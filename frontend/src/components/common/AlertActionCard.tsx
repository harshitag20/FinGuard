import React from 'react';
import { AlertTriangle, CheckCircle, Clock, Wind, Ban, Droplet, ArrowRight } from 'lucide-react';
import { TelemetryAlert } from '../../types';
import { useLanguage } from '../../App';
import { I18N } from '../../i18n/translations';

interface AlertActionCardProps {
  alert: TelemetryAlert;
  onMarkDone?: () => void;
  onRemindLater?: () => void;
  onExecuteAction?: () => void;
}

export const AlertActionCard: React.FC<AlertActionCardProps> = ({
  alert,
  onMarkDone,
  onRemindLater,
  onExecuteAction
}) => {
  const { lang } = useLanguage();
  const strings = (I18N as any)[lang] || (I18N as any).hi || (I18N as any).en;

  const isCritical = alert.severity === 'CRITICAL';

  // Translate / map parameter to friendly action
  const getActionTitle = () => {
    if (alert.parameter === 'oxygen') {
      return lang === 'hi' ? 'ऑक्सीजन बहुत कम है!' : 'Oxygen is too low!';
    }
    if (alert.parameter === 'ammonia') {
      return lang === 'hi' ? 'अमोनिया कचरा बढ़ गया है!' : 'Ammonia waste is too high!';
    }
    if (alert.parameter === 'temp') {
      return lang === 'hi' ? 'पानी का तापमान असामान्य है' : 'Water temperature abnormal';
    }
    return lang === 'hi' ? 'पानी का स्तर बिगड़ा है' : 'Water quality alert';
  };

  const getPrimaryActionLabel = () => {
    if (alert.parameter === 'oxygen') return strings.alert_action_aerator;
    if (alert.parameter === 'ammonia') return strings.alert_action_stop_feed;
    return alert.cautiousAction || strings.run_aerator;
  };

  return (
    <div 
      className={`rounded-2xl p-4 border-2 transition-all space-y-3 shadow-sm ${
        isCritical 
          ? 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/60 text-rose-950 dark:text-rose-100'
          : 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-300 dark:border-amber-900/60 text-amber-950 dark:text-amber-100'
      }`}
    >
      {/* Header with DEMO badge and Severity */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`p-1.5 rounded-xl ${isCritical ? 'bg-rose-200 text-rose-700' : 'bg-amber-200 text-amber-700'}`}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-tight">
              {getActionTitle()}
            </h3>
            <span className="text-[10px] font-medium opacity-75">
              {alert.parameter.toUpperCase()} {alert.observedValue} {alert.unit} (Safe: {alert.referenceRange ? `${alert.referenceRange[0]} - ${alert.referenceRange[1]}` : alert.ruleTriggered})
            </span>
          </div>
        </div>

        {/* DEMO practice badge */}
        {alert.isSimulated && (
          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-black/10 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-black/10">
            {strings.demo_badge}
          </span>
        )}
      </div>

      {/* Plain Language Explanation */}
      <p className="text-xs font-semibold leading-relaxed">
        {alert.speciesImpactExplanation}
      </p>

      {/* Primary Action Button (Prominent, High-Contrast) */}
      <button
        type="button"
        onClick={onExecuteAction || onMarkDone}
        className={`w-full min-h-[48px] py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 shadow-sm transition-all active:scale-[0.98] ${
          isCritical
            ? 'bg-rose-600 hover:bg-rose-500 text-white'
            : 'bg-amber-600 hover:bg-amber-500 text-white'
        }`}
      >
        <span>{getPrimaryActionLabel()}</span>
        <ArrowRight size={16} />
      </button>

      {/* Secondary Actions: Mark Done & Remind Later */}
      <div className="flex items-center justify-between pt-1 text-xs">
        <button
          type="button"
          onClick={onMarkDone}
          className="inline-flex items-center space-x-1 font-bold text-slate-600 dark:text-slate-300 hover:underline py-1.5 px-2"
        >
          <CheckCircle size={14} className="text-emerald-600" />
          <span>{strings.mark_done}</span>
        </button>

        <button
          type="button"
          onClick={onRemindLater}
          className="inline-flex items-center space-x-1 font-semibold text-slate-500 dark:text-slate-400 hover:underline py-1.5 px-2"
        >
          <Clock size={14} />
          <span>{strings.remind_later}</span>
        </button>
      </div>
    </div>
  );
};

export default AlertActionCard;
