import logging
from typing import Dict, Any, List, Optional
from agent_runtime.tools.farm_tools import FarmToolHandler
from agent_runtime.core.tool_tracker import ToolExecutionTracker

logger = logging.getLogger("core.tool_registry")

class ToolRegistry:
    def __init__(self, handler: FarmToolHandler):
        self.handler = handler

    def get_tool_functions(self, tracker: Optional[ToolExecutionTracker] = None) -> List[Any]:
        """Returns the list of callable functions for Gemini automatic tool calling.
        Records tool execution metadata into tracker if provided."""
        
        def get_farm_profile(farm_id: str) -> str:
            """Retrieve the farm profile, pond configuration, and species details for a farm.
            
            Args:
                farm_id: The unique identifier of the farm (e.g. 'FARM-001').
            """
            logger.info(f"Tool executing: get_farm_profile({farm_id})")
            try:
                res = self.handler.get_farm_profile(farm_id)
                if tracker:
                    tracker.record_execution("get_farm_profile", {"farm_id": farm_id}, status="success")
                return str(res)
            except Exception as e:
                if tracker:
                    tracker.record_execution("get_farm_profile", {"farm_id": farm_id}, status="error", error=str(e))
                raise e

        def get_diagnostic_report(diagnosis_id: str) -> str:
            """Retrieve detailed information about a specific diagnostic report by ID.
            
            Args:
                diagnosis_id: The ID of the diagnostic record (e.g. 'DX-001').
            """
            logger.info(f"Tool executing: get_diagnostic_report({diagnosis_id})")
            try:
                res = self.handler.get_diagnostic_report(diagnosis_id)
                if tracker:
                    tracker.record_execution("get_diagnostic_report", {"diagnosis_id": diagnosis_id}, status="success")
                return str(res)
            except Exception as e:
                if tracker:
                    tracker.record_execution("get_diagnostic_report", {"diagnosis_id": diagnosis_id}, status="error", error=str(e))
                raise e

        def list_diagnostic_history(farm_id: str, start_date: str = "", end_date: str = "") -> str:
            """List all historical diagnostic records for a farm in chronological order.
            
            Args:
                farm_id: The unique identifier of the farm.
                start_date: Optional ISO-8601 start date filter (or empty string).
                end_date: Optional ISO-8601 end date filter (or empty string).
            """
            logger.info(f"Tool executing: list_diagnostic_history({farm_id})")
            s = start_date if start_date else None
            e = end_date if end_date else None
            try:
                res = self.handler.list_diagnostic_history(farm_id, s, e)
                if tracker:
                    tracker.record_execution("list_diagnostic_history", {"farm_id": farm_id, "start_date": s, "end_date": e}, status="success")
                return str(res)
            except Exception as e:
                if tracker:
                    tracker.record_execution("list_diagnostic_history", {"farm_id": farm_id, "start_date": s, "end_date": e}, status="error", error=str(e))
                raise e

        def compare_diagnostics(diagnosis_id_a: str, diagnosis_id_b: str) -> str:
            """Compare two diagnostic records to analyze pathogen, symptom, and environmental differences.
            
            Args:
                diagnosis_id_a: The first diagnosis ID (e.g. 'DX-001').
                diagnosis_id_b: The second diagnosis ID (e.g. 'DX-002').
            """
            logger.info(f"Tool executing: compare_diagnostics({diagnosis_id_a}, {diagnosis_id_b})")
            try:
                res = self.handler.compare_diagnostics(diagnosis_id_a, diagnosis_id_b)
                if tracker:
                    tracker.record_execution("compare_diagnostics", {"diagnosis_id_a": diagnosis_id_a, "diagnosis_id_b": diagnosis_id_b}, status="success")
                return str(res)
            except Exception as e:
                if tracker:
                    tracker.record_execution("compare_diagnostics", {"diagnosis_id_a": diagnosis_id_a, "diagnosis_id_b": diagnosis_id_b}, status="error", error=str(e))
                raise e

        def get_water_quality_history(farm_id: str, limit: int = 10) -> str:
            """Retrieve recent water quality readings including temperature, dissolved oxygen, pH, and ammonia.
            
            Args:
                farm_id: The farm identifier.
                limit: Maximum number of readings to return (default 10).
            """
            logger.info(f"Tool executing: get_water_quality_history({farm_id})")
            try:
                res = self.handler.get_water_quality_history(farm_id=farm_id, limit=limit)
                if tracker:
                    tracker.record_execution("get_water_quality_history", {"farm_id": farm_id, "limit": limit}, status="success")
                return str(res)
            except Exception as e:
                if tracker:
                    tracker.record_execution("get_water_quality_history", {"farm_id": farm_id, "limit": limit}, status="error", error=str(e))
                raise e

        def save_farmer_observation(description: str, observation_type: str = "general", pond_id: str = "") -> str:
            """Save a newly reported farmer observation, symptom progression, or environmental anomaly.
            
            Args:
                description: The detailed description reported by the farmer.
                observation_type: Type of observation (e.g. 'symptom_progression', 'mortality_event', 'behavioural_change', 'environmental_event').
                pond_id: Optional ID of the specific pond affected.
            """
            logger.info(f"Tool executing: save_farmer_observation({description[:40]})")
            p = pond_id if pond_id else None
            try:
                res = self.handler.save_farmer_observation(description=description, observation_type=observation_type, pond_id=p)
                if tracker:
                    tracker.record_execution("save_farmer_observation", {"description": description[:60], "observation_type": observation_type, "pond_id": p}, status="success")
                return str(res)
            except Exception as e:
                if tracker:
                    tracker.record_execution("save_farmer_observation", {"description": description[:60], "observation_type": observation_type, "pond_id": p}, status="error", error=str(e))
                raise e

        def get_farmer_observations(farm_id: str, limit: int = 20) -> str:
            """Retrieve the historical observations recorded by farm staff.
            
            Args:
                farm_id: The farm identifier.
                limit: Maximum number of observations to fetch.
            """
            logger.info(f"Tool executing: get_farmer_observations({farm_id})")
            try:
                res = self.handler.get_farmer_observations(farm_id, limit=limit)
                if tracker:
                    tracker.record_execution("get_farmer_observations", {"farm_id": farm_id, "limit": limit}, status="success")
                return str(res)
            except Exception as e:
                if tracker:
                    tracker.record_execution("get_farmer_observations", {"farm_id": farm_id, "limit": limit}, status="error", error=str(e))
                raise e

        def generate_farm_health_summary(farm_id: str) -> str:
            """Generate a comprehensive health and status summary for the farm.
            
            Args:
                farm_id: The farm identifier.
            """
            logger.info(f"Tool executing: generate_farm_health_summary({farm_id})")
            try:
                res = self.handler.generate_farm_health_summary(farm_id)
                if tracker:
                    tracker.record_execution("generate_farm_health_summary", {"farm_id": farm_id}, status="success")
                return str(res)
            except Exception as e:
                if tracker:
                    tracker.record_execution("generate_farm_health_summary", {"farm_id": farm_id}, status="error", error=str(e))
                raise e

        def search_research_sources(query: str) -> str:
            """Search verified scientific aquaculture disease cards and bulletins.
            
            Args:
                query: Search terms such as disease name, pathogen, or symptoms.
            """
            logger.info(f"Tool executing: search_research_sources({query})")
            try:
                res = self.handler.search_research_sources(query)
                if tracker:
                    tracker.record_execution("search_research_sources", {"query": query}, status="success")
                return str(res)
            except Exception as e:
                if tracker:
                    tracker.record_execution("search_research_sources", {"query": query}, status="error", error=str(e))
                raise e

        def get_research_task(task_id: str) -> str:
            """Retrieve the status and results of a research task.
            
            Args:
                task_id: The research task ID.
            """
            logger.info(f"Tool executing: get_research_task({task_id})")
            try:
                res = self.handler.get_research_task(task_id)
                if tracker:
                    tracker.record_execution("get_research_task", {"task_id": task_id}, status="success")
                return str(res)
            except Exception as e:
                if tracker:
                    tracker.record_execution("get_research_task", {"task_id": task_id}, status="error", error=str(e))
                raise e

        def start_research_task(question: str, related_diagnosis_id: str = "") -> str:
            """Initiate an asynchronous background scientific research inquiry for this farm.
            
            Args:
                question: The specific disease, pathogen, or water-quality research question.
                related_diagnosis_id: Optional diagnostic report ID to associate with the inquiry.
            """
            logger.info(f"Tool executing: start_research_task({question[:50]})")
            diag_id = related_diagnosis_id if related_diagnosis_id else None
            try:
                res = self.handler.start_research_task(question=question, related_diagnosis_id=diag_id)
                if tracker:
                    tracker.record_execution("start_research_task", {"question": question[:60], "related_diagnosis_id": diag_id}, status="success")
                return str(res)
            except Exception as e:
                if tracker:
                    tracker.record_execution("start_research_task", {"question": question[:60], "related_diagnosis_id": diag_id}, status="error", error=str(e))
                raise e

        return [
            get_farm_profile,
            get_diagnostic_report,
            list_diagnostic_history,
            compare_diagnostics,
            get_water_quality_history,
            save_farmer_observation,
            get_farmer_observations,
            generate_farm_health_summary,
            search_research_sources,
            get_research_task,
            start_research_task
        ]
