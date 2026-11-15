from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

class FarmDataProviderInterface(ABC):
    @abstractmethod
    def get_profile(self) -> Optional[Dict[str, Any]]:
        pass

class DiagnosticDataProviderInterface(ABC):
    @abstractmethod
    def add(self, data: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_by_id(self, diagnosis_id: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def list_history(self, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
        pass

class WaterQualityDataProviderInterface(ABC):
    @abstractmethod
    def list_readings(self, start_date: Optional[str] = None, end_date: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        pass

class ObservationDataProviderInterface(ABC):
    @abstractmethod
    def add(self, data: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_by_id(self, obs_id: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def list_observations(self, limit: int = 50) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def mark_synced(self, obs_id: str, central_id: str, committed_at: str) -> bool:
        pass

