import React, { useState, useEffect, useMemo } from 'react';
import { 
  Droplets, Thermometer, Wind, AlertTriangle, ShieldCheck, 
  MapPin, ChevronRight, Fish, Globe, ChevronDown, ChevronUp,
  Activity, Sparkles, Landmark, Stethoscope, LineChart, HelpCircle
} from 'lucide-react';
import { useLanguage, useTheme, usePond, useUser, useNavigation } from '../App';
import { Screen, TelemetryAlert } from '../types';
import { SPECIES_CATALOG, SpeciesProfile } from '../services/speciesCatalog';
import { evaluateMultiSpeciesCompatibility } from '../services/overlapEngine';
import { api } from '../services/apiService';
import { fetchWeatherByCoords, WeatherData } from '../services/weatherService';
import { getHighAccuracyLocation } from '../services/locationService';
import { I18N } from '../i18n/translations';
import { getDailyReport, DailyFarmReport } from '../services/telemetryReportHelper';
import MetricCard from '../components/common/MetricCard';
import StatusPill from '../components/common/StatusPill';
import ListenButton from '../components/common/ListenButton';
import SectionHeader from '../components/common/SectionHeader';

const Dashboard: React.FC = () => {
  const { lang, setLang } = useLanguage();
  const { theme } = useTheme();
  const { pond, setPond } = usePond();
  const { user } = useUser();
  const { navigate } = useNavigation();
  const strings = (I18N as any)[lang] || (I18N as any).hi || (I18N as any).en;

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [alerts, setAlerts] = useState<TelemetryAlert[]>([]);
  const [telemetryHistory, setTelemetryHistory] = useState<any[]>([]);
  const [simRunning, setSimRunning] = useState(false);
  const [showDataSource, setShowDataSource] = useState(false);

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

  // Fetch telemetry history, alerts & simulation state
  const fetchData = async () => {
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
      const history = await api.getPondTelemetry(pond.id);
      setTelemetryHistory(history || []);
      const fetchedAlerts = await api.getAlerts();
      setAlerts(fetchedAlerts || []);
    } catch (err) {
      console.warn('Dashboard data fetch error', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Poll only when simulation is actively running
  useEffect(() => {
    if (!simRunning) return;
    const timer = setInterval(fetchData, 4000);
    return () => clearInterval(timer);
  }, [simRunning]);

  // Fetch location weather
  useEffect(() => {
    const loadWeather = async () => {
      try {
        const loc = await getHighAccuracyLocation();
        const data = await fetchWeatherByCoords(loc.lat, loc.lng);
        setWeather(data);
      } catch {
        const fallback = await fetchWeatherByCoords(16.54, 81.52);
        setWeather(fallback);
      }
    };
    loadWeather();
  }, []);

  const handleToggleSimulation = async () => {
    try {
      if (simRunning) {
        const next = await api.pauseSimulation();
        setSimRunning(next.isRunning);
      } else {
        const next = await api.startSimulation();
        setSimRunning(next.isRunning);
        await fetchData();
      }
    } catch (e) {
      console.warn('Toggle simulation error', e);
    }
  };

  // Compute 24-hour Daily Farm Report
  const dailyReport: DailyFarmReport | null = useMemo(() => {
    return getDailyReport(telemetryHistory, pond.metrics, alerts);
  }, [telemetryHistory, pond.metrics, alerts]);

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const farmerName = user?.name ? `, ${user.name}` : '';
    if (lang === 'hi') {
      return `${strings.namaste}${farmerName} 🙏`;
    }
    if (hour < 12) return `${strings.good_morning}${farmerName}`;
    if (hour < 17) return `${strings.good_afternoon}${farmerName}`;
    return `${strings.good_evening}${farmerName}`;
  }, [user?.name, lang, strings]);

  // Speech summary text for Listen button
  const voiceSummary = useMemo(() => {
    if (!dailyReport) return strings.empty_report_title;
    if (lang === 'hi') {
      return `${dailyReport.headlineHi}। ${dailyReport.summaryHi}`;
    }
    return `${dailyReport.headlineEn}. ${dailyReport.summaryEn}`;
  }, [dailyReport, lang, strings]);

  return (
    <div className={`p-4 pb-32 space-y-4 max-w-lg mx-auto transition-colors duration-300 ${
      theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
    }`}>

      {/* 1. Header: Greeting, Pond Name, Weather Chip, and Language Switcher */}
      <header className="pt-2 flex items-start justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
            <MapPin size={13} className="shrink-0" />
            <span className="truncate max-w-[200px]">
              {pond.name} · {user?.location || 'Bhimavaram, AP'}
            </span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {greeting}
          </h1>
        </div>

        {/* Right side: Language Switcher & Weather Chip */}
        <div className="flex items-center space-x-2">
          {/* Language Switcher Dropdown */}
          <div className="relative">
            <select
              value={lang}
              onChange={(e) => {
                const newLang = e.target.value as any;
                setLang(newLang);
                try { localStorage.setItem('finguard_lang', newLang); } catch {}
              }}
              className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-black uppercase tracking-wider shadow-xs hover:bg-blue-100 dark:hover:bg-blue-900/60 cursor-pointer outline-none transition-all"
              aria-label="Switch Language"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="te">తెలుగు</option>
              <option value="bn">বাংলা</option>
              <option value="mr">मराठी</option>
              <option value="ta">தமிழ்</option>
            </select>
          </div>

          {/* Weather Chip */}
          {weather && (
            <div className="text-right bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs">
              <span className="text-xs font-black text-slate-900 dark:text-slate-100 block leading-tight">
                {weather.temp}°C
              </span>
              <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[70px] block">
                {weather.condition}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* 2. Hero Card: "Today's Pond Health" (The Daily Report Summary) */}
      {dailyReport ? (
        <section 
          className={`rounded-3xl p-5 border-2 shadow-sm transition-all space-y-3 ${
            dailyReport.overallStatus === 'danger'
              ? 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/60'
              : dailyReport.overallStatus === 'watch'
                ? 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-300 dark:border-amber-900/60'
                : 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-900/60'
          }`}
          aria-label={strings.daily_report_title}
        >
          {/* Top row: Title + Date + Listen Button */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {strings.daily_report_title}
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                {dailyReport.dateStr}
              </span>
              <ListenButton textToSpeak={voiceSummary} size="sm" />
            </div>
          </div>

          {/* Big Status Verdict Headline */}
          <div className="pt-1">
            <h2 className="text-2xl font-black tracking-tight leading-tight text-slate-900 dark:text-slate-100">
              {lang === 'hi' ? dailyReport.headlineHi : dailyReport.headlineEn}
            </h2>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
              {lang === 'hi' ? dailyReport.summaryHi : dailyReport.summaryEn}
            </p>
          </div>

          {/* Footer note: Last updated time */}
          <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>{strings.last_updated}</span>
            <span className="font-semibold">{pond.name}</span>
          </div>
        </section>
      ) : (
        /* Empty State */
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
            <Droplets size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {strings.empty_report_title}
          </h3>
          <p className="text-xs text-slate-500">
            {strings.empty_report_sub}
          </p>
        </section>
      )}

      {/* 3. "Today's Report" Section: 4 Rows (Oxygen, Ammonia, Temp, pH) */}
      <section className="space-y-2.5">
        <SectionHeader 
          title={strings.todays_report_heading}
          subtitle={strings.todays_report_sub}
        />

        <div className="space-y-2.5">
          {/* Oxygen in water (DO) */}
          <MetricCard
            id="oxygen"
            icon={<Wind size={20} />}
            friendlyName={strings.param_oxygen}
            technicalLabel={strings.param_oxygen_tech}
            currentValue={pond.metrics.oxygen}
            unit="mg/L"
            avgValue={dailyReport?.parameters.oxygen.avg || 6.2}
            minValue={dailyReport?.parameters.oxygen.min || 3.9}
            maxValue={dailyReport?.parameters.oxygen.max || 7.4}
            minTime={dailyReport?.parameters.oxygen.minTime || '4 AM'}
            status={dailyReport?.parameters.oxygen.status || 'good'}
            safeRangeText={strings.safe_above}
            scientificSource="ICAR-CIFA Standard / FAO"
            meaningEn="The amount of breathable oxygen dissolved in your pond water."
            meaningHi="पानी में घुली हुई ऑक्सीजन जो मछलियों के सांस लेने के लिए जरूरी है।"
            importanceEn="Without adequate oxygen (at least 5 mg/L), fish stop feeding, gasp at the surface, and can suffocate rapidly."
            importanceHi="5 mg/L से कम ऑक्सीजन होने पर मछलियां खाना बंद कर देती हैं और सतह पर दम घुटने लगता है।"
            actionEn={dailyReport?.parameters.oxygen.status === 'danger' ? 'Switch on aerators immediately!' : 'Normal breathing zone. Keep aerators maintained.'}
            actionHi={dailyReport?.parameters.oxygen.status === 'danger' ? 'तुरंत एरेटर चालू करें!' : 'ऑक्सीजन सही है। एरेटर तैयार रखें।'}
            sparklineData={[6.4, 5.8, 5.1, 4.3, 3.9, 4.6, 5.5, pond.metrics.oxygen]}
          />

          {/* Ammonia (harmful waste) (TAN) */}
          <MetricCard
            id="ammonia"
            icon={<Droplets size={20} />}
            friendlyName={strings.param_ammonia}
            technicalLabel={strings.param_ammonia_tech}
            currentValue={pond.metrics.ammonia}
            unit="mg/L"
            avgValue={dailyReport?.parameters.ammonia.avg || 0.03}
            minValue={dailyReport?.parameters.ammonia.min || 0.01}
            maxValue={dailyReport?.parameters.ammonia.max || 0.08}
            minTime="Yesterday"
            status={dailyReport?.parameters.ammonia.status || 'good'}
            safeRangeText={strings.safe_below}
            scientificSource="Boyd (2020) Water Quality in Ponds"
            meaningEn="Poisonous waste produced from fish excretions and rotting leftover feed at the pond bottom."
            meaningHi="मछली के मल और बचे हुए सड़े चारे से पैदा होने वाला जहरीला कचरा।"
            importanceEn="High ammonia damages fish gills, weakens their immune system, and causes sudden mortality."
            importanceHi="अधिक अमोनिया से मछलियों के गिल्स जल जाते हैं और वे बीमार होकर मरने लगती हैं।"
            actionEn={dailyReport?.parameters.ammonia.status === 'danger' ? 'Stop feeding immediately and add fresh water!' : 'Waste level is safe and clean.'}
            actionHi={dailyReport?.parameters.ammonia.status === 'danger' ? 'तुरंत चारा देना रोकें और नया पानी डालें!' : 'कचरा स्तर सुरक्षित है।'}
            sparklineData={[0.02, 0.02, 0.03, 0.04, 0.03, 0.02, 0.03, pond.metrics.ammonia]}
          />

          {/* Water temperature */}
          <MetricCard
            id="temp"
            icon={<Thermometer size={20} />}
            friendlyName={strings.param_temp}
            technicalLabel={strings.param_temp_tech}
            currentValue={pond.metrics.temp}
            unit="°C"
            avgValue={dailyReport?.parameters.temp.avg || 28.5}
            minValue={dailyReport?.parameters.temp.min || 26.2}
            maxValue={dailyReport?.parameters.temp.max || 31.0}
            minTime="6 AM"
            status={dailyReport?.parameters.temp.status || 'good'}
            safeRangeText={strings.safe_temp}
            scientificSource="FAO Cultured Aquatic Species Sheet"
            meaningEn="The natural temperature of the pond water affecting fish digestion and metabolism."
            meaningHi="पानी का तापमान जो मछलियों के भोजन पचाने और बढ़ने की गति तय करता है।"
            importanceEn="Indian Major Carps grow best between 26°C and 32°C. Sudden chilling stops growth."
            importanceHi="रोहू और कतला 26°C से 32°C में सबसे तेजी से बढ़ते हैं।"
            actionEn="Optimal growth temperature. Regular feeding schedule can continue."
            actionHi="तापमान अनुकूल है। नियमित चारा देना जारी रखें।"
            sparklineData={[27.0, 26.5, 26.2, 27.5, 29.0, 30.2, 29.5, pond.metrics.temp]}
          />

          {/* Water acidity (pH) */}
          <MetricCard
            id="ph"
            icon={<Activity size={20} />}
            friendlyName={strings.param_ph}
            technicalLabel={strings.param_ph_tech}
            currentValue={pond.metrics.ph}
            unit="pH"
            avgValue={dailyReport?.parameters.ph.avg || 7.6}
            minValue={dailyReport?.parameters.ph.min || 7.3}
            maxValue={dailyReport?.parameters.ph.max || 8.1}
            minTime="5 AM"
            status={dailyReport?.parameters.ph.status || 'good'}
            safeRangeText={strings.safe_ph}
            scientificSource="ICAR-CIFA Standard for Freshwater Carp"
            meaningEn="Whether water is acidic or alkaline. Best maintained slightly alkaline."
            meaningHi="पानी में अम्लीयता (खारापन/तेजाबियत) का स्तर। हल्का क्षारीय पानी सबसे अच्छा होता है।"
            importanceEn="A pH below 6.5 irritates fish skin and gills; above 9.0 turns ammonia highly toxic."
            importanceHi="6.5 से कम pH त्वचा को नुकसान पहुंचाता है और 9 से अधिक pH अमोनिया को बहुत जहरीला बनाता है।"
            actionEn="Acidity is well balanced. Keep pond liming schedule as planned."
            actionHi="pH पूरी तरह संतुलित है। चूने का सामान्य चक्र बनाए रखें।"
            sparklineData={[7.4, 7.3, 7.3, 7.5, 7.7, 7.9, 7.8, pond.metrics.ph]}
          />
        </div>
      </section>

      {/* 4. "Problems Today" Section */}
      <section className="space-y-2.5">
        <SectionHeader 
          title={strings.problems_today} 
          subtitle={dailyReport?.problems.length ? `${dailyReport.problems.length} detected in last 24h` : undefined}
        />

        {dailyReport && dailyReport.problems.length > 0 ? (
          <div className="space-y-2">
            {dailyReport.problems.map((problem) => (
              <div 
                key={problem.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col space-y-2.5 ${
                  problem.severity === 'danger'
                    ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                    : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">
                      {problem.severity === 'danger' ? '🔴' : '🟡'}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                        {lang === 'hi' ? problem.titleHi : problem.titleEn}
                      </h4>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {problem.timeRange}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ONE Recommended Action Button */}
                <button
                  type="button"
                  onClick={() => navigate(Screen.MONITORING)}
                  className={`w-full min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-xs transition-all active:scale-[0.98] ${
                    problem.severity === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                  }`}
                >
                  <span>{lang === 'hi' ? problem.actionLabelHi : problem.actionLabelEn}</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-4 flex items-center space-x-3">
            <span className="text-2xl">🎉</span>
            <div>
              <h4 className="font-extrabold text-sm text-emerald-900 dark:text-emerald-200">
                {strings.no_problems_title}
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                {strings.no_problems_sub}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 5. "Your Fish" Card (Compact) */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-white/10 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Fish size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {strings.your_fish} ({speciesList.length})
              </h3>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => navigate(Screen.PROFILE)}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline py-1 px-2"
          >
            {strings.edit_fish}
          </button>
        </div>

        {/* Species chips */}
        <div className="flex flex-wrap gap-1.5">
          {speciesList.map(sp => (
            <span 
              key={sp.id}
              className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-white/5"
            >
              {sp.commonName}
            </span>
          ))}
        </div>

        {/* Replaced technical "Ecological Overlap" with clear verdict */}
        <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center space-x-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
          <span>{strings.compatible_fish_msg}</span>
        </div>
      </section>

      {/* 6. "What would you like to do?" Quick Actions (2-3 large buttons with icons) */}
      <section className="space-y-2.5">
        <SectionHeader title={strings.quick_actions_title} />

        <div className="grid grid-cols-1 gap-2.5">
          {/* Action 1: Check fish health */}
          <button
            type="button"
            onClick={() => navigate(Screen.DISEASE)}
            className="w-full min-h-[56px] p-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-between text-left shadow-sm transition-all active:scale-[0.98]"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Stethoscope size={22} />
              </div>
              <div>
                <h4 className="font-extrabold text-base leading-snug">
                  {strings.action_check_fish}
                </h4>
                <p className="text-xs text-blue-100 mt-0.5">
                  {strings.action_check_fish_sub}
                </p>
              </div>
            </div>
            <ChevronRight size={20} className="shrink-0 text-white/80" />
          </button>

          {/* Action 2: Live pond graphs */}
          <button
            type="button"
            onClick={() => navigate(Screen.MONITORING)}
            className="w-full min-h-[56px] p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 hover:border-slate-300 text-slate-900 dark:text-slate-100 flex items-center justify-between text-left shadow-xs transition-all active:scale-[0.98]"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <LineChart size={22} />
              </div>
              <div>
                <h4 className="font-extrabold text-base leading-snug">
                  {strings.action_live_graphs}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {strings.action_live_graphs_sub}
                </p>
              </div>
            </div>
            <ChevronRight size={20} className="shrink-0 text-slate-400" />
          </button>

          {/* Action 3: Find government help / subsidy */}
          <button
            type="button"
            onClick={() => navigate(Screen.SCHEMES)}
            className="w-full min-h-[56px] p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 hover:border-slate-300 text-slate-900 dark:text-slate-100 flex items-center justify-between text-left shadow-xs transition-all active:scale-[0.98]"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Landmark size={22} />
              </div>
              <div>
                <h4 className="font-extrabold text-base leading-snug">
                  {strings.action_gov_schemes}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {strings.action_gov_schemes_sub}
                </p>
              </div>
            </div>
            <ChevronRight size={20} className="shrink-0 text-slate-400" />
          </button>
        </div>
      </section>

      {/* 7. Collapsible "Data Source" Row at Bottom */}
      <section className="pt-2">
        <div className="bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-white/5 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setShowDataSource(!showDataSource)}
            className="w-full p-3 flex items-center justify-between text-slate-600 dark:text-slate-400 font-semibold"
          >
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${simRunning ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              <span>{strings.data_source_title}: {simRunning ? strings.data_source_live : strings.data_source_demo}</span>
            </div>
            {showDataSource ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showDataSource && (
            <div className="p-3 pt-0 border-t border-slate-200/50 dark:border-white/5 space-y-2">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {simRunning 
                  ? 'Currently streaming dynamic updates. You can pause the feed anytime.' 
                  : 'Currently showing demo practice data. Switch feed on to simulate continuous live sensors.'}
              </p>
              <button
                type="button"
                onClick={handleToggleSimulation}
                className={`py-2 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                  simRunning
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    : 'bg-blue-600 text-white hover:bg-blue-500'
                }`}
              >
                {simRunning ? 'Stop Feed' : 'Allow Feed'}
              </button>
            </div>
          )}
        </div>
      </section>

    </div>
  );
};

export default Dashboard;
