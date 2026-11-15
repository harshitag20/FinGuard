import pytest
from fastapi.testclient import TestClient
from agent_runtime.main import app, validate_conversation_farm
from agent_runtime.storage.repositories import ConversationRepository
from agent_runtime.storage.database import init_db
from agent_runtime.config import config

@pytest.fixture
def conv_repo(tmp_path):
    data_dir = str(tmp_path)
    init_db(data_dir, "FARM-001")
    return ConversationRepository(data_dir)

def test_conversation_persistence_across_restart(tmp_path):
    data_dir = str(tmp_path)
    conv_id = "conv-persistent-100"
    
    # 1. First run: bind conversation to FARM-001
    repo1 = ConversationRepository(data_dir)
    res = repo1.validate_or_bind(conv_id, "FARM-001")
    assert res is True
    
    # Verify saved
    conv1 = repo1.get_conversation(conv_id)
    assert conv1 is not None
    assert conv1["farm_id"] == "FARM-001"
    
    # 2. Simulate runtime restart by creating a completely new repository instance
    repo2 = ConversationRepository(data_dir)
    conv2 = repo2.get_conversation(conv_id)
    assert conv2 is not None
    assert conv2["farm_id"] == "FARM-001"
    
    # Same farm can continue conversation
    assert repo2.validate_or_bind(conv_id, "FARM-001") is True

def test_foreign_conversation_id_rejection(tmp_path):
    data_dir = str(tmp_path)
    conv_id = "conv-isolated-200"
    
    # Conversation is created by FARM-001
    repo = ConversationRepository(data_dir)
    assert repo.validate_or_bind(conv_id, "FARM-001") is True
    
    # An agent for FARM-002 attempts to use the same conversation ID
    assert repo.validate_or_bind(conv_id, "FARM-002") is False

def test_concurrent_conversations_separate_farms(tmp_path):
    data_dir = str(tmp_path)
    repo = ConversationRepository(data_dir)
    
    # Separate conversations for different farms
    assert repo.validate_or_bind("conv-f1-001", "FARM-001") is True
    assert repo.validate_or_bind("conv-f2-001", "FARM-002") is True
    assert repo.validate_or_bind("conv-f1-002", "FARM-001") is True
    assert repo.validate_or_bind("conv-f2-002", "FARM-002") is True
    
    # Re-validate ownership
    assert repo.validate_or_bind("conv-f1-001", "FARM-001") is True
    assert repo.validate_or_bind("conv-f2-001", "FARM-002") is True
    assert repo.validate_or_bind("conv-f1-001", "FARM-002") is False
    assert repo.validate_or_bind("conv-f2-001", "FARM-001") is False

def test_api_conversation_id_rejection_http_403(monkeypatch, tmp_path):
    data_dir = str(tmp_path)
    farm_id = "FARM-001"
    init_db(data_dir, farm_id)
    
    # Bind conv-hijack-test to FARM-002 in storage
    shared_repo = ConversationRepository(data_dir)
    shared_repo.validate_or_bind("conv-hijack-test", "FARM-002")
    
    # Configure main app to point to this data_dir for FARM-001
    monkeypatch.setattr(config, "data_dir", data_dir)
    monkeypatch.setattr(config, "farm_id", "FARM-001")
    
    with TestClient(app) as client:
        # Request with a conversation ID belonging to FARM-002 must return 403
        resp = client.post("/chat", json={
            "farm_id": "FARM-001",
            "message": "Summarize history",
            "conversation_id": "conv-hijack-test"
        })
        assert resp.status_code == 403
        assert "Conversation Isolation Violation" in resp.json()["detail"]

