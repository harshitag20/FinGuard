import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, RotateCcw, FastForward, AlertTriangle, ShieldCheck, 
  Droplets, Thermometer, Wind, Activity, ArrowRight, RefreshCw, CheckCircle2, ChevronDown, Info
} from 'lucide-react';
import { usePond, useTheme, useUser } from '../App';
import { SimulationState, TelemetryAlert, PondMetrics } from '../types';
import { api } from '../services/apiService';
import { SPECIES_CATALOG } from '../services/speciesCatalog';

const PondMonitoring: React.FC = () => {
  const { pond, setPond } = usePond();
  const { theme } = useTheme();
  const { user } = useUser();

  const [simState, setSimState] = useState<SimulationState | null>(null);
  const [telemetryHistory, setTelemetryHistory] = useState<PondMetrics[]>([]);
  const [alerts, setAlerts] = useState<TelemetryAlert[]>([]);
  const [selectedSpeed, setSelectedSpeed] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);

  const activeSpecies = (user?.selectedSpecies || pond.speciesIds || ['rohu', 'catla', 'mrigal'])
    .map(id => SPECIES_CATALOG[id])
    .filter(Boolean);

  const fetchStream = async () => {
    try {
      const state = await api.getSimulationState();
      if (state) {
        setSimState(state);
        setPond(prev => ({
          ...prev,
          metrics: state.currentMetrics,
          isSimulated: true
        }));
      }
      const history = await api.getPondTelemetry(pond.id);
      setTelemetryHistory(history);
      const activeAlerts = await api.getAlerts();
      setAlerts(activeAlerts);
    } catch (err) {
      console.warn('Simulation stream fetch error:', err);
    }
  };

  // Fetch state once on mount without background polling
  useEffect(() => {
    fetchStream();
  }, []);

  // Poll only when simulation is explicitly permitted and running, updating every 5 seconds
  useEffect(() => {
    if (!simState?.isRunning) return;
    const intervalMs = Math.max(1000, Math.floor(5000 / selectedSpeed));
    const timer = setInterval(fetchStream, intervalMs);
    return () => clearInterval(timer);
  }, [simState?.isRunning, selectedSpeed]);

  const handleTogglePlay = async () => {
    setIsLoading(true);
    try {
      if (simState?.isRunning) {
        const next = await api.pauseSimulation();
        setSimState(next);
      } else {
        const next = await api.startSimulation();
        setSimState(next);
        await fetchStream();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      const next = await api.resetSimulation(42);
      setSimState(next);
      await api.clearAlerts();
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeedChange = async (speed: number) => {
    setSelectedSpeed(speed);
    const next = await api.setSimulationSpeed(speed);
    setSimState(next);
  };

  const handleTriggerScenario = async (scenario: SimulationState['activeScenario']) => {
    setIsLoading(true);
    try {
      const next = await api.triggerScenario(scenario);
      setSimState(next);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`p-4 pb-28 space-y-4 max-w-lg mx-auto transition-colors duration-500 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* Header */}
      <div className="pt-2 flex justify-between items-center">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Real-Time Stream
          </span>
          <h1 className="text-xl font-extrabold tracking-tight">Pond Telemetry Monitor</h1>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">
          SIMULATION
        </div>
      </div>

      {/* Simulator Control Dashboard */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-white/10 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Engine Controls</span>
          <span className="text-[10px] text-slate-400 font-semibold">
            Status: <strong className={simState?.isRunning ? 'text-emerald-500' : 'text-amber-500'}>
              {simState?.isRunning ? 'STREAMING' : 'PAUSED'}
            </strong>
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleTogglePlay}
            disabled={isLoading}
            className={`flex-1 py-2.5 px-4 rounded-2xl font-bold uppercase tracking-wider text-xs flex items-center justify-center space-x-1.5 transition-all shadow-sm ${
              simState?.isRunning 
                ? 'bg-amber-500 text-white hover:bg-amber-600' 
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            {simState?.isRunning ? <Pause size={14} /> : <Play size={14} />}
            <span>{simState?.isRunning ? 'Pause' : 'Start'}</span>
          </button>

          <button
            onClick={handleReset}
            disabled={isLoading}
            className="py-2.5 px-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-xs flex items-center space-x-1 hover:bg-slate-200 active:scale-95"
            title="Reset to Baseline Seed"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>

          {/* Speed Multiplier */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-[10px] font-black">
            {[1, 2, 5].map(speed => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-2 py-1 rounded-xl transition-all ${
                  selectedSpeed === speed 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Demo Scenarios Trigger Bar */}
        <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Hackathon Demonstration Scenarios
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleTriggerScenario('NOCTURNAL_HYPOXIA')}
              className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                simState?.activeScenario === 'NOCTURNAL_HYPOXIA'
                  ? 'bg-red-500/10 border-red-500 text-red-700 dark:text-red-300 font-bold'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/5 hover:border-slate-300 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="font-extrabold flex items-center space-x-1">
                <span>1. Nocturnal Hypoxia</span>
              </div>
              <span className="text-[9px] text-slate-400 block mt-0.5">
                Simulates DO drop (&lt; 2.5 mg/L), triggering alert & recovery
              </span>
            </button>

            <button
              onClick={() => handleTriggerScenario('AMMONIA_SPIKE')}
              className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                simState?.activeScenario === 'AMMONIA_SPIKE'
                  ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300 font-bold'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/5 hover:border-slate-300 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="font-extrabold flex items-center space-x-1">
                <span>2. Ammonia Spike</span>
              </div>
              <span className="text-[9px] text-slate-400 block mt-0.5">
                Simulates TAN climbing to 0.20 mg/L with gill stress warning
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Parameter Telemetry Cards */}
      <div className="space-y-2">
        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 px-1">
          Current Sensor Telemetry
        </span>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Oxygen */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-white/10 shadow-sm">
            <span className="text-[10px] font-bold uppercase text-slate-400">Dissolved Oxygen (DO)</span>
            <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {pond.metrics.oxygen} <span className="text-xs font-bold text-slate-400">mg/L</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 flex justify-between">
              <span>Threshold:</span>
              <strong className="text-slate-700 dark:text-slate-300">&gt;= 5.0 mg/L</strong>
            </div>
          </div>

          {/* Temperature */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-white/10 shadow-sm">
            <span className="text-[10px] font-bold uppercase text-slate-400">Water Temperature</span>
            <div className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-1">
              {pond.metrics.temp} <span className="text-xs font-bold text-slate-400">°C</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 flex justify-between">
              <span>Threshold:</span>
              <strong className="text-slate-700 dark:text-slate-300">26 - 32 °C</strong>
            </div>
          </div>

          {/* pH */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-white/10 shadow-sm">
            <span className="text-[10px] font-bold uppercase text-slate-400">pH Level</span>
            <div className="text-3xl font-black text-teal-600 dark:text-teal-400 mt-1">
              {pond.metrics.ph} <span className="text-xs font-bold text-slate-400">pH</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 flex justify-between">
              <span>Threshold:</span>
              <strong className="text-slate-700 dark:text-slate-300">7.2 - 8.5</strong>
            </div>
          </div>

          {/* TAN Ammonia */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-white/10 shadow-sm">
            <span className="text-[10px] font-bold uppercase text-slate-400">Total Ammonia (TAN)</span>
            <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {pond.metrics.ammonia} <span className="text-xs font-bold text-slate-400">mg/L</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 flex justify-between">
              <span>Threshold:</span>
              <strong className="text-slate-700 dark:text-slate-300">&lt;= 0.05 mg/L</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Hysteresis Alert Engine Log */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-white/10 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Active Alerts & Hysteresis Engine
            </h2>
            <span className="text-[10px] text-slate-400">
              Anti-chatter: requires 2 consecutive breach samples to alert, 2 normal to recover
            </span>
          </div>
          {alerts.length > 0 && (
            <button
              onClick={async () => {
                await api.clearAlerts();
                setAlerts([]);
              }}
              className="text-[10px] font-bold text-slate-400 hover:text-red-500"
            >
              Clear
            </button>
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-2xl flex items-center space-x-2 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
            <CheckCircle2 size={16} />
            <span>All pond telemetry within species optimal envelope. No active alerts.</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {alerts.map(alt => (
              <div 
                key={alt.id}
                className={`p-3 rounded-2xl border space-y-1.5 text-xs ${
                  alt.severity === 'CRITICAL'
                    ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800'
                    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    alt.severity === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    {alt.severity} - [SIMULATED]
                  </span>
                  <span className="text-[10px] text-slate-400">{new Date(alt.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="font-extrabold text-slate-800 dark:text-slate-100">
                  {alt.parameter.toUpperCase()}: {alt.observedValue} {alt.unit} (Ref: {alt.referenceRange[0]} - {alt.referenceRange[1]} {alt.unit})
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
                  {alt.speciesImpactExplanation}
                </p>
                <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl text-[10px] text-slate-700 dark:text-slate-200 border border-black/5 dark:border-white/5">
                  <strong>Action:</strong> {alt.cautiousAction}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default PondMonitoring;

