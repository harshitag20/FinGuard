import logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from control_plane.config import config
from control_plane.models.db import init_control_plane_db, seed_control_plane_if_empty
from control_plane.routes import health, farms, agents, messages

logging.basicConfig(level=getattr(logging, config.log_level.upper(), logging.INFO))
logger = logging.getLogger("control_plane")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing FinGuard Control Plane...")
    init_control_plane_db()
    seed_file = Path(__file__).resolve().parent.parent / "data" / "seed" / "sample_farms.json"
    seed_control_plane_if_empty(seed_file)
    logger.info("FinGuard Control Plane ready.")
    yield
    logger.info("FinGuard Control Plane stopped.")

app = FastAPI(
    title="FinGuard Farm Agent - Control Plane",
    description="Central management, farm provisioning, and message routing for Maritime.sh farm agents.",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(health.router)
app.include_router(farms.router)
app.include_router(agents.router)
app.include_router(messages.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("control_plane.main:app", host="0.0.0.0", port=config.port, reload=False)

