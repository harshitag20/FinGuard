"""Opt-in live verification test against Prune AI Gateway.

STRICT SAFETY RULES:
- Skipped by default in CI, Docker builds, and ordinary pytest runs.
- Requires explicit environment variable: ENABLE_LIVE_PRUNE_TESTS=true.
- Requires valid PRUNE_API_KEY and optionally GEMINI_API_KEY.
- Uses minimal token prompt ('Explain dissolved oxygen in aquaculture in two sentences.') with zero sensitive farm data.
- Never logs API keys or raw authorization headers.
"""

import os
import pytest
import httpx
from src.client import FinGuardPruneClient
from src.receipt import extract_receipt, verify_receipt_online
from src.router import RequestCategory

LIVE_FLAG = os.environ.get("ENABLE_LIVE_PRUNE_TESTS", "false").lower() == "true"
PRUNE_KEY = os.environ.get("PRUNE_API_KEY", "")
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
TARGET_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")


@pytest.mark.skipif(not LIVE_FLAG, reason="Live Prune tests disabled by default (ENABLE_LIVE_PRUNE_TESTS != true)")
def test_live_prune_gateway_dissolved_oxygen():
    if not PRUNE_KEY or not PRUNE_KEY.startswith("prune_"):
        pytest.skip("Valid PRUNE_API_KEY starting with 'prune_' is required for live tests.")

    # Execute harmless live prompt
    url = "https://api.withprune.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {PRUNE_KEY}",
        "X-Prune-Key": PRUNE_KEY,
        "Content-Type": "application/json",
        "X-Prune-Feature-Id": "live_verification_audit",
        "X-Prune-Workload": "finGuard_verification",
    }
    if GEMINI_KEY:
        headers["X-Prune-Allow-Inline-Key"] = "true"

    payload = {
        "model": TARGET_MODEL,
        "messages": [
            {"role": "user", "content": "Explain dissolved oxygen in aquaculture in two sentences."}
        ],
        "max_tokens": 100,
    }
    if GEMINI_KEY:
        payload["user_api_key"] = GEMINI_KEY

    response = httpx.post(url, headers=headers, json=payload, timeout=30.0)
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}: {response.text}"

    data = response.json()
    assert "candidates" in data or "choices" in data, "Response must contain candidates or choices"

    meta = data.get("prune_metadata")
    assert meta is not None, "Response must contain prune_metadata"
    assert isinstance(meta, dict)

    # Verify provider header or metadata
    provider = response.headers.get("x-prune-provider") or meta.get("provider")
    assert provider == "gemini", f"Expected provider 'gemini', got {provider}"

    # Verify receipt signature presence
    sig = meta.get("receipt_signature") or response.headers.get("x-prune-receipt-signature")
    assert sig is not None, "Receipt must contain cryptographic signature"

    # Extract normalized receipt and assert full observability
    header_dict = dict(response.headers)
    request_id = data.get("id") or header_dict.get("x-request-id") or "req_live"
    receipt = extract_receipt(
        request_id=request_id,
        feature_id="live_verification_audit",
        workload="finGuard_verification",
        requested_model=TARGET_MODEL,
        response_headers=header_dict,
        response_body=data,
        farm_id="FARM-AUDIT-001",
    )

    assert receipt.requested_model == TARGET_MODEL
    # Strict observability check: Actual model served is gemini-3.5-flash-lite, NEVER reported as requested_model
    assert receipt.actual_model == "gemini-3.5-flash-lite"
    assert receipt.actual_model != receipt.requested_model
    assert receipt.provider == "gemini"
    assert receipt.total_tokens is not None and receipt.total_tokens > 0
    assert receipt.receipt_signature is not None
    assert receipt.receipt_key_id is not None

    # Verify receipt via official Prune endpoint
    verify_result = verify_receipt_online(meta, api_key=PRUNE_KEY)
    assert verify_result.get("valid") is True, f"Receipt signature verification failed: {verify_result}"
