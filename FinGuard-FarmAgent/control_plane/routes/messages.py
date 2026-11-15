import logging
from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any, Optional
from shared.contracts.agent import AgentChatMessage, AgentChatResponse
from control_plane.farm_service import FarmService
from control_plane.agent_service import AgentService
from control_plane.maritime_client import MaritimeClientAdapter

logger = logging.getLogger("control_plane.routes.messages")
router = APIRouter(prefix="/api/farms", tags=["Messages"])
maritime_adapter = MaritimeClientAdapter()
agent_service = AgentService(maritime_adapter=maritime_adapter)
farm_service = FarmService()

# Control-plane level conversation registry
control_plane_conversations: Dict[str, str] = {}

@router.post("/{farm_id}/message", response_model=Dict[str, Any])
async def send_message_to_farm(farm_id: str, msg: AgentChatMessage):
    """Send a query or instruction to the dedicated farm agent."""
    farm = farm_service.get_farm(farm_id)
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Farm '{farm_id}' not found.")
    
    # 1. Enforce payload farm_id matching
    if msg.farm_id and msg.farm_id.strip() != farm_id.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Tenant Authorization Violation: Message farm_id '{msg.farm_id}' does not match path farm_id '{farm_id}'."
        )

    # 2. Enforce conversation-ID isolation across farms
    if msg.conversation_id:
        existing_owner = control_plane_conversations.get(msg.conversation_id)
        if existing_owner and existing_owner != farm_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Conversation Isolation Violation: Conversation '{msg.conversation_id}' belongs to farm '{existing_owner}'."
            )
        control_plane_conversations[msg.conversation_id] = farm_id

    try:
        return await agent_service.send_message_to_farm_agent(
            farm_id=farm_id,
            message=msg.message,
            conversation_id=msg.conversation_id
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Agent messaging error: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Agent messaging error: {str(e)}")
