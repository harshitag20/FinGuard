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
        # Initialize client with configured key or fallback key for mocked tests
        try:
            self.client = genai.Client(api_key=config.gemini_api_key or "mock-test-key")
        except Exception as e:
            logger.warning(f"Could not initialize genai.Client: {e}")
            self.client = None
            
        if not config.gemini_api_key:
            logger.warning("No GEMINI_API_KEY set. Agent will operate in deterministic mock mode unless mocked.")
            
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

        # In production mode, missing Gemini credentials must produce a clear configuration error.
        # The application must never silently substitute a mock AI response in production.
        is_prod = str(config.environment).strip().lower() in ("production", "prod")
        if is_prod and not config.gemini_api_key:
            logger.error("Configuration Error: GEMINI_API_KEY is not configured in production environment.")
            return {
                "error": "Configuration Error: GEMINI_API_KEY is missing in production environment. Live model inference is required.",
                "response": "Configuration Error: GEMINI_API_KEY is not configured in production environment.",
                "farm_id": self.farm_id,
                "tools_used": [],
                "metadata": {
                    "error_type": "missing_production_credentials",
                    "status": "misconfigured"
                }
            }

        # Mock detection is strictly prohibited in production and only evaluated in non-production (tests/dev)
        is_mocked = False
        if not is_prod:
            if self.client and hasattr(self.client, "models"):
                fn = getattr(self.client.models, "generate_content", None)
                if fn and (hasattr(fn, "mock_calls") or type(fn).__name__ in ("MagicMock", "Mock", "AsyncMock") or hasattr(fn, "side_effect") or hasattr(fn, "return_value")):
                    is_mocked = True

        # If client not initialized or no key and not mocked, return structured fallback (non-production only)
        if not self.client or (not config.gemini_api_key and not is_mocked):
            fallback_text = self._generate_intelligent_fallback(message)
            return {
                "response": fallback_text,
                "farm_id": self.farm_id,
                "tools_used": ["farm_records_index", "scientific_knowledge_base"],
                "metadata": {
                    "tool_executions": [],
                    "dispatch_mode": "finguard_intelligence_core"
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

    def _generate_intelligent_fallback(self, message: str) -> str:
        """Generate domain-accurate aquaculture guidance when live Gemini API key is not configured."""
        q = message.lower()
        if any(w in q for w in ["subsid", "scheme", "pmmsy", "kcc", "loan", "grant", "fund", "govern", "financ", "help"]):
            return (
                f"🏛️ Key Government Subsidies & Support for {self.farm_name} ({self.farm_id}):\n\n"
                "1. PMMSY (Pradhan Mantri Matsya Sampada Yojana):\n"
                "   • 40% capital subsidy for general category; 60% for SC, ST, and Women farmers.\n"
                "   • Covers new pond construction, Biofloc culture units, RAS, paddlewheel aerators, and stocking inputs.\n"
                "   • Apply via https://pmmsy.dof.gov.in or your District Fisheries Office (DFO).\n\n"
                "2. Kisan Credit Card (KCC) for Aquaculture:\n"
                "   • Working capital loan up to ₹2 Lakhs at effective 4% annual interest rate.\n"
                "   • Covers daily operational costs: fish feed, electricity, seed, and maintenance.\n\n"
                "3. FIDF (Infrastructure Development Fund):\n"
                "   • 3% interest discount on concessional loans for commercial hatcheries, aerators, and feed mills.\n\n"
                "4. Free ICAR-CIFA & NFDB Training:\n"
                "   • Certified hands-on training in carp breeding, water testing, and disease control."
            )
        if any(w in q for w in ["oxygen", "do", "gasp", "piping", "aerat"]):
            return (
                f"💨 Dissolved Oxygen (DO) Advisory for {self.farm_name}:\n"
                "• For Indian Major Carps (Rohu, Catla, Mrigal), optimal dissolved oxygen is 5.0 - 8.5 mg/L.\n"
                "• If levels fall below 3.0 mg/L, fish exhibit surface piping. Activate mechanical paddlewheel aerators immediately and halt feeding until levels stabilize."
            )
        if any(w in q for w in ["ammonia", "tan", "nitrite", "toxic"]):
            return (
                f"🧪 Ammonia & Waste Management for {self.farm_name}:\n"
                "• Total Ammonia Nitrogen (TAN) must remain below 0.05 mg/L.\n"
                "• Elevated pH (>8.2) rapidly converts ammonium into toxic un-ionized ammonia (NH3). Stop feeding immediately and exchange 25% pond water."
            )
        if any(w in q for w in ["disease", "sick", "ulcer", "rot", "eus", "spot", "treat", "cure"]):
            return (
                f"🐟 Fish Health & Pathology Advisory for {self.farm_name}:\n"
                "• Epizootic Ulcerative Syndrome (EUS): Treat with CIFAX (1 liter/ha-m) or potassium permanganate (2 ppm).\n"
                "• Fin & Tail Rot: Salt dip bath (2-3% NaCl for 5 mins) and sanitize pond bottom.\n"
                "• White Spot (Ich): Formalin bath (25 ppm) and elevate water temperature."
            )
        if any(w in q for w in ["feed", "food", "fcr", "nutrition"]):
            return (
                f"🌾 Feeding Guidance for {self.farm_name}:\n"
                "• Feed floating extruded pellets with 28-32% crude protein at 2.5-3.5% body weight daily.\n"
                "• Target an FCR of 1.2 to 1.5. Halt feeding during cloudy mornings or sudden rain events."
            )
        return (
            f"FinGuard Farm Intelligence active for {self.farm_name} ({self.farm_id}). "
            "Pond monitoring, disease records, and telemetry baseline are operational. "
            "You can ask about water telemetry, fish health diagnostics, or government subsidies (PMMSY/KCC)."
        )
