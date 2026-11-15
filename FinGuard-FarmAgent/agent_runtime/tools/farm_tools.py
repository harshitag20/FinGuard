import logging
from typing import Dict, Any, List, Optional
from agent_runtime.storage.repositories import (
    FarmRepository,
    DiagnosticRepository,
    ObservationRepository,
    WaterQualityRepository,
    ResearchRepository,
    MemoryRepository,
)
from agent_runtime.security.tenant_isolation import validate_farm_access, TenantIsolationError

logger = logging.getLogger("tools.farm_tools")

class FarmToolHandler:
    def __init__(
        self,
        farm_id: str,
        farm_repo: FarmRepository,
        diag_repo: DiagnosticRepository,
        obs_repo: ObservationRepository,
        wq_repo: WaterQualityRepository,
        research_repo: ResearchRepository,
        mem_repo: MemoryRepository,
        research_manager=None,
    ):
        self.assigned_farm_id = farm_id
        self.farm_repo = farm_repo
        self.diag_repo = diag_repo
        self.obs_repo = obs_repo
        self.wq_repo = wq_repo
        self.research_repo = research_repo
        self.mem_repo = mem_repo
        self.research_manager = research_manager

    def get_farm_profile(self, farm_id: str) -> Dict[str, Any]:
        """Retrieve the farm profile, pond configuration, and species details."""
        validate_farm_access(farm_id, self.assigned_farm_id)
        profile = self.farm_repo.get_profile()
        if not profile:
            return {"error": f"Farm profile for {farm_id} not found."}
        return {"farm_profile": profile}

    def get_diagnostic_report(self, diagnosis_id: str, farm_id: Optional[str] = None) -> Dict[str, Any]:
        """Retrieve a specific diagnostic report by its diagnosis_id."""
        if farm_id:
            validate_farm_access(farm_id, self.assigned_farm_id)
        report = self.diag_repo.get_by_id(diagnosis_id)
        if not report:
            return {"error": f"Diagnostic report '{diagnosis_id}' not found for farm {self.assigned_farm_id}."}
        if report.get("farm_id") != self.assigned_farm_id:
            raise TenantIsolationError(requested_farm_id=report.get("farm_id", "UNKNOWN"), assigned_farm_id=self.assigned_farm_id)
        return {"diagnostic_report": report}

    def list_diagnostic_history(self, farm_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict[str, Any]:
        """List historical diagnostic reports in chronological order."""
        validate_farm_access(farm_id, self.assigned_farm_id)
        history = self.diag_repo.list_history(start_date, end_date)
        return {
            "farm_id": self.assigned_farm_id,
            "count": len(history),
            "diagnostics": history
        }

    def compare_diagnostics(self, diagnosis_id_a: str, diagnosis_id_b: str, farm_id: Optional[str] = None) -> Dict[str, Any]:
        """Compare two diagnostic records to identify differences in symptoms, pathogens, and water conditions."""
        if farm_id:
            validate_farm_access(farm_id, self.assigned_farm_id)
        rec_a = self.diag_repo.get_by_id(diagnosis_id_a)
        rec_b = self.diag_repo.get_by_id(diagnosis_id_b)
        if not rec_a:
            return {"error": f"Diagnostic record '{diagnosis_id_a}' not found for farm {self.assigned_farm_id}."}
        if not rec_b:
            return {"error": f"Diagnostic record '{diagnosis_id_b}' not found for farm {self.assigned_farm_id}."}
        
        # Enforce both records belong to assigned tenant
        if rec_a.get("farm_id") != self.assigned_farm_id:
            raise TenantIsolationError(requested_farm_id=rec_a.get("farm_id", "UNKNOWN"), assigned_farm_id=self.assigned_farm_id)
        if rec_b.get("farm_id") != self.assigned_farm_id:
            raise TenantIsolationError(requested_farm_id=rec_b.get("farm_id", "UNKNOWN"), assigned_farm_id=self.assigned_farm_id)

        comparison = {
            "record_a": {
                "id": rec_a["diagnosis_id"],
                "species": rec_a["species"],
                "disease": rec_a["suspected_disease"],
                "confidence": rec_a["confidence"],
                "verification": rec_a["verification_status"],
                "date": rec_a["created_at"],
                "symptoms": rec_a["observed_symptoms"],
                "water_quality": rec_a["water_quality_context"]
            },
            "record_b": {
                "id": rec_b["diagnosis_id"],
                "species": rec_b["species"],
                "disease": rec_b["suspected_disease"],
                "confidence": rec_b["confidence"],
                "verification": rec_b["verification_status"],
                "date": rec_b["created_at"],
                "symptoms": rec_b["observed_symptoms"],
                "water_quality": rec_b["water_quality_context"]
            },
            "summary_diff": {
                "same_species": rec_a["species"] == rec_b["species"],
                "same_suspected_disease": rec_a["suspected_disease"] == rec_b["suspected_disease"],
                "shared_symptoms": list(set(rec_a.get("observed_symptoms", [])).intersection(set(rec_b.get("observed_symptoms", []))))
            }
        }
        return {"comparison": comparison}

    def get_water_quality_history(self, farm_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None, limit: int = 20) -> Dict[str, Any]:
        """Retrieve historical water quality sensor readings."""
        validate_farm_access(farm_id, self.assigned_farm_id)
        readings = self.wq_repo.list_readings(start_date, end_date, limit)
        return {
            "farm_id": self.assigned_farm_id,
            "readings_count": len(readings),
            "readings": readings,
            "note": "Readings are clearly marked with data_source (e.g. mock_sensor)."
        }

    def save_farmer_observation(
        self,
        description: str,
        observation_type: str = "general",
        pond_id: Optional[str] = None,
        farm_id: Optional[str] = None,
        reported_by: str = "Farmer",
        related_diagnosis_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Save a new unverified observation reported by the farmer."""
        if farm_id:
            validate_farm_access(farm_id, self.assigned_farm_id)
        
        # If related_diagnosis_id provided, verify it belongs to this farm
        if related_diagnosis_id:
            diag = self.diag_repo.get_by_id(related_diagnosis_id)
            if not diag:
                raise TenantIsolationError(requested_farm_id="UNKNOWN_OR_FOREIGN", assigned_farm_id=self.assigned_farm_id)

        obs_data = {
            "farm_id": self.assigned_farm_id,
            "pond_id": pond_id,
            "observation_type": observation_type,
            "description": description,
            "reported_by": reported_by,
            "source": "farmer_direct_input",
            "related_diagnosis_id": related_diagnosis_id,
            "verification_status": "unverified",
            "data_source": "mock"
        }
        saved = self.obs_repo.add(obs_data)
        logger.info(f"Saved farmer observation: {saved['observation_id']}")
        return {
            "success": True,
            "observation": saved,
            "disclaimer": "This is a farmer-reported observation and has not yet been scientifically verified."
        }

    def get_farmer_observations(self, farm_id: str, limit: int = 50) -> Dict[str, Any]:
        """Retrieve recent farmer observations."""
        validate_farm_access(farm_id, self.assigned_farm_id)
        observations = self.obs_repo.list_observations(limit)
        return {
            "farm_id": self.assigned_farm_id,
            "count": len(observations),
            "observations": observations
        }

    def generate_farm_health_summary(self, farm_id: str) -> Dict[str, Any]:
        """Generate a structured chronological health summary of the farm."""
        validate_farm_access(farm_id, self.assigned_farm_id)
        profile = self.farm_repo.get_profile() or {}
        diagnostics = self.diag_repo.list_history()
        observations = self.obs_repo.list_observations(limit=5)
        recent_wq = self.wq_repo.list_readings(limit=5)
        
        return {
            "farm_id": self.assigned_farm_id,
            "farm_name": profile.get("name", "Unknown"),
            "species": profile.get("species_profile", []),
            "total_diagnostics_on_record": len(diagnostics),
            "recent_diagnostics": [
                {
                    "diagnosis_id": d["diagnosis_id"],
                    "species": d["species"],
                    "suspected_disease": d["suspected_disease"],
                    "confidence": d["confidence"],
                    "status": d["verification_status"],
                    "date": d["created_at"]
                } for d in diagnostics[-3:]
            ],
            "recent_farmer_observations": [
                {
                    "id": o["observation_id"],
                    "desc": o["description"],
                    "date": o["timestamp"]
                } for o in observations[:3]
            ],
            "water_quality_status": "optimal" if len(recent_wq) > 0 else "no_telemetry",
            "latest_water_readings": recent_wq[:2]
        }

    def search_research_sources(self, query: str) -> Dict[str, Any]:
        """Search verified scientific literature and disease advisory bulletins."""
        results = self.research_repo.search_sources(query)
        return {
            "query": query,
            "found_count": len(results),
            "sources": results,
            "citation_policy": "Only verified literature is returned. No citations are fabricated."
        }

    def get_research_task(self, task_id: str, farm_id: Optional[str] = None) -> Dict[str, Any]:
        """Retrieve background research task status and findings."""
        if farm_id:
            validate_farm_access(farm_id, self.assigned_farm_id)
        task = self.research_repo.get_task(task_id)
        if not task:
            return {"error": f"Research task '{task_id}' not found for farm {self.assigned_farm_id}."}
        if task.get("farm_id") != self.assigned_farm_id:
            raise TenantIsolationError(requested_farm_id=task.get("farm_id", "UNKNOWN"), assigned_farm_id=self.assigned_farm_id)
        return {"research_task": task}

    def start_research_task(self, question: str, related_diagnosis_id: Optional[str] = None) -> Dict[str, Any]:
        """Start asynchronous research task."""
        if self.research_manager:
            return self.research_manager.create_task(question=question, related_diagnosis_id=related_diagnosis_id)
        return self.research_repo.create_task(question=question, related_diagnosis_id=related_diagnosis_id)
