from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any
from shared.contracts.farm import FarmContract, FarmCreateRequest
from shared.contracts.observation import ObservationCreateRequest, ObservationContract
from control_plane.farm_service import FarmService

router = APIRouter(prefix="/api/farms", tags=["Farms"])
farm_service = FarmService()

@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def register_farm(farm_data: FarmCreateRequest):
    """Register a new aquaculture farm in FinGuard."""
    try:
        return farm_service.register_farm(farm_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

@router.get("", response_model=List[Dict[str, Any]])
def list_farms():
    """List all registered farms."""
    return farm_service.list_farms()

@router.get("/{farm_id}", response_model=Dict[str, Any])
def get_farm(farm_id: str):
    """Retrieve detailed farm profile by farm_id."""
    farm = farm_service.get_farm(farm_id)
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Farm '{farm_id}' not found.")
    return farm

@router.get("/{farm_id}/diagnostics", response_model=List[Dict[str, Any]])
def get_farm_diagnostics(farm_id: str):
    """Retrieve historical diagnostic reports for a specific farm."""
    farm = farm_service.get_farm(farm_id)
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Farm '{farm_id}' not found.")
    return farm_service.get_diagnostics(farm_id)

@router.get("/{farm_id}/observations", response_model=List[Dict[str, Any]])
def get_farm_observations(farm_id: str):
    """Retrieve farmer observations for a specific farm."""
    farm = farm_service.get_farm(farm_id)
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Farm '{farm_id}' not found.")
    return farm_service.get_observations(farm_id)

@router.post("/{farm_id}/observations", status_code=status.HTTP_201_CREATED)
def create_farm_observation(farm_id: str, obs: ObservationCreateRequest):
    """Record a new unverified observation from farm personnel."""
    farm = farm_service.get_farm(farm_id)
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Farm '{farm_id}' not found.")
    
    # Enforce tenant isolation on observation creation
    if obs.farm_id and obs.farm_id.strip() != farm_id.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Tenant Isolation Violation: Observation farm_id '{obs.farm_id}' does not match target farm '{farm_id}'."
        )
    return farm_service.create_observation(farm_id, obs)

@router.get("/{farm_id}/health-summary", response_model=Dict[str, Any])
def get_farm_health_summary(farm_id: str):
    """Retrieve a structured health summary combining diagnostics, water quality, and observations."""
    farm = farm_service.get_farm(farm_id)
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Farm '{farm_id}' not found.")
    return farm_service.get_health_summary(farm_id)
