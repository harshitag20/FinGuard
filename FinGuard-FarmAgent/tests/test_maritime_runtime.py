import os
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from agent_runtime.main import app
from agent_runtime.config import config

def test_maritime_contract_health():
    with TestClient(app) as client:
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "farm_id" in data

def test_maritime_contract_chat_payload():
    with TestClient(app) as client:
        # Standard Maritime chat payload
        payload = {
            "message": "Hello, confirm you are alive and tell me your farm ID.",
            "source": "cli"
        }
        mock_reply = {
            "response": f"Hello, I am active for farm {config.farm_id}.",
            "farm_id": config.farm_id,
            "tools_used": []
        }
        with patch("agent_runtime.core.agent.FinGuardAgent.chat", new_callable=AsyncMock) as mock_chat:
            mock_chat.return_value = mock_reply
            resp = client.post("/chat", json=payload)
            assert resp.status_code == 200
            data = resp.json()
            # Maritime requires 'response' field or plain text
            assert "response" in data
            assert config.farm_id in data["response"]

def test_runtime_data_directory_configured():
    assert os.path.exists(config.data_dir)
    assert os.path.isdir(config.data_dir)
