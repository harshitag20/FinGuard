from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class SpeciesProfile(BaseModel):
    common_name: str
    scientific_name: str
    stocking_density_per_m2: float
    life_stage: str

class PondInfo(BaseModel):
    pond_id: str
    area_hectares: float
    average_depth_meters: float
    primary_species: str
    aeration_installed: bool

class EnvironmentalBaseline(BaseModel):
    optimal_temp_celsius: List[float] = [25.0, 32.0]
    optimal_dissolved_oxygen_mg_l: List[float] = [5.0, 8.0]
    optimal_ph: List[float] = [6.5, 8.5]
    max_tolerable_ammonia_mg_l: float = 0.05

class FarmContract(BaseModel):
    farm_id: str
    name: str
    location: str
    species_profile: List[SpeciesProfile]
    ponds: List[PondInfo]
    environmental_baseline: EnvironmentalBaseline = Field(default_factory=EnvironmentalBaseline)
    maritime_agent_id: Optional[str] = None
    provisioning_status: str = "unprovisioned"
    created_at: str
    data_source: str = "mock"

class FarmCreateRequest(BaseModel):
    farm_id: str
    name: str
    location: str
    species_profile: List[SpeciesProfile]
    ponds: List[PondInfo]
    environmental_baseline: Optional[EnvironmentalBaseline] = None

