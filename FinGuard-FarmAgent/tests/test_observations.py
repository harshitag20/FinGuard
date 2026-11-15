import pytest
from agent_runtime.storage.database import init_db
from agent_runtime.storage.repositories import ObservationRepository

def test_observation_persistence_and_retrieval(tmp_path):
    data_dir = str(tmp_path)
    farm_id = "FARM-001"
    init_db(data_dir, farm_id)
    
    repo = ObservationRepository(data_dir, farm_id)
    
    obs = repo.add({
        "pond_id": "POND-01",
        "observation_type": "symptom_progression",
        "description": "Five fish swimming erratically at surface.",
        "reported_by": "Ramesh",
        "related_diagnosis_id": "DX-001"
    })
    
    obs_id = obs["observation_id"]
    assert obs_id.startswith("OBS-")
    assert obs["verification_status"] == "unverified"
    
    # Verify retrieval across separate repository instance (simulating restart)
    repo_after_restart = ObservationRepository(data_dir, farm_id)
    retrieved = repo_after_restart.get_by_id(obs_id)
    assert retrieved is not None
    assert retrieved["description"] == "Five fish swimming erratically at surface."
    assert retrieved["reported_by"] == "Ramesh"
    assert retrieved["related_diagnosis_id"] == "DX-001"

def test_observation_listing(tmp_path):
    data_dir = str(tmp_path)
    farm_id = "FARM-001"
    init_db(data_dir, farm_id)
    
    repo = ObservationRepository(data_dir, farm_id)
    repo.add({"description": "First observation", "timestamp": "2026-10-01T10:00:00Z"})
    repo.add({"description": "Second observation", "timestamp": "2026-10-02T10:00:00Z"})
    
    items = repo.list_observations()
    assert len(items) == 2
    # newest first
    assert items[0]["description"] == "Second observation"

