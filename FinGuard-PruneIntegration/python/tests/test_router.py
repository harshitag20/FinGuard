"""Unit tests for Python Request Classifier & Policy Router."""

import pytest
from src.router import RequestCategory, classify_request


def test_voice_live_route_isolation():
    decision = classify_request(RequestCategory.VOICE_LIVE, is_voice_session=True)
    assert decision.route_target == "direct_gemini"
    assert decision.cache_policy == "off"
    assert decision.feature_id == "voice_expert_live"
    assert "Gemini Live" in decision.reason


def test_multimodal_image_route_isolation():
    decision = classify_request(RequestCategory.MULTIMODAL_IMAGE, has_images=True)
    assert decision.route_target == "direct_gemini"
    assert decision.is_supported is False
    assert decision.cache_policy == "off"
    assert "unverified" in decision.reason


def test_disease_diagnosis_route_isolation():
    decision = classify_request(RequestCategory.DISEASE_DIAGNOSIS, contains_farm_telemetry=True)
    assert decision.route_target == "direct_gemini"
    assert decision.cache_policy == "off"
    assert decision.is_supported is False
    assert decision.feature_id == "disease_screening"


def test_farm_conversation_route_isolation():
    decision = classify_request(RequestCategory.FARM_CONVERSATION, contains_sensitive_data=True)
    assert decision.route_target == "direct_gemini"
    assert decision.cache_policy == "off"
    assert decision.is_supported is False
    assert decision.feature_id == "farm_agent"


def test_static_educational_exact_cache_allowed():
    decision = classify_request(RequestCategory.STATIC_EDUCATIONAL)
    assert decision.route_target == "prune_gateway"
    assert decision.cache_policy == "exact"
    assert decision.feature_id == "educational_knowledge"


def test_general_text_defaults():
    decision = classify_request(RequestCategory.GENERAL_TEXT)
    assert decision.route_target == "prune_gateway"
    assert decision.cache_policy == "off"
    assert decision.feature_id == "general_chat"

