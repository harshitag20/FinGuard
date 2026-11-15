#!/usr/bin/env python3
"""FinGuard AI Gateway Integration CLI Demonstration.

Demonstrates request classification, policy routing, Prune Shield enforcement,
and receipt normalization across different FinGuard request categories.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

# Add python adapter source to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "python"))

import httpx
from src.client import FinGuardPruneClient
from src.config import FinGuardPruneConfig
from src.errors import (
    PruneAuthenticationError,
    PruneDirectFallbackProhibitedError,
    PruneGatewayDisabledError,
    PruneShieldError,
    PruneSpendCapError,
)
from src.router import RequestCategory


def print_banner(title: str) -> None:
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def create_mock_transport() -> httpx.MockTransport:
    """Mock HTTP transport simulating Prune Gateway responses for offline demo."""
    def handler(request: httpx.Request) -> httpx.Response:
        headers = {k.lower(): v for k, v in request.headers.items()}
        body = json.loads(request.read().decode("utf-8"))

        shield_code = headers.get("x-mock-shield-code")
        if shield_code == "spend_cap":
            return httpx.Response(
                status_code=429,
                headers={"content-type": "application/json", "x-prune-shield-code": "spend_cap"},
                json={"error": "Daily budget ceiling ($50.00) reached in Prune Shield."},
            )

        # Standard simulated response
        cache_policy = headers.get("x-prune-cache", "off")
        is_cache_hit = cache_policy == "exact"

        prompt_tokens = 42
        comp_tokens = 95
        cost_usd = 0.0 if is_cache_hit else 0.000045
        saved_usd = 0.000180 if is_cache_hit else 0.000015

        res_body = {
            "id": f"req_prune_demo_{os.urandom(4).hex()}",
            "model": body.get("model", "gemini-1.5-flash"),
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": (
                            "Simulated Gemini Response: Maintain dissolved oxygen above 5.0 mg/L. "
                            "Immediate emergency aeration recommended if DO drops below 3.0 mg/L."
                        ),
                    }
                }
            ],
            "usage": {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": comp_tokens,
                "total_tokens": prompt_tokens + comp_tokens,
            },
            "prune_metadata": {
                "provider": "gemini",
                "cache_hit": is_cache_hit,
                "cache_type": "exact" if is_cache_hit else None,
                "mapped_model": "gemini-3.5-flash-lite",
                "cost_usd": cost_usd,
                "cost_saved_usd": saved_usd,
                "tokens_saved": prompt_tokens if is_cache_hit else 0,
                "optimizations_applied": ["exact_match_cache"] if is_cache_hit else ["cheaper_model_routing"],
                "receipt_signature": "MEQCIQD8x1fMockEd25519SignatureBase64StringForFinGuardAudit==",
                "receipt_key_id": "prune_pubkey_2026_v1",
                "latency_ms": {"upstream_ms": 110.2},
            },
        }

        return httpx.Response(
            status_code=200,
            headers={
                "content-type": "application/json",
                "x-prune-provider": "google",
                "x-prune-cache-hit": "true" if is_cache_hit else "false",
                "x-prune-cost-saved": str(saved_usd),
            },
            json=res_body,
        )

    return httpx.MockTransport(handler)


def run_single_demo(
    client: FinGuardPruneClient,
    request_file: Path,
    description: str,
) -> None:
    print_banner(f"DEMO CASE: {description}")
    with open(request_file, "r", encoding="utf-8") as f:
        req_data = json.load(f)

    category_str = req_data.get("category", "general_text")
    category = RequestCategory(category_str)

    print(f"[*] Input File: {request_file.name}")
    print(f"[*] FinGuard Category: {category.value}")
    print(f"[*] Farm ID: {req_data.get('farm_id')}")
    print(f"[*] Feature ID: {req_data.get('feature_id')}")
    print(f"[*] Prompt: {req_data['messages'][0]['content'][:90]}...")

    try:
        response = client.create_chat_completion(
            category=category,
            messages=req_data["messages"],
            farm_id=req_data.get("farm_id"),
            feature_id=req_data.get("feature_id"),
            workload=req_data.get("workload"),
            run_id=req_data.get("run_id"),
            run_budget_usd=req_data.get("run_budget_usd"),
            max_steps=req_data.get("max_steps"),
            has_images=req_data.get("has_images", False),
            is_voice_session=req_data.get("is_voice_session", False),
            contains_farm_telemetry=req_data.get("contains_farm_telemetry", False),
            contains_sensitive_data=req_data.get("contains_sensitive_data", False),
        )

        print("\n--- [ROUTING & GOVERNANCE DECISION] ---")
        print(f"Route Target : {response.routing.route_target}")
        print(f"Cache Policy : {response.routing.cache_policy}")
        print(f"Decision Reason: {response.routing.reason}")

        print("\n--- [INTELLIGENCE OUTPUT] ---")
        print(f"Model Used   : {response.model}")
        print(f"Content      : {response.content}")

        print("\n--- [NORMALIZED PRUNE RECEIPT] ---")
        r = response.receipt
        print(f"Request ID   : {r.request_id}")
        print(f"Provider     : {r.provider}")
        print(f"Req Model    : {r.requested_model}")
        print(f"Actual Model : {r.actual_model}")
        print(f"Cache Hit    : {r.cache_hit} (Type: {r.cache_type})")
        print(f"Tokens       : Input: {r.input_tokens}, Output: {r.output_tokens}, Total: {r.total_tokens}, Saved: {r.tokens_saved}")
        print(f"Latency      : Total: {r.latency_ms}ms, Upstream: {r.upstream_latency_ms}ms, Retries: {r.retry_count}")
        print(f"Verification : {r.receipt_verification_status}")
        print(f"Cost (USD)   : ${r.cost_usd:.6f}" if r.cost_usd is not None else "Cost (USD)   : N/A")
        print(f"Saved (USD)  : ${r.cost_saved_usd:.6f}" if r.cost_saved_usd is not None else "Saved (USD)  : N/A")
        print(f"Optimizations: {r.optimizations_applied}")
        print(f"Signature    : {r.receipt_signature[:40]}..." if r.receipt_signature else "Signature    : None")
        print(f"Key ID       : {r.receipt_key_id}")

    except PruneDirectFallbackProhibitedError as e:
        print(f"\n[SECURITY ACTION] DIRECT ROUTE ISOLATED: {e}")
    except PruneSpendCapError as e:
        print(f"\n[SHIELD BLOCKED] SPENDING CEILING ENFORCED: {e}")
    except Exception as e:
        print(f"\n[ERROR] Request failed as expected: {type(e).__name__} - {e}")


def main() -> None:
    parser = argparse.ArgumentParser(description="FinGuard Prune AI Gateway CLI Demonstration")
    parser.add_argument("--live", action="store_true", help="Use live Prune API key from environment")
    parser.add_argument("--request", type=str, help="Specific sample request JSON file to run")
    args = parser.parse_args()

    samples_dir = BASE_DIR / "demo" / "sample_requests"

    if args.live:
        api_key = os.environ.get("PRUNE_API_KEY", "")
        if not api_key:
            print("ERROR: --live requires PRUNE_API_KEY set in environment.")
            sys.exit(1)
        client = FinGuardPruneClient(
            api_key=api_key,
            enabled=True,
            mode="active",
            allow_direct_fallback=False,
        )
        print("[!] Running in LIVE mode against https://api.withprune.com/v1")
    else:
        # Mock mode
        http_client = httpx.Client(transport=create_mock_transport())
        client = FinGuardPruneClient(
            api_key="prune_mock_demo_key_7788",
            enabled=True,
            mode="shadow",
            allow_direct_fallback=False,
            http_client=http_client,
        )
        print("[!] Running in OFFLINE MOCK mode (zero network calls, simulated Shield/receipts)")

    if args.request:
        req_path = Path(args.request)
        run_single_demo(client, req_path, f"Custom Request: {req_path.name}")
        return

    # Run complete demonstration suite
    demos = [
        (samples_dir / "general_text.json", "General Text Request (Prune Proxied)"),
        (samples_dir / "disease_diagnosis.json", "Clinical Disease Diagnosis (Prune Proxied, Strict NO CACHE)"),
        (samples_dir / "farm_telemetry.json", "Farm Agent Loop (Prune Proxied, Run Budget Enforced)"),
        (samples_dir / "voice_live_bypass.json", "Gemini Live Audio (Isolated to Direct Provider)"),
        (samples_dir / "multimodal_bypass.json", "Fish Disease Image (Unverified Gateway - Direct Provider)"),
    ]

    for req_file, desc in demos:
        if req_file.exists():
            run_single_demo(client, req_file, desc)


if __name__ == "__main__":
    main()

