/**
 * FinGuard-PruneIntegration: Standardized Error Hierarchy
 */

export class PruneError extends Error {
  public readonly statusCode?: number;
  public readonly isRetryable: boolean;

  constructor(message: string, statusCode?: number, isRetryable = false) {
    super(message);
    this.name = 'PruneError';
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PruneAuthenticationError extends PruneError {
  constructor(message = 'Prune API key invalid, revoked, or missing.') {
    super(message, 401, false);
    this.name = 'PruneAuthenticationError';
  }
}

export class PruneShieldError extends PruneError {
  public readonly shieldCode: string;

  constructor(message: string, shieldCode: string, statusCode = 429, isRetryable = false) {
    super(`${message} (Shield Code: ${shieldCode})`, statusCode, isRetryable);
    this.name = 'PruneShieldError';
    this.shieldCode = shieldCode;
  }
}

export class PruneSpendCapError extends PruneShieldError {
  constructor(message = 'Prune Shield rejected request: Account or run spending cap reached.') {
    super(message, 'spend_cap', 429, false);
    this.name = 'PruneSpendCapError';
  }
}

export class PruneRateLimitError extends PruneShieldError {
  constructor(message = 'Prune Shield rate limit exceeded.') {
    super(message, 'rate_limit', 429, true);
    this.name = 'PruneRateLimitError';
  }
}

export class PruneShieldUnavailableError extends PruneShieldError {
  constructor(message = 'Prune Shield is temporarily unavailable (fail-closed policy enforced).') {
    super(message, 'shield_unavailable', 503, true);
    this.name = 'PruneShieldUnavailableError';
  }
}

export class PruneTimeoutError extends PruneError {
  constructor(message = 'Request to Prune gateway timed out.') {
    super(message, 504, true);
    this.name = 'PruneTimeoutError';
  }
}

export class PruneNetworkError extends PruneError {
  constructor(message: string) {
    super(`Network connection error to Prune gateway: ${message}`, undefined, true);
    this.name = 'PruneNetworkError';
  }
}

export class PruneGatewayDisabledError extends PruneError {
  constructor(message = 'Prune AI Gateway integration is currently disabled (PRUNE_ENABLED=false).') {
    super(message, undefined, false);
    this.name = 'PruneGatewayDisabledError';
  }
}

export class PruneDirectFallbackProhibitedError extends PruneError {
  constructor(message = 'Prune gateway call failed and direct provider fallback is strictly prohibited (PRUNE_ALLOW_DIRECT_FALLBACK=false).') {
    super(message, 502, false);
    this.name = 'PruneDirectFallbackProhibitedError';
  }
}

/**
 * Maps HTTP response status and headers into specific Prune error classes.
 */
export function mapHttpErrorToPruneError(
  status: number,
  bodyText: string,
  shieldCode?: string | null
): PruneError {
  const safeBody = bodyText ? bodyText.slice(0, 300) : 'No response body';

  if (shieldCode) {
    switch (shieldCode.toLowerCase()) {
      case 'spend_cap':
        return new PruneSpendCapError(`Spend limit exceeded: ${safeBody}`);
      case 'rate_limit':
        return new PruneRateLimitError(`Rate limit reached: ${safeBody}`);
      case 'shield_unavailable':
        return new PruneShieldUnavailableError(`Shield check failed closed: ${safeBody}`);
      default:
        return new PruneShieldError(`Prune Shield rejected request: ${safeBody}`, shieldCode, status, status >= 500);
    }
  }

  if (status === 401) {
    return new PruneAuthenticationError(`Authentication failed: ${safeBody}`);
  }

  if (status === 429) {
    return new PruneRateLimitError(`Rate limit reached (upstream or gateway): ${safeBody}`);
  }

  if (status >= 500) {
    return new PruneError(`Prune gateway server error (${status}): ${safeBody}`, status, true);
  }

  return new PruneError(`Prune request failed with status ${status}: ${safeBody}`, status, false);
}

