"""FinGuard-PruneIntegration: Python Client Implementation."""

from __future__ import annotations

import random
import time
from typing import Any, Dict, List, Optional
import httpx

from src.config import FinGuardPruneConfig, load_config, validate_config
from src.errors import (
    PruneDirectFallbackProhibitedError,
    PruneError,
    PruneGatewayDisabledError,
    PruneNetworkError,
    PruneTimeoutError,
    map_http_error_to_prune_error,
)
from src.metadata import build_gateway_headers
from src.receipt import FinGuardReceipt, extract_receipt, verify_receipt_online
from src.router import RequestCategory, RoutingDecision, classify_request


class ChatCompletionResponse:
    """Standardized response from FinGuard AI Gateway."""

    def __init__(
        self,
        content: str,
        model: str,
        receipt: FinGuardReceipt,
        routing: RoutingDecision,
        raw_response: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.content = content
        self.model = model
        self.receipt = receipt
        self.routing = routing
        self.raw_response = raw_response


class FinGuardPruneClient:
    """Enterprise client for governing AI requests between FinGuard and Prune AI Gateway."""

    def __init__(
        self,
        config: Optional[FinGuardPruneConfig] = None,
        http_client: Optional[httpx.Client] = None,
        **config_overrides: Any,
    ) -> None:
        self.config = config or load_config(**config_overrides)
        self._http_client = http_client

    def _get_client(self) -> httpx.Client:
        if self._http_client is not None:
            return self._http_client
        return httpx.Client(timeout=self.config.timeout_seconds)

    def create_chat_completion(
        self,
        messages: List[Dict[str, str]],
        category: RequestCategory = RequestCategory.GENERAL_TEXT,
        model: Optional[str] = None,
        farm_id: Optional[str] = None,
        feature_id: Optional[str] = None,
        workload: Optional[str] = None,
        run_id: Optional[str] = None,
        run_budget_usd: Optional[float] = None,
        max_steps: Optional[int] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
        verify_receipt: bool = False,
        has_images: bool = False,
        is_voice_session: bool = False,
        has_tool_calls: bool = False,
        contains_farm_telemetry: bool = False,
        contains_sensitive_data: bool = False,
    ) -> ChatCompletionResponse:
        """Execute a governed AI request with routing, Shield policies, and receipt normalization."""
        start_time = time.perf_counter()

        # 1. Classify request
        routing = classify_request(
            category=category,
            feature_id=feature_id or self.config.default_feature_id,
            has_images=has_images,
            is_voice_session=is_voice_session,
            has_tool_calls=has_tool_calls,
            contains_farm_telemetry=contains_farm_telemetry,
            contains_sensitive_data=contains_sensitive_data,
        )

        target_model = model or self.config.gemini_model
        resolved_feature_id = feature_id or routing.feature_id
        resolved_workload = workload or self.config.default_workload

        # 2. Check direct Gemini requirement
        if routing.route_target == "direct_gemini":
            if not self.config.allow_direct_fallback:
                raise PruneDirectFallbackProhibitedError(
                    f"Request category [{category.value}] requires direct provider routing, "
                    f"but direct fallback is prohibited."
                )
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return ChatCompletionResponse(
                content=f"[DIRECT_GEMINI_FALLBACK] Request category {category.value} bypassed Prune gateway.",
                model=target_model,
                routing=routing,
                receipt=FinGuardReceipt(
                    request_id=f"direct_{int(time.time()*1000)}",
                    farm_id=farm_id,
                    feature_id=resolved_feature_id,
                    workload=resolved_workload,
                    requested_model=target_model,
                    actual_model=target_model,
                    provider="gemini",
                    cache_hit=False,
                    cache_type=None,
                    input_tokens=None,
                    output_tokens=None,
                    total_tokens=None,
                    cost_usd=None,
                    cost_saved_usd=None,
                    tokens_saved=None,
                    optimizations_applied=["direct_bypass"],
                    receipt_verification_status="skipped",
                    latency_ms=latency_ms,
                    retry_count=0,
                ),
            )

        # 3. Check gateway enabled status
        if not self.config.enabled:
            if self.config.allow_direct_fallback:
                latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                return ChatCompletionResponse(
                    content="[GATEWAY_DISABLED_DIRECT] Prune gateway is disabled; direct fallback engaged.",
                    model=target_model,
                    routing=routing,
                    receipt=FinGuardReceipt(
                        request_id=f"disabled_{int(time.time()*1000)}",
                        farm_id=farm_id,
                        feature_id=resolved_feature_id,
                        workload=resolved_workload,
                        requested_model=target_model,
                        actual_model=target_model,
                        provider="gemini",
                        cache_hit=False,
                        cache_type=None,
                        input_tokens=None,
                        output_tokens=None,
                        total_tokens=None,
                        cost_usd=None,
                        cost_saved_usd=None,
                        tokens_saved=None,
                        optimizations_applied=["gateway_disabled"],
                        receipt_verification_status="skipped",
                        latency_ms=latency_ms,
                        retry_count=0,
                    ),
                )
            raise PruneGatewayDisabledError()

        validate_config(self.config)

        # 4. Build gateway headers
        headers = build_gateway_headers(
            api_key=self.config.api_key,
            customer_id=farm_id,
            feature_id=resolved_feature_id,
            workload=resolved_workload,
            run_id=run_id,
            run_budget_usd=run_budget_usd,
            max_steps=max_steps,
            cache_policy=routing.cache_policy,
        )

        json_body = {
            "model": target_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        endpoint_url = f"{self.config.base_url}/chat/completions"

        # 5. Execute request with bounded retries for transient errors (exponential backoff + jitter)
        attempts = 0
        max_attempts = 1 + self.config.max_retries

        while attempts < max_attempts:
            attempts += 1
            try:
                client = self._get_client()
                response = client.post(endpoint_url, headers=headers, json=json_body)

                if response.status_code >= 400:
                    shield_code = response.headers.get("x-prune-shield-code")
                    prune_err = map_http_error_to_prune_error(
                        response.status_code, response.text, shield_code
                    )

                    if prune_err.is_retryable and attempts < max_attempts:
                        jitter = random.uniform(0.01, 0.05)
                        delay = min(1.0, 0.2 * (2 ** (attempts - 1)) + jitter)
                        time.sleep(delay)
                        continue
                    raise prune_err

                resp_data = response.json()
                choices = resp_data.get("choices") or []
                content = choices[0].get("message", {}).get("content", "") if choices else ""

                header_dict = dict(response.headers)
                request_id = resp_data.get("id") or header_dict.get("x-request-id") or f"req_{int(time.time()*1000)}"

                latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                retry_count = attempts - 1
                verification_status = "unverified"

                if verify_receipt and resp_data.get("prune_metadata"):
                    verify_result = verify_receipt_online(
                        resp_data["prune_metadata"],
                        base_url=self.config.base_url,
                        api_key=self.config.api_key,
                    )
                    verification_status = "verified" if verify_result.get("valid") else "failed"

                receipt = extract_receipt(
                    request_id=request_id,
                    farm_id=farm_id,
                    feature_id=resolved_feature_id,
                    workload=resolved_workload,
                    requested_model=target_model,
                    response_headers=header_dict,
                    response_body=resp_data,
                    latency_ms=latency_ms,
                    retry_count=retry_count,
                    receipt_verification_status=verification_status,
                )

                return ChatCompletionResponse(
                    content=content,
                    model=receipt.actual_model or resp_data.get("model") or target_model,
                    receipt=receipt,
                    routing=routing,
                    raw_response=resp_data,
                )

            except httpx.TimeoutException as exc:
                if attempts >= max_attempts:
                    raise PruneTimeoutError(f"Gateway request timed out: {exc}") from exc
                jitter = random.uniform(0.01, 0.05)
                delay = min(1.0, 0.2 * (2 ** (attempts - 1)) + jitter)
                time.sleep(delay)
            except httpx.NetworkError as exc:
                if attempts >= max_attempts:
                    raise PruneNetworkError(str(exc)) from exc
                jitter = random.uniform(0.01, 0.05)
                delay = min(1.0, 0.2 * (2 ** (attempts - 1)) + jitter)
                time.sleep(delay)
            except PruneError as exc:
                if not exc.is_retryable or attempts >= max_attempts:
                    raise
                jitter = random.uniform(0.01, 0.05)
                delay = min(1.0, 0.2 * (2 ** (attempts - 1)) + jitter)
                time.sleep(delay)

        raise PruneError("Unexpected execution termination in gateway retry loop")
