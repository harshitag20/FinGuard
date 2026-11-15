import pytest
import asyncio
from agent_runtime.storage.database import init_db
from agent_runtime.storage.repositories import ObservationRepository
from agent_runtime.storage.central_sync import MockCentralFinGuardAdapter, ObservationOutboxManager

@pytest.mark.asyncio
async def test_observation_outbox_flow(tmp_path):
    data_dir = str(tmp_path)
    farm_id = "FARM-001"
    init_db(data_dir, farm_id)
    
    repo = ObservationRepository(data_dir, farm_id)
    mock_adapter = MockCentralFinGuardAdapter()
    outbox = ObservationOutboxManager(obs_repo=repo, central_adapter=mock_adapter)
    
    # 1. Add new observation locally
    obs = repo.add({
        "pond_id": "POND-01",
        "description": "Feed refusal observed in north pond sector.",
        "idempotency_key": "idem-key-001"
    })
    
    assert obs["sync_status"] == "pending"
    assert obs["central_committed_at"] is None
    
    # 2. Flush outbox
    flush_res = await outbox.flush_pending_observations()
    assert flush_res["flushed_count"] == 1
    assert flush_res["failed_count"] == 0
    
    # 3. Check updated status
    updated = repo.get_by_id(obs["observation_id"])
    assert updated["sync_status"] == "synced"
    assert updated["central_committed_at"] is not None
    assert "CENTRAL-" in mock_adapter.central_store[obs["observation_id"]]["central_id"]

@pytest.mark.asyncio
async def test_idempotency_prevents_duplicate_commit(tmp_path):
    data_dir = str(tmp_path)
    farm_id = "FARM-001"
    init_db(data_dir, farm_id)
    
    repo = ObservationRepository(data_dir, farm_id)
    mock_adapter = MockCentralFinGuardAdapter()
    
    # Create record with specific idempotency key
    obs1 = repo.add({
        "description": "Fish gasping at surface",
        "idempotency_key": "idem-key-duplicate-check"
    })
    
    # Attempting to add with exact same idempotency key returns the existing record
    obs2 = repo.add({
        "description": "Fish gasping at surface (duplicate attempt)",
        "idempotency_key": "idem-key-duplicate-check"
    })
    
    assert obs1["observation_id"] == obs2["observation_id"]
    
    # Outbox sync is also idempotent
    outbox = ObservationOutboxManager(obs_repo=repo, central_adapter=mock_adapter)
    res1 = await outbox.flush_pending_observations()
    assert res1["flushed_count"] == 1
    
    # Second sync returns duplicate: True on adapter
    res2 = await mock_adapter.sync_observation(obs1)
    assert res2["success"] is True
    assert res2.get("duplicate") is True

@pytest.mark.asyncio
async def test_central_sync_retry_on_failure(tmp_path):
    data_dir = str(tmp_path)
    farm_id = "FARM-001"
    init_db(data_dir, farm_id)
    
    repo = ObservationRepository(data_dir, farm_id)
    
    class FailingAdapter:
        async def sync_observation(self, obs, max_retries=1):
            raise ConnectionError("Central backend temporarily unreachable (HTTP 503)")

    outbox = ObservationOutboxManager(obs_repo=repo, central_adapter=FailingAdapter())
    obs = repo.add({"description": "Test failure handling"})
    
    res = await outbox.flush_pending_observations()
    assert res["failed_count"] == 1
    
    record = repo.get_by_id(obs["observation_id"])
    assert record["sync_status"] == "pending"
    assert record["sync_attempts"] >= 1
    assert "temporarily unreachable" in record["last_sync_error"]

