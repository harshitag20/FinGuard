import uuid
from fastapi.testclient import TestClient
from control_plane.main import app

def test_control_plane_health():
    with TestClient(app) as client:
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

def test_farm_registration_and_retrieval():
    with TestClient(app) as client:
        dynamic_farm_id = f"FARM-TEST-{uuid.uuid4().hex[:6].upper()}"
        new_farm = {
            "farm_id": dynamic_farm_id,
            "name": "Sundarbans Brackish Water Farm",
            "location": "Canning, West Bengal",
            "species_profile": [
                {
                    "common_name": "Black Tiger Shrimp",
                    "scientific_name": "Penaeus monodon",
                    "stocking_density_per_m2": 10.0,
                    "life_stage": "Post-larvae to sub-adult"
                }
            ],
            "ponds": [
                {
                    "pond_id": "POND-BW1",
                    "area_hectares": 1.5,
                    "average_depth_meters": 1.2,
                    "primary_species": "Black Tiger Shrimp",
                    "aeration_installed": True
                }
            ]
        }
        create_resp = client.post("/api/farms", json=new_farm)
        assert create_resp.status_code == 201
        
        get_resp = client.get(f"/api/farms/{dynamic_farm_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["name"] == "Sundarbans Brackish Water Farm"

def test_farm_isolation_on_api():
    with TestClient(app) as client:
        # Requesting non-existent farm returns 404
        resp = client.get("/api/farms/FARM-NONEXISTENT")
        assert resp.status_code == 404
        
        # Diagnostics for FARM-001 vs FARM-002 are isolated
        f1_diags = client.get("/api/farms/FARM-001/diagnostics").json()
        f2_diags = client.get("/api/farms/FARM-002/diagnostics").json()
        
        f1_ids = {d["diagnosis_id"] for d in f1_diags}
        f2_ids = {d["diagnosis_id"] for d in f2_diags}
        
        # Strict separation: intersection must be empty
        assert len(f1_ids.intersection(f2_ids)) == 0
