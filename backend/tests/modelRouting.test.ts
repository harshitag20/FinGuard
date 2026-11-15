import { describe, it, expect } from 'vitest';
import {
  classifyRequest,
  RequestCategory
} from '../../FinGuard-PruneIntegration/typescript/src/index';
import { modelRoutingService } from '../src/services/pruneRouting.service';

describe('Prune Model Routing & Conservative Classification Policy', () => {
  it('classifies general text queries as Prune-eligible (prune_gateway)', () => {
    const decision = classifyRequest({
      category: RequestCategory.GENERAL_TEXT
    });

    expect(decision.routeTarget).toBe('prune_gateway');
    expect(decision.isSupported).toBe(true);
  });

  it('classifies static educational questions as Prune-eligible with exact caching enabled', () => {
    const decision = classifyRequest({
      category: RequestCategory.STATIC_EDUCATIONAL
    });

    expect(decision.routeTarget).toBe('prune_gateway');
    expect(decision.cachePolicy).toBe('exact');
    expect(decision.isSupported).toBe(true);
  });

  it('strictly forces clinical disease diagnosis to direct Gemini provider (bypassing Prune)', () => {
    const decision = classifyRequest({
      category: RequestCategory.DISEASE_DIAGNOSIS
    });

    expect(decision.routeTarget).toBe('direct_gemini');
    expect(decision.cachePolicy).toBe('off'); // Zero caching for clinical diagnostic decisions
    expect(decision.reason).toContain('Clinical diagnosis');
  });

  it('strictly forces multimodal image analysis to direct Gemini provider (bypassing Prune)', () => {
    const decision = classifyRequest({
      category: RequestCategory.MULTIMODAL_IMAGE,
      hasImages: true
    });

    expect(decision.routeTarget).toBe('direct_gemini');
    expect(decision.reason).toContain('Multimodal image forwarding');
  });

  it('strictly forces real-time voice sessions to direct Gemini provider (bypassing Prune)', () => {
    const decision = classifyRequest({
      category: RequestCategory.VOICE_LIVE,
      isVoiceSession: true
    });

    expect(decision.routeTarget).toBe('direct_gemini');
    expect(decision.reason).toContain('WebSockets are not supported by Prune HTTP proxy');
  });

  it('routes volatile farm telemetry to direct provider path with caching off', () => {
    const decision = classifyRequest({
      category: RequestCategory.GENERAL_TEXT,
      containsFarmTelemetry: true
    });

    expect(decision.routeTarget).toBe('direct_gemini');
    expect(decision.cachePolicy).toBe('off');
  });

  it('executes model routing service and delivers structured response', async () => {
    const result = await modelRoutingService.executeCompletion({
      category: RequestCategory.GENERAL_TEXT,
      prompt: 'What is the optimal dissolved oxygen level for cultivating Indian Major Carps?'
    });

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(10);
    expect(result.routing).toBeDefined();
    expect(['prune_gateway', 'direct_gemini', 'offline_fallback']).toContain(result.provider);
  });
});
