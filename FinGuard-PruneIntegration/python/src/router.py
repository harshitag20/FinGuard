"""FinGuard-PruneIntegration: Request Classification and Policy Router for Python."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class RequestCategory(str, Enum):
    GENERAL_TEXT = "general_text"
    STATIC_EDUCATIONAL = "static_educational"
    FARM_CONVERSATION = "farm_conversation"
    DISEASE_DIAGNOSIS = "disease_diagnosis"
    MULTIMODAL_IMAGE = "multimodal_image"
    VOICE_LIVE = "voice_live"
    AGENT_TOOL_CALLING = "agent_tool_calling"


@dataclass
class RoutingDecision:
    category: RequestCategory
    route_target: str  # "prune_gateway" | "direct_gemini" | "rejected"
    cache_policy: str  # "off" | "exact" | "disabled"
    feature_id: str
    is_supported: bool
    reason: str


def classify_request(
    category: RequestCategory,
    feature_id: Optional[str] = None,
    has_images: bool = False,
    is_voice_session: bool = False,
    has_tool_calls: bool = False,
    contains_farm_telemetry: bool = False,
    contains_sensitive_data: bool = False,
) -> RoutingDecision:
    """Classify incoming LLM request and enforce FinGuard security and caching policies."""
    # 1. Voice and WebSocket real-time audio
    if category == RequestCategory.VOICE_LIVE or is_voice_session:
        return RoutingDecision(
            category=RequestCategory.VOICE_LIVE,
            route_target="direct_gemini",
            cache_policy="off",
            feature_id=feature_id or "voice_expert_live",
            is_supported=True,
            reason="Gemini Live bidirectional WebSockets are unsupported by HTTP proxy. Direct path only.",
        )

    # 2. Multimodal image inputs (fish pathology photos, pond cameras)
    if category == RequestCategory.MULTIMODAL_IMAGE or has_images:
        return RoutingDecision(
            category=RequestCategory.MULTIMODAL_IMAGE,
            route_target="direct_gemini",
            cache_policy="off",
            feature_id=feature_id or "multimodal_disease_screening",
            is_supported=False,
            reason="Multimodal image forwarding through Prune gateway is unverified. Preserved on direct Gemini path.",
        )

    # 3. Clinical disease diagnosis & water telemetry - MUST remain direct
    if category == RequestCategory.DISEASE_DIAGNOSIS or contains_farm_telemetry:
        return RoutingDecision(
            category=RequestCategory.DISEASE_DIAGNOSIS,
            route_target="direct_gemini",
            cache_policy="off",
            feature_id=feature_id or "disease_screening",
            is_supported=False,
            reason="Clinical diagnosis and volatile telemetry require direct Gemini execution until diagnostic output quality and safety are validated.",
        )

    # 4. Farm-specific operational context & observations
    if category == RequestCategory.FARM_CONVERSATION or contains_sensitive_data:
        return RoutingDecision(
            category=RequestCategory.FARM_CONVERSATION,
            route_target="direct_gemini",
            cache_policy="off",
            feature_id=feature_id or "farm_agent",
            is_supported=False,
            reason="Farm operational conversations preserved on direct Gemini provider path pending audit.",
        )

    # 5. Agent tool-calling requests (Maritime agent) - MUST remain direct
    if category == RequestCategory.AGENT_TOOL_CALLING or has_tool_calls:
        return RoutingDecision(
            category=RequestCategory.AGENT_TOOL_CALLING,
            route_target="direct_gemini",
            cache_policy="off",
            feature_id=feature_id or "farm_agent_tools",
            is_supported=False,
            reason="Gemini tool calling compatibility via Prune gateway is unverified. Preserved on direct Gemini provider path.",
        )

    # 6. Static educational knowledge (opt-in exact cache)
    if category == RequestCategory.STATIC_EDUCATIONAL:
        return RoutingDecision(
            category=RequestCategory.STATIC_EDUCATIONAL,
            route_target="prune_gateway",
            cache_policy="exact",
            feature_id=feature_id or "educational_knowledge",
            is_supported=True,
            reason="Static biological facts and educational content are safe for exact-match caching.",
        )

    # Default: General explanatory text
    return RoutingDecision(
        category=RequestCategory.GENERAL_TEXT,
        route_target="prune_gateway",
        cache_policy="off",
        feature_id=feature_id or "general_chat",
        is_supported=True,
        reason="General explanatory text routed through Prune gateway with conservative caching.",
    )

