from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class AgentChatMessage(BaseModel):
    message: str
    source: Optional[str] = "api"
    conversation_id: Optional[str] = None
    farm_id: Optional[str] = None

class AgentChatResponse(BaseModel):
    response: str
    farm_id: Optional[str] = None
    tools_used: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class AgentProvisionContract(BaseModel):
    farm_id: str
    maritime_agent_id: str
    status: str
    created_at: str
    external_id: str

