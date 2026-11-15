from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class DiagnosticContract(BaseModel):
    diagnosis_id: str
    farm_id: str
    species: str
    pond_id: Optional[str] = None
    suspected_disease: str
    pathogen_candidate: Optional[str] = None
    confidence: str = "moderate"
    observed_symptoms: List[str] = Field(default_factory=list)
    differential_diagnoses: List[str] = Field(default_factory=list)
    water_quality_context: Dict[str, Any] = Field(default_factory=dict)
    verification_status: str = "pending"
    verification_notes: Optional[str] = None
    created_at: str
    data_source: str = "mock"

class DiagnosticCreateRequest(BaseModel):
    farm_id: str
    species: str
    pond_id: Optional[str] = None
    suspected_disease: str
    pathogen_candidate: Optional[str] = None
    confidence: str = "moderate"
    observed_symptoms: List[str] = Field(default_factory=list)
    differential_diagnoses: List[str] = Field(default_factory=list)
    water_quality_context: Optional[Dict[str, Any]] = None
    verification_status: str = "pending"
    verification_notes: Optional[str] = None

