import json
import sqlite3
from pathlib import Path
from typing import Dict, Any, Optional, List
from control_plane.config import config

def init_control_plane_db():
    db_file = Path(config.db_path)
    db_file.parent.mkdir(parents=True, exist_ok=True)
    
    with sqlite3.connect(db_file) as conn:
        cursor = conn.cursor()
        
        # Farms Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS farms (
            farm_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            location TEXT NOT NULL,
            species_profile TEXT NOT NULL,
            ponds TEXT NOT NULL,
            environmental_baseline TEXT NOT NULL,
            maritime_agent_id TEXT,
            provisioning_status TEXT NOT NULL DEFAULT 'unprovisioned',
            created_at TEXT NOT NULL,
            data_source TEXT DEFAULT 'mock'
        );
        """)
        
        # Agent Mappings Table (One farm -> One Maritime agent)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS agent_mappings (
            farm_id TEXT PRIMARY KEY,
            maritime_agent_id TEXT UNIQUE NOT NULL,
            external_id TEXT UNIQUE NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            last_message_at TEXT
        );
        """)
        conn.commit()

def seed_control_plane_if_empty(seed_file: Path):
    if not seed_file.exists():
        return
    with sqlite3.connect(config.db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM farms")
        if cursor.fetchone()[0] == 0:
            with open(seed_file, "r", encoding="utf-8") as f:
                farms = json.load(f)
                for farm in farms:
                    cursor.execute("""
                    INSERT INTO farms
                    (farm_id, name, location, species_profile, ponds, environmental_baseline, maritime_agent_id, provisioning_status, created_at, data_source)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        farm["farm_id"],
                        farm["name"],
                        farm["location"],
                        json.dumps(farm.get("species_profile", [])),
                        json.dumps(farm.get("ponds", [])),
                        json.dumps(farm.get("environmental_baseline", {})),
                        farm.get("maritime_agent_id"),
                        farm.get("provisioning_status", "unprovisioned"),
                        farm.get("created_at"),
                        farm.get("data_source", "mock")
                    ))
                    if farm.get("maritime_agent_id"):
                        cursor.execute("""
                        INSERT OR IGNORE INTO agent_mappings
                        (farm_id, maritime_agent_id, external_id, status, created_at)
                        VALUES (?, ?, ?, ?, ?)
                        """, (
                            farm["farm_id"],
                            farm["maritime_agent_id"],
                            f"farm_{farm['farm_id']}",
                            "active",
                            farm["created_at"]
                        ))
            conn.commit()

