import os
import json
import sqlite3
from pathlib import Path
import logging

logger = logging.getLogger("storage.database")

def get_db_path(data_dir: str, farm_id: str) -> Path:
    base = Path(data_dir)
    base.mkdir(parents=True, exist_ok=True)
    return base / f"farm_{farm_id}.db"

def init_db(data_dir: str, farm_id: str):
    db_path = get_db_path(data_dir, farm_id)
    logger.info(f"Initializing SQLite database at: {db_path} for farm {farm_id}")
    
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        
        # Farm Profile table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS farm_profile (
            farm_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            location TEXT NOT NULL,
            species_profile TEXT NOT NULL,
            ponds TEXT NOT NULL,
            environmental_baseline TEXT NOT NULL,
            maritime_agent_id TEXT,
            provisioning_status TEXT,
            created_at TEXT,
            data_source TEXT DEFAULT 'mock'
        );
        """)
        
        # Diagnostics table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS diagnostics (
            diagnosis_id TEXT PRIMARY KEY,
            farm_id TEXT NOT NULL,
            species TEXT NOT NULL,
            pond_id TEXT,
            suspected_disease TEXT NOT NULL,
            pathogen_candidate TEXT,
            confidence TEXT,
            observed_symptoms TEXT,
            differential_diagnoses TEXT,
            water_quality_context TEXT,
            verification_status TEXT,
            verification_notes TEXT,
            created_at TEXT NOT NULL,
            data_source TEXT DEFAULT 'mock'
        );
        """)
        
        # Observations table with Outbox & Central Sync support
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS observations (
            observation_id TEXT PRIMARY KEY,
            farm_id TEXT NOT NULL,
            pond_id TEXT,
            observation_type TEXT,
            description TEXT NOT NULL,
            reported_by TEXT,
            timestamp TEXT NOT NULL,
            source TEXT,
            related_diagnosis_id TEXT,
            verification_status TEXT,
            data_source TEXT DEFAULT 'mock',
            sync_status TEXT DEFAULT 'pending',
            idempotency_key TEXT,
            central_id TEXT,
            central_committed_at TEXT,
            sync_attempts INTEGER DEFAULT 0,
            max_sync_retries INTEGER DEFAULT 5,
            last_sync_error TEXT
        );
        """)
        
        # Safe migration for existing observations table
        cursor.execute("PRAGMA table_info(observations)")
        obs_cols = [row[1] for row in cursor.fetchall()]
        if "sync_status" not in obs_cols:
            cursor.execute("ALTER TABLE observations ADD COLUMN sync_status TEXT DEFAULT 'pending'")
        if "idempotency_key" not in obs_cols:
            cursor.execute("ALTER TABLE observations ADD COLUMN idempotency_key TEXT")
        if "central_id" not in obs_cols:
            cursor.execute("ALTER TABLE observations ADD COLUMN central_id TEXT")
        if "central_committed_at" not in obs_cols:
            cursor.execute("ALTER TABLE observations ADD COLUMN central_committed_at TEXT")
        if "sync_attempts" not in obs_cols:
            cursor.execute("ALTER TABLE observations ADD COLUMN sync_attempts INTEGER DEFAULT 0")
        if "max_sync_retries" not in obs_cols:
            cursor.execute("ALTER TABLE observations ADD COLUMN max_sync_retries INTEGER DEFAULT 5")
        if "last_sync_error" not in obs_cols:
            cursor.execute("ALTER TABLE observations ADD COLUMN last_sync_error TEXT")

        # Water Quality table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS water_quality (
            reading_id TEXT PRIMARY KEY,
            farm_id TEXT NOT NULL,
            pond_id TEXT,
            temperature_celsius REAL,
            dissolved_oxygen_mg_l REAL,
            ph REAL,
            unionized_ammonia_mg_l REAL,
            alkalinity_mg_l REAL,
            turbidity_ntu REAL,
            timestamp TEXT NOT NULL,
            data_source TEXT DEFAULT 'mock_sensor'
        );
        """)
        
        # Research Tasks table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS research_tasks (
            research_task_id TEXT PRIMARY KEY,
            farm_id TEXT NOT NULL,
            related_diagnosis_id TEXT,
            research_question TEXT NOT NULL,
            status TEXT NOT NULL,
            findings TEXT,
            sources TEXT,
            created_at TEXT NOT NULL,
            started_at TEXT,
            completed_at TEXT,
            failed_at TEXT,
            retry_count INTEGER DEFAULT 0,
            max_retries INTEGER DEFAULT 3,
            error_message TEXT,
            execution_lock TEXT,
            last_heartbeat_at TEXT
        );
        """)

        # Safe migration for research_tasks
        cursor.execute("PRAGMA table_info(research_tasks)")
        task_cols = [row[1] for row in cursor.fetchall()]
        if "started_at" not in task_cols:
            cursor.execute("ALTER TABLE research_tasks ADD COLUMN started_at TEXT")
        if "failed_at" not in task_cols:
            cursor.execute("ALTER TABLE research_tasks ADD COLUMN failed_at TEXT")
        if "retry_count" not in task_cols:
            cursor.execute("ALTER TABLE research_tasks ADD COLUMN retry_count INTEGER DEFAULT 0")
        if "max_retries" not in task_cols:
            cursor.execute("ALTER TABLE research_tasks ADD COLUMN max_retries INTEGER DEFAULT 3")
        if "error_message" not in task_cols:
            cursor.execute("ALTER TABLE research_tasks ADD COLUMN error_message TEXT")
        if "execution_lock" not in task_cols:
            cursor.execute("ALTER TABLE research_tasks ADD COLUMN execution_lock TEXT")
        if "last_heartbeat_at" not in task_cols:
            cursor.execute("ALTER TABLE research_tasks ADD COLUMN last_heartbeat_at TEXT")
        
        # Memory Items table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS memory_items (
            memory_id TEXT PRIMARY KEY,
            farm_id TEXT NOT NULL,
            category TEXT NOT NULL,
            content TEXT NOT NULL,
            source TEXT,
            timestamp TEXT NOT NULL
        );
        """)
        
        conn.commit()

def get_conversations_db_path(data_dir: str) -> Path:
    base = Path(data_dir)
    base.mkdir(parents=True, exist_ok=True)
    return base / "conversations.db"

def init_conversations_db(data_dir: str):
    db_path = get_conversations_db_path(data_dir)
    logger.info(f"Initializing Conversations database at: {db_path}")
    with sqlite3.connect(db_path) as conn:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout=5000;")
        cursor = conn.cursor()
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            conversation_id TEXT PRIMARY KEY,
            farm_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            last_activity_at TEXT NOT NULL,
            metadata TEXT
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversations_farm ON conversations(farm_id);")
        conn.commit()

def seed_database_if_empty(data_dir: str, farm_id: str, seed_dir: Path):
    db_path = get_db_path(data_dir, farm_id)
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        
        # Check if farm_profile has this farm
        cursor.execute("SELECT COUNT(*) FROM farm_profile WHERE farm_id = ?", (farm_id,))
        if cursor.fetchone()[0] == 0:
            # Seed farm
            farms_file = seed_dir / "sample_farms.json"
            if farms_file.exists():
                with open(farms_file, "r", encoding="utf-8") as f:
                    farms = json.load(f)
                    for fm in farms:
                        if fm.get("farm_id") == farm_id:
                            cursor.execute("""
                            INSERT INTO farm_profile 
                            (farm_id, name, location, species_profile, ponds, environmental_baseline, maritime_agent_id, provisioning_status, created_at, data_source)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                fm["farm_id"],
                                fm["name"],
                                fm["location"],
                                json.dumps(fm.get("species_profile", [])),
                                json.dumps(fm.get("ponds", [])),
                                json.dumps(fm.get("environmental_baseline", {})),
                                fm.get("maritime_agent_id"),
                                fm.get("provisioning_status", "provisioned"),
                                fm.get("created_at"),
                                fm.get("data_source", "mock")
                            ))
        
        # Check if diagnostics has records
        cursor.execute("SELECT COUNT(*) FROM diagnostics WHERE farm_id = ?", (farm_id,))
        if cursor.fetchone()[0] == 0:
            diag_file = seed_dir / "sample_diagnostics.json"
            if diag_file.exists():
                with open(diag_file, "r", encoding="utf-8") as f:
                    diags = json.load(f)
                    for d in diags:
                        if d.get("farm_id") == farm_id:
                            cursor.execute("""
                            INSERT INTO diagnostics
                            (diagnosis_id, farm_id, species, pond_id, suspected_disease, pathogen_candidate, confidence, observed_symptoms, differential_diagnoses, water_quality_context, verification_status, verification_notes, created_at, data_source)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                d["diagnosis_id"],
                                d["farm_id"],
                                d["species"],
                                d.get("pond_id"),
                                d["suspected_disease"],
                                d.get("pathogen_candidate"),
                                d.get("confidence", "moderate"),
                                json.dumps(d.get("observed_symptoms", [])),
                                json.dumps(d.get("differential_diagnoses", [])),
                                json.dumps(d.get("water_quality_context", {})),
                                d.get("verification_status", "pending"),
                                d.get("verification_notes"),
                                d["created_at"],
                                d.get("data_source", "mock")
                            ))
        
        # Check observations
        cursor.execute("SELECT COUNT(*) FROM observations WHERE farm_id = ?", (farm_id,))
        if cursor.fetchone()[0] == 0:
            obs_file = seed_dir / "sample_observations.json"
            if obs_file.exists():
                with open(obs_file, "r", encoding="utf-8") as f:
                    obs = json.load(f)
                    for o in obs:
                        if o.get("farm_id") == farm_id:
                            cursor.execute("""
                            INSERT INTO observations
                            (observation_id, farm_id, pond_id, observation_type, description, reported_by, timestamp, source, related_diagnosis_id, verification_status, data_source, sync_status, central_committed_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)
                            """, (
                                o["observation_id"],
                                o["farm_id"],
                                o.get("pond_id"),
                                o.get("observation_type", "general"),
                                o["description"],
                                o.get("reported_by", "Farmer"),
                                o["timestamp"],
                                o.get("source", "farmer_direct_input"),
                                o.get("related_diagnosis_id"),
                                o.get("verification_status", "unverified"),
                                o.get("data_source", "mock"),
                                o["timestamp"]
                            ))
        
        # Check water quality
        cursor.execute("SELECT COUNT(*) FROM water_quality WHERE farm_id = ?", (farm_id,))
        if cursor.fetchone()[0] == 0:
            wq_file = seed_dir / "sample_water_quality.json"
            if wq_file.exists():
                with open(wq_file, "r", encoding="utf-8") as f:
                    wqs = json.load(f)
                    for w in wqs:
                        if w.get("farm_id") == farm_id:
                            cursor.execute("""
                            INSERT INTO water_quality
                            (reading_id, farm_id, pond_id, temperature_celsius, dissolved_oxygen_mg_l, ph, unionized_ammonia_mg_l, alkalinity_mg_l, turbidity_ntu, timestamp, data_source)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                w["reading_id"],
                                w["farm_id"],
                                w.get("pond_id"),
                                w.get("temperature_celsius"),
                                w.get("dissolved_oxygen_mg_l"),
                                w.get("ph"),
                                w.get("unionized_ammonia_mg_l"),
                                w.get("alkalinity_mg_l"),
                                w.get("turbidity_ntu"),
                                w["timestamp"],
                                w.get("data_source", "mock_sensor")
                            ))
                            
        conn.commit()
