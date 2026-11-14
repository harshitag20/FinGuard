/**
 * FinGuard.io - Core Data Models and Types
 * Species-Aware Aquaculture Intelligence Platform
 */

export enum Screen {
  DASHBOARD = 'DASHBOARD',
  MONITORING = 'MONITORING',
  DISEASE = 'DISEASE',
  SCHEMES = 'SCHEMES',
  PROFILE = 'PROFILE'
}

export enum Language {
  ENGLISH = 'en',
  HINDI = 'hi',
  BENGALI = 'bn',
  MARATHI = 'mr',
  TELUGU = 'te',
  TAMIL = 'ta'
}

export interface PondMetrics {
  temp: number;      // °C
  ph: number;        // pH units
  oxygen: number;    // mg/L Dissolved Oxygen
  ammonia: number;   // mg/L TAN (Total Ammonia Nitrogen)
  nitrite?: number;  // mg/L NO2-N
  salinity?: number; // ppt
  timestamp?: number;
  isSimulated?: boolean;
}

export interface PondConfig {
  id: string;
  name: string;
  tankSize: string;
  fishCount: number;
  speciesIds: string[]; // Canonical IDs: 'rohu', 'catla', etc.
  metrics: PondMetrics;
  healthScore: number;
  isSimulated: boolean;
  status: 'NORMAL' | 'CAUTION' | 'CRITICAL';
  createdAt?: string;
}

export interface UserData {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  location: string;
  farmName?: string;
  pondSize: string;
  selectedSpecies: string[]; // List of species canonical IDs
  cultureType: string;
  type: 'google' | 'standard';
  onboardedAt?: string;
}

// Multilayer Disease Screening Models
export interface SymptomObservation {
  id: string;
  label: string;
  category: 'behavior' | 'physical' | 'mortality' | 'water';
  selected: boolean;
}

export interface CandidateDisease {
  disease_id: string | null;
  name: string;
  pathogenType?: string;
  reported_confidence: number | null; // Model-reported value only if provided
  uncertainty_label: 'Low Uncertainty' | 'Moderate Uncertainty' | 'High Uncertainty / Inconclusive';
  is_uncalibrated_estimate: boolean;
  supporting_evidence: string[];
  contradicting_evidence: string[];
  additional_checks: string[];
  reference_ids: string[];
}

export interface WaterQualityFinding {
  parameter: string;
  observed: number;
  unit: string;
  reference_interval: [number, number];
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL';
  plausibility_to_symptoms: 'CONTRIBUTING_FACTOR' | 'NEUTRAL' | 'INCONSISTENT';
  notes: string;
}

export interface DiseaseScreeningResult {
  id: string;
  timestamp: string;
  status: 'screening_only' | 'inconclusive' | 'verified';
  species: string[];
  observations: string[];
  water_quality_findings: WaterQualityFinding[];
  candidate_diseases: CandidateDisease[];
  alternative_explanations: string[];
  missing_information: string[];
  immediate_mitigation: string[];
  escalation_recommended: boolean;
  limitations: string[];
  verified_status?: 'PRELIMINARY' | 'EVIDENCE_REFINED' | 'EXTERNALLY_CONFIRMED';
  verification_notes?: string;
  verification_history?: {
    verifiedAt: string;
    repeatDO?: number;
    repeatTemp?: number;
    symptomFollowup?: string;
    expertConsulted?: boolean;
    findingsUpdated: string;
  }[];
}

// Simulated Water Telemetry Engine
export interface SimulationState {
  isRunning: boolean;
  speedMultiplier: number; // 1x, 2x, 5x, 10x
  activeScenario: 'BASELINE' | 'NOCTURNAL_HYPOXIA' | 'ACID_RAIN_PH_DROP' | 'AMMONIA_SPIKE' | 'COLD_SNAP';
  stepCount: number;
  currentMetrics: PondMetrics;
  seed: number;
  isSimulated: true;
}

export interface TelemetryAlert {
  id: string;
  pondId: string;
  parameter: 'temp' | 'ph' | 'oxygen' | 'ammonia' | 'nitrite';
  observedValue: number;
  unit: string;
  referenceRange: [number, number];
  timestamp: string;
  severity: 'WARNING' | 'CRITICAL';
  ruleTriggered: string;
  speciesImpactExplanation: string;
  cautiousAction: string;
  isSimulated: boolean;
}

// Kaggle Dataset & Evaluation
export interface DatasetManifestItem {
  id: string;
  datasetName: string;
  sourceUrl: string;
  license: string;
  totalFileCount: number;
  sampleImagesCount: number;
  availableLabels: string[];
  supportedSpecies: string[];
  ingestionStatus: 'LOCAL_DIRECTORY_SYNCED' | 'DOCUMENTED_CATALOG_AVAILABLE' | 'AWAITING_INGESTION';
  knownLimitations: string[];
  lastManifestUpdate: string;
  evaluationMetrics?: {
    evaluationDate: string;
    evaluatedSampleCount: number;
    perClassMetrics: {
      label: string;
      precision: number;
      recall: number;
      f1Score: number;
      sampleCount: number;
    }[];
    macroF1: number;
    overallAccuracy: number;
    evaluationNotes: string;
  };
}

export interface GovScheme {
  id: string;
  title: string;
  category: 'SUBSIDY' | 'LOAN' | 'TRAINING' | 'INFRASTRUCTURE';
  benefit: string;
  eligibility: string;
  description: string;
  link: string;
}
