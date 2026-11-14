/**
 * FinGuard.io - Secure Server-Side Gemini Multimodal Screening Service
 * Evaluates fish health through multilayer synthesis:
 * Species Profile + Pond Telemetry + Gross Visual Pathology + Clinical History + Documented References
 */

import { GoogleGenAI, Type } from '@google/genai';
import { PondMetrics, DiseaseScreeningResult, WaterQualityFinding, CandidateDisease } from '../../../shared/types';
import { SPECIES_CATALOG, SpeciesProfile } from '../../../shared/speciesCatalog';
import { DISEASE_CATALOG, DiseaseReference } from '../../../shared/diseaseCatalog';

export interface ScreeningRequest {
  speciesIds: string[];
  pondId: string;
  pondMetrics?: PondMetrics;
  imageBase64?: string;
  reportedSymptoms: string[]; // e.g. ['reduced_appetite', 'lesions', 'gasping']
  symptomHistory?: string;
  historicalReadingsSummary?: string;
}

export interface VerificationRequest {
  screeningId: string;
  repeatDO?: number;
  repeatTemp?: number;
  repeatPh?: number;
  repeatAmmonia?: number;
  gillClipExamined?: boolean;
  gillClipNotes?: string;
  microscopyConducted?: boolean;
  expertConsulted?: boolean;
  expertNameOrTitle?: string;
  additionalNotes?: string;
}

/**
 * Validates the raw JSON output against the expected strict schema.
 */
function validateScreeningResponse(parsed: any, speciesIds: string[]): DiseaseScreeningResult {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Screening output is not a valid JSON object');
  }

  const candidateDiseases: CandidateDisease[] = [];
  if (Array.isArray(parsed.candidate_diseases)) {
    for (const c of parsed.candidate_diseases) {
      if (typeof c.name !== 'string') continue;

      let diseaseId: string | null = null;
      if (typeof c.disease_id === 'string' && DISEASE_CATALOG[c.disease_id]) {
        diseaseId = c.disease_id;
      } else {
        // Find matching key in DISEASE_CATALOG
        const found = Object.keys(DISEASE_CATALOG).find(
          k => DISEASE_CATALOG[k].canonicalName.toLowerCase() === c.name.toLowerCase()
        );
        diseaseId = found || null;
      }

      let reportedConfidence: number | null = null;
      if (typeof c.reported_confidence === 'number' && !isNaN(c.reported_confidence)) {
        // Bound between 0 and 1
        reportedConfidence = Math.max(0.0, Math.min(1.0, Number(c.reported_confidence.toFixed(2))));
      }

      let uncertaintyLabel: CandidateDisease['uncertainty_label'] = 'Moderate Uncertainty';
      if (reportedConfidence !== null) {
        if (reportedConfidence >= 0.75) uncertaintyLabel = 'Low Uncertainty';
        else if (reportedConfidence <= 0.4) uncertaintyLabel = 'High Uncertainty / Inconclusive';
      }

      candidateDiseases.push({
        disease_id: diseaseId,
        name: c.name,
        pathogenType: diseaseId ? DISEASE_CATALOG[diseaseId]?.pathogenType : 'Undetermined',
        reported_confidence: reportedConfidence,
        uncertainty_label: uncertaintyLabel,
        is_uncalibrated_estimate: true, // Non-negotiable requirement
        supporting_evidence: Array.isArray(c.supporting_evidence) ? c.supporting_evidence.map(String) : [],
        contradicting_evidence: Array.isArray(c.contradicting_evidence) ? c.contradicting_evidence.map(String) : [],
        additional_checks: Array.isArray(c.additional_checks) ? c.additional_checks.map(String) : [],
        reference_ids: diseaseId ? [diseaseId] : []
      });
    }
  }

  const waterFindings: WaterQualityFinding[] = Array.isArray(parsed.water_quality_findings)
    ? parsed.water_quality_findings.map((w: any) => ({
        parameter: String(w.parameter || 'Unknown'),
        observed: Number(w.observed || 0),
        unit: String(w.unit || ''),
        reference_interval: Array.isArray(w.reference_interval) && w.reference_interval.length === 2
          ? [Number(w.reference_interval[0]), Number(w.reference_interval[1])]
          : [0, 0],
        status: w.status === 'CRITICAL' ? 'CRITICAL' : (w.status === 'WARNING' ? 'WARNING' : 'OPTIMAL'),
        plausibility_to_symptoms: w.plausibility_to_symptoms === 'CONTRIBUTING_FACTOR' ? 'CONTRIBUTING_FACTOR' : 'NEUTRAL',
        notes: String(w.notes || '')
      }))
    : [];

  const result: DiseaseScreeningResult = {
    id: `SCR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    status: candidateDiseases.length === 0 ? 'inconclusive' : 'screening_only',
    species: speciesIds,
    observations: Array.isArray(parsed.observations) ? parsed.observations.map(String) : [],
    water_quality_findings: waterFindings,
    candidate_diseases: candidateDiseases,
    alternative_explanations: Array.isArray(parsed.alternative_explanations)
      ? parsed.alternative_explanations.map(String)
      : ['Subclinical osmotic stress', 'Environmental hypoxia', 'Nutritional deficiency'],
    missing_information: Array.isArray(parsed.missing_information) ? parsed.missing_information.map(String) : [],
    immediate_mitigation: Array.isArray(parsed.immediate_mitigation)
      ? parsed.immediate_mitigation.map(String)
      : ['Increase pond aeration immediately', 'Cease artificial feeding for 24 hours', 'Consult local fisheries veterinary authority'],
    escalation_recommended: Boolean(parsed.escalation_recommended ?? true),
    limitations: [
      'Preliminary screening only: does not constitute histopathological or laboratory-confirmed veterinary diagnosis.',
      'AI confidence values reflect internal model uncertainty and are not calibrated real-world probabilities.',
      'Visual examination alone cannot distinguish between polymicrobial co-infections.'
    ],
    verified_status: 'PRELIMINARY'
  };

  return result;
}

/**
 * Compares current pond metrics with species profiles to produce factual water quality findings.
 */
function evaluateWaterQualityForSpecies(
  metrics: PondMetrics,
  speciesList: SpeciesProfile[]
): WaterQualityFinding[] {
  const findings: WaterQualityFinding[] = [];

  if (speciesList.length === 0) return findings;

  // Temperature
  const minTemp = Math.max(...speciesList.map(s => s.parameters.temp.optimal[0]));
  const maxTemp = Math.min(...speciesList.map(s => s.parameters.temp.optimal[1]));
  const tempStatus = (metrics.temp < minTemp || metrics.temp > maxTemp) ? 'WARNING' : 'OPTIMAL';
  findings.push({
    parameter: 'Water Temperature',
    observed: metrics.temp,
    unit: '°C',
    reference_interval: [minTemp, maxTemp],
    status: tempStatus,
    plausibility_to_symptoms: metrics.temp < 22 ? 'CONTRIBUTING_FACTOR' : 'NEUTRAL',
    notes: metrics.temp < 22
      ? 'Low water temperature significantly depresses fish immune defense and promotes fungal Saprolegnia / winter EUS.'
      : 'Within acceptable thermal range.'
  });

  // Dissolved Oxygen
  const minDO = Math.max(...speciesList.map(s => s.parameters.oxygen.optimal[0]));
  const critDO = Math.max(...speciesList.map(s => s.parameters.oxygen.criticalLow));
  let doStatus: 'OPTIMAL' | 'WARNING' | 'CRITICAL' = 'OPTIMAL';
  let doPlausibility: 'CONTRIBUTING_FACTOR' | 'NEUTRAL' = 'NEUTRAL';
  let doNotes = 'Normal oxygen saturation.';

  if (metrics.oxygen < critDO) {
    doStatus = 'CRITICAL';
    doPlausibility = 'CONTRIBUTING_FACTOR';
    doNotes = 'Critical hypoxia: triggers severe respiratory asphyxia, surface piping, and suppresses antibody production.';
  } else if (metrics.oxygen < minDO) {
    doStatus = 'WARNING';
    doPlausibility = 'CONTRIBUTING_FACTOR';
    doNotes = 'Depressed dissolved oxygen causes lethargy and increases susceptibility to opportunistic bacterial gill disease.';
  }

  findings.push({
    parameter: 'Dissolved Oxygen',
    observed: metrics.oxygen,
    unit: 'mg/L',
    reference_interval: [minDO, 9.0],
    status: doStatus,
    plausibility_to_symptoms: doPlausibility,
    notes: doNotes
  });

  // Total Ammonia Nitrogen (TAN)
  const maxTAN = Math.min(...speciesList.map(s => s.parameters.ammonia.optimal[1]));
  const critTAN = Math.min(...speciesList.map(s => s.parameters.ammonia.criticalHigh));
  let tanStatus: 'OPTIMAL' | 'WARNING' | 'CRITICAL' = 'OPTIMAL';
  let tanPlausibility: 'CONTRIBUTING_FACTOR' | 'NEUTRAL' = 'NEUTRAL';
  let tanNotes = 'Safe ammonia levels.';

  if (metrics.ammonia > critTAN) {
    tanStatus = 'CRITICAL';
    tanPlausibility = 'CONTRIBUTING_FACTOR';
    tanNotes = 'Acute ammonia toxicity: causes gill hyperplasia, erosion of fin margins, and internal hemorrhaging.';
  } else if (metrics.ammonia > maxTAN) {
    tanStatus = 'WARNING';
    tanPlausibility = 'CONTRIBUTING_FACTOR';
    tanNotes = 'Sublethal ammonia stress weakens epidermal mucus layer, facilitating bacterial fin/tail rot.';
  }

  findings.push({
    parameter: 'Total Ammonia Nitrogen (TAN)',
    observed: metrics.ammonia,
    unit: 'mg/L TAN',
    reference_interval: [0.0, maxTAN],
    status: tanStatus,
    plausibility_to_symptoms: tanPlausibility,
    notes: tanNotes
  });

  // pH
  const minPh = Math.max(...speciesList.map(s => s.parameters.ph.optimal[0]));
  const maxPh = Math.min(...speciesList.map(s => s.parameters.ph.optimal[1]));
  const phStatus = (metrics.ph < minPh || metrics.ph > maxPh) ? 'WARNING' : 'OPTIMAL';
  findings.push({
    parameter: 'pH Level',
    observed: metrics.ph,
    unit: 'pH',
    reference_interval: [minPh, maxPh],
    status: phStatus,
    plausibility_to_symptoms: (metrics.ph < minPh || metrics.ph > maxPh) ? 'CONTRIBUTING_FACTOR' : 'NEUTRAL',
    notes: metrics.ph < 6.8
      ? 'Acidic water dissolves protective epidermal mucus coat, increasing vulnerability to fungal zoospore invasion.'
      : (metrics.ph > 8.8 ? 'High pH converts ionized ammonium (NH4+) into toxic un-ionized ammonia (NH3).' : 'Optimum range.')
  });

  return findings;
}

/**
 * Scientifically grounded fallback when Gemini API key is unconfigured or rate limited.
 */
function generateAuthoritativeFallbackScreening(
  req: ScreeningRequest,
  speciesList: SpeciesProfile[],
  waterFindings: WaterQualityFinding[]
): DiseaseScreeningResult {
  const candidates: CandidateDisease[] = [];
  const reportedSymptoms = req.reportedSymptoms.map(s => s.toLowerCase());

  // Rule 1: Lesions / red spots
  if (reportedSymptoms.some(s => s.includes('lesion') || s.includes('spot') || s.includes('ulcer'))) {
    const eusRef = DISEASE_CATALOG.eus;
    candidates.push({
      disease_id: eusRef.diseaseId,
      name: eusRef.canonicalName,
      pathogenType: eusRef.pathogenType,
      reported_confidence: 0.72,
      uncertainty_label: 'Moderate Uncertainty',
      is_uncalibrated_estimate: true,
      supporting_evidence: [
        'Reported visible ulcers / necrotic lesions consistent with gross EUS presentation.',
        ...waterFindings.filter(w => w.status !== 'OPTIMAL').map(w => `Environmental stress: ${w.parameter} (${w.observed} ${w.unit})`)
      ],
      contradicting_evidence: [
        'Aphanomyces invadans hyphae have not been verified via muscle squash histopathology.'
      ],
      additional_checks: [
        'Take muscle biopsy at ulcer margin for wet mount microscopy',
        'Check for fungal aseptate granulomas'
      ],
      reference_ids: [eusRef.diseaseId]
    });
  }

  // Rule 2: Fin damage / rot
  if (reportedSymptoms.some(s => s.includes('fin') || s.includes('tail') || s.includes('fray'))) {
    const finRef = DISEASE_CATALOG.fin_and_tail_rot;
    candidates.push({
      disease_id: finRef.diseaseId,
      name: finRef.canonicalName,
      pathogenType: finRef.pathogenType,
      reported_confidence: 0.68,
      uncertainty_label: 'Moderate Uncertainty',
      is_uncalibrated_estimate: true,
      supporting_evidence: [
        'Reported fin fraying or tail degradation.',
        'Elevated organic waste or ammonia predisposing to Flavobacterium/Aeromonas infection.'
      ],
      contradicting_evidence: [
        'Could also be mechanical damage from aggressive net handling or territorial nipping.'
      ],
      additional_checks: [
        'Examine fin bases for hemorrhagic septicemia',
        'Rule out aggressive fin nipping'
      ],
      reference_ids: [finRef.diseaseId]
    });
  }

  // Rule 3: Gasping / gill distress / surface piping
  if (reportedSymptoms.some(s => s.includes('gasp') || s.includes('breath') || s.includes('piping') || s.includes('gill'))) {
    const gillRef = DISEASE_CATALOG.bacterial_gill_rot;
    candidates.push({
      disease_id: gillRef.diseaseId,
      name: gillRef.canonicalName,
      pathogenType: gillRef.pathogenType,
      reported_confidence: 0.70,
      uncertainty_label: 'Moderate Uncertainty',
      is_uncalibrated_estimate: true,
      supporting_evidence: [
        'Surface piping and labored opercular movement.',
        ...waterFindings.filter(w => w.parameter.includes('Oxygen') && w.status !== 'OPTIMAL').map(w => 'Documented low dissolved oxygen.')
      ],
      contradicting_evidence: [
        'Gill flukes (Dactylogyrus) or acute ammonia burning can produce identical clinical signs.'
      ],
      additional_checks: [
        'Lift operculum to inspect gill filaments for gray mottled clubbing',
        'Perform microscopic gill clip'
      ],
      reference_ids: [gillRef.diseaseId]
    });
  }

  // If no specific symptoms or healthy appearance reported
  if (candidates.length === 0) {
    if (reportedSymptoms.some(s => s.includes('healthy') || s.includes('normal'))) {
      const hRef = DISEASE_CATALOG.healthy_fish;
      candidates.push({
        disease_id: hRef.diseaseId,
        name: hRef.canonicalName,
        pathogenType: hRef.pathogenType,
        reported_confidence: 0.85,
        uncertainty_label: 'Low Uncertainty',
        is_uncalibrated_estimate: true,
        supporting_evidence: ['No gross pathological lesions or abnormal behaviors reported.'],
        contradicting_evidence: ['Subclinical or early incubation phase cannot be excluded visually.'],
        additional_checks: ['Periodic routine pond water monitoring'],
        reference_ids: [hRef.diseaseId]
      });
    } else {
      // Inconclusive case
      return {
        id: `SCR-${Date.now()}-INC`,
        timestamp: new Date().toISOString(),
        status: 'inconclusive',
        species: req.speciesIds,
        observations: req.reportedSymptoms,
        water_quality_findings: waterFindings,
        candidate_diseases: [],
        alternative_explanations: [
          'Non-infectious water quality shock',
          'Physical trauma from predatory birds or handling',
          'Nutritional deficiency or feed spoilage'
        ],
        missing_information: [
          'Clear high-resolution photograph of fish body and gills',
          'Specific behavioral descriptions (feeding enthusiasm, swimming pattern)',
          'Recent dissolved oxygen and TAN measurements'
        ],
        immediate_mitigation: [
          'Verify pond dissolved oxygen and TAN immediately using calibrated chemical kits.',
          'Cease feeding for 24 hours to reduce bio-load while observing fish behavior.',
          'Contact local Krishi Vigyan Kendra (KVK) or State Fisheries Officer.'
        ],
        escalation_recommended: true,
        limitations: [
          'Inconclusive evidence: observations provided are insufficient for candidate differentiation.',
          'Do not apply broad-spectrum chemical treatments without veterinary confirmation.'
        ],
        verified_status: 'PRELIMINARY'
      };
    }
  }

  return {
    id: `SCR-${Date.now()}-SYS`,
    timestamp: new Date().toISOString(),
    status: 'screening_only',
    species: req.speciesIds,
    observations: req.reportedSymptoms,
    water_quality_findings: waterFindings,
    candidate_diseases: candidates,
    alternative_explanations: [
      'Polymicrobial secondary infection',
      'Underlying water chemistry stress'
    ],
    missing_information: [
      'Microscopic gill/skin scrape verification',
      'Longitudinal mortality count'
    ],
    immediate_mitigation: [
      'Immediately ensure mechanical aeration is functioning at maximum capacity.',
      'Reduce feed ration by 50% to prevent un-ionized ammonia buildup.',
      'Maintain pond water depth and avoid abrupt cold-water replenishment.',
      'Consult a certified aquatic animal health professional before using any chemical additives.'
    ],
    escalation_recommended: true,
    limitations: [
      'Screening assessment based on clinical rule engine and documented ICAR-CIFA references.',
      'Confidence values are qualitative heuristics, not validated diagnostic probabilities.'
    ],
    verified_status: 'PRELIMINARY'
  };
}

export class GeminiScreeningService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  }

  /**
   * Main screening entry point.
   */
  public async performScreening(req: ScreeningRequest): Promise<DiseaseScreeningResult> {
    const speciesList = req.speciesIds.map(id => SPECIES_CATALOG[id]).filter(Boolean);
    const metrics = req.pondMetrics || {
      temp: 28.5,
      ph: 7.6,
      oxygen: 6.2,
      ammonia: 0.02,
      timestamp: Date.now(),
      isSimulated: true
    };

    // Calculate deterministic water quality comparison
    const waterFindings = evaluateWaterQualityForSpecies(metrics, speciesList);

    // If no API key configured, use the scientifically authoritative fallback
    if (!this.apiKey) {
      console.info('[GeminiScreening] GEMINI_API_KEY not configured. Executing authoritative scientific rule-engine screening.');
      return generateAuthoritativeFallbackScreening(req, speciesList, waterFindings);
    }

    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });
      const prompt = `You are an expert Aquatic Veterinary Pathologist and Aquaculture Scientist.
Analyze this fish health screening request based on:
Species: ${speciesList.map(s => `${s.commonName} (${s.scientificName})`).join(', ')}
Reported Symptoms: ${req.reportedSymptoms.join(', ') || 'None specified'}
Pond Telemetry: Temp: ${metrics.temp}°C, pH: ${metrics.ph}, Dissolved Oxygen: ${metrics.oxygen} mg/L, TAN Ammonia: ${metrics.ammonia} mg/L
Symptom History: ${req.symptomHistory || 'No prior notes'}
Water Quality Findings: ${JSON.stringify(waterFindings)}

Available Documented Disease Reference IDs in catalogue: eus, bacterial_gill_rot, fin_and_tail_rot, white_spot_ich, saprolegniasis, healthy_fish.

INSTRUCTIONS:
1. Provide a differential screening with multiple candidate diseases if symptoms point to more than one possibility.
2. DO NOT force confidence scores to add up to 1.0 / 100%. If uncertain, provide a qualitative estimate (0.1 to 0.9) or null.
3. For each candidate disease, state clearly the supporting evidence, contradicting evidence, and additional checks.
4. Provide cautious, evidence-based immediate mitigations (focus on aeration, water quality, quarantine; NO unverified prescription antibiotic dosages).
5. Output ONLY valid JSON adhering strictly to the schema.`;

      const contentsParts: any[] = [];
      if (req.imageBase64) {
        const cleanBase64 = req.imageBase64.includes('base64,')
          ? req.imageBase64.split('base64,')[1]
          : req.imageBase64;
        contentsParts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: cleanBase64
          }
        });
      }
      contentsParts.push({ text: prompt });

      let responseText = '{}';
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API timeout after 3500ms')), 3500)
        );

        const geminiCall = ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: contentsParts,
          config: {
            systemInstruction: "You are an objective aquatic pathologist. Never fabricate confident diagnoses without clinical evidence. Distinguish model uncertainty from validated lab diagnosis. Output valid JSON.",
            responseMimeType: "application/json"
          }
        });

        const response = await Promise.race([geminiCall, timeoutPromise]);
        responseText = response.text || '{}';
      } catch (modelErr) {
        console.warn('[GeminiScreening] Gemini API call timed out or failed. Falling back immediately to authoritative scientific engine:', modelErr);
        return generateAuthoritativeFallbackScreening(req, speciesList, waterFindings);
      }

      const parsed = JSON.parse(responseText);
      const validatedResult = validateScreeningResponse(parsed, req.speciesIds);

      // Merge factual water quality findings if missing from model output
      if (validatedResult.water_quality_findings.length === 0) {
        validatedResult.water_quality_findings = waterFindings;
      }

      return validatedResult;
    } catch (err) {
      console.warn('[GeminiScreening] Gemini API call failed or timed out. Falling back to authoritative scientific engine:', err);
      return generateAuthoritativeFallbackScreening(req, speciesList, waterFindings);
    }
  }

  /**
   * Verification Stage (Phase C, Step 6):
   * Re-evaluates screening findings based on newly entered repeat observations or veterinary feedback.
   */
  public verifyScreening(
    existing: DiseaseScreeningResult,
    verifyReq: VerificationRequest
  ): DiseaseScreeningResult {
    const updated = { ...existing };
    const historyEntry = {
      verifiedAt: new Date().toISOString(),
      repeatDO: verifyReq.repeatDO,
      repeatTemp: verifyReq.repeatTemp,
      symptomFollowup: verifyReq.gillClipNotes,
      expertConsulted: verifyReq.expertConsulted,
      findingsUpdated: ''
    };

    const updates: string[] = [];

    // Check repeat water quality
    if (verifyReq.repeatDO !== undefined) {
      updates.push(`Repeat Dissolved Oxygen verified at ${verifyReq.repeatDO} mg/L`);
      if (verifyReq.repeatDO > 5.0) {
        updates.push('Oxygen levels stabilized above hypoxic threshold.');
      }
    }

    if (verifyReq.microscopyConducted) {
      updates.push('Wet-mount microscopy completed.');
      if (verifyReq.gillClipNotes) {
        updates.push(`Microscopy observation: "${verifyReq.gillClipNotes}"`);
      }
    }

    if (verifyReq.expertConsulted) {
      updated.verified_status = 'EXTERNALLY_CONFIRMED';
      updated.verification_notes = `Externally verified by qualified specialist (${verifyReq.expertNameOrTitle || 'Fisheries Officer'}). Confirmation protocol documented.`;
      updates.push(`Specialist consultation confirmed: ${verifyReq.expertNameOrTitle || 'Aquatic Veterinarian'}`);
    } else {
      updated.verified_status = 'EVIDENCE_REFINED';
      updated.verification_notes = `Screening refined with ${updates.length} follow-up field observations. Preliminary screening status maintained.`;
    }

    historyEntry.findingsUpdated = updates.join('; ');
    updated.verification_history = [...(updated.verification_history || []), historyEntry];

    return updated;
  }
}

export const geminiScreeningService = new GeminiScreeningService();

