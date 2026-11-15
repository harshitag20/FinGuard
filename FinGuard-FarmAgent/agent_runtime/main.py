import os
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, Query, status
from fastapi.responses import JSONResponse

from agent_runtime.config import config
from agent_runtime.storage.database import init_db, seed_database_if_empty
from agent_runtime.storage.repositories import (
    FarmRepository,
    DiagnosticRepository,
    ObservationRepository,
    WaterQualityRepository,
    ResearchRepository,
    MemoryRepository,
    ConversationRepository,
)
from agent_runtime.storage.central_sync import MockCentralFinGuardAdapter, CentralFinGuardApiAdapter, ObservationOutboxManager
from agent_runtime.research.research_manager import ResearchManager
from agent_runtime.tools.farm_tools import FarmToolHandler
from agent_runtime.core.tool_registry import ToolRegistry
from agent_runtime.core.agent import FinGuardAgent
from agent_runtime.security.tenant_isolation import validate_farm_access
from shared.contracts.agent import AgentChatMessage, AgentChatResponse
from shared.contracts.observation import ObservationCreateRequest

# Setup logging
logging.basicConfig(level=getattr(logging, config.log_level.upper(), logging.INFO))
logger = logging.getLogger("agent_runtime")

# Repositories & Agent instances
farm_repo = None
diag_repo = None
obs_repo = None
wq_repo = None
research_repo = None
mem_repo = None
conv_repo = None
research_manager = None
outbox_manager = None
tool_handler = None
tool_registry = None
agent_instance = None

def validate_conversation_farm(conversation_id: Optional[str], assigned_farm_id: str):
    """Enforces persistent conversation ownership across process restarts.
    Rejects any attempt to reuse a conversation ID bound to another farm with HTTP 403.
    """
    if not conversation_id:
        return
    if not conv_repo:
        logger.warning("Conversation repository not yet initialized; deferring conversation binding.")
        return
    
    is_valid = conv_repo.validate_or_bind(conversation_id, assigned_farm_id)
    if not is_valid:
        record = conv_repo.get_conversation(conversation_id)
        bound_farm = record.get("farm_id") if record else "another farm"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Conversation Isolation Violation: Conversation '{conversation_id}' belongs to farm '{bound_farm}', not '{assigned_farm_id}'."
        )

@asynccontextmanager
async def lifespan(app: FastAPI):
    global farm_repo, diag_repo, obs_repo, wq_repo, research_repo, mem_repo, conv_repo, research_manager, outbox_manager, tool_handler, tool_registry, agent_instance
    logger.info(f"Starting FinGuard Agent Runtime for Farm: {config.farm_id}")
    
    # 1. Initialize persistent SQLite database & conversation ownership storage
    init_db(config.data_dir, config.farm_id)
    
    # 2. Seed database if empty from data/seed
    seed_dir = Path(__file__).resolve().parent.parent / "data" / "seed"
    seed_database_if_empty(config.data_dir, config.farm_id, seed_dir)
    
    # 3. Initialize repositories
    farm_repo = FarmRepository(config.data_dir, config.farm_id)
    diag_repo = DiagnosticRepository(config.data_dir, config.farm_id)
    obs_repo = ObservationRepository(config.data_dir, config.farm_id)
    wq_repo = WaterQualityRepository(config.data_dir, config.farm_id)
    research_repo = ResearchRepository(config.data_dir, config.farm_id, seed_dir)
    mem_repo = MemoryRepository(config.data_dir, config.farm_id)
    conv_repo = ConversationRepository(config.data_dir)
    
    # 4. Research Manager & Outbox Manager
    research_manager = ResearchManager(repository=research_repo, model_id=config.gemini_model)
    central_adapter = MockCentralFinGuardAdapter() if config.environment == "development" else CentralFinGuardApiAdapter()
    outbox_manager = ObservationOutboxManager(obs_repo=obs_repo, central_adapter=central_adapter)

    # 5. Recover any interrupted research tasks from unexpected restart / sleep wakeup
    try:
        recovered = await research_manager.recover_interrupted_tasks()
        if recovered:
            logger.info(f"Recovered {len(recovered)} interrupted research tasks on startup.")
    except Exception as e:
        logger.error(f"Error during research recovery on startup: {e}")

    # 6. Tool handler & Registry
    tool_handler = FarmToolHandler(
        farm_id=config.farm_id,
        farm_repo=farm_repo,
        diag_repo=diag_repo,
        obs_repo=obs_repo,
        wq_repo=wq_repo,
        research_repo=research_repo,
        mem_repo=mem_repo,
        research_manager=research_manager
    )
    tool_registry = ToolRegistry(tool_handler)
    
    # 6. Gemini Agent
    agent_instance = FinGuardAgent(tool_registry=tool_registry, farm_id=config.farm_id)
    logger.info("FinGuard Agent Runtime initialized successfully.")
    
    yield
    logger.info("FinGuard Agent Runtime shutting down.")

app = FastAPI(
    title=f"FinGuard Farm Agent Runtime [{config.farm_id}]",
    description="Maritime.sh persistent custom agent runtime for aquaculture farm intelligence.",
    version="1.0.0",
    lifespan=lifespan
)

# Maritime Contract: Endpoint 1
@app.get("/health")
def health():
    """Maritime health check endpoint: Returns fast 200 OK without side effects."""
    return {
        "status": "ok",
        "service": "FinGuard-FarmAgent-Runtime",
        "farm_id": config.farm_id,
        "environment": config.environment
    }

# Maritime Contract: Endpoint 2
@app.post("/chat", response_model=AgentChatResponse)
async def chat(payload: AgentChatMessage):
    """Maritime chat endpoint: Accepts user messages, executes tools, and returns response within 30s."""
    if not agent_instance:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Agent runtime initializing")
    
    # 1. Enforce farm identity authorization
    if payload.farm_id:
        validate_farm_access(payload.farm_id, config.farm_id)

    # 2. Enforce conversation-ID farm isolation
    validate_conversation_farm(payload.conversation_id, config.farm_id)

    result = await agent_instance.chat(
        message=payload.message,
        farm_id=payload.farm_id,
        conversation_id=payload.conversation_id
    )

    if result.get("metadata", {}).get("error_type") == "missing_production_credentials":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("response", "Configuration Error: GEMINI_API_KEY missing in production.")
        )

    return AgentChatResponse(**result)

# Farm Data Endpoints for Control Plane Integration
@app.get("/farm")
def get_farm(farm_id: Optional[str] = Query(None)):
    if not tool_handler:
        raise HTTPException(status_code=503, detail="Initializing")
    if farm_id:
        validate_farm_access(farm_id, config.farm_id)
    return tool_handler.get_farm_profile(config.farm_id)

@app.get("/diagnostics")
def get_diagnostics(farm_id: Optional[str] = Query(None)):
    if not tool_handler:
        raise HTTPException(status_code=503, detail="Initializing")
    if farm_id:
        validate_farm_access(farm_id, config.farm_id)
    return tool_handler.list_diagnostic_history(config.farm_id)

@app.get("/observations")
def get_observations(farm_id: Optional[str] = Query(None)):
    if not tool_handler:
        raise HTTPException(status_code=503, detail="Initializing")
    if farm_id:
        validate_farm_access(farm_id, config.farm_id)
    return tool_handler.get_farmer_observations(config.farm_id)

@app.post("/observations")
def create_observation(obs: ObservationCreateRequest):
    if not tool_handler:
        raise HTTPException(status_code=503, detail="Initializing")
    # Strict Tenant Authorization on Observation Creation
    validate_farm_access(obs.farm_id, config.farm_id)
    return tool_handler.save_farmer_observation(
        description=obs.description,
        observation_type=obs.observation_type,
        pond_id=obs.pond_id,
        farm_id=obs.farm_id,
        reported_by=obs.reported_by or "Farmer",
        related_diagnosis_id=obs.related_diagnosis_id
    )

@app.post("/observations/sync")
async def sync_outbox():
    """Trigger outbox synchronization of pending observations to the central FinGuard backend."""
    if not outbox_manager:
        raise HTTPException(status_code=503, detail="Initializing")
    return await outbox_manager.flush_pending_observations()

@app.get("/health-summary")
def get_health_summary(farm_id: Optional[str] = Query(None)):
    if not tool_handler:
        raise HTTPException(status_code=503, detail="Initializing")
    if farm_id:
        validate_farm_access(farm_id, config.farm_id)
    return tool_handler.generate_farm_health_summary(config.farm_id)

# Research Management Endpoints
@app.post("/research")
def create_research_inquiry(payload: Dict[str, Any]):
    if not research_manager:
        raise HTTPException(status_code=503, detail="Initializing")
    question = payload.get("question")
    if not question:
        raise HTTPException(status_code=400, detail="Field 'question' is required.")
    related_dx = payload.get("related_diagnosis_id")
    return research_manager.create_task(question=question, related_diagnosis_id=related_dx)

@app.get("/research/{task_id}")
def get_research_inquiry(task_id: str):
    if not research_manager:
        raise HTTPException(status_code=503, detail="Initializing")
    task = research_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Research task '{task_id}' not found.")
    return task

@app.get("/research")
def list_research_inquiries():
    if not research_manager:
        raise HTTPException(status_code=503, detail="Initializing")
    return research_manager.list_tasks()

@app.post("/research/recover")
async def recover_research():
    """Manual or scheduled trigger to recover interrupted research tasks."""
    if not research_manager:
        raise HTTPException(status_code=503, detail="Initializing")
    return await research_manager.recover_interrupted_tasks()
