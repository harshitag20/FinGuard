import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, AlertTriangle, ShieldCheck, 
  Wind, Thermometer, Droplets, Activity, ChevronRight, Info,
  CheckCircle2, Clock, Sparkles, Sliders, Moon, Flame
} from 'lucide-react';
import { usePond, useTheme, useUser, useLanguage } from '../App';
import { SimulationState, TelemetryAlert, PondMetrics } from '../types';
import { api } from '../services/apiService';
import { SPECIES_CATALOG } from '../services/speciesCatalog';
import { I18N } from '../i18n/translations';
import LiveChartCard, { ChartDataPoint } from '../components/common/LiveChartCard';
import AlertActionCard from '../components/common/AlertActionCard';
import SectionHeader from '../components/common/SectionHeader';
import BottomSheet from '../components/common/BottomSheet';

type MetricTab = 'oxygen' | 'temp' | 'ph' | 'ammonia';

const PondMonitoring: React.FC = () => {
  const { pond, setPond } = usePond();
  const { theme } = useTheme();
  const { user } = useUser();
  const { lang } = useLanguage();
  const strings = (I18N as any)[lang] || (I18N as any).hi || (I18N as any).en;

  const [simState, setSimState] = useState<SimulationState | null>(null);
  const [alerts, setAlerts] = useState<TelemetryAlert[]>([]);
  const [selectedSpeed, setSelectedSpeed] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<MetricTab>('oxygen');
  const [showAllGraphs, setShowAllGraphs] = useState(false);
  const [showHowAlertsWork, setShowHowAlertsWork] = useState(false);
  const [showAllAlertsModal, setShowAllAlertsModal] = useState(false);

  // Rolling buffer of chart points (capped at 60 points)
  const [chartHistory, setChartHistory] = useState<PondMetrics[]>([]);

  // Page visibility to pause updates and save battery/performance
  const [isTabVisible, setIsTabVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const fetchStream = async () => {
    try {
      const state = await api.getSimulationState();
      if (state) {
        setSimState(state);
        if (state.currentMetrics) {
          setPond(prev => ({
            ...prev,
            metrics: state.currentMetrics,
            isSimulated: true
          }));

          // Append to rolling chart buffer (keep last 60 points)
          setChartHistory(prev => {
            const last = prev[prev.length - 1];
            if (last && last.timestamp === state.currentMetrics.timestamp) {
              return prev;
            }
            const updated = [...prev, state.currentMetrics];
            if (updated.length > 60) {
              return updated.slice(updated.length - 60);
            }
            return updated;
          });
        }
      }

      const activeAlerts = await api.getAlerts();
      setAlerts(activeAlerts || []);
    } catch (err) {
      console.warn('Simulation stream fetch error:', err);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchStream();
  }, []);

  // Poll only when simulation is explicitly running AND page is visible
  useEffect(() => {
    if (!simState?.isRunning || !isTabVisible) return;
    const intervalMs = Math.max(1000, Math.floor(4000 / (selectedSpeed || 1)));
    const timer = setInterval(fetchStream, intervalMs);
    return () => clearInterval(timer);
  }, [simState?.isRunning, selectedSpeed, isTabVisible]);

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
      setChartHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeedChange = async (speed: number) => {
    setSelectedSpeed(speed);
    const next = await api.setSimulationSpeed(speed);
    setSimState(next);
  };

  const handleTriggerScenario = async (scenario: 'NOCTURNAL_HYPOXIA' | 'AMMONIA_SPIKE') => {
    setIsLoading(true);
    try {
      const next = await api.triggerScenario(scenario);
      setSimState(next);
      // If paused, automatically start so the farmer sees the change
      if (!next.isRunning) {
        const started = await api.startSimulation();
        setSimState(started);
      }
      await fetchStream();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAlerts = async () => {
    await api.clearAlerts();
    setAlerts([]);
  };

  // Convert rolling metrics buffer to chart points
  const formatChartData = (param: 'oxygen' | 'temp' | 'ph' | 'ammonia', safeMin: number, safeMax: number): ChartDataPoint[] => {
    if (chartHistory.length === 0) {
      const cur = pond.metrics[param];
      return [
        { timeStr: '-2m', timestamp: Date.now() - 120000, value: cur },
        { timeStr: '-1m', timestamp: Date.now() - 60000, value: cur },
        { timeStr: 'now', timestamp: Date.now(), value: cur }
      ];
    }

    const now = Date.now();
    return chartHistory.map((m, idx) => {
      const diffSec = Math.round((now - (m.timestamp || now)) / 1000);
      let timeStr = 'now';
      if (diffSec > 60) {
        timeStr = `-${Math.round(diffSec / 60)}m`;
      } else if (diffSec > 5) {
        timeStr = `-${diffSec}s`;
      }

      const val = m[param];
      const isBreach = val < safeMin || val > safeMax;

      return {
        timeStr: idx === chartHistory.length - 1 ? 'now' : timeStr,
        timestamp: m.timestamp || now,
        value: val,
        isBreach
      };
    });
  };

  const oxygenData = useMemo(() => formatChartData('oxygen', 5.0, 12.0), [chartHistory, pond.metrics.oxygen]);
  const tempData = useMemo(() => formatChartData('temp', 26.0, 32.0), [chartHistory, pond.metrics.temp]);
  const phData = useMemo(() => formatChartData('ph', 7.2, 8.5), [chartHistory, pond.metrics.ph]);
  const ammoniaData = useMemo(() => formatChartData('ammonia', 0.0, 0.05), [chartHistory, pond.metrics.ammonia]);

  // Compute status for each parameter
  const m = pond.metrics;
  const oxygenStatus = m.oxygen < 3.0 ? 'CRITICAL' : m.oxygen < 5.0 ? 'CAUTION' : 'NORMAL';
  const tempStatus = (m.temp < 18 || m.temp > 35) ? 'CRITICAL' : (m.temp < 26 || m.temp > 32) ? 'CAUTION' : 'NORMAL';
  const phStatus = (m.ph < 6.5 || m.ph > 9.2) ? 'CRITICAL' : (m.ph < 7.2 || m.ph > 8.5) ? 'CAUTION' : 'NORMAL';
  const ammoniaStatus = m.ammonia > 0.25 ? 'CRITICAL' : m.ammonia > 0.05 ? 'CAUTION' : 'NORMAL';

  // Dynamic captions
  const oxygenCaption = m.oxygen < 4.0 ? strings.chart_oxygen_falling : strings.chart_oxygen_safe;
  const ammoniaCaption = m.ammonia > 0.05 ? strings.chart_ammonia_rising : strings.chart_ammonia_safe;

  return (
    <div className={`p-4 pb-32 space-y-4 max-w-lg mx-auto transition-colors duration-300 ${
      theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
    }`}>
      
      {/* 1. Header: Plain Language Title & Subtitle */}
      <header className="pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {strings.live_status_title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {strings.live_status_sub}
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
          {strings.demo_badge}
        </span>
      </header>

      {/* 2. Simplified Simulation Controls: Single "Demo Mode" Card */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-white/10 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${simState?.isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {strings.demo_mode_title}
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {simState?.isRunning ? strings.demo_running_msg : strings.demo_paused_msg}
          </span>
        </div>

        {/* Big Play/Pause Button + Reset + Speed Selector (Slow / Normal / Fast) */}
        <div className="flex items-center space-x-2">
          {/* Main Play / Pause Button */}
          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={isLoading}
            className={`flex-1 min-h-[48px] py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 shadow-sm transition-all active:scale-[0.98] ${
              simState?.isRunning 
                ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {simState?.isRunning ? <Pause size={18} /> : <Play size={18} />}
            <span>{simState?.isRunning ? strings.btn_pause : strings.btn_play}</span>
          </button>

          {/* Reset Icon Button */}
          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            className="min-h-[48px] min-w-[48px] p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center justify-center transition-all active:scale-95"
            title={strings.btn_reset}
            aria-label={strings.btn_reset}
          >
            <RotateCcw size={18} />
          </button>

          {/* Speed Selector (Slow / Normal / Fast) */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            {[
              { val: 1, label: strings.speed_slow },
              { val: 2, label: strings.speed_normal },
              { val: 5, label: strings.speed_fast }
            ].map(item => (
              <button
                key={item.val}
                type="button"
                onClick={() => handleSpeedChange(item.val)}
                className={`min-h-[40px] px-2.5 py-1.5 rounded-lg transition-all ${
                  selectedSpeed === item.val
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Short Helper Line */}
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {strings.demo_help_line}
        </p>

        {/* Practice Scenarios (2 Big Friendly Cards) */}
        <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
            {strings.scenario_title}
          </span>
          <div className="grid grid-cols-1 gap-2">
            {/* Scenario 1: Night Oxygen Drop */}
            <button
              type="button"
              onClick={() => handleTriggerScenario('NOCTURNAL_HYPOXIA')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start space-x-3 active:scale-[0.98] ${
                simState?.activeScenario === 'NOCTURNAL_HYPOXIA'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-950 dark:text-rose-100 font-bold'
                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-white/5 hover:border-slate-300 text-slate-800 dark:text-slate-200'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                <Moon size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-sm">
                  {strings.scenario_hypoxia_title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {strings.scenario_hypoxia_desc}
                </p>
              </div>
            </button>

            {/* Scenario 2: Ammonia Rise */}
            <button
              type="button"
              onClick={() => handleTriggerScenario('AMMONIA_SPIKE')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start space-x-3 active:scale-[0.98] ${
                simState?.activeScenario === 'AMMONIA_SPIKE'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-950 dark:text-amber-100 font-bold'
                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-white/5 hover:border-slate-300 text-slate-800 dark:text-slate-200'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <Flame size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-sm">
                  {strings.scenario_ammonia_title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {strings.scenario_ammonia_desc}
                </p>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Live Graphs Section with Safe-Zone Bands */}
      <section className="space-y-3">
        {/* View Mode Toggle: Single Tab vs Show All */}
        <div className="flex items-center justify-between">
          <SectionHeader title={lang === 'hi' ? 'लाइव ग्राफ' : 'Live Real-Time Graphs'} />
          <button
            type="button"
            onClick={() => setShowAllGraphs(!showAllGraphs)}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline py-1 px-2"
          >
            {showAllGraphs ? strings.view_single : strings.view_all}
          </button>
        </div>

        {/* Tab selector when not showing all */}
        {!showAllGraphs && (
          <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto no-scrollbar">
            {[
              { id: 'oxygen', label: strings.param_oxygen, icon: <Wind size={15} /> },
              { id: 'temp', label: strings.param_temp, icon: <Thermometer size={15} /> },
              { id: 'ph', label: strings.param_ph, icon: <Activity size={15} /> },
              { id: 'ammonia', label: strings.param_ammonia, icon: <Droplets size={15} /> }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as MetricTab)}
                className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="truncate">{tab.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        )}

        {/* Chart Cards */}
        <div className="space-y-3">
          {(!showAllGraphs ? activeTab === 'oxygen' : true) && (
            <LiveChartCard
              id="oxygen"
              title={strings.param_oxygen}
              technicalName={strings.param_oxygen_tech}
              currentValue={pond.metrics.oxygen}
              unit="mg/L"
              status={oxygenStatus}
              data={oxygenData}
              safeMin={5.0}
              safeMax={12.0}
              yMin={0}
              yMax={12}
              captionEn={oxygenCaption}
              captionHi={m.oxygen < 4.0 ? strings.chart_oxygen_falling : strings.chart_oxygen_safe}
            />
          )}

          {(!showAllGraphs ? activeTab === 'temp' : true) && (
            <LiveChartCard
              id="temp"
              title={strings.param_temp}
              technicalName={strings.param_temp_tech}
              currentValue={pond.metrics.temp}
              unit="°C"
              status={tempStatus}
              data={tempData}
              safeMin={26.0}
              safeMax={32.0}
              yMin={16}
              yMax={38}
              captionEn={strings.chart_temp_safe}
              captionHi={strings.chart_temp_safe}
            />
          )}

          {(!showAllGraphs ? activeTab === 'ph' : true) && (
            <LiveChartCard
              id="ph"
              title={strings.param_ph}
              technicalName={strings.param_ph_tech}
              currentValue={pond.metrics.ph}
              unit="pH"
              status={phStatus}
              data={phData}
              safeMin={7.2}
              safeMax={8.5}
              yMin={5.5}
              yMax={10.0}
              captionEn={strings.chart_ph_safe}
              captionHi={strings.chart_ph_safe}
            />
          )}

          {(!showAllGraphs ? activeTab === 'ammonia' : true) && (
            <LiveChartCard
              id="ammonia"
              title={strings.param_ammonia}
              technicalName={strings.param_ammonia_tech}
              currentValue={pond.metrics.ammonia}
              unit="mg/L"
              status={ammoniaStatus}
              data={ammoniaData}
              safeMin={0.0}
              safeMax={0.05}
              yMin={0}
              yMax={0.30}
              captionEn={ammoniaCaption}
              captionHi={m.ammonia > 0.05 ? strings.chart_ammonia_rising : strings.chart_ammonia_safe}
            />
          )}
        </div>
      </section>

      {/* 4. Simplified Alerts Section: "What you should do now" */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <SectionHeader 
            title={strings.alerts_title} 
            subtitle={alerts.length > 0 ? `${alerts.length} action items` : undefined}
          />
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowHowAlertsWork(true)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center space-x-1"
            >
              <Info size={14} />
              <span>{strings.how_alerts_work}</span>
            </button>
            {alerts.length > 0 && (
              <button
                type="button"
                onClick={handleClearAlerts}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {strings.clear_all_alerts}
              </button>
            )}
          </div>
        </div>

        {alerts.length > 0 ? (
          <div className="space-y-2.5">
            {/* Show only top 1-2 alerts as big action cards */}
            {alerts.slice(0, 2).map((alert) => (
              <AlertActionCard
                key={alert.id}
                alert={alert}
                onMarkDone={handleClearAlerts}
                onRemindLater={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
                onExecuteAction={handleTogglePlay}
              />
            ))}

            {alerts.length > 2 && (
              <button
                type="button"
                onClick={() => setShowAllAlertsModal(true)}
                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {strings.see_all_alerts} ({alerts.length})
              </button>
            )}
          </div>
        ) : (
          <div className="bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-4 flex items-center space-x-3">
            <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
              {strings.alerts_none}
            </p>
          </div>
        )}
      </section>

      {/* "How Alerts Work" Bottom Sheet */}
      <BottomSheet
        isOpen={showHowAlertsWork}
        onClose={() => setShowHowAlertsWork(false)}
        title={strings.how_alerts_work}
      >
        <div className="space-y-3 text-xs leading-relaxed">
          <p className="text-slate-700 dark:text-slate-300 font-medium">
            {strings.how_alerts_work_desc}
          </p>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-2">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">Anti-chatter filter:</span>
              <span className="text-slate-600 dark:text-slate-400">2 consecutive readings required</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">Auto-recovery:</span>
              <span className="text-slate-600 dark:text-slate-400">2 normal readings clears alert</span>
            </div>
          </div>
        </div>
      </BottomSheet>

      {/* "See All Alerts" Modal */}
      <BottomSheet
        isOpen={showAllAlertsModal}
        onClose={() => setShowAllAlertsModal(false)}
        title={strings.see_all_alerts}
      >
        <div className="space-y-2.5">
          {alerts.map(a => (
            <AlertActionCard
              key={a.id}
              alert={a}
              onMarkDone={handleClearAlerts}
            />
          ))}
        </div>
      </BottomSheet>

    </div>
  );
};

export default PondMonitoring;
