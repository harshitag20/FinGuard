"""Unit tests for Python Client Adapter with HTTP mocks."""

import json
import pytest
import httpx
from src.client import FinGuardPruneClient
from src.errors import (
    PruneAuthenticationError,
    PruneDirectFallbackProhibitedError,
    PruneGatewayDisabledError,
    PruneShieldUnavailableError,
    PruneSpendCapError,
)
from src.router import RequestCategory


def test_gateway_disabled_raises_error():
    client = FinGuardPruneClient(enabled=False, allow_direct_fallback=False)
    with pytest.raises(PruneGatewayDisabledError):
        client.create_chat_completion(
            messages=[{"role": "user", "content": "ping"}],
            category=RequestCategory.GENERAL_TEXT,
        )


def test_missing_api_key_when_enabled():
    client = FinGuardPruneClient(enabled=True, api_key="")
    with pytest.raises(ValueError, match="PRUNE_API_KEY is missing"):
        client.create_chat_completion(
            messages=[{"role": "user", "content": "ping"}],
            category=RequestCategory.GENERAL_TEXT,
        )


def test_direct_fallback_prohibition_on_multimodal():
    client = FinGuardPruneClient(
        enabled=True,
        api_key="prune_mock_key",
        allow_direct_fallback=False,
    )
    with pytest.raises(PruneDirectFallbackProhibitedError):
        client.create_chat_completion(
            messages=[{"role": "user", "content": "examine fish image"}],
            category=RequestCategory.MULTIMODAL_IMAGE,
        )


def test_successful_request_headers_and_receipt():
    captured_request = {}

    def mock_handler(request: httpx.Request) -> httpx.Response:
        captured_request["url"] = str(request.url)
        captured_request["headers"] = dict(request.headers)
        captured_request["body"] = json.loads(request.read().decode("utf-8"))

        response_body = {
            "id": "chatcmpl_mock_success_01",
            "model": "gemini-1.5-flash",
            "choices": [{"message": {"role": "assistant", "content": "Tilapia feeding rate: 2-3% biomass."}}],
            "usage": {"prompt_tokens": 25, "completion_tokens": 35},
            "prune_metadata": {
                "cost_usd": 0.000035,
                "cost_saved_usd": 0.000010,
                "cache_hit": False,
                "mapped_model": "gemini-3.5-flash-lite",
                "receipt_signature": "sig_mock_py_123",
                "receipt_key_id": "key_v1",
            },
        }
        return httpx.Response(
            status_code=200,
            headers={
                "content-type": "application/json",
                "x-prune-provider": "google",
                "x-prune-cache-hit": "false",
            },
            json=response_body,
        )

    transport = httpx.MockTransport(mock_handler)
    http_client = httpx.Client(transport=transport)

    client = FinGuardPruneClient(
        enabled=True,
        api_key="prune_live_mock_key_999",
        base_url="https://api.withprune.com/v1",
        http_client=http_client,
    )

    resp = client.create_chat_completion(
        messages=[{"role": "user", "content": "Feed calculation for Pond 1"}],
        category=RequestCategory.GENERAL_TEXT,
        farm_id="FARM-042",
        feature_id="general_chat",
        workload="finGuard_farm_agent",
        run_id="run_py_01",
        run_budget_usd=0.08,
        max_steps=4,
    )

    assert captured_request["url"] == "https://api.withprune.com/v1/chat/completions"
    headers = captured_request["headers"]
    assert headers["authorization"] == "Bearer prune_live_mock_key_999"
    assert headers["x-prune-key"] == "prune_live_mock_key_999"
    assert headers["x-prune-customer-id"] == "FARM-042"
    assert headers["x-prune-feature-id"] == "general_chat"
    assert headers["x-prune-workload"] == "finGuard_farm_agent"
    assert headers["x-prune-run-id"] == "run_py_01"
    assert headers["x-prune-run-budget-usd"] == "0.080000"
    assert headers["x-prune-max-steps"] == "4"
    assert headers["x-prune-cache"] == "off"

    assert resp.content == "Tilapia feeding rate: 2-3% biomass."
    assert resp.receipt.farm_id == "FARM-042"
    assert resp.receipt.cost_usd == 0.000035
    assert resp.receipt.receipt_signature == "sig_mock_py_123"
    assert resp.receipt.provider == "google"
    assert resp.receipt.actual_model == "gemini-3.5-flash-lite"
    assert resp.receipt.requested_model == "gemini-2.5-flash"
    assert resp.receipt.total_tokens == 60
    assert resp.receipt.retry_count == 0
    assert resp.receipt.latency_ms is not None


def test_spend_cap_error_refuses_retry():
    call_count = 0

    def mock_handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        return httpx.Response(
            status_code=429,
            headers={"content-type": "application/json", "x-prune-shield-code": "spend_cap"},
            json={"error": "Daily spending limit reached"},
        )

    transport = httpx.MockTransport(mock_handler)
    http_client = httpx.Client(transport=transport)

    client = FinGuardPruneClient(
        enabled=True,
        api_key="prune_mock_key",
        max_retries=3,
        http_client=http_client,
    )

    with pytest.raises(PruneSpendCapError):
        client.create_chat_completion(
            messages=[{"role": "user", "content": "ping"}],
            category=RequestCategory.GENERAL_TEXT,
        )

    # Spend cap must NEVER retry
    assert call_count == 1


def test_authentication_error_refuses_retry():
    call_count = 0

    def mock_handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        return httpx.Response(
            status_code=401,
            headers={"content-type": "application/json"},
            json={"error": "Invalid Prune API Key"},
        )

    transport = httpx.MockTransport(mock_handler)
    http_client = httpx.Client(transport=transport)

    client = FinGuardPruneClient(
        enabled=True,
        api_key="prune_bad_key",
        max_retries=2,
        http_client=http_client,
    )

    with pytest.raises(PruneAuthenticationError):
        client.create_chat_completion(
            messages=[{"role": "user", "content": "ping"}],
            category=RequestCategory.GENERAL_TEXT,
        )

    assert call_count == 1


def test_transient_shield_unavailable_retries_and_succeeds():
    call_count = 0

    def mock_handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return httpx.Response(
                status_code=503,
                headers={"content-type": "application/json", "x-prune-shield-code": "shield_unavailable"},
                json={"error": "Shield policy database timeout"},
            )
        return httpx.Response(
            status_code=200,
            headers={"content-type": "application/json"},
            json={
                "id": "req_recovery_02",
                "model": "gemini-1.5-flash",
                "choices": [{"message": {"content": "Recovery successful"}}],
            },
        )

    transport = httpx.MockTransport(mock_handler)
    http_client = httpx.Client(transport=transport)

    client = FinGuardPruneClient(
        enabled=True,
        api_key="prune_mock_key",
        max_retries=2,
        http_client=http_client,
    )

    resp = client.create_chat_completion(
        messages=[{"role": "user", "content": "hello"}],
        category=RequestCategory.GENERAL_TEXT,
    )

    assert call_count == 2
    assert resp.content == "Recovery successful"

