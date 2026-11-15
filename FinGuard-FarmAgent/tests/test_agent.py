import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from agent_runtime.main import app

def test_agent_chat_diagnostic_query():
    with TestClient(app) as client:
        # Mock Gemini response that calls tools and returns findings
        mock_response = MagicMock()
        mock_response.text = (
            "Based on the [VERIFIED LAB/FIELD RECORDS] for FARM-001, previous health incidents include "
            "DX-001 (Bacterial Fin and Tail Rot in Rohu) and DX-002 (Epizootic Ulcerative Syndrome in Catla)."
        )
        
        with patch("google.genai.models.Models.generate_content", return_value=mock_response):
            resp = client.post("/chat", json={
                "message": "Summarize previous health incidents on my farm.",
                "farm_id": "FARM-001"
            })
            assert resp.status_code == 200
            data = resp.json()
            assert "response" in data
            text = data["response"].lower()
            assert any(term in text for term in ["rohu", "catla", "fin rot", "eus", "verified", "dx-001"])

def test_agent_chat_missing_data_handling():
    with TestClient(app) as client:
        mock_response = MagicMock()
        mock_response.text = (
            "Based on [VERIFIED LAB/FIELD RECORDS] for FARM-001, there is no historical record "
            "or documented case of Viral Nervous Necrosis (VNN)."
        )
        
        with patch("google.genai.models.Models.generate_content", return_value=mock_response):
            resp = client.post("/chat", json={
                "message": "Have I ever had Viral Nervous Necrosis (VNN) in my ponds?",
                "farm_id": "FARM-001"
            })
            assert resp.status_code == 200
            text = resp.json()["response"].lower()
            assert any(term in text for term in ["no historical", "no record", "no mention", "not found", "no history", "not documented"])

def test_agent_observation_saving():
    with TestClient(app) as client:
        # Test tool handler saving directly to verify persistence
        from agent_runtime.storage.repositories import ObservationRepository
        from agent_runtime.config import config
        repo = ObservationRepository(config.data_dir, "FARM-001")
        initial_count = len(repo.list_observations())
        
        obs_resp = client.post("/observations", json={
            "farm_id": "FARM-001",
            "pond_id": "POND-02",
            "observation_type": "symptom_progression",
            "description": "Two fish in Pond 2 have white patches on scales.",
            "reported_by": "Field Tech"
        })
        assert obs_resp.status_code == 200
        new_count = len(repo.list_observations())
        assert new_count == initial_count + 1
