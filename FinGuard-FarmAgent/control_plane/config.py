import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class ControlPlaneConfig(BaseSettings):
    maritime_api_key: str = os.getenv("MARITIME_API_KEY", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    environment: str = os.getenv("ENVIRONMENT", "development")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    port: int = int(os.getenv("CONTROL_PLANE_PORT", "8080"))
    
    # Storage for control plane SQLite db
    db_path: str = os.getenv("CONTROL_PLANE_DB", str(Path(__file__).resolve().parent.parent / "data" / "control_plane.db"))
    
    # Template to use for cloud agents on Maritime
    maritime_agent_template: str = os.getenv("MARITIME_AGENT_TEMPLATE", "openclaw")
    
    # Execution mode: "local" (dispatches to agent_runtime directly or local endpoint) or "maritime" (dispatches to api.maritime.sh)
    agent_dispatch_mode: str = os.getenv("AGENT_DISPATCH_MODE", "local")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

config = ControlPlaneConfig()

