/**
 * FinGuard-PruneIntegration: Configuration Schema and Loader
 */

export type PruneMode = 'shadow' | 'active';
export type PruneCachePolicy = 'disabled' | 'exact' | 'semantic';

export interface FinGuardPruneConfig {
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
  mode: PruneMode;
  defaultFeatureId: string;
  defaultWorkload: string;
  timeoutMs: number;
  maxRetries: number;
  cachePolicy: PruneCachePolicy;
  allowDirectFallback: boolean;
  geminiModel: string;
}

/**
 * Loads configuration from environment variables or custom overrides.
 * Strictly adheres to security rules: defaults to disabled, validates formats.
 */
export function loadConfig(overrides?: Partial<FinGuardPruneConfig>): FinGuardPruneConfig {
  const env = process.env;

  const config: FinGuardPruneConfig = {
    apiKey: overrides?.apiKey ?? env.PRUNE_API_KEY ?? '',
    baseUrl: (overrides?.baseUrl ?? env.PRUNE_BASE_URL ?? 'https://api.withprune.com/v1').replace(/\/+$/, ''),
    enabled: overrides?.enabled ?? (env.PRUNE_ENABLED?.toLowerCase() === 'true'),
    mode: (overrides?.mode ?? env.PRUNE_MODE?.toLowerCase() ?? 'shadow') as PruneMode,
    defaultFeatureId: overrides?.defaultFeatureId ?? env.PRUNE_DEFAULT_FEATURE_ID ?? 'general_chat',
    defaultWorkload: overrides?.defaultWorkload ?? env.PRUNE_DEFAULT_WORKLOAD ?? 'finGuard_core',
    timeoutMs: (overrides?.timeoutMs ?? parseInt(env.PRUNE_TIMEOUT_SECONDS || '30', 10) * 1000) || 30000,
    maxRetries: overrides?.maxRetries ?? parseInt(env.PRUNE_MAX_RETRIES || '1', 10),
    cachePolicy: (overrides?.cachePolicy ?? env.PRUNE_CACHE_POLICY?.toLowerCase() ?? 'disabled') as PruneCachePolicy,
    allowDirectFallback: overrides?.allowDirectFallback ?? (env.PRUNE_ALLOW_DIRECT_FALLBACK?.toLowerCase() === 'true'),
    geminiModel: overrides?.geminiModel ?? env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  };

  return config;
}

/**
 * Validates configuration prior to executing requests.
 */
export function validateConfig(config: FinGuardPruneConfig): void {
  if (config.enabled && !config.apiKey) {
    throw new Error('Prune gateway is enabled (PRUNE_ENABLED=true) but PRUNE_API_KEY is not configured.');
  }

  if (config.maxRetries < 0 || config.maxRetries > 5) {
    throw new Error(`Invalid PRUNE_MAX_RETRIES (${config.maxRetries}). Must be between 0 and 5.`);
  }

  if (config.timeoutMs < 1000) {
    throw new Error(`Timeout too short: ${config.timeoutMs}ms. Minimum is 1000ms.`);
  }
}

