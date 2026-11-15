import pytest
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient
from agent_runtime.main import app
from agent_runtime.security.tenant_isolation import TenantIsolationError, validate_farm_access
from agent_runtime.tools.farm_tools import FarmToolHandler
from agent_runtime.storage.repositories import (
    FarmRepository, DiagnosticRepository, ObservationRepository, WaterQualityRepository, ResearchRepository, MemoryRepository
)

def test_observation_creation_isolation_on_endpoint():
    with TestClient(app) as client:
        # Attempting to post an observation with foreign farm_id FARM-002 to FARM-001 runtime
        res = client.post("/observations", json={
            "farm_id": "FARM-002",
            "pond_id": "POND-01",
            "observation_type": "symptom_progression",
            "description": "Unauthorized observation injection attempt."
        })
        assert res.status_code == 403
        assert "Tenant Isolation Violation" in res.json()["detail"]

def test_diagnostic_report_isolation(tmp_path):
    data_dir = str(tmp_path)
    from agent_runtime.storage.database import init_db
    init_db(data_dir, "FARM-001")
    init_db(data_dir, "FARM-002")

    h1 = FarmToolHandler(
        farm_id="FARM-001",
        farm_repo=FarmRepository(data_dir, "FARM-001"),
        diag_repo=DiagnosticRepository(data_dir, "FARM-001"),
        obs_repo=ObservationRepository(data_dir, "FARM-001"),
        wq_repo=WaterQualityRepository(data_dir, "FARM-001"),
        research_repo=ResearchRepository(data_dir, "FARM-001"),
        mem_repo=MemoryRepository(data_dir, "FARM-001")
    )
    
    # Adding diagnosis to foreign farm repo FARM-002
    d2_repo = DiagnosticRepository(data_dir, "FARM-002")
    d2 = d2_repo.add({"diagnosis_id": "DX-FARM2-99", "species": "Tilapia", "suspected_disease": "Streptococcosis"})
    
    # Farm 1 handler attempting to fetch Farm 2 diagnosis
    res = h1.get_diagnostic_report("DX-FARM2-99")
    # Not found in Farm 1 repo
    assert "error" in res

def test_compare_diagnostics_isolation(tmp_path):
    data_dir = str(tmp_path)
    from agent_runtime.storage.database import init_db
    init_db(data_dir, "FARM-001")
    init_db(data_dir, "FARM-002")

    d1_repo = DiagnosticRepository(data_dir, "FARM-001")
    d1 = d1_repo.add({"diagnosis_id": "DX-FARM1-01", "species": "Rohu", "suspected_disease": "Fin Rot"})
    
    d2_repo = DiagnosticRepository(data_dir, "FARM-002")
    d2 = d2_repo.add({"diagnosis_id": "DX-FARM2-02", "species": "Tilapia", "suspected_disease": "Streptococcosis"})
    
    h1 = FarmToolHandler(
        farm_id="FARM-001",
        farm_repo=FarmRepository(data_dir, "FARM-001"),
        diag_repo=d1_repo,
        obs_repo=ObservationRepository(data_dir, "FARM-001"),
        wq_repo=WaterQualityRepository(data_dir, "FARM-001"),
        research_repo=ResearchRepository(data_dir, "FARM-001"),
        mem_repo=MemoryRepository(data_dir, "FARM-001")
    )
    
    # Comparing diagnosis from FARM-001 with foreign diagnosis from FARM-002
    res = h1.compare_diagnostics("DX-FARM1-01", "DX-FARM2-02")
    assert "error" in res
    assert "not found" in res["error"].lower()

def test_conversation_id_isolation():
    with TestClient(app) as client:
        # Step 1: Initialize conversation for FARM-001
        res1 = client.post("/chat", json={
            "message": "Start consultation",
            "farm_id": "FARM-001",
            "conversation_id": "conv-shared-test-999"
        })
        assert res1.status_code == 200
        
        # Step 2: Attempt to reuse same conversation_id with a different farm_id (FARM-002)
        res2 = client.post("/chat", json={
            "message": "Hijack consultation",
            "farm_id": "FARM-002",
            "conversation_id": "conv-shared-test-999"
        })
        assert res2.status_code == 403
        assert "Isolation Violation" in res2.json()["detail"]

def test_concurrent_requests_isolation():
    with TestClient(app) as client:
        def query_farm(payload):
            return client.post("/chat", json=payload)

        req1 = {"message": "Health check 1", "farm_id": "FARM-001", "conversation_id": "conv-conc-1"}
        req2 = {"message": "Health check 2", "farm_id": "FARM-001", "conversation_id": "conv-conc-2"}
        
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(query_farm, r) for r in [req1, req2, req1, req2]]
            results = [f.result() for f in futures]
            
        for r in results:
            assert r.status_code == 200
            assert r.json()["farm_id"] == "FARM-001"
