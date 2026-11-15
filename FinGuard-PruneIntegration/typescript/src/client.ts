/**
 * FinGuard-PruneIntegration: TypeScript Client Implementation
 */

import { FinGuardPruneConfig, loadConfig, validateConfig } from './config.js';
import {
  PruneError,
  PruneGatewayDisabledError,
  PruneDirectFallbackProhibitedError,
  PruneTimeoutError,
  PruneNetworkError,
  mapHttpErrorToPruneError,
} from './errors.js';
import { buildGatewayHeaders } from './metadata.js';
import {
  extractReceipt,
  FinGuardReceipt,
  ReceiptVerificationStatus,
  verifyReceiptOnline,
} from './receipt.js';
import { classifyRequest, RequestCategory, RoutingDecision } from './router.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  category: RequestCategory;
  messages: ChatMessage[];
  model?: string;
  farmId?: string;
  featureId?: string;
  workload?: string;
  runId?: string;
  runBudgetUsd?: number;
  maxSteps?: number;
  temperature?: number;
  maxTokens?: number;
  verifyReceipt?: boolean;
  hasImages?: boolean;
  isVoiceSession?: boolean;
  hasToolCalls?: boolean;
  containsFarmTelemetry?: boolean;
  containsSensitiveData?: boolean;
}

export interface ChatCompletionResponse {
  content: string;
  model: string;
  receipt: FinGuardReceipt;
  routing: RoutingDecision;
  rawResponse?: Record<string, unknown>;
}

export type HttpFetchFn = typeof fetch;

export class FinGuardPruneClient {
  public readonly config: FinGuardPruneConfig;
  private readonly fetchFn: HttpFetchFn;

  constructor(
    configOverrides?: Partial<FinGuardPruneConfig>,
    customFetch?: HttpFetchFn
  ) {
    this.config = loadConfig(configOverrides);
    this.fetchFn = customFetch || globalThis.fetch;
  }

  /**
   * Executes a governed LLM completion request with full observability and policy enforcement.
   */
  public async createChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const startTime = performance.now();

    // 1. Classify the request and determine routing policy
    const routing = classifyRequest({
      category: request.category,
      featureId: request.featureId || this.config.defaultFeatureId,
      hasImages: request.hasImages,
      isVoiceSession: request.isVoiceSession,
      hasToolCalls: request.hasToolCalls,
      containsFarmTelemetry: request.containsFarmTelemetry,
      containsSensitiveData: request.containsSensitiveData,
    });

    const targetModel = request.model || this.config.geminiModel;

    // 2. Enforce routing isolation
    if (routing.routeTarget === 'direct_gemini') {
      if (!this.config.allowDirectFallback) {
        throw new PruneDirectFallbackProhibitedError(
          `Request category [${request.category}] must be routed directly to Gemini provider, but direct fallback is disabled.`
        );
      }
      return {
        content: `[DIRECT_GEMINI_FALLBACK] Request category ${request.category} bypassed Prune gateway.`,
        model: targetModel,
        routing,
        receipt: {
          request_id: `direct_${Date.now()}`,
          farm_id: request.farmId || null,
          feature_id: routing.featureId,
          workload: request.workload || this.config.defaultWorkload,
          requested_model: targetModel,
          actual_model: targetModel,
          provider: 'gemini',
          cache_hit: false,
          cache_type: null,
          input_tokens: null,
          output_tokens: null,
          total_tokens: null,
          cost_usd: null,
          cost_saved_usd: null,
          tokens_saved: null,
          optimizations_applied: ['direct_bypass'],
          receipt_signature: null,
          receipt_key_id: null,
          receipt_verification_status: 'skipped',
          latency_ms: Math.round(performance.now() - startTime),
          upstream_latency_ms: null,
          retry_count: 0,
          created_at: new Date().toISOString(),
        },
      };
    }

    // 3. Check gateway enabled state
    if (!this.config.enabled) {
      if (this.config.allowDirectFallback) {
        return {
          content: '[GATEWAY_DISABLED_DIRECT] Prune gateway is disabled; direct fallback engaged.',
          model: targetModel,
          routing,
          receipt: {
            request_id: `disabled_${Date.now()}`,
            farm_id: request.farmId || null,
            feature_id: routing.featureId,
            workload: request.workload || this.config.defaultWorkload,
            requested_model: targetModel,
            actual_model: targetModel,
            provider: 'gemini',
            cache_hit: false,
            cache_type: null,
            input_tokens: null,
            output_tokens: null,
            total_tokens: null,
            cost_usd: null,
            cost_saved_usd: null,
            tokens_saved: null,
            optimizations_applied: ['gateway_disabled'],
            receipt_signature: null,
            receipt_key_id: null,
            receipt_verification_status: 'skipped',
            latency_ms: Math.round(performance.now() - startTime),
            upstream_latency_ms: null,
            retry_count: 0,
            created_at: new Date().toISOString(),
          },
        };
      }
      throw new PruneGatewayDisabledError();
    }

    // Validate config before proceeding
    validateConfig(this.config);

    // 4. Build headers with governance metadata
    const featureId = request.featureId || routing.featureId;
    const workload = request.workload || this.config.defaultWorkload;

    const headers = buildGatewayHeaders(this.config.apiKey, {
      customerId: request.farmId,
      featureId,
      workload,
      runId: request.runId,
      runBudgetUsd: request.runBudgetUsd,
      maxSteps: request.maxSteps,
      cachePolicy: routing.cachePolicy,
    });

    const bodyPayload = {
      model: targetModel,
      messages: request.messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 1024,
    };

    const endpointUrl = `${this.config.baseUrl}/chat/completions`;

    // 5. Execute with bounded retries for transient failures (exponential backoff + jitter)
    let attempts = 0;
    const maxAttempts = 1 + this.config.maxRetries;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const controller = new AbortController();
        const timeoutHandle = setTimeout(() => controller.abort(), this.config.timeoutMs);

        let response: Response;
        try {
          response = await this.fetchFn(endpointUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(bodyPayload),
            signal: controller.signal,
          });
        } catch (fetchErr: unknown) {
          if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
            throw new PruneTimeoutError(`Gateway request timed out after ${this.config.timeoutMs}ms`);
          }
          throw new PruneNetworkError(fetchErr instanceof Error ? fetchErr.message : String(fetchErr));
        } finally {
          clearTimeout(timeoutHandle);
        }

        // Handle error responses
        if (!response.ok) {
          const errorBody = await response.text();
          const shieldCode = response.headers.get('x-prune-shield-code');
          const pruneErr = mapHttpErrorToPruneError(response.status, errorBody, shieldCode);

          // Only retry if marked retryable and attempts remain
          if (pruneErr.isRetryable && attempts < maxAttempts) {
            const jitter = Math.random() * 50;
            const delayMs = Math.min(1000, 200 * Math.pow(2, attempts - 1) + jitter);
            await new Promise((res) => setTimeout(res, delayMs));
            continue;
          }
          throw pruneErr;
        }

        // Parse successful response
        const responseData = (await response.json()) as Record<string, unknown>;
        const choices = (responseData.choices as Array<{ message?: { content?: string } }>) || [];
        const content = choices[0]?.message?.content || '';

        // Extract normalized response headers
        const headerMap: Record<string, string> = {};
        response.headers.forEach((val, key) => {
          headerMap[key.toLowerCase()] = val;
        });

        const requestId =
          (typeof responseData.id === 'string' ? responseData.id : null) ||
          headerMap['x-request-id'] ||
          `req_${Date.now()}`;

        const latencyMs = Math.round(performance.now() - startTime);
        const retryCount = attempts - 1;
        let verificationStatus: ReceiptVerificationStatus = 'unverified';

        if (request.verifyReceipt && responseData.prune_metadata) {
          const verifyResult = await verifyReceiptOnline(
            responseData.prune_metadata as Record<string, unknown>,
            this.config.baseUrl,
            this.config.apiKey
          );
          verificationStatus = verifyResult.valid ? 'verified' : 'failed';
        }

        const receipt = extractReceipt({
          requestId,
          farmId: request.farmId,
          featureId,
          workload,
          requestedModel: targetModel,
          responseHeaders: headerMap,
          responseBody: responseData,
          latencyMs,
          retryCount,
          receiptVerificationStatus: verificationStatus,
        });

        return {
          content,
          model: receipt.actual_model || (typeof responseData.model === 'string' ? responseData.model : targetModel),
          receipt,
          routing,
          rawResponse: responseData,
        };
      } catch (err: unknown) {
        if (err instanceof PruneError && !err.isRetryable) {
          throw err;
        }
        if (attempts >= maxAttempts) {
          throw err;
        }
        const jitter = Math.random() * 50;
        const delayMs = Math.min(1000, 200 * Math.pow(2, attempts - 1) + jitter);
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }

    throw new PruneError('Unexpected completion loop termination');
  }
}
