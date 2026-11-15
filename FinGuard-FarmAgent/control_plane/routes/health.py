from fastapi import APIRouter
from control_plane.config import config

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "FinGuard-ControlPlane",
        "environment": config.environment,
        "dispatch_mode": config.agent_dispatch_mode
    }

