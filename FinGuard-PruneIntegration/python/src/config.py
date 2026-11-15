"""FinGuard-PruneIntegration: Python Configuration Loader & Validator."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Literal, Optional


PruneMode = Literal["shadow", "active"]
PruneCachePolicy = Literal["disabled", "exact", "semantic"]


@dataclass
class FinGuardPruneConfig:
    api_key: str
    base_url: str = "https://api.withprune.com/v1"
    enabled: bool = False
    mode: PruneMode = "shadow"
    default_feature_id: str = "farm_agent"
    default_workload: str = "finGuard_farm_agent"
    timeout_seconds: float = 30.0
    max_retries: int = 1
    cache_policy: PruneCachePolicy = "disabled"
    allow_direct_fallback: bool = False
    gemini_model: str = "gemini-2.5-flash"


def load_config(
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    enabled: Optional[bool] = None,
    mode: Optional[PruneMode] = None,
    default_feature_id: Optional[str] = None,
    default_workload: Optional[str] = None,
    timeout_seconds: Optional[float] = None,
    max_retries: Optional[int] = None,
    cache_policy: Optional[PruneCachePolicy] = None,
    allow_direct_fallback: Optional[bool] = None,
    gemini_model: Optional[str] = None,
) -> FinGuardPruneConfig:
    """Load configuration from environment variables with optional parameter overrides."""
    env = os.environ

    env_enabled = env.get("PRUNE_ENABLED", "false").lower() == "true"
    env_fallback = env.get("PRUNE_ALLOW_DIRECT_FALLBACK", "false").lower() == "true"
    env_mode = env.get("PRUNE_MODE", "shadow").lower()
    if env_mode not in ("shadow", "active"):
        env_mode = "shadow"

    env_cache = env.get("PRUNE_CACHE_POLICY", "disabled").lower()
    if env_cache not in ("disabled", "exact", "semantic"):
        env_cache = "disabled"

    return FinGuardPruneConfig(
        api_key=api_key if api_key is not None else env.get("PRUNE_API_KEY", ""),
        base_url=(base_url or env.get("PRUNE_BASE_URL", "https://api.withprune.com/v1")).rstrip("/"),
        enabled=enabled if enabled is not None else env_enabled,
        mode=mode or env_mode,  # type: ignore
        default_feature_id=default_feature_id or env.get("PRUNE_DEFAULT_FEATURE_ID", "farm_agent"),
        default_workload=default_workload or env.get("PRUNE_DEFAULT_WORKLOAD", "finGuard_farm_agent"),
        timeout_seconds=timeout_seconds if timeout_seconds is not None else float(env.get("PRUNE_TIMEOUT_SECONDS", "30")),
        max_retries=max_retries if max_retries is not None else int(env.get("PRUNE_MAX_RETRIES", "1")),
        cache_policy=cache_policy or env_cache,  # type: ignore
        allow_direct_fallback=allow_direct_fallback if allow_direct_fallback is not None else env_fallback,
        gemini_model=gemini_model or env.get("GEMINI_MODEL", "gemini-2.5-flash"),
    )


def validate_config(config: FinGuardPruneConfig) -> None:
    """Validate configuration rules before executing gateway operations."""
    if config.enabled and not config.api_key:
        raise ValueError(
            "Prune gateway is enabled (PRUNE_ENABLED=true) but PRUNE_API_KEY is missing."
        )
    if config.max_retries < 0 or config.max_retries > 5:
        raise ValueError(f"Invalid max_retries ({config.max_retries}). Must be 0-5.")
    if config.timeout_seconds < 1.0:
        raise ValueError(f"Invalid timeout ({config.timeout_seconds}s). Minimum is 1.0s.")

