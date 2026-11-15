import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class AgentConfig(BaseSettings):
    farm_id: str = os.getenv("FARM_ID", "FARM-001")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    environment: str = os.getenv("ENVIRONMENT", "development")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    port: int = int(os.getenv("PORT", "8000"))
    
    # Persistent storage directory
    # On Maritime micro-VMs, /data is mounted. In local dev, fallback to ./data/runtime
    data_dir: str = os.getenv("DATA_DIR", "/data" if os.path.exists("/data") and os.access("/data", os.W_OK) else str(Path(__file__).resolve().parent.parent / "data" / "runtime"))

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

config = AgentConfig()

