from typing import Optional
from pydantic import BaseModel

class ObservationContract(BaseModel):
    observation_id: str
    farm_id: str
    pond_id: Optional[str] = None
    observation_type: str = "general"
    description: str
    reported_by: str = "Farmer"
    timestamp: str
    source: str = "farmer_direct_input"
    related_diagnosis_id: Optional[str] = None
    verification_status: str = "unverified"
    data_source: str = "mock"

class ObservationCreateRequest(BaseModel):
    farm_id: str
    pond_id: Optional[str] = None
    observation_type: str = "general"
    description: str
    reported_by: Optional[str] = "Farmer"
    source: Optional[str] = "farmer_direct_input"
    related_diagnosis_id: Optional[str] = None

