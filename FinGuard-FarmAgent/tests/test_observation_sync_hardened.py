import pytest
import uuid
from datetime import datetime, timezone
from agent_runtime.storage.database import init_db
from agent_runtime.storage.repositories import ObservationRepository
from agent_runtime.storage.central_sync import ObservationOutboxManager, MockCentralFinGuardAdapter

@pytest.fixture
def obs_setup(tmp_path):
    farm_id = "FARM-SYNC-TEST"
    data_dir = str(tmp_path)
    init_db(data_dir, farm_id)
    repo = ObservationRepository(data_dir, farm_id)
    adapter = MockCentralFinGuardAdapter()
    manager = ObservationOutboxManager(obs_repo=repo, central_adapter=adapter, max_retries=3)
    return {"repo": repo, "adapter": adapter, "manager": manager, "data_dir": data_dir, "farm_id": farm_id}

@pytest.mark.asyncio
async def test_pending_observations_survive_restart(obs_setup):
    repo = obs_setup["repo"]
    data_dir = obs_setup["data_dir"]
    farm_id = obs_setup["farm_id"]
    
    # 1. Add observation locally
    obs = repo.add({
        "description": "Feed intake decreased in pond 2",
        "observation_type": "feeding",
        "pond_id": "Pond-02",
        "idempotency_key": "idemp-key-100"
    })
    obs_id = obs["observation_id"]
    assert obs["sync_status"] == "pending"
    assert obs["idempotency_key"] == "idemp-key-100"
    
    # 2. Simulate restart by instantiating new repo and outbox manager
    restarted_repo = ObservationRepository(data_dir, farm_id)
    pending = restarted_repo.list_pending_sync()
    assert len(pending) == 1
    assert pending[0]["observation_id"] == obs_id
    assert pending[0]["idempotency_key"] == "idemp-key-100"

@pytest.mark.asyncio
async def test_central_id_and_committed_at_persisted(obs_setup):
    repo = obs_setup["repo"]
    manager = obs_setup["manager"]
    
    obs = repo.add({
        "description": "Mild lethargy near water inlet",
        "observation_type": "behavior",
        "pond_id": "Pond-01"
    })
    obs_id = obs["observation_id"]
    
    # Flush pending outbox
    result = await manager.flush_pending_observations()
    assert result["flushed_count"] == 1
    assert result["failed_count"] == 0
    
    # Verify in DB
    record = repo.get_by_id(obs_id)
    assert record["sync_status"] == "synced"
    assert record["central_id"] == f"CENTRAL-{obs_id}"
    assert record["central_committed_at"] is not None
    assert record["last_sync_error"] is None

@pytest.mark.asyncio
async def test_duplicate_avoidance_via_idempotency_key(obs_setup):
    repo = obs_setup["repo"]
    manager = obs_setup["manager"]
    adapter = obs_setup["adapter"]
    
    # Add observation with explicit idempotency key
    key = f"idemp-fixed-{uuid.uuid4().hex[:6]}"
    obs = repo.add({
        "description": "Water turbidity check post-aeration",
        "idempotency_key": key
    })
    obs_id = obs["observation_id"]
    
    # First sync
    res1 = await manager.flush_pending_observations()
    assert res1["flushed_count"] == 1
    
    rec1 = repo.get_by_id(obs_id)
    first_central_id = rec1["central_id"]
    first_committed = rec1["central_committed_at"]
    
    # Simulate network retry with same idempotency key
    sync_res = await adapter.sync_observation(rec1)
    assert sync_res["success"] is True
    assert sync_res["duplicate"] is True
    assert sync_res["central_id"] == first_central_id
    assert sync_res["committed_at"] == first_committed

@pytest.mark.asyncio
async def test_permanent_failure_transitions_to_requires_review(tmp_path):
    farm_id = "FARM-FAIL-TEST"
    data_dir = str(tmp_path)
    init_db(data_dir, farm_id)
    repo = ObservationRepository(data_dir, farm_id)
    
    # Adapter that always raises connection error
    class FailingAdapter:
        async def sync_observation(self, observation):
            raise ConnectionError("Central backend connection refused (503 Service Unavailable)")
            
    manager = ObservationOutboxManager(obs_repo=repo, central_adapter=FailingAdapter(), max_retries=3)
    
    obs = repo.add({
        "description": "High mortality detected in nursery tank 1",
        "observation_type": "mortality"
    })
    obs_id = obs["observation_id"]
    
    # Flush attempt 1: failure 1 (pending)
    res1 = await manager.flush_pending_observations()
    assert res1["failed_count"] == 1
    assert repo.get_by_id(obs_id)["sync_status"] == "pending"
    assert repo.get_by_id(obs_id)["sync_attempts"] == 1
    
    # Flush attempt 2: failure 2 (pending)
    await manager.flush_pending_observations()
    assert repo.get_by_id(obs_id)["sync_status"] == "pending"
    assert repo.get_by_id(obs_id)["sync_attempts"] == 2
    
    # Flush attempt 3: reaches max_retries (3) -> transitions to requires_review
    res3 = await manager.flush_pending_observations()
    assert res3["requires_review_count"] == 1
    
    final_record = repo.get_by_id(obs_id)
    assert final_record["sync_status"] == "requires_review"
    assert final_record["sync_attempts"] == 3
    assert "Central backend connection refused" in final_record["last_sync_error"]

