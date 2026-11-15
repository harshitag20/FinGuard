"""Unit tests for Python Receipt Normalization and Verification."""

import base64
import json
import pytest
from src.receipt import (
    ReceiptVerificationError,
    extract_receipt,
    verify_receipt_offline,
    verify_receipt_online,
)
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey


def test_extract_receipt_full():
    raw_body = {
        "id": "chatcmpl_test_py_101",
        "model": "gemini-2.5-flash",
        "usage": {"prompt_tokens": 50, "completion_tokens": 150},
        "prune_metadata": {
            "provider": "gemini",
            "cache_hit": True,
            "cache_type": "exact",
            "cost_usd": 0.00005,
            "cost_saved_usd": 0.00020,
            "tokens_saved": 50,
            "mapped_model": "gemini-3.5-flash-lite",
            "optimizations_applied": ["exact_cache"],
            "receipt_signature": "sig_mock_py",
            "receipt_key_id": "key_py_01",
            "latency_ms": {"upstream_ms": 115.4},
        },
    }
    headers = {
        "X-Prune-Provider": "gemini",
        "X-Prune-Cache-Hit": "true",
    }

    receipt = extract_receipt(
        request_id="chatcmpl_test_py_101",
        feature_id="farm_agent",
        workload="finGuard_farm_agent",
        requested_model="gemini-2.5-flash",
        response_headers=headers,
        response_body=raw_body,
        farm_id="FARM-002",
        latency_ms=290.5,
        retry_count=1,
    )

    assert receipt.request_id == "chatcmpl_test_py_101"
    assert receipt.farm_id == "FARM-002"
    assert receipt.feature_id == "farm_agent"
    assert receipt.workload == "finGuard_farm_agent"
    assert receipt.requested_model == "gemini-2.5-flash"
    assert receipt.actual_model == "gemini-3.5-flash-lite"
    assert receipt.provider == "gemini"
    assert receipt.cache_hit is True
    assert receipt.cache_type == "exact"
    assert receipt.input_tokens == 50
    assert receipt.output_tokens == 150
    assert receipt.total_tokens == 200
    assert receipt.cost_usd == 0.00005
    assert receipt.cost_saved_usd == 0.00020
    assert receipt.tokens_saved == 50
    assert receipt.receipt_signature == "sig_mock_py"
    assert receipt.receipt_key_id == "key_py_01"
    assert receipt.latency_ms == 290.5
    assert receipt.upstream_latency_ms == 115.4
    assert receipt.retry_count == 1
    assert receipt.receipt_verification_status == "unverified"


def test_extract_receipt_missing_fields_never_reports_requested_as_actual():
    minimal_body = {
        "choices": [{"message": {"content": "Normal water quality parameters"}}],
    }
    receipt = extract_receipt(
        request_id="req_empty_01",
        feature_id="water_quality",
        workload="finGuard_farm_agent",
        requested_model="gemini-2.5-flash",
        response_headers={},
        response_body=minimal_body,
    )

    assert receipt.request_id == "req_empty_01"
    assert receipt.farm_id is None
    assert receipt.requested_model == "gemini-2.5-flash"
    # Actual model must be None, NOT the requested model
    assert receipt.actual_model is None
    assert receipt.provider is None
    assert receipt.cache_hit is False
    assert receipt.cache_type is None
    assert receipt.input_tokens is None
    assert receipt.output_tokens is None
    assert receipt.total_tokens is None
    assert receipt.cost_usd is None
    assert receipt.cost_saved_usd is None
    assert receipt.tokens_saved is None
    assert receipt.receipt_signature is None
    assert receipt.receipt_key_id is None
    assert receipt.latency_ms is None
    assert receipt.retry_count == 0
    assert receipt.optimizations_applied == []


def test_offline_ed25519_receipt_verification():
    priv_key = Ed25519PrivateKey.generate()
    pub_key = priv_key.public_key()
    pub_bytes = pub_key.public_bytes_raw()

    receipt_dict = {
        "request_id": "req_crypto_test",
        "cost_usd": 0.0001,
        "cache_hit": False,
        "model": "gemini-2.5-flash",
    }

    # Sign canonical bytes
    canonical = json.dumps(receipt_dict, sort_keys=True, separators=(",", ":")).encode("utf-8")
    sig_raw = priv_key.sign(canonical)
    sig_b64 = base64.b64encode(sig_raw).decode("utf-8")

    receipt_dict["receipt_signature"] = sig_b64

    # Valid verification
    assert verify_receipt_offline(receipt_dict, pub_bytes) is True

    # Tampered receipt must fail safely with ReceiptVerificationError
    tampered_dict = dict(receipt_dict)
    tampered_dict["cost_usd"] = 0.9999
    with pytest.raises(ReceiptVerificationError, match="signature mismatch"):
        verify_receipt_offline(tampered_dict, pub_bytes)

    # Missing signature must fail safely
    with pytest.raises(ReceiptVerificationError, match="missing 'receipt_signature'"):
        verify_receipt_offline({"cost_usd": 0.001}, pub_bytes)

    # Invalid public key bytes must fail safely
    with pytest.raises(ReceiptVerificationError, match="Invalid Ed25519 public key bytes"):
        verify_receipt_offline(receipt_dict, b"short_key")


def test_online_verification_fails_safely_on_invalid_input():
    # Empty receipt dict fails safely without uncaught exception
    res = verify_receipt_online({})
    assert res["valid"] is False
    assert "empty or malformed" in res["reason"]
