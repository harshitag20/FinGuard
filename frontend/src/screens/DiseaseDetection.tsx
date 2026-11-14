import React, { useState, useRef, useMemo } from 'react';
import { 
  Camera, Activity, Loader2, X, Sparkles, Upload, CheckCircle2, AlertCircle, 
  ShieldAlert, ShieldCheck, ChevronRight, RefreshCw, FileText, Stethoscope, AlertTriangle, Info, HelpCircle
} from 'lucide-react';
import { useTheme, usePond, useUser } from '../App';
import { DiseaseScreeningResult, CandidateDisease, WaterQualityFinding } from '../types';
import { SPECIES_CATALOG } from '../services/speciesCatalog';
import { DISEASE_CATALOG } from '../services/diseaseCatalog';
import { api } from '../services/apiService';

const SYMPTOM_OPTIONS = [
  { id: 'reduced_appetite', label: 'Reduced Appetite / Anorexia', category: 'behavior' },
  { id: 'surface_gasping', label: 'Surface Gasping / Piping for Air', category: 'behavior' },
  { id: 'unusual_swimming', label: 'Erratic Swimming / Flashing on Dykes', category: 'behavior' },
  { id: 'visible_lesions', label: 'Red Spots / Deep Ulcerative Lesions', category: 'physical' },
  { id: 'fin_damage', label: 'Frayed / Opaque Rotting Fins', category: 'physical' },
  { id: 'white_spots', label: 'Tiny White Cysts on Body / Fins', category: 'physical' },
  { id: 'pale_swollen_gills', label: 'Pale, Mottled or Gray Swollen Gills', category: 'physical' },
  { id: 'cotton_wool_growth', label: 'Cotton-Like Fungal Hyphae Tufts', category: 'physical' },
  { id: 'unusual_mortality', label: 'Abrupt Unexplained Mortality Event', category: 'mortality' }
];

const DiseaseDetection: React.FC = () => {
  const { theme } = useTheme();
  const { pond } = usePond();
  const { user } = useUser();

  // Workflow Step: 'OBSERVE' -> 'SCREENING' -> 'VERIFY'
  const [activeStep, setActiveStep] = useState<'OBSERVE' | 'RESULTS' | 'VERIFY'>('OBSERVE');

  // Input states
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>(
    user?.selectedSpecies?.[0] || pond.speciesIds?.[0] || 'rohu'
  );
  const [image, setImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['visible_lesions']);
  const [symptomHistory, setSymptomHistory] = useState<string>('Symptoms started 2 days ago after heavy rainfall.');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom API key state
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return localStorage.getItem('finguard_gemini_api_key') || '';
  });
  const [showKeyModal, setShowKeyModal] = useState(false);

  // Result state
  const [result, setResult] = useState<DiseaseScreeningResult | null>(null);

  // Verification Form State
  const [repeatDO, setRepeatDO] = useState<string>('5.8');
  const [repeatTemp, setRepeatTemp] = useState<string>('27.5');
  const [microscopyConducted, setMicroscopyConducted] = useState(false);
  const [gillClipNotes, setGillClipNotes] = useState('');
  const [expertConsulted, setExpertConsulted] = useState(false);
  const [expertName, setExpertName] = useState('Dr. K. Rao (District Fisheries Veterinarian)');
  const [isVerifying, setIsVerifying] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSpecies = SPECIES_CATALOG[selectedSpeciesId] || SPECIES_CATALOG.rohu;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImageError(null);
    if (!file) return;

    // Validate size (max 8MB)
    if (file.size > 8 * 1024 * 1024) {
      setImageError("Image file too large. Please upload an image under 8MB.");
      return;
    }

    // Validate type
    if (!file.type.match(/^image\/(jpeg|png|webp)$/i)) {
      setImageError("Invalid file format. Please upload JPEG, PNG, or WebP images.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      setSelectedSymptoms(prev => prev.length === 0 ? ['visible_lesions'] : prev);
    };
    reader.readAsDataURL(file);
  };

  const loadPreset = (type: 'eus' | 'fin_rot' | 'white_spot') => {
    setError(null);
    if (type === 'eus') {
      setSelectedSpeciesId('rohu');
      setSelectedSymptoms(['visible_lesions', 'reduced_appetite']);
      setSymptomHistory('Sudden monsoon cold snap 2 days ago. Red necrotic ulcers emerging along mid-body flanks.');
    } else if (type === 'fin_rot') {
      setSelectedSpeciesId('catla');
      setSelectedSymptoms(['fin_damage', 'reduced_appetite']);
      setSymptomHistory('Dorsal and caudal fin fraying with whitish margins. Water ammonia has been elevated.');
    } else {
      setSelectedSpeciesId('mrigal');
      setSelectedSymptoms(['white_spots', 'unusual_swimming']);
      setSymptomHistory('Fish actively flashing against earthen dykes. Tiny pinhead white cysts distributed on epidermal scales.');
    }
  };

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const runMultilayerScreening = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.screenFishHealth({
        speciesIds: [selectedSpeciesId],
        pondId: pond.id,
        pondMetrics: pond.metrics,
        imageBase64: image || undefined,
        reportedSymptoms: selectedSymptoms,
        symptomHistory
      });
      setResult(response);
      setActiveStep('RESULTS');
    } catch (err: any) {
      setError(err.message || 'Diagnostic screening failed. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async () => {
    if (!result) return;
    setIsVerifying(true);
    try {
      const updated = await api.verifyScreening({
        screeningId: result.id,
        repeatDO: repeatDO ? parseFloat(repeatDO) : undefined,
        repeatTemp: repeatTemp ? parseFloat(repeatTemp) : undefined,
        microscopyConducted,
        gillClipNotes,
        expertConsulted,
        expertNameOrTitle: expertConsulted ? expertName : undefined
      });
      setResult(updated);
      setActiveStep('RESULTS');
    } catch (err: any) {
      alert("Verification update failed: " + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={`p-4 pb-28 space-y-4 max-w-lg mx-auto transition-colors duration-500 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* Step Indicator Header */}
      <div className="pt-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Pathology & Environmental Synthesis
        </span>
        <h1 className="text-xl font-extrabold tracking-tight">Multilayer Disease Screening</h1>
        
        {/* Step tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mt-3 text-xs font-bold">
          <button 
            onClick={() => setActiveStep('OBSERVE')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              activeStep === 'OBSERVE' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400'
            }`}
          >
            1. Collect Observations
          </button>
          <button 
            onClick={() => result && setActiveStep('RESULTS')}
            disabled={!result}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              activeStep === 'RESULTS' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 disabled:opacity-50'
            }`}
          >
            2. Differential Candidates
          </button>
          <button 
            onClick={() => result && setActiveStep('VERIFY')}
            disabled={!result}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              activeStep === 'VERIFY' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 disabled:opacity-50'
            }`}
          >
            3. Verify Findings
          </button>
        </div>
      </div>

      {/* STEP 1: COLLECT OBSERVATIONS */}
      {activeStep === 'OBSERVE' && (
        <div className="space-y-4 animate-in fade-in">
          
          {/* Species & Pond Context */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-white/10 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Screening Subject</span>
              <span className="text-[10px] font-bold text-slate-400">Pond: {pond.name}</span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Affected Fish Species</label>
              <select
                value={selectedSpeciesId}
                onChange={(e) => setSelectedSpeciesId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl py-2.5 px-3 text-xs font-bold outline-none"
              >
                {Object.values(SPECIES_CATALOG).map(sp => (
                  <option key={sp.id} value={sp.id}>
                    {sp.commonName} ({sp.scientificName})
                  </option>
                ))}
              </select>
            </div>

            {/* Current Pond Telemetry Pill Box */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1.5">
              <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                <span>Observed Pond Telemetry:</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">Auto-synced</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center text-xs">
                <div className="p-1 bg-white dark:bg-slate-900 rounded-lg">
                  <span className="text-[8px] text-slate-400 block uppercase">DO</span>
                  <strong className={pond.metrics.oxygen < 3.0 ? 'text-red-500' : 'text-blue-600'}>
                    {pond.metrics.oxygen} mg/L
                  </strong>
                </div>
                <div className="p-1 bg-white dark:bg-slate-900 rounded-lg">
                  <span className="text-[8px] text-slate-400 block uppercase">Temp</span>
                  <strong>{pond.metrics.temp}°C</strong>
                </div>
                <div className="p-1 bg-white dark:bg-slate-900 rounded-lg">
                  <span className="text-[8px] text-slate-400 block uppercase">pH</span>
                  <strong>{pond.metrics.ph}</strong>
                </div>
                <div className="p-1 bg-white dark:bg-slate-900 rounded-lg">
                  <span className="text-[8px] text-slate-400 block uppercase">TAN</span>
                  <strong>{pond.metrics.ammonia} mg/L</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Photograph Upload Container */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-white/10 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Fish Specimen Photograph</span>
              <span className="text-[10px] text-slate-400 font-semibold">Gills, scales, ulcers</span>
            </div>

            <div className="relative aspect-video rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950">
              {image ? (
                <div className="relative w-full h-full">
                  <img src={image} alt="Specimen" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setImage(null)}
                    className="absolute top-2 right-2 bg-slate-900/80 text-white p-1.5 rounded-full hover:bg-red-600 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="text-center p-4 space-y-2">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto">
                    <Camera size={24} />
                  </div>
                  <div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Upload Fish Photo
                    </button>
                    <p className="text-[10px] text-slate-400 mt-0.5">JPEG, PNG up to 8MB</p>
                  </div>
                </div>
              )}
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />

            {imageError && (
              <p className="text-xs font-bold text-red-600 bg-red-50 p-2 rounded-xl border border-red-200">
                {imageError}
              </p>
            )}
          </div>

          {/* Observable Symptoms Selector */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-white/10 shadow-sm space-y-2.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Clinical Observations & Behavior
            </span>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {SYMPTOM_OPTIONS.map(sym => {
                const isSelected = selectedSymptoms.includes(sym.id);
                return (
                  <div
                    key={sym.id}
                    onClick={() => toggleSymptom(sym.id)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                      isSelected 
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-900 dark:text-blue-300 font-bold'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{sym.label}</span>
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                      isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                    }`}>
                      {isSelected && <CheckCircle2 size={12} />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Clinical History notes */}
            <div className="pt-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Symptom History & Recent Environmental Changes
              </label>
              <textarea
                value={symptomHistory}
                onChange={(e) => setSymptomHistory(e.target.value)}
                rows={2}
                placeholder="e.g. Sudden cold spell, heavy rainfall, or abnormal feeding drop observed..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl p-2.5 text-xs font-semibold outline-none mt-1"
              />
            </div>

            {/* Quick Presets */}
            <div className="pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Quick Test Reference Scenarios
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => loadPreset('eus')}
                  className="px-2.5 py-1 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold hover:bg-red-500/20 active:scale-95 transition-all"
                >
                  🔴 EUS Ulcers
                </button>
                <button
                  type="button"
                  onClick={() => loadPreset('fin_rot')}
                  className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold hover:bg-amber-500/20 active:scale-95 transition-all"
                >
                  🟡 Fin & Tail Rot
                </button>
                <button
                  type="button"
                  onClick={() => loadPreset('white_spot')}
                  className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold hover:bg-blue-500/20 active:scale-95 transition-all"
                >
                  ⚪ White Spot (Ich)
                </button>
              </div>
            </div>
          </div>

          {/* AI Model Status & Optional Key Config */}
          <div className="flex items-center justify-between px-1 text-[10px] font-semibold text-slate-400">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>ICAR Diagnostic Engine & Gemini Vision</span>
            </span>
            <button
              type="button"
              onClick={() => setShowKeyModal(!showKeyModal)}
              className="text-blue-600 dark:text-blue-400 underline font-bold"
            >
              {customApiKey ? 'API Key Configured' : 'Add Gemini Key'}
            </button>
          </div>

          {showKeyModal && (
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl space-y-2 text-xs animate-in fade-in">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Optional: Google Gemini API Key
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={customApiKey}
                onChange={(e) => {
                  setCustomApiKey(e.target.value);
                  localStorage.setItem('finguard_gemini_api_key', e.target.value.trim());
                }}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-2 text-xs font-mono outline-none"
              />
              <p className="text-[10px] text-slate-400">
                FinGuard runs ICAR-CIFA veterinary synthesis locally. Adding a free Gemini key unlocks live multimodal visual reasoning.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold flex items-center space-x-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Action */}
          <button
            onClick={runMultilayerScreening}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white py-4 rounded-2xl font-extrabold uppercase tracking-wider text-xs flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/25 transition-all"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : (
              <>
                <Sparkles size={16} />
                <span>Execute Multilayer Screening</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* STEP 2: DIFFERENTIAL SCREENING RESULTS */}
      {activeStep === 'RESULTS' && result && (
        <div className="space-y-4 animate-in fade-in">
          
          {/* Status & Uncertainty Alert Header */}
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-3xl p-4 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-blue-600 text-white rounded-full">
                PRELIMINARY SCREENING ONLY
              </span>
              <span className="text-[10px] text-slate-400">
                Ref: {result.id.slice(0, 14)}
              </span>
            </div>
            <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
              Diagnostic assessment synthesized across {activeSpecies.commonName} biology, current pond readings, and documented ICAR/FAO pathology reference catalogues.
            </p>
            {result.verified_status === 'EXTERNALLY_CONFIRMED' && (
              <div className="mt-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 p-1.5 rounded-lg">
                Verified: {result.verification_notes}
              </div>
            )}
          </div>

          {/* Water Quality Findings Component */}
          {result.water_quality_findings.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-white/10 shadow-sm space-y-2.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Pond Environmental Co-Factors
              </span>

              <div className="space-y-1.5">
                {result.water_quality_findings.map((w, i) => (
                  <div 
                    key={i}
                    className={`p-2.5 rounded-2xl border text-xs space-y-1 ${
                      w.status === 'CRITICAL' ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900' :
                      (w.status === 'WARNING' ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900' :
                      'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-white/5')
                    }`}
                  >
                    <div className="flex justify-between items-center font-bold">
                      <span>{w.parameter}: {w.observed} {w.unit}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-black ${
                        w.status === 'CRITICAL' ? 'bg-red-600 text-white' :
                        (w.status === 'WARNING' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white')
                      }`}>
                        {w.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{w.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Candidate Diseases Differential List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Candidate Diseases ({result.candidate_diseases.length})
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">Multiple coexistence possible</span>
            </div>

            {result.candidate_diseases.length === 0 ? (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 p-4 rounded-3xl text-xs space-y-2">
                <div className="font-extrabold text-amber-800 dark:text-amber-300 flex items-center space-x-1.5">
                  <AlertCircle size={16} />
                  <span>Inconclusive — More Information Required</span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                  The reported symptoms and photographs are insufficient to establish a distinctive differential candidate.
                </p>
              </div>
            ) : (
              result.candidate_diseases.map((cand, idx) => (
                <div 
                  key={idx}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-white/10 shadow-sm space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {cand.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Pathogen: {cand.pathogenType || 'Infectious'}
                      </span>
                    </div>
                    
                    {/* Uncalibrated Estimate Badge */}
                    <div className="text-right">
                      {cand.reported_confidence !== null ? (
                        <div>
                          <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                            {(cand.reported_confidence * 100).toFixed(0)}%
                          </span>
                          <span className="text-[8px] text-slate-400 block uppercase font-bold tracking-tight">
                            Uncalibrated AI Estimate
                          </span>
                        </div>
                      ) : (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600">
                          {cand.uncertainty_label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Supporting Evidence */}
                  {cand.supporting_evidence.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Supporting Evidence:
                      </span>
                      <ul className="list-disc list-inside text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                        {cand.supporting_evidence.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Contradicting / Missing Evidence */}
                  {cand.contradicting_evidence.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Differential Caveats & Conflicts:
                      </span>
                      <ul className="list-disc list-inside text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                        {cand.contradicting_evidence.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommended Confirmatory Checks */}
                  {cand.additional_checks.length > 0 && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl text-[10px] space-y-1 border border-slate-100 dark:border-white/5">
                      <strong className="text-slate-700 dark:text-slate-300">Recommended Confirmatory Checks:</strong>
                      <p className="text-slate-500 dark:text-slate-400">{cand.additional_checks.join(' • ')}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Immediate Evidence-Based Cautious Actions */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-3xl p-4 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck size={16} />
              <span>Immediate Evidence-Based Actions</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              {result.immediate_mitigation.map((m, i) => (
                <li key={i} className="flex items-start space-x-1.5">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Treatment Safety Disclaimer */}
          <div className="p-3.5 bg-slate-100 dark:bg-slate-800/60 rounded-3xl text-[10px] text-slate-500 space-y-1">
            <strong className="text-slate-700 dark:text-slate-300 block">Pharmacological Safety Notice:</strong>
            <p>
              FinGuard does not prescribe or endorse automated over-the-counter antibiotic treatments. Antibiotic use in commercial aquaculture requires prescription oversight by a registered aquatic veterinarian to protect consumer food safety and prevent antimicrobial resistance (AMR).
            </p>
          </div>

          {/* Bottom Actions: Verify or New Screen */}
          <div className="flex space-x-2 pt-2">
            <button
              onClick={() => setActiveStep('VERIFY')}
              className="flex-1 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white py-3.5 rounded-2xl font-bold uppercase tracking-wider text-xs flex items-center justify-center space-x-2 transition-all border border-white/10"
            >
              <Stethoscope size={16} />
              <span>Verify Findings (Stage 6)</span>
            </button>

            <button
              onClick={() => setActiveStep('OBSERVE')}
              className="px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold uppercase tracking-wider text-xs hover:bg-slate-200"
            >
              New
            </button>
          </div>

        </div>
      )}

      {/* STEP 3: VERIFICATION WORKFLOW */}
      {activeStep === 'VERIFY' && result && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-white/10 shadow-sm space-y-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Verification & Follow-up Observations
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Refine preliminary screening results by entering repeat water tests, microscopic findings, or certified veterinary input.
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Repeat DO (mg/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={repeatDO}
                    onChange={(e) => setRepeatDO(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl p-2.5 text-xs font-bold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Repeat Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={repeatTemp}
                    onChange={(e) => setRepeatTemp(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl p-2.5 text-xs font-bold outline-none"
                  />
                </div>
              </div>

              {/* Microscopy Checkbox */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-2 border border-slate-100 dark:border-white/5">
                <label className="flex items-center space-x-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={microscopyConducted}
                    onChange={(e) => setMicroscopyConducted(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span>Wet-Mount Microscopy / Gill Clip Examined</span>
                </label>
                {microscopyConducted && (
                  <textarea
                    value={gillClipNotes}
                    onChange={(e) => setGillClipNotes(e.target.value)}
                    placeholder="e.g. Horseshoe macronucleus observed (Ich), or branched hyphae seen..."
                    rows={2}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-2 text-xs font-medium outline-none"
                  />
                )}
              </div>

              {/* Veterinary Consultation */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-2 border border-slate-100 dark:border-white/5">
                <label className="flex items-center space-x-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={expertConsulted}
                    onChange={(e) => setExpertConsulted(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span>Verified by Aquatic Veterinarian / Fisheries Officer</span>
                </label>
                {expertConsulted && (
                  <input
                    type="text"
                    value={expertName}
                    onChange={(e) => setExpertName(e.target.value)}
                    placeholder="Officer Name / Institute (e.g. CIFA / KVK)"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-2 text-xs font-bold outline-none"
                  />
                )}
              </div>

              <button
                onClick={handleVerifySubmit}
                disabled={isVerifying}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-2xl font-extrabold uppercase tracking-wider text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                {isVerifying ? <Loader2 className="animate-spin" size={16} /> : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Update Screening Assessment</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setActiveStep('RESULTS')}
                className="w-full text-slate-400 hover:text-slate-600 text-xs font-semibold text-center py-1"
              >
                Cancel and return to Results
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DiseaseDetection;
