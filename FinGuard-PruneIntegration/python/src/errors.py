"""FinGuard-PruneIntegration: Standardized Error Hierarchy for Python Adapter."""

from __future__ import annotations

from typing import Optional


class PruneError(Exception):
    """Base exception for Prune gateway errors."""

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        is_retryable: bool = False,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.is_retryable = is_retryable


class PruneAuthenticationError(PruneError):
    """Raised when API key is missing, invalid, or revoked (HTTP 401)."""

    def __init__(self, message: str = "Prune API key invalid, revoked, or missing.") -> None:
        super().__init__(message, status_code=401, is_retryable=False)


class PruneShieldError(PruneError):
    """Raised when Prune Shield rejects a request before forwarding upstream."""

    def __init__(
        self,
        message: str,
        shield_code: str,
        status_code: int = 429,
        is_retryable: bool = False,
    ) -> None:
        super().__init__(f"{message} (Shield Code: {shield_code})", status_code=status_code, is_retryable=is_retryable)
        self.shield_code = shield_code


class PruneSpendCapError(PruneShieldError):
    """Raised when an account, key, or run budget is exhausted (must not be retried)."""

    def __init__(self, message: str = "Prune Shield rejected request: Spending cap reached.") -> None:
        super().__init__(message, shield_code="spend_cap", status_code=429, is_retryable=False)


class PruneRateLimitError(PruneShieldError):
    """Raised when per-minute rate limits are exceeded (transient / retryable)."""

    def __init__(self, message: str = "Prune Shield rate limit reached.") -> None:
        super().__init__(message, shield_code="rate_limit", status_code=429, is_retryable=True)


class PruneShieldUnavailableError(PruneShieldError):
    """Raised when Shield policy database check times out (fail-closed policy enforced)."""

    def __init__(self, message: str = "Prune Shield policy check failed closed.") -> None:
        super().__init__(message, shield_code="shield_unavailable", status_code=503, is_retryable=True)


class PruneTimeoutError(PruneError):
    """Raised when a gateway call exceeds the configured timeout."""

    def __init__(self, message: str = "Prune gateway request timed out.") -> None:
        super().__init__(message, status_code=504, is_retryable=True)


class PruneNetworkError(PruneError):
    """Raised on connection failures to the gateway."""

    def __init__(self, message: str) -> None:
        super().__init__(f"Connection error to Prune gateway: {message}", is_retryable=True)


class PruneGatewayDisabledError(PruneError):
    """Raised when Prune gateway is disabled (PRUNE_ENABLED=false) and fallback is disallowed."""

    def __init__(self, message: str = "Prune AI Gateway is disabled (PRUNE_ENABLED=false).") -> None:
        super().__init__(message, is_retryable=False)


class PruneDirectFallbackProhibitedError(PruneError):
    """Raised when direct Gemini fallback is requested but prohibited by security policy."""

    def __init__(
        self,
        message: str = (
            "Prune gateway call failed or was bypassed, and direct provider fallback "
            "is prohibited (PRUNE_ALLOW_DIRECT_FALLBACK=false)."
        ),
    ) -> None:
        super().__init__(message, status_code=502, is_retryable=False)


def map_http_error_to_prune_error(
    status_code: int,
    body_text: str,
    shield_code: Optional[str] = None,
) -> PruneError:
    """Map HTTP response code and Shield header into a specific domain exception."""
    safe_body = body_text[:300] if body_text else "No response body"

    if shield_code:
        code_lower = shield_code.lower()
        if code_lower == "spend_cap":
            return PruneSpendCapError(f"Spend limit exceeded: {safe_body}")
        if code_lower == "rate_limit":
            return PruneRateLimitError(f"Rate limit exceeded: {safe_body}")
        if code_lower == "shield_unavailable":
            return PruneShieldUnavailableError(f"Shield failed closed: {safe_body}")
        return PruneShieldError(f"Shield rejected request: {safe_body}", shield_code=shield_code, status_code=status_code, is_retryable=status_code >= 500)

    if status_code == 401:
        return PruneAuthenticationError(f"Authentication failed: {safe_body}")
    if status_code == 429:
        return PruneRateLimitError(f"Rate limit exceeded: {safe_body}")
    if status_code >= 500:
        return PruneError(f"Prune gateway error ({status_code}): {safe_body}", status_code=status_code, is_retryable=True)

    return PruneError(f"Prune request failed with status {status_code}: {safe_body}", status_code=status_code, is_retryable=False)

