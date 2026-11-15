import os
import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import httpx
from agent_runtime.storage.repositories import ObservationRepository

logger = logging.getLogger("storage.central_sync")

class CentralFinGuardApiAdapter:
    """Adapter for communicating with the authoritative FinGuard Express backend."""
    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: float = 10.0
    ):
        self.base_url = base_url or os.getenv("FINGUARD_CENTRAL_API_URL", "http://localhost:3000")
        self.api_key = api_key or os.getenv("FINGUARD_CENTRAL_API_KEY", "")
        self.timeout = timeout

    async def sync_observation(self, observation: Dict[str, Any], max_retries: int = 3) -> Dict[str, Any]:
        """Post observation to central FinGuard backend with idempotency token and exponential backoff."""
        farm_id = observation["farm_id"]
        endpoint = f"{self.base_url}/api/v1/farms/{farm_id}/observations"
        headers = {
            "Content-Type": "application/json",
            "Idempotency-Key": observation.get("idempotency_key", observation["observation_id"]),
            "X-FinGuard-Service-Key": self.api_key
        }

        retries = 0
        while retries < max_retries:
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.post(endpoint, json=observation, headers=headers)
                    if resp.status_code in (200, 201):
                        data = resp.json()
                        return {
                            "success": True,
                            "central_id": data.get("central_id") or data.get("id") or observation["observation_id"],
                            "committed_at": data.get("committed_at") or datetime.now(timezone.utc).isoformat()
                        }
                    elif resp.status_code == 409:
                        # Already exists centrally (idempotent success)
                        return {
                            "success": True,
                            "central_id": observation["observation_id"],
                            "committed_at": datetime.now(timezone.utc).isoformat(),
                            "duplicate": True
                        }
                    else:
                        raise RuntimeError(f"Central server returned status {resp.status_code}: {resp.text}")
            except Exception as e:
                retries += 1
                wait_time = 0.5 * (2 ** (retries - 1))
                logger.warning(f"Central sync attempt {retries} failed for {observation['observation_id']}: {e}. Retrying in {wait_time}s...")
                if retries >= max_retries:
                    raise RuntimeError(f"Central sync exhausted {max_retries} retries: {str(e)}")
                time.sleep(wait_time)


class MockCentralFinGuardAdapter:
    """Mock adapter for local development and offline testing."""
    def __init__(self):
        self.central_store: Dict[str, Dict[str, Any]] = {}

    async def sync_observation(self, observation: Dict[str, Any], max_retries: int = 1) -> Dict[str, Any]:
        obs_id = observation["observation_id"]
        idempotency_key = observation.get("idempotency_key", obs_id)
        
        # Check idempotency
        for stored in self.central_store.values():
            if stored.get("idempotency_key") == idempotency_key:
                return {
                    "success": True,
                    "central_id": stored["central_id"],
                    "committed_at": stored["committed_at"],
                    "duplicate": True
                }

        central_id = f"CENTRAL-{obs_id}"
        committed_at = datetime.now(timezone.utc).isoformat()
        
        record = dict(observation)
        record["central_id"] = central_id
        record["committed_at"] = committed_at
        self.central_store[obs_id] = record
        
        logger.info(f"Mock Central committed observation: {central_id} at {committed_at}")
        return {
            "success": True,
            "central_id": central_id,
            "committed_at": committed_at
        }


class ObservationOutboxManager:
    """Manages the observation outbox: ensures local observations are reliably pushed to central storage."""
    def __init__(self, obs_repo: ObservationRepository, central_adapter=None, max_retries: int = 5):
        self.obs_repo = obs_repo
        self.adapter = central_adapter or MockCentralFinGuardAdapter()
        self.max_retries = max_retries

    async def flush_pending_observations(self) -> Dict[str, Any]:
        """Flushes all pending un-synchronized observations to central with bounded retries."""
        pending = self.obs_repo.list_pending_sync(limit=25)
        synced_count = 0
        errors = []
        requires_review_count = 0

        for obs in pending:
            obs_id = obs["observation_id"]
            try:
                result = await self.adapter.sync_observation(obs)
                if result.get("success"):
                    self.obs_repo.mark_synced(
                        obs_id,
                        result.get("central_id"),
                        result.get("committed_at")
                    )
                    synced_count += 1
            except Exception as e:
                err_msg = str(e)
                status_info = self.obs_repo.record_sync_failure(obs_id, err_msg, max_retries=self.max_retries)
                is_permanent = status_info.get("status") == "requires_review"
                if is_permanent:
                    requires_review_count += 1
                errors.append({
                    "observation_id": obs_id,
                    "error": err_msg,
                    "attempts": status_info.get("attempts"),
                    "requires_review": is_permanent
                })

        return {
            "flushed_count": synced_count,
            "failed_count": len(errors),
            "requires_review_count": requires_review_count,
            "errors": errors
        }

