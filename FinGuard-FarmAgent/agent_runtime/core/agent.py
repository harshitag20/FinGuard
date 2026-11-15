import logging
from typing import Dict, Any, List, Optional
from google import genai
from google.genai import types
from agent_runtime.config import config
from agent_runtime.core.prompts import get_system_prompt
from agent_runtime.core.tool_registry import ToolRegistry
from agent_runtime.core.tool_tracker import ToolExecutionTracker
from agent_runtime.security.tenant_isolation import validate_farm_access

logger = logging.getLogger("core.agent")

class FinGuardAgent:
    def __init__(self, tool_registry: ToolRegistry, farm_id: str):
        self.tool_registry = tool_registry
        self.farm_id = farm_id
        self.client = None
        if config.gemini_api_key:
            self.client = genai.Client(api_key=config.gemini_api_key)
        else:
            logger.warning("No GEMINI_API_KEY set. Agent will operate in deterministic mock mode.")
            
        # Cache farm profile for system instructions
        profile_res = self.tool_registry.handler.get_farm_profile(farm_id)
        profile = profile_res.get("farm_profile", {})
        self.farm_name = profile.get("name", f"Farm {farm_id}")
        self.species = profile.get("species_profile", [])
        self.system_prompt = get_system_prompt(self.farm_id, self.farm_name, self.species)

    async def chat(self, message: str, farm_id: Optional[str] = None, conversation_id: Optional[str] = None) -> Dict[str, Any]:
        """Process incoming chat query for this farm."""
        # 1. Enforce tenant isolation
        if farm_id:
            validate_farm_access(farm_id, self.farm_id)
            
        logger.info(f"Processing chat message for farm {self.farm_id}: {message[:60]}")
        
        tracker = ToolExecutionTracker()

        # If client not initialized or no key, return structured fallback
        if not self.client:
            return {
                "response": (
                    f"[Notice: Running without live Gemini API key] Received query for farm {self.farm_id}: '{message}'. "
                    "Farm records and tools are operational."
                ),
                "farm_id": self.farm_id,
                "tools_used": [],
                "metadata": {
                    "tool_executions": [],
                    "dispatch_mode": "mock_no_key"
                }
            }

        try:
            tools = self.tool_registry.get_tool_functions(tracker=tracker)
            gen_config = types.GenerateContentConfig(
                system_instruction=self.system_prompt,
                tools=tools,
                temperature=0.2
            )
            
            # Call Gemini
            response = self.client.models.generate_content(
                model=config.gemini_model,
                contents=message,
                config=gen_config
            )
            
            reply_text = response.text or "I processed your request using the farm records."
            
            # Application-level tool tracking
            executed_tools = tracker.tool_names
            tool_records = tracker.executions

            # Also check if response has explicit function_calls not captured
            if hasattr(response, "function_calls") and response.function_calls:
                for fc in response.function_calls:
                    if fc.name not in executed_tools:
                        executed_tools.append(fc.name)
                        tool_records.append({
                            "tool": fc.name,
                            "args": dict(fc.args) if fc.args else {},
                            "status": "invoked_by_model"
                        })

            return {
                "response": reply_text.strip(),
                "farm_id": self.farm_id,
                "tools_used": executed_tools,
                "metadata": {
                    "tool_executions": tool_records,
                    "model": config.gemini_model,
                    "conversation_id": conversation_id
                }
            }
        except Exception as e:
            logger.error(f"Error during agent reasoning: {e}", exc_info=True)
            return {
                "response": f"I encountered an error retrieving or processing the farm intelligence records: {str(e)}",
                "farm_id": self.farm_id,
                "tools_used": tracker.tool_names,
                "metadata": {
                    "tool_executions": tracker.executions,
                    "error": str(e)
                },
                "error": str(e)
            }
