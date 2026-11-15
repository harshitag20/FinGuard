import json
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pathlib import Path
from agent_runtime.storage.database import get_db_path, get_conversations_db_path, init_conversations_db

class FarmRepository:
    def __init__(self, data_dir: str, farm_id: str):
        self.db_path = get_db_path(data_dir, farm_id)
        self.farm_id = farm_id

    def get_profile(self) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM farm_profile WHERE farm_id = ?", (self.farm_id,))
            row = cursor.fetchone()
            if not row:
                return None
            data = dict(row)
            data["species_profile"] = json.loads(data["species_profile"])
            data["ponds"] = json.loads(data["ponds"])
            data["environmental_baseline"] = json.loads(data["environmental_baseline"])
            return data

class DiagnosticRepository:
    def __init__(self, data_dir: str, farm_id: str):
        self.db_path = get_db_path(data_dir, farm_id)
        self.farm_id = farm_id

    def add(self, data: Dict[str, Any]) -> Dict[str, Any]:
        diagnosis_id = data.get("diagnosis_id") or f"DX-{uuid.uuid4().hex[:6].upper()}"
        created_at = data.get("created_at") or datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO diagnostics
            (diagnosis_id, farm_id, species, pond_id, suspected_disease, pathogen_candidate, confidence,
             observed_symptoms, differential_diagnoses, water_quality_context, verification_status,
             verification_notes, created_at, data_source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                diagnosis_id,
                self.farm_id,
                data.get("species", "Unknown"),
                data.get("pond_id"),
                data.get("suspected_disease"),
                data.get("pathogen_candidate"),
                data.get("confidence", "moderate"),
                json.dumps(data.get("observed_symptoms", [])),
                json.dumps(data.get("differential_diagnoses", [])),
                json.dumps(data.get("water_quality_context", {})),
                data.get("verification_status", "pending"),
                data.get("verification_notes"),
                created_at,
                data.get("data_source", "mock")
            ))
            conn.commit()
        return self.get_by_id(diagnosis_id)

    def get_by_id(self, diagnosis_id: str) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM diagnostics WHERE diagnosis_id = ? AND farm_id = ?",
                (diagnosis_id, self.farm_id)
            )
            row = cursor.fetchone()
            if not row:
                return None
            res = dict(row)
            res["observed_symptoms"] = json.loads(res["observed_symptoms"])
            res["differential_diagnoses"] = json.loads(res["differential_diagnoses"])
            res["water_quality_context"] = json.loads(res["water_quality_context"])
            return res

    def list_history(self, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
        query = "SELECT * FROM diagnostics WHERE farm_id = ?"
        params: List[Any] = [self.farm_id]
        if start_date:
            query += " AND created_at >= ?"
            params.append(start_date)
        if end_date:
            query += " AND created_at <= ?"
            params.append(end_date)
        query += " ORDER BY created_at ASC"

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            results = []
            for r in rows:
                item = dict(r)
                item["observed_symptoms"] = json.loads(item["observed_symptoms"])
                item["differential_diagnoses"] = json.loads(item["differential_diagnoses"])
                item["water_quality_context"] = json.loads(item["water_quality_context"])
                results.append(item)
            return results

class ObservationRepository:
    def __init__(self, data_dir: str, farm_id: str):
        self.db_path = get_db_path(data_dir, farm_id)
        self.farm_id = farm_id

    def add(self, data: Dict[str, Any]) -> Dict[str, Any]:
        obs_id = data.get("observation_id") or f"OBS-{uuid.uuid4().hex[:6].upper()}"
        ts = data.get("timestamp") or datetime.now(timezone.utc).isoformat()
        idempotency_key = data.get("idempotency_key") or str(uuid.uuid4())
        sync_status = data.get("sync_status", "pending")
        central_committed_at = data.get("central_committed_at")

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Check idempotency: if an observation with this idempotency_key already exists, return it
            if data.get("idempotency_key"):
                cursor.execute(
                    "SELECT observation_id FROM observations WHERE idempotency_key = ? AND farm_id = ?",
                    (data["idempotency_key"], self.farm_id)
                )
                existing = cursor.fetchone()
                if existing:
                    return self.get_by_id(existing[0])

            cursor.execute("""
            INSERT INTO observations
            (observation_id, farm_id, pond_id, observation_type, description, reported_by, timestamp,
             source, related_diagnosis_id, verification_status, data_source, sync_status, idempotency_key, central_committed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                obs_id,
                self.farm_id,
                data.get("pond_id"),
                data.get("observation_type", "general"),
                data.get("description"),
                data.get("reported_by", "Farmer"),
                ts,
                data.get("source", "farmer_direct_input"),
                data.get("related_diagnosis_id"),
                data.get("verification_status", "unverified"),
                data.get("data_source", "mock"),
                sync_status,
                idempotency_key,
                central_committed_at
            ))
            conn.commit()
        return self.get_by_id(obs_id)

    def get_by_id(self, obs_id: str) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM observations WHERE observation_id = ? AND farm_id = ?", (obs_id, self.farm_id))
            row = cursor.fetchone()
            return dict(row) if row else None

    def list_observations(self, limit: int = 50) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM observations WHERE farm_id = ? ORDER BY timestamp DESC LIMIT ?",
                (self.farm_id, limit)
            )
            return [dict(r) for r in cursor.fetchall()]

    def list_pending_sync(self, limit: int = 20) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM observations WHERE farm_id = ? AND sync_status = 'pending' ORDER BY timestamp ASC LIMIT ?",
                (self.farm_id, limit)
            )
            return [dict(r) for r in cursor.fetchall()]

    def mark_synced(self, obs_id: str, arg2: Optional[str] = None, arg3: Optional[str] = None) -> bool:
        """Marks observation as synced, persisting central ID and committed timestamp."""
        if arg3 is not None:
            central_id = arg2
            central_committed_at = arg3
        else:
            central_committed_at = arg2
            central_id = None
        if not central_committed_at:
            central_committed_at = datetime.now(timezone.utc).isoformat()

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE observations
            SET sync_status = 'synced',
                central_id = COALESCE(?, central_id),
                central_committed_at = ?,
                last_sync_error = NULL
            WHERE observation_id = ? AND farm_id = ?
            """, (central_id, central_committed_at, obs_id, self.farm_id))
            conn.commit()
            return cursor.rowcount > 0

    def record_sync_failure(self, obs_id: str, error: str, max_retries: Optional[int] = None) -> Dict[str, Any]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT sync_attempts, max_sync_retries FROM observations WHERE observation_id = ? AND farm_id = ?",
                (obs_id, self.farm_id)
            )
            row = cursor.fetchone()
            attempts = (row[0] or 0) + 1 if row else 1
            if max_retries is not None:
                max_r = max_retries
            else:
                max_r = row[1] if (row and row[1]) else 5

            new_status = "requires_review" if attempts >= max_r else "pending"
            cursor.execute("""
            UPDATE observations
            SET sync_status = ?, sync_attempts = ?, last_sync_error = ?
            WHERE observation_id = ? AND farm_id = ?
            """, (new_status, attempts, error, obs_id, self.farm_id))
            conn.commit()
            return {"status": new_status, "attempts": attempts}

class WaterQualityRepository:
    def __init__(self, data_dir: str, farm_id: str):
        self.db_path = get_db_path(data_dir, farm_id)
        self.farm_id = farm_id

    def list_readings(self, start_date: Optional[str] = None, end_date: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        query = "SELECT * FROM water_quality WHERE farm_id = ?"
        params: List[Any] = [self.farm_id]
        if start_date:
            query += " AND timestamp >= ?"
            params.append(start_date)
        if end_date:
            query += " AND timestamp <= ?"
            params.append(end_date)
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(query, params)
            return [dict(r) for r in cursor.fetchall()]

class ResearchRepository:
    def __init__(self, data_dir: str, farm_id: str, seed_dir: Optional[Path] = None):
        self.db_path = get_db_path(data_dir, farm_id)
        self.farm_id = farm_id
        self.seed_dir = seed_dir or Path(data_dir).parent / "seed"

    def create_task(self, question: str, related_diagnosis_id: Optional[str] = None, max_retries: int = 3) -> Dict[str, Any]:
        task_id = f"RES-{uuid.uuid4().hex[:6].upper()}"
        now = datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO research_tasks
            (research_task_id, farm_id, related_diagnosis_id, research_question, status, findings, sources, created_at, retry_count, max_retries)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
            """, (task_id, self.farm_id, related_diagnosis_id, question, "pending", None, None, now, max_retries))
            conn.commit()
        return {"research_task_id": task_id, "status": "pending", "question": question}

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM research_tasks WHERE research_task_id = ? AND farm_id = ?", (task_id, self.farm_id))
            row = cursor.fetchone()
            if not row:
                return None
            res = dict(row)
            if res.get("sources"):
                res["sources"] = json.loads(res["sources"])
            return res

    def acquire_task_lock(self, task_id: str, worker_id: str) -> bool:
        """Atomically acquires an execution lock on a pending or running task."""
        now = datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE research_tasks
            SET execution_lock = ?, status = 'running', started_at = COALESCE(started_at, ?), last_heartbeat_at = ?
            WHERE research_task_id = ? AND farm_id = ?
              AND (execution_lock IS NULL OR execution_lock = ?)
              AND status IN ('pending', 'running')
            """, (worker_id, now, now, task_id, self.farm_id, worker_id))
            conn.commit()
            return cursor.rowcount > 0

    def release_task_lock(self, task_id: str, worker_id: str) -> bool:
        """Releases the execution lock held by a worker."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE research_tasks
            SET execution_lock = NULL
            WHERE research_task_id = ? AND farm_id = ? AND execution_lock = ?
            """, (task_id, self.farm_id, worker_id))
            conn.commit()
            return cursor.rowcount > 0

    def update_task(
        self,
        task_id: str,
        status: str,
        findings: Optional[str] = None,
        sources: Optional[List[Dict[str, Any]]] = None,
        started_at: Optional[str] = None,
        completed_at: Optional[str] = None,
        failed_at: Optional[str] = None,
        retry_count: Optional[int] = None,
        error_message: Optional[str] = None,
        clear_lock: bool = False
    ) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            sources_json = json.dumps(sources) if sources is not None else None
            
            sql = """
            UPDATE research_tasks
            SET status = ?,
                findings = COALESCE(?, findings),
                sources = COALESCE(?, sources),
                started_at = COALESCE(?, started_at),
                completed_at = COALESCE(?, completed_at),
                failed_at = COALESCE(?, failed_at),
                retry_count = COALESCE(?, retry_count),
                error_message = COALESCE(?, error_message)
            """
            params: List[Any] = [
                status, findings, sources_json, started_at, completed_at, failed_at, retry_count, error_message
            ]
            if clear_lock:
                sql += ", execution_lock = NULL"
            
            sql += " WHERE research_task_id = ? AND farm_id = ?"
            params.extend([task_id, self.farm_id])
            
            cursor.execute(sql, params)
            conn.commit()
        return self.get_task(task_id)

    def list_interrupted_tasks(self) -> List[Dict[str, Any]]:
        """Returns tasks left in pending or running state across restarts."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM research_tasks WHERE farm_id = ? AND status IN ('pending', 'running') ORDER BY created_at ASC",
                (self.farm_id,)
            )
            return [dict(r) for r in cursor.fetchall()]

    def mark_requires_review(self, task_id: str, error: str) -> Optional[Dict[str, Any]]:
        now = datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE research_tasks
            SET status = 'requires_review', error_message = ?, failed_at = ?, execution_lock = NULL
            WHERE research_task_id = ? AND farm_id = ?
            """, (error, now, task_id, self.farm_id))
            conn.commit()
        return self.get_task(task_id)

    def list_tasks(self, limit: int = 20) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM research_tasks WHERE farm_id = ? ORDER BY created_at DESC LIMIT ?", (self.farm_id, limit))
            results = []
            for r in cursor.fetchall():
                d = dict(r)
                if d.get("sources"):
                    d["sources"] = json.loads(d["sources"])
                results.append(d)
            return results

    def search_sources(self, query: str) -> List[Dict[str, Any]]:
        # Load curated literature from sample_research_sources.json
        sources_file = self.seed_dir / "sample_research_sources.json"
        if not sources_file.exists():
            return []
        with open(sources_file, "r", encoding="utf-8") as f:
            sources = json.load(f)
        
        q_tokens = query.lower().split()
        matches = []
        for s in sources:
            text = f"{s.get('title', '')} {' '.join(s.get('topics', []))} {s.get('key_findings', '')}".lower()
            if any(token in text for token in q_tokens):
                matches.append(s)
        return matches

class MemoryRepository:
    def __init__(self, data_dir: str, farm_id: str):
        self.db_path = get_db_path(data_dir, farm_id)
        self.farm_id = farm_id

    def add_item(self, category: str, content: str, source: str = "conversation") -> Dict[str, Any]:
        mem_id = f"MEM-{uuid.uuid4().hex[:6].upper()}"
        now = datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO memory_items (memory_id, farm_id, category, content, source, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (mem_id, self.farm_id, category, content, source, now))
            conn.commit()
        return {"memory_id": mem_id, "category": category, "content": content, "timestamp": now}

    def list_items(self, category: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        query = "SELECT * FROM memory_items WHERE farm_id = ?"
        params: List[Any] = [self.farm_id]
        if category:
            query += " AND category = ?"
            params.append(category)
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(query, params)
            return [dict(r) for r in cursor.fetchall()]

class ConversationRepository:
    """Persistent storage for conversation ownership across runtime restarts."""
    def __init__(self, data_dir: str):
        self.db_path = get_conversations_db_path(data_dir)
        init_conversations_db(data_dir)

    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM conversations WHERE conversation_id = ?", (conversation_id,))
            row = cursor.fetchone()
            if not row:
                return None
            res = dict(row)
            if res.get("metadata"):
                try:
                    res["metadata"] = json.loads(res["metadata"])
                except Exception:
                    pass
            return res

    def validate_or_bind(self, conversation_id: str, farm_id: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Validates that conversation_id belongs to farm_id.
        If conversation is new, binds it to farm_id.
        If bound to another farm, returns False.
        If bound to this farm, updates last_activity_at and returns True.
        """
        now = datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT farm_id FROM conversations WHERE conversation_id = ?", (conversation_id,))
            row = cursor.fetchone()
            if row:
                bound_farm = row["farm_id"]
                if bound_farm != farm_id:
                    return False
                cursor.execute(
                    "UPDATE conversations SET last_activity_at = ? WHERE conversation_id = ?",
                    (now, conversation_id)
                )
                conn.commit()
                return True
            else:
                meta_json = json.dumps(metadata or {})
                cursor.execute("""
                INSERT INTO conversations (conversation_id, farm_id, created_at, last_activity_at, metadata)
                VALUES (?, ?, ?, ?, ?)
                """, (conversation_id, farm_id, now, now, meta_json))
                conn.commit()
                return True

    def list_conversations_by_farm(self, farm_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM conversations WHERE farm_id = ? ORDER BY last_activity_at DESC LIMIT ?",
                (farm_id, limit)
            )
            return [dict(r) for r in cursor.fetchall()]

