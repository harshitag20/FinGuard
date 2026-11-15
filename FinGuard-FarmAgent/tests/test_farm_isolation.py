import pytest
from fastapi import HTTPException
from agent_runtime.security.tenant_isolation import validate_farm_access, TenantIsolationError
from agent_runtime.tools.farm_tools import FarmToolHandler
from agent_runtime.storage.repositories import (
    FarmRepository, DiagnosticRepository, ObservationRepository, WaterQualityRepository, ResearchRepository, MemoryRepository
)

def test_tenant_isolation_validation():
    # Matching farm ID passes
    validate_farm_access("FARM-001", "FARM-001")
    
    # Mismatched farm ID raises 403 TenantIsolationError
    with pytest.raises(TenantIsolationError) as exc_info:
        validate_farm_access("FARM-002", "FARM-001")
    assert exc_info.value.status_code == 403
    assert "Tenant Isolation Violation" in exc_info.value.detail

def test_tool_handler_rejects_foreign_farm_diagnostics(tmp_path):
    data_dir = str(tmp_path)
    handler = FarmToolHandler(
        farm_id="FARM-001",
        farm_repo=FarmRepository(data_dir, "FARM-001"),
        diag_repo=DiagnosticRepository(data_dir, "FARM-001"),
        obs_repo=ObservationRepository(data_dir, "FARM-001"),
        wq_repo=WaterQualityRepository(data_dir, "FARM-001"),
        research_repo=ResearchRepository(data_dir, "FARM-001"),
        mem_repo=MemoryRepository(data_dir, "FARM-001")
    )
    
    with pytest.raises(TenantIsolationError):
        handler.list_diagnostic_history("FARM-002")

def test_tool_handler_rejects_foreign_farm_observations(tmp_path):
    data_dir = str(tmp_path)
    handler = FarmToolHandler(
        farm_id="FARM-001",
        farm_repo=FarmRepository(data_dir, "FARM-001"),
        diag_repo=DiagnosticRepository(data_dir, "FARM-001"),
        obs_repo=ObservationRepository(data_dir, "FARM-001"),
        wq_repo=WaterQualityRepository(data_dir, "FARM-001"),
        research_repo=ResearchRepository(data_dir, "FARM-001"),
        mem_repo=MemoryRepository(data_dir, "FARM-001")
    )
    
    with pytest.raises(TenantIsolationError):
        handler.get_farmer_observations("FARM-002")

