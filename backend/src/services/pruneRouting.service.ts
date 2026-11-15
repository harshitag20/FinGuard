import { config } from '../config';
import { GoogleGenAI } from '@google/genai';
import {
  FinGuardPruneClient,
  RequestCategory,
  classifyRequest,
  RoutingDecision,
  ChatMessage,
  FinGuardReceipt
} from '../../../FinGuard-PruneIntegration/typescript/src/index';

export interface ModelCompletionRequest {
  category: RequestCategory;
  prompt: string;
  systemInstruction?: string;
  farmId?: string;
  hasImages?: boolean;
  containsFarmTelemetry?: boolean;
  hasToolCalls?: boolean;
  isVoiceSession?: boolean;
}

export interface ModelCompletionResponse {
  content: string;
  provider: 'prune_gateway' | 'direct_gemini' | 'offline_fallback';
  model: string;
  routing: RoutingDecision;
  receipt?: FinGuardReceipt | null;
  cached?: boolean;
}

export class ModelRoutingService {
  private pruneClient: FinGuardPruneClient | null = null;
  private geminiClient: GoogleGenAI | null = null;

  constructor() {
    this.initializeClients();
  }

  private initializeClients() {
    // 1. Initialize Prune Client if enabled and configured
    if (config.pruneEnabled && config.pruneApiKey) {
      try {
        this.pruneClient = new FinGuardPruneClient({
          apiKey: config.pruneApiKey,
          baseUrl: config.pruneBaseUrl,
          enabled: true,
          geminiModel: config.pruneModel,
          allowDirectFallback: config.pruneAllowDirectFallback
        });
      } catch (err: any) {
        console.warn(`[ModelRouting] Prune client init warning: ${err.message}`);
        this.pruneClient = null;
      }
    }

    // 2. Initialize Direct Google GenAI Client
    if (config.geminiApiKey) {
      try {
        this.geminiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
      } catch (err: any) {
        console.warn(`[ModelRouting] Gemini client init warning: ${err.message}`);
        this.geminiClient = null;
      }
    }
  }

  /**
   * Main completion router: Evaluates policy classification and routes accordingly.
   */
  public async executeCompletion(req: ModelCompletionRequest): Promise<ModelCompletionResponse> {
    // 1. Classify the request under conservative model policy
    const decision = classifyRequest({
      category: req.category,
      hasImages: req.hasImages,
      containsFarmTelemetry: req.containsFarmTelemetry,
      hasToolCalls: req.hasToolCalls,
      isVoiceSession: req.isVoiceSession
    });

    // 2. Prune Gateway Route
    if (decision.routeTarget === 'prune_gateway' && config.pruneEnabled && this.pruneClient) {
      try {
        const messages: ChatMessage[] = [];
        if (req.systemInstruction) {
          messages.push({ role: 'system', content: req.systemInstruction });
        }
        messages.push({ role: 'user', content: req.prompt });

        const pruneRes = await this.pruneClient.createChatCompletion({
          category: req.category,
          messages,
          farmId: req.farmId,
          model: config.pruneModel
        });

        return {
          content: pruneRes.content,
          provider: 'prune_gateway',
          model: pruneRes.model,
          routing: decision,
          receipt: pruneRes.receipt,
          cached: pruneRes.receipt?.cache_hit || false
        };
      } catch (err: any) {
        console.warn(`[ModelRouting] Prune Gateway dispatch failed: ${err.message}`);
        if (!config.pruneAllowDirectFallback) {
          throw err;
        }
        // Proceed to direct Gemini fallback
      }
    }

    // 3. Direct Gemini Provider Route (for clinical diagnosis, multimodal, telemetry, tool-calls, or fallback)
    if (this.geminiClient) {
      try {
        const response = await this.geminiClient.models.generateContent({
          model: config.geminiModel,
          contents: req.prompt,
          config: {
            systemInstruction: req.systemInstruction || 'You are FinGuard AI, an expert aquaculture health and pond management specialist.'
          }
        });

        return {
          content: response.text || '',
          provider: 'direct_gemini',
          model: config.geminiModel,
          routing: decision,
          receipt: null,
          cached: false
        };
      } catch (err: any) {
        console.warn(`[ModelRouting] Direct Gemini call failed: ${err.message}`);
      }
    }

    // 4. Authoritative Offline Rule-Engine Fallback
    return {
      content: this.generateOfflineFallback(req.prompt, req.category),
      provider: 'offline_fallback',
      model: 'finguard-scientific-rules-v1',
      routing: decision,
      receipt: null,
      cached: false
    };
  }

  /**
   * Generates factual, scientifically grounded responses when external AI APIs are offline.
   */
  private generateOfflineFallback(prompt: string, category: RequestCategory): string {
    const p = prompt.toLowerCase();
    if (p.includes('oxygen') || p.includes('do') || p.includes('piping') || p.includes('gasping')) {
      return "Dissolved Oxygen Advisory: For Indian Major Carps (Rohu, Catla, Mrigal), optimal dissolved oxygen is 5.0 - 8.5 mg/L. Levels below 3.0 mg/L trigger acute respiratory distress and surface piping. Immediately engage mechanical paddlewheel aerators or pump fresh oxygenated water.";
    }
    if (p.includes('ammonia') || p.includes('tan') || p.includes('toxicity')) {
      return "Ammonia & Water Quality: Total Ammonia Nitrogen (TAN) must remain below 0.05 mg/L. Elevated water pH (>8.2) rapidly converts ammonium (NH4+) into lethal un-ionized toxic ammonia (NH3). Cease feeding immediately and perform a partial water exchange.";
    }
    if (p.includes('temperature') || p.includes('cold') || p.includes('winter')) {
      return "Thermal Corridor Management: Tropical freshwater carps thrive at 26°C - 32°C. Water temperatures dropping below 22°C depress immune function and drastically heighten susceptibility to Epizootic Ulcerative Syndrome (EUS) and Saprolegnia fungus.";
    }
    return "FinGuard Aquaculture Advisory: Maintain stable dissolved oxygen (>5.0 mg/L), neutral pH (7.2 - 8.2), and avoid overfeeding during diurnal low-oxygen periods. Refer to your farm dashboard for species-specific tolerance ranges.";
  }
}

export const modelRoutingService = new ModelRoutingService();
