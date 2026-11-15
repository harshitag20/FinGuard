import { config } from '../config';
import { GoogleGenAI } from '@google/genai';
import {
  FinGuardPruneClient,
  RequestCategory,
  classifyRequest,
  RoutingDecision,
  ChatMessage,
  FinGuardReceipt
} from '../../../FinGuard-PruneIntegration/typescript/dist/src/index.js';

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
  public generateOfflineFallback(prompt: string, category: RequestCategory): string {
    const p = prompt.toLowerCase();

    // 1. Government Subsidies, Schemes, Loans & Financial Assistance
    if (
      p.includes('subsid') || p.includes('scheme') || p.includes('pmmsy') || 
      p.includes('kcc') || p.includes('loan') || p.includes('grant') || 
      p.includes('fund') || p.includes('govern') || p.includes('financ') ||
      p.includes('assist') || p.includes('money') || p.includes('help')
    ) {
      return (
        "🏛️ Key Government Subsidies & Support for Fish Farmers in India:\n\n" +
        "1. PMMSY (Pradhan Mantri Matsya Sampada Yojana):\n" +
        "   • 40% capital subsidy for general category farmers.\n" +
        "   • 60% capital subsidy for SC, ST, and Women fish farmers.\n" +
        "   • Covers: New freshwater pond construction, Biofloc units, Recirculating Aquaculture Systems (RAS), aerators, and initial fingerling/feed inputs.\n" +
        "   • How to apply: Register on https://pmmsy.dof.gov.in or apply through your District Fisheries Officer (DFO).\n\n" +
        "2. Kisan Credit Card (KCC) for Aquaculture:\n" +
        "   • Working capital loan up to ₹2 Lakhs at an effective 4% annual interest rate (with 3% prompt repayment incentive).\n" +
        "   • Covers operational expenses: fish feed, electricity, pond maintenance, seed, and medicines.\n" +
        "   • Available at any nationalized, cooperative, or regional rural bank.\n\n" +
        "3. FIDF (Fisheries & Aquaculture Infrastructure Development Fund):\n" +
        "   • Concessional institutional financing with 3% interest subvention for commercial hatcheries, feed mills, automated paddlewheel aerators, and cold storage.\n\n" +
        "4. ICAR-CIFA & NFDB Free Training:\n" +
        "   • Certified hands-on training programs in carp breeding, water quality management, and disease prevention with government stipends.\n\n" +
        "👉 You can also explore the 'Gov Subsidies' tab in the bottom navigation to generate your personalized application checklist!"
      );
    }

    // 2. Dissolved Oxygen & Aeration
    if (p.includes('oxygen') || p.includes('do') || p.includes('piping') || p.includes('gasping') || p.includes('aerat')) {
      return (
        "💨 Dissolved Oxygen (DO) Management Advisory:\n" +
        "• Safe Operating Window: 5.0 - 8.5 mg/L for Indian Major Carps (Rohu, Catla, Mrigal).\n" +
        "• Warning Zone: 3.0 - 5.0 mg/L (reduced feeding, sluggish activity).\n" +
        "• Critical Danger: < 3.0 mg/L causes severe respiratory distress and surface piping (gasping for air).\n" +
        "• Action Protocol: Run mechanical paddlewheel aerators immediately, pump in fresh oxygenated water, and immediately halt feeding until levels rise above 5.0 mg/L."
      );
    }

    // 3. Ammonia & Toxic Waste
    if (p.includes('ammonia') || p.includes('tan') || p.includes('toxicity') || p.includes('waste') || p.includes('nitrite')) {
      return (
        "🧪 Ammonia & Waste Water Quality:\n" +
        "• Total Ammonia Nitrogen (TAN) must be strictly kept below 0.05 mg/L.\n" +
        "• At water pH > 8.2 and elevated temperatures, non-toxic ammonium (NH4+) rapidly converts into lethal toxic un-ionized ammonia (NH3).\n" +
        "• Action: Cease all feeding immediately for 24-48 hours, conduct a 25-30% partial water exchange with clean borewell water, and apply agricultural gypsum or zeolites if available."
      );
    }

    // 4. Water Temperature & Seasonal Management
    if (p.includes('temperature') || p.includes('temp') || p.includes('cold') || p.includes('winter') || p.includes('heat') || p.includes('summer')) {
      return (
        "🌡️ Temperature Management for Pond Aquaculture:\n" +
        "• Optimal Thermal Corridor: 26°C - 32°C for optimal metabolic growth and feed conversion ratio (FCR).\n" +
        "• Cold Drops (< 24°C): Fish metabolism slows drastically; reduce feeding rate by 40-50% to prevent unconsumed feed decomposition. Cold stress also triggers Epizootic Ulcerative Syndrome (EUS).\n" +
        "• High Heat (> 34°C): Oxygen solubility in water drops precipitously while fish respiration doubles. Operate aerators through the early morning hours (2 AM - 7 AM)."
      );
    }

    // 5. Water Acidity (pH) & Liming
    if (p.includes('ph') || p.includes('acid') || p.includes('alkalin') || p.includes('lime')) {
      return (
        "⚖️ Pond Water pH & Liming Advisory:\n" +
        "• Ideal Range: 7.2 - 8.2 (slightly alkaline biological buffer).\n" +
        "• Acidic Water (pH < 6.5): Inhibits gill respiration and mineral assimilation. Apply agricultural limestone (CaCO3) at 200 - 300 kg/hectare.\n" +
        "• Highly Alkaline Water (pH > 9.0): Amplifies ammonia toxicity. Apply agricultural gypsum (calcium sulfate) or dilute with fresh water."
      );
    }

    // 6. Fish Diseases & Symptoms (EUS, Fin Rot, White Spot, Ulcers)
    if (p.includes('disease') || p.includes('sick') || p.includes('rot') || p.includes('ulcer') || p.includes('spot') || p.includes('fung') || p.includes('cifax') || p.includes('cure') || p.includes('treat')) {
      return (
        "🐟 Disease Diagnostics & Treatment Protocol:\n" +
        "1. Epizootic Ulcerative Syndrome (EUS): Characterized by red spots developing into deep ulcers. Treat with CIFAX (ICAR-CIFA formulation) at 1 liter per hectare-meter of water, or apply Potassium Permanganate at 2-3 ppm.\n" +
        "2. Bacterial Fin & Tail Rot: Frayed, necrotic fin edges with white margins. Perform salt dip bath (2% NaCl for 5 mins) and improve pond bottom hygiene.\n" +
        "3. White Spot (Ich): Small white cysts covering body and fins. Administer formaline bath (25 ppm) and elevate water temperature.\n" +
        "4. Argulus (Fish Lice): Apply Deltamethrin (Butox) or Clinar as per recommended veterinary dosage under professional guidance."
      );
    }

    // 7. Feeding, Feed Conversion Ratio (FCR) & Nutrition
    if (p.includes('feed') || p.includes('food') || p.includes('fcr') || p.includes('nutrition') || p.includes('protein')) {
      return (
        "🌾 Feeding & Nutrition Standards for Carps & Catfish:\n" +
        "• Feed Quality: Use floating pelleted feed containing 28% - 32% crude protein.\n" +
        "• Feeding Rate: 2.5% to 3.5% of total estimated biomass per day, split into morning and late afternoon sessions.\n" +
        "• Target FCR: Aim for Feed Conversion Ratio of 1.2 to 1.5 kg of feed per 1 kg of fish weight gained.\n" +
        "• Best Practice: Use check trays (feed baskets) to monitor consumption within 2 hours. Overfeeding is the #1 cause of ammonia spikes and dissolved oxygen crashes."
      );
    }

    // 8. Species Mix & Polyculture
    if (p.includes('species') || p.includes('rohu') || p.includes('catla') || p.includes('mrigal') || p.includes('tilapia') || p.includes('prawn') || p.includes('scampi')) {
      return (
        "🐠 Recommended Indian Major Carp (IMC) Composite Polyculture:\n" +
        "• Surface Feeder (Catla catla): 30% - 40% (feeds on zooplankton).\n" +
        "• Column Feeder (Labeo rohita / Rohu): 30% - 40% (feeds on decaying organic matter & phytoplankton).\n" +
        "• Bottom Feeder (Cirrhinus mrigala / Mrigal): 20% - 30% (feeds on benthic detritus & microorganisms).\n" +
        "• Stocking Density: 4,000 - 5,000 fingerlings (8-10 cm size) per hectare in fertilized earthen ponds for optimal annual yield."
      );
    }

    return (
      "FinGuard Aquaculture Intelligence Advisory:\n" +
      "• Telemetry Target: Maintain dissolved oxygen > 5.0 mg/L, water temperature between 26°C - 32°C, and pH 7.2 - 8.2.\n" +
      "• Operational Security: Test water parameters daily at dawn. For government subsidies (PMMSY 40-60%, KCC 4% loans), navigate to the Schemes screen or ask me for application guidance."
    );
  }
}

export const modelRoutingService = new ModelRoutingService();
