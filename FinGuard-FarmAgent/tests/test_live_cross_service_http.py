import pytest
import asyncio
import httpx
from unittest.mock import patch, MagicMock
from agent_runtime.storage.database import init_db
from agent_runtime.storage.repositories import ObservationRepository
from agent_runtime.storage.central_sync import CentralFinGuardApiAdapter, ObservationOutboxManager

@pytest.mark.asyncio
async def test_live_central_sync_adapter_contract():
    """Validates the live CentralFinGuardApiAdapter HTTP contract against the Express API contract."""
    adapter = CentralFinGuardApiAdapter(
        base_url="http://mock-finguard-central:3001",
        api_key="fg-farmagent-service-secret-key-2026"
    )

    observation = {
        "observation_id": "OBS-LIVE-001",
        "farm_id": "FARM-001",
        "pond_id": "POND-01",
        "description": "Live HTTP contract verification: Minor lethargy in fingerlings.",
        "idempotency_key": "IDEM-LIVE-001"
    }

    # 1. First HTTP delivery (201 Created)
    mock_201 = httpx.Response(
        status_code=201,
        json={"success": True, "central_id": "CENTRAL-OBS-1001", "committed_at": "2026-11-15T07:00:00Z"},
        request=httpx.Request("POST", f"{adapter.base_url}/api/v1/farms/FARM-001/observations")
    )

    with patch("httpx.AsyncClient.post", return_value=mock_201) as mock_post:
        res = await adapter.sync_observation(observation)
        assert res["success"] is True
        assert res["central_id"] == "CENTRAL-OBS-1001"
        assert res["committed_at"] == "2026-11-15T07:00:00Z"
        
        # Verify strict headers sent to Core
        headers_sent = mock_post.call_args[1]["headers"]
        assert headers_sent["Idempotency-Key"] == "IDEM-LIVE-001"
        assert headers_sent["X-FinGuard-Service-Key"] == "fg-farmagent-service-secret-key-2026"

    # 2. Duplicate retry delivery (409 Conflict with idempotent acknowledgment)
    mock_409 = httpx.Response(
        status_code=409,
        json={"success": True, "central_id": "CENTRAL-OBS-1001", "committed_at": "2026-11-15T07:00:00Z", "duplicate": True},
        request=httpx.Request("POST", f"{adapter.base_url}/api/v1/farms/FARM-001/observations")
    )

    with patch("httpx.AsyncClient.post", return_value=mock_409):
        res_dup = await adapter.sync_observation(observation)
        assert res_dup["success"] is True
        assert res_dup["duplicate"] is True

    # 3. Unauthorized access (401 Unauthorized from Core)
    mock_401 = httpx.Response(
        status_code=401,
        text="Unauthorized: Invalid or missing X-FinGuard-Service-Key.",
        request=httpx.Request("POST", f"{adapter.base_url}/api/v1/farms/FARM-001/observations")
    )

    with patch("httpx.AsyncClient.post", return_value=mock_401):
        with pytest.raises(RuntimeError) as exc_info:
            await adapter.sync_observation(observation, max_retries=1)
        assert "401" in str(exc_info.value)

    # 4. Tenant isolation violation (403 Forbidden from Core)
    mock_403 = httpx.Response(
        status_code=403,
        text="Tenant Isolation Violation: User is not authorized to access farm 'FARM-OTHER'.",
        request=httpx.Request("POST", f"{adapter.base_url}/api/v1/farms/FARM-OTHER/observations")
    )

    tampered_obs = {**observation, "farm_id": "FARM-OTHER"}
    with patch("httpx.AsyncClient.post", return_value=mock_403):
        with pytest.raises(RuntimeError) as exc_info:
            await adapter.sync_observation(tampered_obs, max_retries=1)
        assert "403" in str(exc_info.value)

@pytest.mark.asyncio
async def test_outbox_resilience_on_core_downtime(tmp_path):
    """Verifies that outbox persists pending observations and recovers gracefully when Core is temporarily down."""
    data_dir = str(tmp_path)
    farm_id = "FARM-001"
    init_db(data_dir, farm_id)

    repo = ObservationRepository(data_dir, farm_id)
    adapter = CentralFinGuardApiAdapter(base_url="http://offline-core:3001", api_key="secret")
    outbox = ObservationOutboxManager(obs_repo=repo, central_adapter=adapter)

    # Add observation locally
    obs = repo.add({
        "pond_id": "POND-01",
        "description": "Observation recorded while Core Express is temporarily unreachable",
        "idempotency_key": "IDEM-OFFLINE-001"
    })

    # Flush when Core fails with connection error
    with patch("httpx.AsyncClient.post", side_effect=httpx.ConnectError("Connection refused")):
        flush_res = await outbox.flush_pending_observations()
        assert flush_res["failed_count"] == 1
        assert flush_res["flushed_count"] == 0

    # Verify observation remains pending in local SQLite outbox
    pending = repo.list_pending_sync()
    assert len(pending) == 1
    assert pending[0]["observation_id"] == obs["observation_id"]
    assert pending[0]["sync_attempts"] >= 1
