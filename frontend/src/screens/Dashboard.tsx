import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, Thermometer, Wind, AlertTriangle, ShieldCheck, 
  X, Activity, Send, Smartphone, Loader2, MapPin, Sparkles, Flame, Droplet, Landmark, ArrowRight, BarChart3, Plus, Droplets, Zap,
  Layers, CheckCircle2, ChevronRight, Info, Fish
} from 'lucide-react';
import { useLanguage, useTheme, usePond, useUser, useNavigation } from '../App';
import { Screen, TelemetryAlert } from '../types';
import { SPECIES_CATALOG, SpeciesProfile } from '../services/speciesCatalog';
import { evaluateMultiSpeciesCompatibility } from '../services/overlapEngine';
import { api } from '../services/apiService';
import { fetchWeatherByCoords, WeatherData } from '../services/weatherService';
import { getHighAccuracyLocation } from '../services/locationService';
import { draftPondReportSMS } from '../services/smsService';
import { notificationService } from '../services/notificationService';
import CircularGauge from '../components/CircularGauge';
import { COLORS } from '../constants';

const Dashboard: React.FC = () => {
  const { lang, t } = useLanguage();
  const { theme } = useTheme();
  const { pond, setPond } = usePond();
  const { user } = useUser();
  const { navigate } = useNavigation();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [alerts, setAlerts] = useState<TelemetryAlert[]>([]);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [smsDraft, setSmsDraft] = useState('');
  const [selectedSpeciesDetail, setSelectedSpeciesDetail] = useState<SpeciesProfile | null>(null);
  const [simRunning, setSimRunning] = useState(false);

  // Active species objects
  const speciesList = useMemo(() => {
    const ids = user?.selectedSpecies || pond.speciesIds || ['rohu', 'catla', 'mrigal'];
    return ids.map(id => SPECIES_CATALOG[id]).filter(Boolean);
  }, [user?.selectedSpecies, pond.speciesIds]);

  // Compatibility report
  const compatibility = useMemo(() => {
    const ids = user?.selectedSpecies || pond.speciesIds || ['rohu', 'catla', 'mrigal'];
    return evaluateMultiSpeciesCompatibility(ids);
  }, [user?.selectedSpecies, pond.speciesIds]);

  // Fetch telemetry & alerts from backend
  const fetchStreamData = async () => {
    try {
      const state = await api.getSimulationState();
      if (state) {
        setSimRunning(state.isRunning);
        if (state.currentMetrics) {
          setPond(prev => ({
            ...prev,
            metrics: state.currentMetrics,
            isSimulated: true
          }));
        }
      }
      const fetchedAlerts = await api.getAlerts();
      setAlerts(fetchedAlerts);
    } catch (err) {
      // Local fallback
    }
  };

  // Initial load once on mount
  useEffect(() => {
    fetchStreamData();
  }, []);

  // Poll strictly every 5 seconds ONLY if simulation is running (allowed by user)
  useEffect(() => {
    if (!simRunning) return;
    const interval = setInterval(fetchStreamData, 5000);
    return () => clearInterval(interval);
  }, [simRunning]);

  const handleToggleSimulation = async () => {
    try {
      if (simRunning) {
        const next = await api.pauseSimulation();
        setSimRunning(next.isRunning);
      } else {
        const next = await api.startSimulation();
        setSimRunning(next.isRunning);
        await fetchStreamData();
      }
    } catch (err) {
      console.warn('Failed to toggle simulation', err);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const loc = await getHighAccuracyLocation();
      const weatherData = await fetchWeatherByCoords(loc.lat, loc.lng);
      setWeather(weatherData);
    } catch (e) {
      console.warn("Weather sync fallback", e);
      const fallback = await fetchWeatherByCoords(16.54, 81.52);
      setWeather(fallback);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    handleSync();
  }, []);

  // Compute parameter statuses
  const paramStatus = useMemo(() => {
    const doMin = compatibility.parameters.oxygen?.commonOptimal?.[0] || 5.0;
    const tempLow = compatibility.parameters.temp?.commonOptimal?.[0] || 25;
    const tempHigh = compatibility.parameters.temp?.commonOptimal?.[1] || 32;
    const phLow = compatibility.parameters.ph?.commonOptimal?.[0] || 7.2;
    const phHigh = compatibility.parameters.ph?.commonOptimal?.[1] || 8.5;
    const tanMax = compatibility.parameters.ammonia?.commonOptimal?.[1] || 0.05;

    const m = pond.metrics;
    return {
      oxygen: {
        status: m.oxygen < 2.0 ? 'CRITICAL' : (m.oxygen < doMin ? 'CAUTION' : 'NORMAL'),
        range: `>= ${doMin} mg/L`,
        source: 'ICAR-CIFA / FAO'
      },
      temp: {
        status: (m.temp < 18 || m.temp > 36) ? 'CRITICAL' : ((m.temp < tempLow || m.temp > tempHigh) ? 'CAUTION' : 'NORMAL'),
        range: `${tempLow} - ${tempHigh} °C`,
        source: 'FAO Cultured Species'
      },
      ph: {
        status: (m.ph < 6.0 || m.ph > 9.5) ? 'CRITICAL' : ((m.ph < phLow || m.ph > phHigh) ? 'CAUTION' : 'NORMAL'),
        range: `${phLow} - ${phHigh} pH`,
        source: 'Boyd (2020) Water Quality'
      },
      ammonia: {
        status: m.ammonia > 0.4 ? 'CRITICAL' : (m.ammonia > tanMax ? 'CAUTION' : 'NORMAL'),
        range: `<= ${tanMax} mg/L TAN`,
        source: 'ICAR-CIFA Standard'
      }
    };
  }, [pond.metrics, compatibility]);

  const activeCriticalAlerts = alerts.filter(a => a.severity === 'CRITICAL');

  return (
    <div className={`p-4 pb-28 space-y-4 max-w-lg mx-auto transition-colors duration-500 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* Simulation Control Banner - Stable, no blinking */}
      <div className={`rounded-2xl px-3.5 py-2.5 flex items-center justify-between border ${
        simRunning 
          ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50' 
          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200/80 dark:border-white/5'
      }`}>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${simRunning ? 'bg-blue-500' : 'bg-slate-400'}`}></div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 block leading-tight">
              {simRunning ? 'Live Simulation Active (5s updates)' : 'Simulated Sensor Feed: Off'}
            </span>
            <span className="text-[9px] text-slate-400 font-semibold block">
              {simRunning ? 'Updating telemetry inputs every 5 seconds' : 'Stopped by default • Click allow to enable'}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleToggleSimulation}
            className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl transition-all ${
              simRunning 
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300' 
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-sm'
            }`}
          >
            {simRunning ? 'Stop Feed' : 'Allow Feed'}
          </button>
          <button 
            onClick={() => navigate(Screen.MONITORING)}
            className="text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center"
            title="Open Simulator Controls"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Farm & Weather Header */}
      <div className="flex justify-between items-center pt-1">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-bold">
            <MapPin size={13} className="text-blue-500" />
            <span>{user?.location || 'Bhimavaram, Andhra Pradesh'}</span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight mt-0.5">
            {user?.farmName || pond.name}
          </h1>
        </div>
        
        {weather && (
          <div className="text-right bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-2xl border border-black/5 dark:border-white/5">
            <span className="text-xs font-black text-blue-600 dark:text-blue-400">{weather.temp}°C</span>
            <span className="text-[10px] text-slate-400 block font-semibold">{weather.condition}</span>
          </div>
        )}
      </div>

      {/* Critical Active Alert Warning (if DO or Ammonia is breached) */}
      {activeCriticalAlerts.length > 0 && (
        <div className="bg-red-500/15 border-2 border-red-500/40 rounded-3xl p-4 space-y-2">
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <AlertTriangle size={20} className="shrink-0" />
            <span className="font-extrabold text-xs uppercase tracking-wider">Critical Water Quality Breach</span>
          </div>
          <p className="text-xs font-bold text-red-700 dark:text-red-300">
            {activeCriticalAlerts[0].speciesImpactExplanation}
          </p>
          <div className="bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-xl border border-red-200 dark:border-red-900 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            <strong>Cautious Next Step:</strong> {activeCriticalAlerts[0].cautiousAction}
          </div>
        </div>
      )}

      {/* Selected Species Portfolio Card */}
      <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-4 border border-slate-100 dark:border-white/10 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Fish size={18} />
            </div>
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Cultivated Species ({speciesList.length})
              </h2>
              <span className="text-[10px] text-slate-400">Species-aware physiological intervals</span>
            </div>
          </div>
          <button 
            onClick={() => navigate(Screen.PROFILE)}
            className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 hover:underline"
          >
            Edit
          </button>
        </div>

        {/* Species Chips */}
        <div className="flex flex-wrap gap-1.5">
          {speciesList.map(sp => (
            <button
              key={sp.id}
              onClick={() => setSelectedSpeciesDetail(sp)}
              className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-transparent hover:border-blue-400 transition-all"
            >
              <span>{sp.commonName}</span>
              <span className="text-[9px] text-slate-400">({sp.feedingHabit.split(' ')[0]})</span>
            </button>
          ))}
        </div>

        {/* Compatibility Overview */}
        <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-semibold text-[11px]">Ecological Overlap:</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
            compatibility.overallCompatibility === 'COMPATIBLE'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : (compatibility.overallCompatibility === 'PARTIAL_CAUTION'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300')
          }`}>
            {compatibility.overallCompatibility}
          </span>
        </div>
      </div>

      {/* 4 Core Parameter Cards with Observed vs Reference Range */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Live Pond Telemetry vs Species Baseline
          </span>
          <span className="text-[10px] text-slate-400 font-semibold">Updated 3s ago</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Dissolved Oxygen */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 border border-slate-100 dark:border-white/10 shadow-sm space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase text-slate-400">Dissolved Oxygen</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                paramStatus.oxygen.status === 'NORMAL' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                paramStatus.oxygen.status === 'CAUTION' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
              }`}>
                {paramStatus.oxygen.status}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                {pond.metrics.oxygen} <span className="text-xs font-bold text-slate-400">mg/L</span>
              </div>
              <div className="text-[10px] text-slate-500 font-semibold mt-1">
                Ref Interval: <strong className="text-slate-700 dark:text-slate-300">{paramStatus.oxygen.range}</strong>
              </div>
              <span className="text-[8.5px] text-slate-400 block mt-0.5 truncate">Src: {paramStatus.oxygen.source}</span>
            </div>
          </div>

          {/* Water Temperature */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 border border-slate-100 dark:border-white/10 shadow-sm space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase text-slate-400">Water Temperature</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                paramStatus.temp.status === 'NORMAL' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                paramStatus.temp.status === 'CAUTION' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
              }`}>
                {paramStatus.temp.status}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                {pond.metrics.temp} <span className="text-xs font-bold text-slate-400">°C</span>
              </div>
              <div className="text-[10px] text-slate-500 font-semibold mt-1">
                Ref Interval: <strong className="text-slate-700 dark:text-slate-300">{paramStatus.temp.range}</strong>
              </div>
              <span className="text-[8.5px] text-slate-400 block mt-0.5 truncate">Src: {paramStatus.temp.source}</span>
            </div>
          </div>

          {/* pH Level */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 border border-slate-100 dark:border-white/10 shadow-sm space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase text-slate-400">pH Level</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                paramStatus.ph.status === 'NORMAL' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                paramStatus.ph.status === 'CAUTION' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
              }`}>
                {paramStatus.ph.status}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight text-teal-600 dark:text-teal-400">
                {pond.metrics.ph} <span className="text-xs font-bold text-slate-400">pH</span>
              </div>
              <div className="text-[10px] text-slate-500 font-semibold mt-1">
                Ref Interval: <strong className="text-slate-700 dark:text-slate-300">{paramStatus.ph.range}</strong>
              </div>
              <span className="text-[8.5px] text-slate-400 block mt-0.5 truncate">Src: {paramStatus.ph.source}</span>
            </div>
          </div>

          {/* TAN Ammonia */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 border border-slate-100 dark:border-white/10 shadow-sm space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase text-slate-400">TAN Ammonia</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                paramStatus.ammonia.status === 'NORMAL' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                paramStatus.ammonia.status === 'CAUTION' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
              }`}>
                {paramStatus.ammonia.status}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                {pond.metrics.ammonia} <span className="text-xs font-bold text-slate-400">mg/L</span>
              </div>
              <div className="text-[10px] text-slate-500 font-semibold mt-1">
                Ref Interval: <strong className="text-slate-700 dark:text-slate-300">{paramStatus.ammonia.range}</strong>
              </div>
              <span className="text-[8.5px] text-slate-400 block mt-0.5 truncate">Src: {paramStatus.ammonia.source}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Action Hub */}
      <div className="space-y-2">
        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 px-1">
          Aquaculture Workflows
        </span>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => navigate(Screen.DISEASE)}
            className="p-4 rounded-3xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white flex flex-col justify-between text-left shadow-lg shadow-blue-500/20 transition-all space-y-3"
          >
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm">Multilayer Screening</h3>
              <p className="text-[10px] text-blue-100 mt-0.5">Diagnose symptoms, pond co-factors & Kaggle data</p>
            </div>
          </button>

          <button
            onClick={() => navigate(Screen.MONITORING)}
            className="p-4 rounded-3xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 active:scale-95 text-white flex flex-col justify-between text-left shadow-lg shadow-black/10 transition-all space-y-3 border border-white/10"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Activity size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm">Live Stream Simulator</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Test hypoxia crash, hysteresis & recovery</p>
            </div>
          </button>
        </div>
      </div>

      {/* Species Detail Popup Modal */}
      {selectedSpeciesDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full space-y-4 border border-slate-100 dark:border-white/10 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedSpeciesDetail.commonName}
                </h3>
                <span className="text-xs text-slate-400 italic">
                  {selectedSpeciesDetail.scientificName} ({selectedSpeciesDetail.family})
                </span>
              </div>
              <button 
                onClick={() => setSelectedSpeciesDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Feeding Niche:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{selectedSpeciesDetail.feedingHabit}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Air Breathing:</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {selectedSpeciesDetail.isAirBreathing ? 'Yes (Accessory organ)' : 'No (Obligate gill respiration)'}
                  </strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300">Scientific Reference Thresholds:</span>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                    <span className="text-slate-500">Water Temperature:</span>
                    <span>{selectedSpeciesDetail.parameters.temp.optimal[0]} - {selectedSpeciesDetail.parameters.temp.optimal[1]} °C</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                    <span className="text-slate-500">Dissolved Oxygen:</span>
                    <span>&gt;= {selectedSpeciesDetail.parameters.oxygen.optimal[0]} mg/L</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                    <span className="text-slate-500">pH Level:</span>
                    <span>{selectedSpeciesDetail.parameters.ph.optimal[0]} - {selectedSpeciesDetail.parameters.ph.optimal[1]}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                    <span className="text-slate-500">Max Ammonia (TAN):</span>
                    <span>{selectedSpeciesDetail.parameters.ammonia.optimal[1]} mg/L</span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-[10px] text-blue-900 dark:text-blue-300 space-y-1">
                <strong>Primary Literature Source:</strong>
                <p>{selectedSpeciesDetail.parameters.temp.sourceTitle}</p>
                <a 
                  href={selectedSpeciesDetail.parameters.temp.sourceUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline block"
                >
                  View Authoritative FAO/ICAR Record
                </a>
              </div>
            </div>

            <button
              onClick={() => setSelectedSpeciesDetail(null)}
              className="w-full bg-slate-900 dark:bg-slate-800 text-white py-3 rounded-2xl font-bold uppercase tracking-wider text-xs"
            >
              Close Record
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
