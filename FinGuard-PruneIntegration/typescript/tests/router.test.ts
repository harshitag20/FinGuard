import { describe, it } from 'node:test';
import assert from 'node:assert';
import { classifyRequest, RequestCategory } from '../src/router.js';

describe('FinGuard Request Classifier & Policy Router', () => {
  it('should isolate Gemini Live voice sessions to direct Gemini path', () => {
    const decision = classifyRequest({
      category: RequestCategory.VOICE_LIVE,
      isVoiceSession: true,
    });

    assert.strictEqual(decision.routeTarget, 'direct_gemini');
    assert.strictEqual(decision.cachePolicy, 'off');
    assert.strictEqual(decision.featureId, 'voice_expert_live');
    assert.ok(decision.reason.includes('Gemini Live'));
  });

  it('should keep multimodal image requests on direct Gemini path until verified', () => {
    const decision = classifyRequest({
      category: RequestCategory.MULTIMODAL_IMAGE,
      hasImages: true,
    });

    assert.strictEqual(decision.routeTarget, 'direct_gemini');
    assert.strictEqual(decision.isSupported, false);
    assert.strictEqual(decision.cachePolicy, 'off');
    assert.ok(decision.reason.includes('unverified'));
  });

  it('should isolate disease diagnosis requests to direct Gemini path until safety validation', () => {
    const decision = classifyRequest({
      category: RequestCategory.DISEASE_DIAGNOSIS,
      containsFarmTelemetry: true,
    });

    assert.strictEqual(decision.routeTarget, 'direct_gemini');
    assert.strictEqual(decision.cachePolicy, 'off');
    assert.strictEqual(decision.isSupported, false);
    assert.strictEqual(decision.featureId, 'disease_screening');
  });

  it('should isolate farm operational conversations to direct Gemini path pending audit', () => {
    const decision = classifyRequest({
      category: RequestCategory.FARM_CONVERSATION,
      containsSensitiveData: true,
    });

    assert.strictEqual(decision.routeTarget, 'direct_gemini');
    assert.strictEqual(decision.cachePolicy, 'off');
    assert.strictEqual(decision.isSupported, false);
    assert.strictEqual(decision.featureId, 'farm_agent');
  });

  it('should permit exact caching only for static educational knowledge', () => {
    const decision = classifyRequest({
      category: RequestCategory.STATIC_EDUCATIONAL,
    });

    assert.strictEqual(decision.routeTarget, 'prune_gateway');
    assert.strictEqual(decision.cachePolicy, 'exact');
    assert.strictEqual(decision.featureId, 'educational_knowledge');
  });

  it('should default general text requests to Prune with off cache', () => {
    const decision = classifyRequest({
      category: RequestCategory.GENERAL_TEXT,
    });

    assert.strictEqual(decision.routeTarget, 'prune_gateway');
    assert.strictEqual(decision.cachePolicy, 'off');
    assert.strictEqual(decision.featureId, 'general_chat');
  });
});

