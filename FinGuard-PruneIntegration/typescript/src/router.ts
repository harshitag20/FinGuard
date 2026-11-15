/**
 * FinGuard-PruneIntegration: Request Classification and Policy Router
 */

export enum RequestCategory {
  GENERAL_TEXT = 'general_text',
  STATIC_EDUCATIONAL = 'static_educational',
  FARM_CONVERSATION = 'farm_conversation',
  DISEASE_DIAGNOSIS = 'disease_diagnosis',
  MULTIMODAL_IMAGE = 'multimodal_image',
  VOICE_LIVE = 'voice_live',
  AGENT_TOOL_CALLING = 'agent_tool_calling',
}

export interface RoutingDecision {
  category: RequestCategory;
  routeTarget: 'prune_gateway' | 'direct_gemini' | 'rejected';
  cachePolicy: 'off' | 'exact' | 'disabled';
  featureId: string;
  isSupported: boolean;
  reason: string;
}

export interface ClassificationContext {
  category: RequestCategory;
  featureId?: string;
  hasImages?: boolean;
  isVoiceSession?: boolean;
  hasToolCalls?: boolean;
  containsFarmTelemetry?: boolean;
  containsSensitiveData?: boolean;
}

/**
 * Classifies an incoming LLM request and enforces strict routing and caching policies.
 */
export function classifyRequest(context: ClassificationContext): RoutingDecision {
  const {
    category,
    featureId,
    hasImages = false,
    isVoiceSession = false,
    hasToolCalls = false,
    containsFarmTelemetry = false,
    containsSensitiveData = false,
  } = context;

  // Rule 1: Real-time voice and WebSocket audio sessions MUST bypass Prune
  if (category === RequestCategory.VOICE_LIVE || isVoiceSession) {
    return {
      category: RequestCategory.VOICE_LIVE,
      routeTarget: 'direct_gemini',
      cachePolicy: 'off',
      featureId: featureId || 'voice_expert_live',
      isSupported: true,
      reason: 'Gemini Live bidirectional WebSockets are not supported by Prune HTTP proxy. Kept on direct Gemini path.',
    };
  }

  // Rule 2: Multimodal image inputs remain direct to Gemini until gateway image mapping is verified
  if (category === RequestCategory.MULTIMODAL_IMAGE || hasImages) {
    return {
      category: RequestCategory.MULTIMODAL_IMAGE,
      routeTarget: 'direct_gemini',
      cachePolicy: 'off',
      featureId: featureId || 'multimodal_disease_screening',
      isSupported: false,
      reason: 'Multimodal image forwarding through Prune gateway is unverified. Preserved on direct Gemini provider path.',
    };
  }

  // Rule 3: Disease diagnosis & expert analysis - MUST remain on direct Gemini path
  // until required request format, output quality, and clinical safety behavior are validated
  if (category === RequestCategory.DISEASE_DIAGNOSIS || containsFarmTelemetry) {
    return {
      category: RequestCategory.DISEASE_DIAGNOSIS,
      routeTarget: 'direct_gemini',
      cachePolicy: 'off',
      featureId: featureId || 'disease_screening',
      isSupported: false,
      reason: 'Clinical diagnosis and volatile telemetry require direct Gemini execution until diagnostic output quality and safety are validated.',
    };
  }

  // Rule 4: Farm-specific operational context & observations
  if (category === RequestCategory.FARM_CONVERSATION || containsSensitiveData) {
    return {
      category: RequestCategory.FARM_CONVERSATION,
      routeTarget: 'direct_gemini',
      cachePolicy: 'off',
      featureId: featureId || 'farm_agent',
      isSupported: false,
      reason: 'Farm operational conversations preserved on direct Gemini provider path pending audit.',
    };
  }

  // Rule 5: Agent tool-calling requests (Maritime agent) - MUST remain on direct Gemini path
  // until real Gemini tool-calling compatibility is proven
  if (category === RequestCategory.AGENT_TOOL_CALLING || hasToolCalls) {
    return {
      category: RequestCategory.AGENT_TOOL_CALLING,
      routeTarget: 'direct_gemini',
      cachePolicy: 'off',
      featureId: featureId || 'farm_agent_tools',
      isSupported: false,
      reason: 'Gemini tool calling compatibility via Prune gateway is unverified. Preserved on direct Gemini provider path.',
    };
  }

  // Rule 6: Static educational reference knowledge - exact caching may be permitted
  if (category === RequestCategory.STATIC_EDUCATIONAL) {
    return {
      category: RequestCategory.STATIC_EDUCATIONAL,
      routeTarget: 'prune_gateway',
      cachePolicy: 'exact',
      featureId: featureId || 'educational_knowledge',
      isSupported: true,
      reason: 'Static biological facts and educational content are safe for exact-match caching.',
    };
  }

  // Default: General text assistance
  return {
    category: RequestCategory.GENERAL_TEXT,
    routeTarget: 'prune_gateway',
    cachePolicy: 'off',
    featureId: featureId || 'general_chat',
    isSupported: true,
    reason: 'General explanatory text routed through Prune gateway with conservative caching.',
  };
}

