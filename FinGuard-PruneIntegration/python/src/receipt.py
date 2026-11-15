"""FinGuard-PruneIntegration: Normalized Internal Receipt Model & Extractor for Python."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import base64
import json


class ReceiptVerificationError(Exception):
    """Raised when receipt verification fails."""
    pass


@dataclass
class FinGuardReceipt:
    request_id: str
    farm_id: Optional[str]
    feature_id: str
    workload: str
    requested_model: str
    actual_model: Optional[str]
    provider: Optional[str] = None
    cache_hit: bool = False
    cache_type: Optional[str] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    cost_usd: Optional[float] = None
    cost_saved_usd: Optional[float] = None
    tokens_saved: Optional[int] = None
    optimizations_applied: List[str] = field(default_factory=list)
    receipt_signature: Optional[str] = None
    receipt_key_id: Optional[str] = None
    receipt_verification_status: str = "unverified"  # "verified" | "failed" | "unverified" | "skipped"
    latency_ms: Optional[float] = None
    upstream_latency_ms: Optional[float] = None
    retry_count: int = 0
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    raw_metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert receipt to JSON-serializable dictionary."""
        return {
            "request_id": self.request_id,
            "farm_id": self.farm_id,
            "feature_id": self.feature_id,
            "workload": self.workload,
            "requested_model": self.requested_model,
            "actual_model": self.actual_model,
            "provider": self.provider,
            "cache_hit": self.cache_hit,
            "cache_type": self.cache_type,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "total_tokens": self.total_tokens,
            "cost_usd": self.cost_usd,
            "cost_saved_usd": self.cost_saved_usd,
            "tokens_saved": self.tokens_saved,
            "optimizations_applied": self.optimizations_applied,
            "receipt_signature": self.receipt_signature,
            "receipt_key_id": self.receipt_key_id,
            "receipt_verification_status": self.receipt_verification_status,
            "latency_ms": self.latency_ms,
            "upstream_latency_ms": self.upstream_latency_ms,
            "retry_count": self.retry_count,
            "created_at": self.created_at,
            "raw_metadata": self.raw_metadata,
        }


def extract_receipt(
    request_id: str,
    feature_id: str,
    workload: str,
    requested_model: str,
    response_headers: Dict[str, str],
    response_body: Dict[str, Any],
    farm_id: Optional[str] = None,
    latency_ms: Optional[float] = None,
    retry_count: int = 0,
    receipt_verification_status: str = "unverified",
) -> FinGuardReceipt:
    """Extract and normalize receipt metrics from Prune response body and headers.
    
    NEVER reports requested_model as actual_model.
    """
    meta: Dict[str, Any] = response_body.get("prune_metadata") or {}

    # Case-insensitive header lookup
    normalized_headers = {k.lower(): v for k, v in response_headers.items()}

    # Provider attribution
    provider = meta.get("provider") or normalized_headers.get("x-prune-provider")

    # Cache hit resolution
    header_cache_hit = normalized_headers.get("x-prune-cache-hit", "").lower() == "true"
    cache_hit = bool(meta.get("cache_hit") or header_cache_hit)

    # Cache type
    cache_type = meta.get("cache_type") or normalized_headers.get("x-prune-cache-type")

    # Actual model served by Prune (never default to requested_model)
    served_model = (
        meta.get("mapped_model")
        or meta.get("receipt_model")
        or meta.get("routed_model")
        or response_body.get("modelVersion")
        or normalized_headers.get("x-prune-routed-model")
    )
    actual_model = str(served_model) if served_model else None

    # Tokens
    usage = response_body.get("usage") or response_body.get("usageMetadata") or {}
    input_tokens = usage.get("prompt_tokens") or usage.get("promptTokenCount")
    output_tokens = usage.get("completion_tokens") or usage.get("candidatesTokenCount")
    total_tokens = usage.get("total_tokens") or usage.get("totalTokenCount")
    if total_tokens is None and (input_tokens is not None or output_tokens is not None):
        total_tokens = (input_tokens or 0) + (output_tokens or 0)

    # Cost & savings
    cost_usd = meta.get("cost_usd") or meta.get("cost_with_prune_usd")
    cost_saved_header = normalized_headers.get("x-prune-cost-saved")
    cost_saved_usd = meta.get("cost_saved_usd") or meta.get("cost_saved")
    if cost_saved_usd is None and cost_saved_header:
        try:
            cost_saved_usd = float(cost_saved_header)
        except ValueError:
            pass

    tokens_saved = meta.get("tokens_saved")

    # Optimizations applied
    optimizations: List[str] = []
    meta_opts = meta.get("optimizations_applied")
    if isinstance(meta_opts, list):
        optimizations.extend(str(opt) for opt in meta_opts if isinstance(opt, str))
    route_applied = normalized_headers.get("x-prune-route-applied")
    if route_applied and f"route:{route_applied}" not in optimizations:
        optimizations.append(f"route:{route_applied}")
    if meta.get("model_remapped") and meta.get("remap_reason"):
        optimizations.append(f"remap:{meta.get('remap_reason')}")

    # Signatures
    signature = (
        meta.get("receipt_signature")
        or meta.get("signature")
        or normalized_headers.get("x-prune-receipt-signature")
        or normalized_headers.get("x-prune-signature")
    )
    key_id = (
        meta.get("receipt_signing_key_id")
        or meta.get("receipt_key_id")
        or meta.get("key_id")
        or normalized_headers.get("x-prune-key-id")
    )

    # Latency breakdown
    upstream_header = normalized_headers.get("x-prune-upstream-ms")
    meta_latency = meta.get("latency_ms") or {}
    upstream_latency_ms = meta_latency.get("upstream_ms")
    if upstream_latency_ms is None and upstream_header:
        try:
            upstream_latency_ms = float(upstream_header)
        except ValueError:
            pass

    return FinGuardReceipt(
        request_id=request_id,
        farm_id=farm_id,
        feature_id=feature_id,
        workload=workload,
        requested_model=requested_model,
        actual_model=actual_model,
        provider=provider,
        cache_hit=cache_hit,
        cache_type=cache_type,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=total_tokens,
        cost_usd=cost_usd,
        cost_saved_usd=cost_saved_usd,
        tokens_saved=tokens_saved,
        optimizations_applied=optimizations,
        receipt_signature=signature,
        receipt_key_id=key_id,
        receipt_verification_status=receipt_verification_status,
        latency_ms=latency_ms,
        upstream_latency_ms=upstream_latency_ms,
        retry_count=retry_count,
        raw_metadata=meta if meta else None,
    )


def verify_receipt_offline(
    receipt_data: Dict[str, Any],
    public_key_bytes: bytes,
) -> bool:
    """Offline cryptographic verification of an Ed25519 Prune receipt signature.
    
    Fails safely without throwing unhandled exceptions if the signature or key is malformed.
    """
    if not isinstance(receipt_data, dict):
        raise ReceiptVerificationError("Malformed receipt: must be a dictionary.")

    signature_b64 = receipt_data.get("receipt_signature") or receipt_data.get("signature")
    if not signature_b64:
        raise ReceiptVerificationError("Receipt is missing 'receipt_signature' or 'signature' field.")

    if not public_key_bytes or len(public_key_bytes) != 32:
        raise ReceiptVerificationError(f"Invalid Ed25519 public key bytes (length: {len(public_key_bytes) if public_key_bytes else 0}, expected 32).")

    try:
        sig_bytes = base64.b64decode(signature_b64)
    except Exception as exc:
        raise ReceiptVerificationError(f"Malformed base64 signature: {exc}") from exc

    # Reconstruct canonical canonical JSON excluding the signature field itself
    signed_fields = {k: v for k, v in receipt_data.items() if k not in ("signature", "receipt_signature")}
    canonical_bytes = json.dumps(signed_fields, sort_keys=True, separators=(",", ":")).encode("utf-8")

    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

    try:
        pub = Ed25519PublicKey.from_public_bytes(public_key_bytes)
        pub.verify(sig_bytes, canonical_bytes)
        return True
    except Exception as exc:
        raise ReceiptVerificationError(f"Cryptographic signature mismatch: {exc}") from exc


def verify_receipt_online(
    receipt_meta: Dict[str, Any],
    base_url: str = "https://api.withprune.com/v1",
    api_key: Optional[str] = None,
    timeout: float = 10.0,
) -> Dict[str, Any]:
    """Verify receipt with Prune's official verification endpoint (POST /v1/receipts/verify).

    Fails safely on network or API failures.
    Returns:
        dict containing {"valid": bool, "reason": str, "key_id": str, "signed_at": str}
    """
    if not isinstance(receipt_meta, dict) or not receipt_meta:
        return {"valid": False, "reason": "empty or malformed receipt dictionary"}

    import httpx

    url = f"{base_url.rstrip('/')}/receipts/verify"
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    try:
        resp = httpx.post(url, headers=headers, json={"receipt": receipt_meta}, timeout=timeout)
        if resp.status_code != 200:
            return {"valid": False, "reason": f"Verification endpoint returned {resp.status_code}: {resp.text[:100]}"}
        return resp.json()
    except Exception as exc:
        return {"valid": False, "reason": f"Verification endpoint request failed: {exc}"}
