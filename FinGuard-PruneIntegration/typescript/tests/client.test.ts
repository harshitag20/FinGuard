import { describe, it } from 'node:test';
import assert from 'node:assert';
import { FinGuardPruneClient } from '../src/client.js';
import { RequestCategory } from '../src/router.js';
import {
  PruneAuthenticationError,
  PruneSpendCapError,
  PruneRateLimitError,
  PruneShieldUnavailableError,
  PruneTimeoutError,
  PruneGatewayDisabledError,
  PruneDirectFallbackProhibitedError,
} from '../src/errors.js';

describe('FinGuardPruneClient (TypeScript Adapter)', () => {
  const dummyApiKey = 'prune_live_mock_secret_key_12345';

  it('should raise PruneGatewayDisabledError when gateway is disabled and fallback is prohibited', async () => {
    const client = new FinGuardPruneClient({
      enabled: false,
      allowDirectFallback: false,
    });

    await assert.rejects(
      async () => {
        await client.createChatCompletion({
          category: RequestCategory.GENERAL_TEXT,
          messages: [{ role: 'user', content: 'test' }],
        });
      },
      (err: unknown) => err instanceof PruneGatewayDisabledError
    );
  });

  it('should reject requests missing PRUNE_API_KEY when enabled', async () => {
    const client = new FinGuardPruneClient({
      enabled: true,
      apiKey: '',
    });

    await assert.rejects(
      async () => {
        await client.createChatCompletion({
          category: RequestCategory.GENERAL_TEXT,
          messages: [{ role: 'user', content: 'test' }],
        });
      },
      /PRUNE_API_KEY is not configured/
    );
  });

  it('should prohibit direct fallback for voice/multimodal requests when allowDirectFallback=false', async () => {
    const client = new FinGuardPruneClient({
      enabled: true,
      apiKey: dummyApiKey,
      allowDirectFallback: false,
    });

    await assert.rejects(
      async () => {
        await client.createChatCompletion({
          category: RequestCategory.VOICE_LIVE,
          messages: [{ role: 'user', content: 'test voice' }],
        });
      },
      (err: unknown) => err instanceof PruneDirectFallbackProhibitedError
    );
  });

  it('should construct correct headers, base URL, and governance metadata on success', async () => {
    let capturedUrl = '';
    let capturedHeaders: any;
    let capturedBody = '';

    const mockFetch = async (input: any, init?: any): Promise<Response> => {
      capturedUrl = input.toString();
      capturedHeaders = init?.headers;
      capturedBody = init?.body as string;

      const mockResponse = {
        id: 'req_success_001',
        model: 'gemini-1.5-flash',
        choices: [{ message: { role: 'assistant', content: 'Optimal DO is 5.5 - 7.0 mg/L.' } }],
        usage: { prompt_tokens: 30, completion_tokens: 20 },
        prune_metadata: {
          cost_usd: 0.00003,
          cost_saved_usd: 0.00001,
          cache_hit: false,
          mapped_model: 'gemini-3.5-flash-lite',
          receipt_signature: 'sig_ed25519_mock',
          receipt_key_id: 'key_mock_01',
        },
      };

      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Prune-Provider': 'google',
          'X-Prune-Cache-Hit': 'false',
        },
      });
    };

    const client = new FinGuardPruneClient(
      {
        enabled: true,
        apiKey: dummyApiKey,
        baseUrl: 'https://api.withprune.com/v1',
      },
      mockFetch as unknown as typeof fetch
    );

    const res = await client.createChatCompletion({
      category: RequestCategory.GENERAL_TEXT,
      farmId: 'FARM-99',
      featureId: 'general_chat',
      workload: 'finGuard_core',
      runId: 'run_diag_01',
      runBudgetUsd: 0.05,
      maxSteps: 3,
      messages: [{ role: 'user', content: 'What is optimal dissolved oxygen in aquaculture?' }],
    });

    assert.strictEqual(capturedUrl, 'https://api.withprune.com/v1/chat/completions');
    const headersObj = capturedHeaders as Record<string, string>;
    assert.strictEqual(headersObj['Authorization'], `Bearer ${dummyApiKey}`);
    assert.strictEqual(headersObj['X-Prune-Key'], dummyApiKey);
    assert.strictEqual(headersObj['X-Prune-Customer-Id'], 'FARM-99');
    assert.strictEqual(headersObj['X-Prune-Feature-Id'], 'general_chat');
    assert.strictEqual(headersObj['X-Prune-Workload'], 'finGuard_core');
    assert.strictEqual(headersObj['X-Prune-Run-Id'], 'run_diag_01');
    assert.strictEqual(headersObj['X-Prune-Run-Budget-Usd'], '0.050000');
    assert.strictEqual(headersObj['X-Prune-Max-Steps'], '3');
    // General category must enforce X-Prune-Cache: off
    assert.strictEqual(headersObj['X-Prune-Cache'], 'off');

    const parsedBody = JSON.parse(capturedBody);
    assert.strictEqual(parsedBody.model, 'gemini-2.5-flash');
    assert.strictEqual(parsedBody.messages[0].content, 'What is optimal dissolved oxygen in aquaculture?');

    assert.strictEqual(res.content, 'Optimal DO is 5.5 - 7.0 mg/L.');
    assert.strictEqual(res.receipt.cost_usd, 0.00003);
    assert.strictEqual(res.receipt.receipt_signature, 'sig_ed25519_mock');
    assert.strictEqual(res.receipt.farm_id, 'FARM-99');
    assert.strictEqual(res.receipt.provider, 'google');
    assert.strictEqual(res.receipt.actual_model, 'gemini-3.5-flash-lite');
    assert.strictEqual(res.receipt.requested_model, 'gemini-2.5-flash');
    assert.strictEqual(res.receipt.retry_count, 0);
    assert.ok(typeof res.receipt.latency_ms === 'number');
  });

  it('should properly map Prune Shield spend_cap errors and refuse retry', async () => {
    let callCount = 0;
    const mockFetch = async (): Promise<Response> => {
      callCount++;
      return new Response(JSON.stringify({ error: 'Daily spending limit exceeded' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-Prune-Shield-Code': 'spend_cap',
        },
      });
    };

    const client = new FinGuardPruneClient(
      {
        enabled: true,
        apiKey: dummyApiKey,
        maxRetries: 3,
      },
      mockFetch as unknown as typeof fetch
    );

    await assert.rejects(
      async () => {
        await client.createChatCompletion({
          category: RequestCategory.GENERAL_TEXT,
          messages: [{ role: 'user', content: 'test' }],
        });
      },
      (err: unknown) => err instanceof PruneSpendCapError
    );

    // Spending caps must NEVER be retried
    assert.strictEqual(callCount, 1);
  });

  it('should map 401 unauthorized to PruneAuthenticationError without retrying', async () => {
    let callCount = 0;
    const mockFetch = async (): Promise<Response> => {
      callCount++;
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const client = new FinGuardPruneClient(
      {
        enabled: true,
        apiKey: 'prune_invalid_key',
        maxRetries: 2,
      },
      mockFetch as unknown as typeof fetch
    );

    await assert.rejects(
      async () => {
        await client.createChatCompletion({
          category: RequestCategory.GENERAL_TEXT,
          messages: [{ role: 'user', content: 'test' }],
        });
      },
      (err: unknown) => err instanceof PruneAuthenticationError
    );

    assert.strictEqual(callCount, 1);
  });

  it('should retry transient 503 shield_unavailable up to maxRetries', async () => {
    let callCount = 0;
    const mockFetch = async (): Promise<Response> => {
      callCount++;
      if (callCount < 2) {
        return new Response(JSON.stringify({ error: 'Shield database timeout' }), {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'X-Prune-Shield-Code': 'shield_unavailable',
          },
        });
      }
      return new Response(
        JSON.stringify({
          id: 'req_recovered',
          model: 'gemini-1.5-flash',
          choices: [{ message: { content: 'Recovered response' } }],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    };

    const client = new FinGuardPruneClient(
      {
        enabled: true,
        apiKey: dummyApiKey,
        maxRetries: 2,
      },
      mockFetch as unknown as typeof fetch
    );

    const res = await client.createChatCompletion({
      category: RequestCategory.GENERAL_TEXT,
      messages: [{ role: 'user', content: 'hello' }],
    });

    assert.strictEqual(callCount, 2);
    assert.strictEqual(res.content, 'Recovered response');
  });
});
