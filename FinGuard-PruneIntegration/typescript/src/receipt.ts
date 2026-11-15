/**
 * FinGuard-PruneIntegration: Normalized Internal Receipt Model & Extractor (TypeScript)
 */

import * as crypto from 'node:crypto';

export type ReceiptVerificationStatus = 'verified' | 'failed' | 'unverified' | 'skipped';

export interface FinGuardReceipt {
  request_id: string;
  farm_id: string | null;
  feature_id: string;
  workload: string;
  requested_model: string;
  actual_model: string | null;
  provider: string | null;
  cache_hit: boolean;
  cache_type: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  cost_usd: number | null;
  cost_saved_usd: number | null;
  tokens_saved: number | null;
  optimizations_applied: string[];
  receipt_signature: string | null;
  receipt_key_id: string | null;
  receipt_verification_status: ReceiptVerificationStatus;
  latency_ms: number | null;
  upstream_latency_ms: number | null;
  retry_count: number;
  created_at: string;
  raw_metadata?: Record<string, unknown> | null;
}

/**
 * Extracts and normalizes receipt metrics from Prune response body and headers.
 * All fields are safely nullable/optional to ensure parser resilience.
 * NEVER reports the requested model as the actual model unless explicitly returned by Prune.
 */
export function extractReceipt(params: {
  requestId: string;
  farmId?: string | null;
  featureId: string;
  workload: string;
  requestedModel: string;
  responseHeaders: Record<string, string | string[] | undefined>;
  responseBody: Record<string, unknown>;
  latencyMs?: number | null;
  retryCount?: number;
  receiptVerificationStatus?: ReceiptVerificationStatus;
}): FinGuardReceipt {
  const {
    requestId,
    farmId = null,
    featureId,
    workload,
    requestedModel,
    responseHeaders,
    responseBody,
    latencyMs = null,
    retryCount = 0,
    receiptVerificationStatus = 'unverified',
  } = params;

  // Extract prune_metadata if present in body
  const meta = (responseBody.prune_metadata || {}) as Record<string, unknown>;

  // Normalize header lookup helper (case-insensitive)
  const getHeader = (name: string): string | null => {
    const target = name.toLowerCase();
    for (const [key, value] of Object.entries(responseHeaders)) {
      if (key.toLowerCase() === target) {
        if (Array.isArray(value)) return value[0] || null;
        return value || null;
      }
    }
    return null;
  };

  // Provider attribution
  const provider =
    (typeof meta.provider === 'string' ? meta.provider : null) ||
    getHeader('x-prune-provider') ||
    null;

  // Cache hit determination
  const headerCacheHit = getHeader('x-prune-cache-hit');
  const cacheHit =
    meta.cache_hit === true ||
    headerCacheHit?.toLowerCase() === 'true' ||
    false;

  // Cache type
  const cacheType =
    (typeof meta.cache_type === 'string' ? meta.cache_type : null) ||
    getHeader('x-prune-cache-type');

  // Actual model served by Prune (gateway remapped / routed / modelVersion)
  // Strict rule: Never report requested_model as actual_model
  const servedModel =
    (typeof meta.mapped_model === 'string' ? meta.mapped_model : null) ||
    (typeof meta.receipt_model === 'string' ? meta.receipt_model : null) ||
    (typeof meta.routed_model === 'string' ? meta.routed_model : null) ||
    (typeof responseBody.modelVersion === 'string' ? responseBody.modelVersion : null) ||
    getHeader('x-prune-routed-model');
  const actualModel = servedModel || null;

  // Usage and tokens
  const usage = (responseBody.usage || responseBody.usageMetadata || {}) as Record<string, unknown>;
  const inputTokens =
    typeof usage.prompt_tokens === 'number'
      ? usage.prompt_tokens
      : typeof usage.promptTokenCount === 'number'
      ? usage.promptTokenCount
      : null;

  const outputTokens =
    typeof usage.completion_tokens === 'number'
      ? usage.completion_tokens
      : typeof usage.candidatesTokenCount === 'number'
      ? usage.candidatesTokenCount
      : null;

  const totalTokens =
    typeof usage.total_tokens === 'number'
      ? usage.total_tokens
      : typeof usage.totalTokenCount === 'number'
      ? usage.totalTokenCount
      : (inputTokens !== null && outputTokens !== null)
      ? inputTokens + outputTokens
      : null;

  // Cost and savings
  const costUsd =
    typeof meta.cost_usd === 'number'
      ? meta.cost_usd
      : typeof meta.cost_with_prune_usd === 'number'
      ? meta.cost_with_prune_usd
      : null;

  const headerCostSaved = getHeader('x-prune-cost-saved');
  const costSavedUsd =
    typeof meta.cost_saved_usd === 'number'
      ? meta.cost_saved_usd
      : typeof meta.cost_saved === 'number'
      ? meta.cost_saved
      : headerCostSaved ? parseFloat(headerCostSaved) : null;

  const tokensSaved =
    typeof meta.tokens_saved === 'number'
      ? meta.tokens_saved
      : null;

  // Optimizations applied
  const optimizations: string[] = [];
  if (Array.isArray(meta.optimizations_applied)) {
    for (const opt of meta.optimizations_applied) {
      if (typeof opt === 'string') optimizations.push(opt);
    }
  }
  const routeApplied = getHeader('x-prune-route-applied');
  if (routeApplied && !optimizations.includes(`route:${routeApplied}`)) {
    optimizations.push(`route:${routeApplied}`);
  }
  if (meta.model_remapped === true && meta.remap_reason) {
    optimizations.push(`remap:${meta.remap_reason}`);
  }

  // Cryptographic receipt signature
  const receiptSignature =
    (typeof meta.receipt_signature === 'string' ? meta.receipt_signature : null) ||
    (typeof meta.signature === 'string' ? meta.signature : null) ||
    getHeader('x-prune-receipt-signature') ||
    getHeader('x-prune-signature');

  const receiptKeyId =
    (typeof meta.receipt_signing_key_id === 'string' ? meta.receipt_signing_key_id : null) ||
    (typeof meta.receipt_key_id === 'string' ? meta.receipt_key_id : null) ||
    (typeof meta.key_id === 'string' ? meta.key_id : null) ||
    getHeader('x-prune-key-id');

  // Latency metrics
  const headerUpstreamMs = getHeader('x-prune-upstream-ms');
  const metaLatency = (meta.latency_ms || {}) as Record<string, unknown>;
  const upstreamLatencyMs =
    typeof metaLatency.upstream_ms === 'number'
      ? metaLatency.upstream_ms
      : headerUpstreamMs ? parseFloat(headerUpstreamMs) : null;

  return {
    request_id: requestId,
    farm_id: farmId,
    feature_id: featureId,
    workload: workload,
    requested_model: requestedModel,
    actual_model: actualModel,
    provider: provider,
    cache_hit: cacheHit,
    cache_type: cacheType,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    cost_usd: costUsd,
    cost_saved_usd: costSavedUsd,
    tokens_saved: tokensSaved,
    optimizations_applied: optimizations,
    receipt_signature: receiptSignature,
    receipt_key_id: receiptKeyId,
    receipt_verification_status: receiptVerificationStatus,
    latency_ms: latencyMs,
    upstream_latency_ms: upstreamLatencyMs,
    retry_count: retryCount,
    created_at: new Date().toISOString(),
    raw_metadata: Object.keys(meta).length > 0 ? meta : null,
  };
}

/**
 * Online verification against Prune's official receipt verification endpoint: POST /v1/receipts/verify
 */
export async function verifyReceiptOnline(
  receiptMeta: Record<string, unknown>,
  baseUrl = 'https://api.withprune.com/v1',
  apiKey?: string,
  timeoutMs = 10000
): Promise<{ valid: boolean; reason: string; keyId?: string; signedAt?: string }> {
  if (!receiptMeta || Object.keys(receiptMeta).length === 0) {
    return { valid: false, reason: 'Empty receipt payload' };
  }

  const url = `${baseUrl.replace(/\/+$/, '')}/receipts/verify`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ receipt: receiptMeta }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      return { valid: false, reason: `Verification endpoint returned ${res.status}: ${errText.slice(0, 100)}` };
    }

    const json = (await res.json()) as { valid: boolean; reason: string; key_id?: string; signed_at?: string };
    return {
      valid: Boolean(json.valid),
      reason: json.reason || (json.valid ? 'valid' : 'invalid'),
      keyId: json.key_id,
      signedAt: json.signed_at,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, reason: `Verification request failed: ${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Offline cryptographic verification using Ed25519 public key bytes.
 * Fails safely if signature or key is malformed or invalid.
 */
export function verifyReceiptOffline(
  receiptData: Record<string, unknown>,
  publicKeyBytes: Buffer | Uint8Array
): { valid: boolean; reason: string } {
  try {
    const sigB64 = (receiptData.receipt_signature || receiptData.signature) as string | undefined;
    if (!sigB64 || typeof sigB64 !== 'string') {
      return { valid: false, reason: 'Missing signature field' };
    }

    if (!publicKeyBytes || (publicKeyBytes.length !== 32 && publicKeyBytes.length !== 44)) {
      return { valid: false, reason: 'Invalid Ed25519 public key bytes' };
    }

    // Exclude signature fields to reconstruct canonical payload
    const signedFields: Record<string, unknown> = {};
    const sortedKeys = Object.keys(receiptData).filter(
      (k) => k !== 'signature' && k !== 'receipt_signature'
    ).sort();
    for (const k of sortedKeys) {
      signedFields[k] = receiptData[k];
    }

    const canonicalBytes = Buffer.from(JSON.stringify(signedFields));
    const sigBuffer = Buffer.from(sigB64, 'base64');

    // Create Ed25519 public key object from raw bytes
    const keyObject = crypto.createPublicKey({
      key: Buffer.isBuffer(publicKeyBytes) ? publicKeyBytes : Buffer.from(publicKeyBytes),
      format: 'der',
      type: 'spki',
    });

    const isVerified = crypto.verify(null, canonicalBytes, keyObject, sigBuffer);
    return { valid: isVerified, reason: isVerified ? 'valid' : 'signature mismatch' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, reason: `Verification failed safely: ${msg}` };
  }
}
