import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from agent_runtime.main import app
from agent_runtime.core.tool_tracker import ToolExecutionTracker

def test_tool_execution_tracker_recording():
    tracker = ToolExecutionTracker()
    tracker.record_execution("list_diagnostic_history", {"farm_id": "FARM-001"}, status="success")
    tracker.record_execution("get_farm_profile", {"farm_id": "FARM-001", "api_key": "secret123"}, status="success")
    
    assert len(tracker.executions) == 2
    assert tracker.tool_names == ["list_diagnostic_history", "get_farm_profile"]
    
    # Check argument sanitization
    secret_record = tracker.executions[1]
    assert secret_record["args"]["api_key"] == "[REDACTED]"
    assert secret_record["args"]["farm_id"] == "FARM-001"

def test_agent_chat_returns_actual_tool_metadata():
    with TestClient(app) as client:
        # Simulate tool execution through the chat endpoint
        from agent_runtime.core.agent import FinGuardAgent
        
        # Test tool registry tracking directly
        from agent_runtime.main import tool_registry
        tracker = ToolExecutionTracker()
        tools = tool_registry.get_tool_functions(tracker=tracker)
        
        # Invoke a tool function directly as Gemini would
        list_tool = next(t for t in tools if t.__name__ == "list_diagnostic_history")
        res = list_tool("FARM-001")
        
        assert "DX-001" in res
        assert tracker.tool_names == ["list_diagnostic_history"]
        assert len(tracker.executions) == 1
        assert tracker.executions[0]["status"] == "success"

def test_chat_response_tools_used_field():
    with TestClient(app) as client:
        # Using mock client response to verify tools_used mapping
        mock_response = MagicMock()
        mock_response.text = "I retrieved the diagnostic history for your farm."
        
        def fake_generate_content(*args, **kwargs):
            # Gemini triggers tool
            tools = kwargs.get("config").tools
            diag_tool = next(t for t in tools if t.__name__ == "list_diagnostic_history")
            diag_tool("FARM-001")
            return mock_response

        with patch("google.genai.models.Models.generate_content", side_effect=fake_generate_content):
            resp = client.post("/chat", json={
                "message": "Summarize my diagnostic reports",
                "farm_id": "FARM-001"
            })
            assert resp.status_code == 200
            data = resp.json()
            assert "list_diagnostic_history" in data["tools_used"]
            assert len(data["metadata"]["tool_executions"]) >= 1
            assert data["metadata"]["tool_executions"][0]["tool"] == "list_diagnostic_history"

