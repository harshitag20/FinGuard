import logging
from fastapi import HTTPException, status

logger = logging.getLogger("tenant_isolation")

class TenantIsolationError(HTTPException):
    def __init__(self, requested_farm_id: str, assigned_farm_id: str):
        detail = (
            f"Tenant Isolation Violation: Agent assigned to farm '{assigned_farm_id}' "
            f"cannot access or modify records for farm '{requested_farm_id}'."
        )
        logger.warning(detail)
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

def validate_farm_access(requested_farm_id: str, assigned_farm_id: str):
    if not requested_farm_id:
        return
    if requested_farm_id.strip() != assigned_farm_id.strip():
        raise TenantIsolationError(requested_farm_id=requested_farm_id, assigned_farm_id=assigned_farm_id)

