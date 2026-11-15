import os
import logging
from typing import Dict, Any, Optional
from control_plane.config import config

logger = logging.getLogger("control_plane.maritime_client")

class MaritimeClientAdapter:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or config.maritime_api_key
        self.client = None
        if self.api_key:
            try:
                from maritime import Maritime
                self.client = Maritime(api_key=self.api_key)
                logger.info("Initialized official Maritime SDK client.")
            except Exception as e:
                logger.error(f"Failed to initialize Maritime SDK client: {e}")
        else:
            logger.warning("No MARITIME_API_KEY configured. Running in local/mock adapter mode.")

    def provision_agent(self, farm_id: str, farm_name: str, instructions: str = "") -> Dict[str, Any]:
        """Idempotently provision a dedicated Maritime agent for a farm.
        Uses external_id = f'farm_{farm_id}' to ensure 1-to-1 idempotent mapping."""
        external_id = f"customer_farm_{farm_id.lower().replace('-', '_')}"
        agent_name = f"finguard-{farm_id.lower().replace('_', '-')}"
        
        # If in cloud mode and client is available
        if config.agent_dispatch_mode == "maritime" and self.client:
            logger.info(f"Provisioning cloud Maritime agent for {farm_id} with name {agent_name}...")
            try:
                agent = self.client.agents.provision(
                    external_id=external_id,
                    name=agent_name,
                    template=config.maritime_agent_template,
                    instructions=instructions or f"You are the FinGuard Farm Intelligence agent for {farm_name} ({farm_id}).",
                    idle_ttl_seconds=3600
                )
                logger.info(f"Successfully provisioned cloud Maritime agent: {agent.get('id')}")
                return {
                    "maritime_agent_id": agent.get("id"),
                    "external_id": external_id,
                    "status": "active",
                    "mode": "cloud_maritime",
                    "details": agent
                }
            except Exception as e:
                logger.error(f"Maritime provisioning error for {farm_id}: {e}")
                raise e

        # Local development / isolated test mode
        local_agent_id = f"local-agent-{farm_id.lower()}"
        logger.info(f"Registered local runtime agent {local_agent_id} for farm {farm_id}")
        return {
            "maritime_agent_id": local_agent_id,
            "external_id": external_id,
            "status": "active",
            "mode": "local_runtime"
        }

    async def chat_with_agent(self, maritime_agent_id: str, message: str, farm_id: str, conversation_id: Optional[str] = None) -> Dict[str, Any]:
        """Send a message to the farm's Maritime agent."""
        if config.agent_dispatch_mode == "maritime" and self.client:
            try:
                logger.info(f"Sending chat message to Maritime agent {maritime_agent_id}...")
                kwargs = {}
                if conversation_id:
                    kwargs["conversation_id"] = conversation_id
                res = self.client.agents.chat(maritime_agent_id, message, **kwargs)
                return {
                    "response": res.get("response") or res.get("reply") or str(res),
                    "farm_id": farm_id,
                    "agent_id": maritime_agent_id,
                    "source": "maritime_cloud"
                }
            except Exception as e:
                logger.error(f"Error chatting with Maritime agent {maritime_agent_id}: {e}")
                raise e

        # Local runtime dispatch
        from agent_runtime.main import app as agent_app
        from starlette.testclient import TestClient
        
        with TestClient(agent_app) as client:
            resp = client.post("/chat", json={
                "message": message,
                "farm_id": farm_id,
                "conversation_id": conversation_id,
                "source": "control_plane"
            })
            if resp.status_code != 200:
                raise RuntimeError(f"Local agent runtime error ({resp.status_code}): {resp.text}")
            data = resp.json()
            return {
                "response": data.get("response", ""),
                "farm_id": farm_id,
                "agent_id": maritime_agent_id,
                "source": "local_runtime"
            }

    def get_agent_status(self, maritime_agent_id: str) -> Dict[str, Any]:
        """Retrieve agent status and metadata."""
        if config.agent_dispatch_mode == "maritime" and self.client:
            try:
                agent = self.client.agents.get(maritime_agent_id)
                return {"status": "ok", "agent": agent}
            except Exception as e:
                logger.error(f"Error fetching Maritime agent {maritime_agent_id}: {e}")
                return {"status": "error", "message": str(e)}

        return {
            "status": "ok",
            "agent": {
                "id": maritime_agent_id,
                "status": "active",
                "mode": "local_runtime"
            }
        }

