import json
import sqlite3
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
from control_plane.config import config
from shared.contracts.farm import FarmContract, FarmCreateRequest
from shared.contracts.observation import ObservationCreateRequest

logger = logging.getLogger("control_plane.farm_service")

class FarmService:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or config.db_path

    def register_farm(self, req: FarmCreateRequest) -> Dict[str, Any]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT farm_id FROM farms WHERE farm_id = ?", (req.farm_id,))
            if cursor.fetchone():
                raise ValueError(f"Farm with ID '{req.farm_id}' already registered.")
            
            created_at = datetime.now(timezone.utc).isoformat()
            baseline = req.environmental_baseline.model_dump() if req.environmental_baseline else {}
            
            cursor.execute("""
            INSERT INTO farms
            (farm_id, name, location, species_profile, ponds, environmental_baseline, provisioning_status, created_at, data_source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                req.farm_id,
                req.name,
                req.location,
                json.dumps([s.model_dump() for s in req.species_profile]),
                json.dumps([p.model_dump() for p in req.ponds]),
                json.dumps(baseline),
                "unprovisioned",
                created_at,
                "mock"
            ))
            conn.commit()
            
        return self.get_farm(req.farm_id)

    def get_farm(self, farm_id: str) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM farms WHERE farm_id = ?", (farm_id,))
            row = cursor.fetchone()
            if not row:
                return None
            data = dict(row)
            data["species_profile"] = json.loads(data["species_profile"])
            data["ponds"] = json.loads(data["ponds"])
            data["environmental_baseline"] = json.loads(data["environmental_baseline"])
            return data

    def list_farms(self) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM farms ORDER BY created_at ASC")
            results = []
            for row in cursor.fetchall():
                data = dict(row)
                data["species_profile"] = json.loads(data["species_profile"])
                data["ponds"] = json.loads(data["ponds"])
                data["environmental_baseline"] = json.loads(data["environmental_baseline"])
                results.append(data)
            return results

    def get_diagnostics(self, farm_id: str) -> List[Dict[str, Any]]:
        # Connect to the agent storage directly or via runtime
        from agent_runtime.storage.database import init_db, seed_database_if_empty
        from agent_runtime.storage.repositories import DiagnosticRepository
        from agent_runtime.config import config as runtime_config
        
        # Ensure farm db is initialized and seeded
        seed_dir = Path(__file__).resolve().parent.parent / "data" / "seed"
        init_db(runtime_config.data_dir, farm_id)
        seed_database_if_empty(runtime_config.data_dir, farm_id, seed_dir)
        
        repo = DiagnosticRepository(runtime_config.data_dir, farm_id)
        return repo.list_history()

    def get_observations(self, farm_id: str) -> List[Dict[str, Any]]:
        from agent_runtime.storage.database import init_db, seed_database_if_empty
        from agent_runtime.storage.repositories import ObservationRepository
        from agent_runtime.config import config as runtime_config
        
        seed_dir = Path(__file__).resolve().parent.parent / "data" / "seed"
        init_db(runtime_config.data_dir, farm_id)
        seed_database_if_empty(runtime_config.data_dir, farm_id, seed_dir)
        
        repo = ObservationRepository(runtime_config.data_dir, farm_id)
        return repo.list_observations()

    def create_observation(self, farm_id: str, obs: ObservationCreateRequest) -> Dict[str, Any]:
        from agent_runtime.storage.repositories import ObservationRepository
        from agent_runtime.config import config as runtime_config
        repo = ObservationRepository(runtime_config.data_dir, farm_id)
        data = obs.model_dump()
        data["farm_id"] = farm_id
        return repo.add(data)

    def get_health_summary(self, farm_id: str) -> Dict[str, Any]:
        from agent_runtime.storage.repositories import (
            FarmRepository, DiagnosticRepository, ObservationRepository, WaterQualityRepository, ResearchRepository, MemoryRepository
        )
        from agent_runtime.tools.farm_tools import FarmToolHandler
        from agent_runtime.config import config as runtime_config
        handler = FarmToolHandler(
            farm_id=farm_id,
            farm_repo=FarmRepository(runtime_config.data_dir, farm_id),
            diag_repo=DiagnosticRepository(runtime_config.data_dir, farm_id),
            obs_repo=ObservationRepository(runtime_config.data_dir, farm_id),
            wq_repo=WaterQualityRepository(runtime_config.data_dir, farm_id),
            research_repo=ResearchRepository(runtime_config.data_dir, farm_id),
            mem_repo=MemoryRepository(runtime_config.data_dir, farm_id)
        )
        return handler.generate_farm_health_summary(farm_id)
