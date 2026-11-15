import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractReceipt, verifyReceiptOffline } from '../src/receipt.js';

describe('FinGuard Receipt Normalization', () => {
  it('should extract full receipt metrics when all fields are present', () => {
    const rawBody = {
      id: 'chatcmpl_test_123',
      model: 'gemini-2.5-flash',
      usage: {
        prompt_tokens: 45,
        completion_tokens: 120,
      },
      prune_metadata: {
        cache_hit: true,
        cache_type: 'exact',
        cost_usd: 0.000045,
        cost_saved_usd: 0.000180,
        tokens_saved: 45,
        routed_model: 'gemini-3.5-flash-lite',
        optimizations_applied: ['exact_cache'],
        receipt_signature: 'sig_base64_ed25519_test',
        receipt_key_id: 'key_v1',
        latency_ms: { upstream_ms: 120.5 },
      },
    };

    const headers = {
      'x-prune-provider': 'gemini',
      'x-prune-cache-hit': 'true',
    };

    const receipt = extractReceipt({
      requestId: 'chatcmpl_test_123',
      farmId: 'FARM-001',
      featureId: 'general_chat',
      workload: 'finGuard_core',
      requestedModel: 'gemini-2.5-flash',
      responseHeaders: headers,
      responseBody: rawBody,
      latencyMs: 350,
      retryCount: 1,
    });

    assert.strictEqual(receipt.request_id, 'chatcmpl_test_123');
    assert.strictEqual(receipt.farm_id, 'FARM-001');
    assert.strictEqual(receipt.feature_id, 'general_chat');
    assert.strictEqual(receipt.workload, 'finGuard_core');
    assert.strictEqual(receipt.requested_model, 'gemini-2.5-flash');
    assert.strictEqual(receipt.actual_model, 'gemini-3.5-flash-lite');
    assert.strictEqual(receipt.provider, 'gemini');
    assert.strictEqual(receipt.cache_hit, true);
    assert.strictEqual(receipt.cache_type, 'exact');
    assert.strictEqual(receipt.input_tokens, 45);
    assert.strictEqual(receipt.output_tokens, 120);
    assert.strictEqual(receipt.total_tokens, 165);
    assert.strictEqual(receipt.cost_usd, 0.000045);
    assert.strictEqual(receipt.cost_saved_usd, 0.000180);
    assert.strictEqual(receipt.receipt_signature, 'sig_base64_ed25519_test');
    assert.strictEqual(receipt.receipt_key_id, 'key_v1');
    assert.strictEqual(receipt.latency_ms, 350);
    assert.strictEqual(receipt.upstream_latency_ms, 120.5);
    assert.strictEqual(receipt.retry_count, 1);
    assert.strictEqual(receipt.receipt_verification_status, 'unverified');
    assert.ok(receipt.created_at);
  });

  it('should never report requested model as actual model when not provided by Prune', () => {
    const minimalBody = {
      choices: [{ message: { content: 'Tilapia requires 5-8 mg/L DO.' } }],
    };

    const receipt = extractReceipt({
      requestId: 'req_fallback_999',
      featureId: 'general_chat',
      workload: 'finGuard_core',
      requestedModel: 'gemini-2.5-flash',
      responseHeaders: {},
      responseBody: minimalBody,
    });

    assert.strictEqual(receipt.request_id, 'req_fallback_999');
    assert.strictEqual(receipt.farm_id, null);
    assert.strictEqual(receipt.requested_model, 'gemini-2.5-flash');
    // Actual model must be null, NOT the requested model
    assert.strictEqual(receipt.actual_model, null);
    assert.strictEqual(receipt.cache_hit, false);
    assert.strictEqual(receipt.cache_type, null);
    assert.strictEqual(receipt.input_tokens, null);
    assert.strictEqual(receipt.output_tokens, null);
    assert.strictEqual(receipt.total_tokens, null);
    assert.strictEqual(receipt.cost_usd, null);
    assert.strictEqual(receipt.cost_saved_usd, null);
    assert.strictEqual(receipt.tokens_saved, null);
    assert.strictEqual(receipt.receipt_signature, null);
    assert.strictEqual(receipt.receipt_key_id, null);
    assert.strictEqual(receipt.latency_ms, null);
    assert.strictEqual(receipt.retry_count, 0);
    assert.deepStrictEqual(receipt.optimizations_applied, []);
  });

  it('should fail safely on invalid or malformed receipt in offline verification', () => {
    // Missing signature
    const res1 = verifyReceiptOffline({ cost_usd: 0.001 }, Buffer.alloc(32));
    assert.strictEqual(res1.valid, false);
    assert.ok(res1.reason.includes('Missing signature'));

    // Invalid key length
    const res2 = verifyReceiptOffline({ signature: 'dGVzdA==' }, Buffer.alloc(10));
    assert.strictEqual(res2.valid, false);
    assert.ok(res2.reason.includes('Invalid Ed25519'));
  });
});
