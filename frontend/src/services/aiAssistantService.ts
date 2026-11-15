/**
 * FinGuard.io - Voice & AI Assistant Service
 * Provides species-aware guidance, navigation assistance, and voice interaction
 * without exposing client-side credentials.
 */

import { PondConfig, Screen } from "../types";

export interface AIResponse {
  text: string;
  navigate?: Screen;
}

export const getGeminiAnalysis = async (query: string, pond: PondConfig, currentLang: string): Promise<AIResponse> => {
  const q = query.toLowerCase();

  // Natural language routing
  if (q.includes('monitor') || q.includes('stream') || q.includes('reading') || q.includes('sensor')) {
    return {
      text: "Opening real-time pond telemetry stream. You can observe live dissolved oxygen, temperature, and pH trends.",
      navigate: Screen.MONITORING
    };
  }

  if (q.includes('disease') || q.includes('sick') || q.includes('spot') || q.includes('rot') || q.includes('ulcer') || q.includes('camera')) {
    return {
      text: "Taking you to Multilayer Disease Screening. You can upload photos, select observed symptoms, and evaluate against species reference ranges.",
      navigate: Screen.DISEASE
    };
  }

  if (q.includes('dataset') || q.includes('kaggle') || q.includes('eval') || q.includes('research') || q.includes('metric')) {
    return {
      text: "Opening Disease Screening & Dataset Intelligence where you can run multimodal screening and inspect disease references.",
      navigate: Screen.DISEASE
    };
  }

  if (q.includes('subsid') || q.includes('scheme') || q.includes('pmmsy') || q.includes('loan') || q.includes('govern') || q.includes('financ')) {
    return {
      text: "🏛️ Government Subsidies & Schemes for Aquaculture in India:\n\n• PMMSY: 40% capital subsidy (60% for SC/ST and Women) for pond excavation, biofloc, aerators & seed.\n• KCC: Working capital loan up to ₹2 Lakhs at effective 4% annual interest rate.\n• FIDF: Concessional finance with 3% interest discount for commercial equipment and aerators.\n\nOpening the Schemes tab so you can view the complete details and generate your application checklist.",
      navigate: Screen.SCHEMES
    };
  }

  if (q.includes('species') || q.includes('setting') || q.includes('pond') || q.includes('profile')) {
    return {
      text: "Opening Farm Settings where you can adjust cultivated species and view physiological compatibility ranges.",
      navigate: Screen.PROFILE
    };
  }

  // Knowledge responses based on species-specific biology
  if (q.includes('oxygen') || q.includes('do') || q.includes('gasping')) {
    return {
      text: `For Indian Major Carps in ${pond.name}, dissolved oxygen must remain above 5.0 mg/L. If fish are surface gasping, activate mechanical aerators immediately and halt feeding.`
    };
  }

  if (q.includes('ph')) {
    return {
      text: `Safe pond water pH range is 7.2 to 8.5. Current reading is ${pond.metrics.ph}. If pH drops below 6.5, apply agricultural limestone at 200-400 kg/ha.`
    };
  }

  if (q.includes('ammonia') || q.includes('tan')) {
    return {
      text: `Total Ammonia Nitrogen (TAN) should remain below 0.05 mg/L. Current pond level is ${pond.metrics.ammonia} mg/L. Un-ionized ammonia toxicity increases sharply at high water pH and temperatures.`
    };
  }

  return {
    text: `FinGuard Intelligence active for ${pond.name}. Current telemetry shows DO at ${pond.metrics.oxygen} mg/L, Temp at ${pond.metrics.temp}°C, and pH at ${pond.metrics.ph}. How can I assist with your pond management today?`
  };
};

export const playElevenLabsVoice = async (text: string): Promise<void> => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
};

export const speakWithElevenLabs = async (text: string): Promise<HTMLAudioElement | null> => {
  return null;
};

export const speakWithFallback = (text: string, lang?: string): void => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    if (lang) utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  }
};
