import pytest
import asyncio
from pathlib import Path
from fastapi.testclient import TestClient
from agent_runtime.main import app
from agent_runtime.storage.database import init_db
from agent_runtime.storage.repositories import ResearchRepository
from agent_runtime.research.research_manager import ResearchManager

@pytest.mark.asyncio
async def test_async_research_lifecycle(tmp_path):
    data_dir = str(tmp_path)
    farm_id = "FARM-001"
    init_db(data_dir, farm_id)
    
    seed_dir = Path("data/seed")
    repo = ResearchRepository(data_dir, farm_id, seed_dir=seed_dir)
    manager = ResearchManager(repository=repo)
    
    # 1. Create task
    task_res = manager.create_task(question="What are effective treatments for Epizootic Ulcerative Syndrome EUS?", related_diagnosis_id="DX-002")
    task_id = task_res["research_task_id"]
    assert task_res["status"] == "pending"
    assert "RES-" in task_id
    
    # 2. Execute background research
    await manager._run_research(task_id, question="What are effective treatments for Epizootic Ulcerative Syndrome EUS?")
    
    # 3. Verify completed task
    completed_task = manager.get_task(task_id)
    assert completed_task is not None
    assert completed_task["status"] == "completed"
    assert completed_task["completed_at"] is not None
    assert completed_task["findings"] is not None
    
    # 4. Verify verified citations are present without fabrication
    assert len(completed_task["sources"]) > 0
    source_titles = [s["title"] for s in completed_task["sources"]]
    assert any("Epizootic Ulcerative Syndrome" in t for t in source_titles)
    assert "[CITATIONS VERIFIED]" in completed_task["findings"]

def test_research_endpoints():
    with TestClient(app) as client:
        # Create research inquiry via API
        post_resp = client.post("/research", json={
            "question": "Management protocols for bacterial fin rot Aeromonas",
            "related_diagnosis_id": "DX-001"
        })
        assert post_resp.status_code == 200
        task_id = post_resp.json()["research_task_id"]
        assert "RES-" in task_id
        
        # Get research inquiry
        get_resp = client.get(f"/research/{task_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["research_task_id"] == task_id
        
        # List research inquiries
        list_resp = client.get("/research")
        assert list_resp.status_code == 200
        assert isinstance(list_resp.json(), list)

