/**
 * FinGuard-PruneIntegration: Metadata and Header Builders
 */

export interface FinGuardRequestMetadata {
  customerId?: string; // Stable internal tenant or farm identifier
  featureId?: string;  // Product feature (e.g., disease_screening, general_chat)
  workload?: string;   // finGuard_core, finGuard_farm_agent, etc.
  runId?: string;      // Agent loop identifier
  runBudgetUsd?: number; // Maximum budget for agent loop
  maxSteps?: number;   // Maximum turn limit for agent loop
  cachePolicy?: 'off' | 'exact' | 'normalized' | 'semantic' | 'disabled';
}

/**
 * Builds HTTP headers to transmit to Prune AI Gateway.
 * Strictly avoids logging or exposing sensitive tokens.
 */
export function buildGatewayHeaders(
  apiKey: string,
  metadata: FinGuardRequestMetadata
): Record<string, string> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'X-Prune-Key': apiKey,
    'Content-Type': 'application/json',
  };

  if (metadata.customerId) {
    // Sanitize identifier
    headers['X-Prune-Customer-Id'] = metadata.customerId.trim().slice(0, 256);
  }

  if (metadata.featureId) {
    headers['X-Prune-Feature-Id'] = metadata.featureId.trim().slice(0, 128);
  }

  if (metadata.workload) {
    headers['X-Prune-Workload'] = metadata.workload.trim().slice(0, 64);
  }

  if (metadata.runId) {
    headers['X-Prune-Run-Id'] = metadata.runId.trim().slice(0, 128);
  }

  if (typeof metadata.runBudgetUsd === 'number' && metadata.runBudgetUsd > 0) {
    headers['X-Prune-Run-Budget-Usd'] = metadata.runBudgetUsd.toFixed(6);
  }

  if (typeof metadata.maxSteps === 'number' && metadata.maxSteps > 0) {
    headers['X-Prune-Max-Steps'] = Math.floor(metadata.maxSteps).toString();
  }

  if (metadata.cachePolicy) {
    headers['X-Prune-Cache'] = metadata.cachePolicy === 'disabled' ? 'off' : metadata.cachePolicy;
  }

  return headers;
}
