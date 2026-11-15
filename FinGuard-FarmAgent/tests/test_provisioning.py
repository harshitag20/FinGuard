import pytest
from fastapi.testclient import TestClient
from control_plane.main import app

def test_agent_provisioning_idempotency():
    with TestClient(app) as client:
        # First provision call
        resp1 = client.post("/api/farms/FARM-001/provision")
        assert resp1.status_code == 200
        agent_id_1 = resp1.json()["maritime_agent_id"]
        
        # Second provision call (must return the exact same agent, avoiding duplicates)
        resp2 = client.post("/api/farms/FARM-001/provision")
        assert resp2.status_code == 200
        agent_id_2 = resp2.json()["maritime_agent_id"]
        
        assert agent_id_1 == agent_id_2

def test_get_provisioned_agent():
    with TestClient(app) as client:
        resp = client.get("/api/farms/FARM-001/agent")
        assert resp.status_code == 200
        data = resp.json()
        assert data["farm_id"] == "FARM-001"
        assert "maritime_agent_id" in data
        assert data["status"] == "active"

