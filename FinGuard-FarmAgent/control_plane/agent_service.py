import json
import sqlite3
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from control_plane.config import config
from control_plane.maritime_client import MaritimeClientAdapter

logger = logging.getLogger("control_plane.agent_service")

class AgentService:
    def __init__(self, maritime_adapter: MaritimeClientAdapter, db_path: Optional[str] = None):
        self.maritime = maritime_adapter
        self.db_path = db_path or config.db_path

    def get_agent_mapping(self, farm_id: str) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM agent_mappings WHERE farm_id = ?", (farm_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def provision_agent_for_farm(self, farm_id: str, farm_name: str, species_info: str = "") -> Dict[str, Any]:
        """Provisions a Maritime agent for a farm if not already provisioned, or returns existing."""
        existing = self.get_agent_mapping(farm_id)
        if existing:
            logger.info(f"Farm {farm_id} is already mapped to Maritime agent {existing['maritime_agent_id']}.")
            return existing

        instructions = (
            f"You are the FinGuard Farm Intelligence agent dedicated to farm {farm_id} ({farm_name}). "
            f"Species under management: {species_info}."
        )
        
        # Provision through Maritime adapter
        res = self.maritime.provision_agent(farm_id=farm_id, farm_name=farm_name, instructions=instructions)
        maritime_agent_id = res["maritime_agent_id"]
        external_id = res["external_id"]
        now = datetime.now(timezone.utc).isoformat()
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR REPLACE INTO agent_mappings
            (farm_id, maritime_agent_id, external_id, status, created_at)
            VALUES (?, ?, ?, ?, ?)
            """, (farm_id, maritime_agent_id, external_id, "active", now))
            
            cursor.execute("""
            UPDATE farms SET maritime_agent_id = ?, provisioning_status = 'provisioned'
            WHERE farm_id = ?
            """, (maritime_agent_id, farm_id))
            
            conn.commit()

        logger.info(f"Mapped farm {farm_id} -> Maritime agent {maritime_agent_id}")
        return {
            "farm_id": farm_id,
            "maritime_agent_id": maritime_agent_id,
            "external_id": external_id,
            "status": "active",
            "created_at": now
        }

    async def send_message_to_farm_agent(self, farm_id: str, message: str, conversation_id: Optional[str] = None) -> Dict[str, Any]:
        mapping = self.get_agent_mapping(farm_id)
        if not mapping:
            raise ValueError(f"Farm {farm_id} does not have an active provisioned agent. Please provision first.")
        
        maritime_agent_id = mapping["maritime_agent_id"]
        result = await self.maritime.chat_with_agent(
            maritime_agent_id=maritime_agent_id,
            message=message,
            farm_id=farm_id,
            conversation_id=conversation_id
        )
        
        # Update last_message_at
        now = datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE agent_mappings SET last_message_at = ? WHERE farm_id = ?", (now, farm_id))
            conn.commit()

        return result

