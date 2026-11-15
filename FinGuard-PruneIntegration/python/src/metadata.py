"""FinGuard-PruneIntegration: Metadata and Header Builders for Python Adapter."""

from __future__ import annotations

from typing import Dict, Optional


def build_gateway_headers(
    api_key: str,
    customer_id: Optional[str] = None,
    feature_id: Optional[str] = None,
    workload: Optional[str] = None,
    run_id: Optional[str] = None,
    run_budget_usd: Optional[float] = None,
    max_steps: Optional[int] = None,
    cache_policy: Optional[str] = None,
) -> Dict[str, str]:
    """Build sanitized HTTP headers for Prune AI Gateway."""
    headers: Dict[str, str] = {
        "Authorization": f"Bearer {api_key}",
        "X-Prune-Key": api_key,
        "Content-Type": "application/json",
    }

    if customer_id:
        headers["X-Prune-Customer-Id"] = customer_id.strip()[:256]

    if feature_id:
        headers["X-Prune-Feature-Id"] = feature_id.strip()[:128]

    if workload:
        headers["X-Prune-Workload"] = workload.strip()[:64]

    if run_id:
        headers["X-Prune-Run-Id"] = run_id.strip()[:128]

    if run_budget_usd is not None and run_budget_usd > 0:
        headers["X-Prune-Run-Budget-Usd"] = f"{run_budget_usd:.6f}"

    if max_steps is not None and max_steps > 0:
        headers["X-Prune-Max-Steps"] = str(int(max_steps))

    if cache_policy:
        headers["X-Prune-Cache"] = "off" if cache_policy == "disabled" else cache_policy

    return headers

