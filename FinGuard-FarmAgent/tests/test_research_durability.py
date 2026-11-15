import pytest
import asyncio
from pathlib import Path
from agent_runtime.storage.database import init_db
from agent_runtime.storage.repositories import ResearchRepository
from agent_runtime.research.research_manager import ResearchManager

@pytest.fixture
def research_setup(tmp_path):
    farm_id = "FARM-TEST-RES"
    data_dir = str(tmp_path)
    init_db(data_dir, farm_id)
    repo = ResearchRepository(data_dir, farm_id)
    manager = ResearchManager(repository=repo, worker_id="worker-test-1")
    return {"repo": repo, "manager": manager, "data_dir": data_dir, "farm_id": farm_id}

@pytest.mark.asyncio
async def test_research_task_creation_and_completion_durability(research_setup):
    manager = research_setup["manager"]
    repo = research_setup["repo"]
    
    # 1. Create a research task
    resp = manager.create_task(question="Optimal dissolved oxygen for Labeo rohita")
    task_id = resp["research_task_id"]
    assert resp["status"] == "pending"
    
    # Allow background coroutine to finish
    await asyncio.sleep(0.5)
    
    # 2. Verify state and metadata in repository
    task = repo.get_task(task_id)
    assert task is not None
    assert task["status"] == "completed"
    assert task["created_at"] is not None
    assert task["completed_at"] is not None
    assert task["findings"] is not None
    assert len(task["findings"]) > 0
    assert task["execution_lock"] is None

@pytest.mark.asyncio
async def test_recovery_of_interrupted_tasks(research_setup):
    repo = research_setup["repo"]
    data_dir = research_setup["data_dir"]
    farm_id = research_setup["farm_id"]
    
    # Simulate an interrupted task left in 'running' state from a crashed process
    task_info = repo.create_task(question="Gill rot pathogen treatment options", max_retries=3)
    task_id = task_info["research_task_id"]
    repo.update_task(task_id, status="running", started_at="2026-11-14T10:00:00Z")
    
    # Verify task is currently uncompleted in SQLite
    interrupted = repo.list_interrupted_tasks()
    assert any(t["research_task_id"] == task_id for t in interrupted)
    
    # Simulate process restart: instantiate a new ResearchManager
    recovered_manager = ResearchManager(repository=repo, worker_id="worker-restart-1")
    actions = await recovered_manager.recover_interrupted_tasks()
    
    assert any(a["task_id"] == task_id and a["action"] == "resumed" for a in actions)
    
    # Allow execution to complete
    await asyncio.sleep(0.5)
    
    final_task = repo.get_task(task_id)
    assert final_task["status"] == "completed"
    assert final_task["retry_count"] >= 1
    assert final_task["execution_lock"] is None

@pytest.mark.asyncio
async def test_task_exceeding_max_retries_marked_requires_review(research_setup):
    repo = research_setup["repo"]
    
    # Create task already at max retries (e.g. 3 retries out of 3)
    task_info = repo.create_task(question="Repeatedly failing inquiry", max_retries=3)
    task_id = task_info["research_task_id"]
    repo.update_task(task_id, status="running", retry_count=3)
    
    # Instantiate new manager simulating a restart
    manager = ResearchManager(repository=repo, worker_id="worker-restart-2")
    actions = await manager.recover_interrupted_tasks()
    
    assert any(a["task_id"] == task_id and a["action"] == "marked_for_review" for a in actions)
    
    task = repo.get_task(task_id)
    assert task["status"] == "requires_review"
    assert "exceeded maximum retry attempts" in task["error_message"].lower()

@pytest.mark.asyncio
async def test_idempotent_recovery(research_setup):
    repo = research_setup["repo"]
    manager = research_setup["manager"]
    
    # Create an interrupted task
    task_info = repo.create_task(question="Water hardness buffering methods", max_retries=3)
    task_id = task_info["research_task_id"]
    repo.update_task(task_id, status="pending")
    
    # Run recovery first time
    actions1 = await manager.recover_interrupted_tasks()
    assert any(a["task_id"] == task_id for a in actions1)
    
    # Run recovery second time immediately while it's active in memory
    actions2 = await manager.recover_interrupted_tasks()
    assert not any(a["task_id"] == task_id for a in actions2)
    
    await asyncio.sleep(0.5)
    task = repo.get_task(task_id)
    assert task["status"] == "completed"

def test_execution_lock_prevents_duplicate_workers(research_setup):
    repo = research_setup["repo"]
    task_info = repo.create_task(question="Execution lock test")
    task_id = task_info["research_task_id"]
    
    # Worker 1 acquires lock
    locked_w1 = repo.acquire_task_lock(task_id, "worker-1")
    assert locked_w1 is True
    
    # Worker 2 attempts to acquire lock on the same task -> fails
    locked_w2 = repo.acquire_task_lock(task_id, "worker-2")
    assert locked_w2 is False
    
    # Worker 1 releases lock
    repo.release_task_lock(task_id, "worker-1")
    
    # Now Worker 2 can acquire lock
    locked_w2_retry = repo.acquire_task_lock(task_id, "worker-2")
    assert locked_w2_retry is True

