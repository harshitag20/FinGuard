from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any
from control_plane.farm_service import FarmService
from control_plane.agent_service import AgentService
from control_plane.maritime_client import MaritimeClientAdapter

router = APIRouter(prefix="/api/farms", tags=["Agents"])
maritime_adapter = MaritimeClientAdapter()
agent_service = AgentService(maritime_adapter=maritime_adapter)
farm_service = FarmService()

@router.post("/{farm_id}/provision", response_model=Dict[str, Any])
def provision_farm_agent(farm_id: str):
    """Provision a dedicated Maritime.sh agent for the given farm (idempotent)."""
    farm = farm_service.get_farm(farm_id)
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Farm '{farm_id}' not found.")
    
    species_names = ", ".join([s["common_name"] for s in farm.get("species_profile", [])])
    return agent_service.provision_agent_for_farm(
        farm_id=farm_id,
        farm_name=farm.get("name", farm_id),
        species_info=species_names
    )

@router.get("/{farm_id}/agent", response_model=Dict[str, Any])
def get_farm_agent(farm_id: str):
    """Retrieve details and status for the Maritime agent assigned to this farm."""
    mapping = agent_service.get_agent_mapping(farm_id)
    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No Maritime agent provisioned for farm '{farm_id}'. Call POST /api/farms/{farm_id}/provision first."
        )
    status_info = maritime_adapter.get_agent_status(mapping["maritime_agent_id"])
    return {
        "farm_id": farm_id,
        "maritime_agent_id": mapping["maritime_agent_id"],
        "external_id": mapping["external_id"],
        "status": mapping["status"],
        "created_at": mapping["created_at"],
        "runtime_details": status_info
    }

