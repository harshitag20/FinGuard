import pytest
from pathlib import Path
from agent_runtime.storage.database import init_db, seed_database_if_empty
from agent_runtime.storage.repositories import DiagnosticRepository
from agent_runtime.tools.farm_tools import FarmToolHandler
from agent_runtime.storage.repositories import (
    FarmRepository, ObservationRepository, WaterQualityRepository, ResearchRepository, MemoryRepository
)

def test_diagnostic_crud_and_chronology(tmp_path):
    data_dir = str(tmp_path)
    farm_id = "FARM-001"
    init_db(data_dir, farm_id)
    
    repo = DiagnosticRepository(data_dir, farm_id)
    
    # Add record 1
    d1 = repo.add({
        "diagnosis_id": "DX-TEST-1",
        "species": "Rohu",
        "suspected_disease": "Fin Rot",
        "confidence": "moderate",
        "observed_symptoms": ["frayed fins"],
        "differential_diagnoses": ["Columnaris"],
        "created_at": "2026-10-01T10:00:00Z"
    })
    assert d1["diagnosis_id"] == "DX-TEST-1"
    
    # Add record 2 (later timestamp)
    d2 = repo.add({
        "diagnosis_id": "DX-TEST-2",
        "species": "Catla",
        "suspected_disease": "EUS",
        "confidence": "high",
        "observed_symptoms": ["red ulcers"],
        "created_at": "2026-10-15T12:00:00Z"
    })
    
    # Fetch by ID
    fetched = repo.get_by_id("DX-TEST-1")
    assert fetched is not None
    assert fetched["suspected_disease"] == "Fin Rot"
    assert "frayed fins" in fetched["observed_symptoms"]
    
    # Chronological history
    history = repo.list_history()
    assert len(history) == 2
    assert history[0]["diagnosis_id"] == "DX-TEST-1"
    assert history[1]["diagnosis_id"] == "DX-TEST-2"

def test_compare_diagnostics(tmp_path):
    data_dir = str(tmp_path)
    farm_id = "FARM-001"
    init_db(data_dir, farm_id)
    
    diag_repo = DiagnosticRepository(data_dir, farm_id)
    diag_repo.add({
        "diagnosis_id": "DX-A",
        "species": "Rohu",
        "suspected_disease": "Fin Rot",
        "confidence": "moderate",
        "observed_symptoms": ["frayed fins", "lethargy"],
        "created_at": "2026-10-01T10:00:00Z"
    })
    diag_repo.add({
        "diagnosis_id": "DX-B",
        "species": "Rohu",
        "suspected_disease": "Bacterial Ulcer",
        "confidence": "high",
        "observed_symptoms": ["frayed fins", "lesions"],
        "created_at": "2026-10-10T10:00:00Z"
    })
    
    handler = FarmToolHandler(
        farm_id=farm_id,
        farm_repo=FarmRepository(data_dir, farm_id),
        diag_repo=diag_repo,
        obs_repo=ObservationRepository(data_dir, farm_id),
        wq_repo=WaterQualityRepository(data_dir, farm_id),
        research_repo=ResearchRepository(data_dir, farm_id),
        mem_repo=MemoryRepository(data_dir, farm_id)
    )
    
    res = handler.compare_diagnostics("DX-A", "DX-B")
    assert "comparison" in res
    diff = res["comparison"]["summary_diff"]
    assert diff["same_species"] is True
    assert "frayed fins" in diff["shared_symptoms"]

