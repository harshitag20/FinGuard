import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { StatusLevel, STATUS_TOKENS } from '../../theme/tokens';
import StatusPill from './StatusPill';
import { useLanguage } from '../../App';
import { I18N } from '../../i18n/translations';

export interface MetricCardProps {
  id: 'oxygen' | 'temp' | 'ph' | 'ammonia';
  icon: React.ReactNode;
  friendlyName: string;
  technicalLabel: string;
  currentValue: number;
  unit: string;
  avgValue: number;
  minValue: number;
  maxValue: number;
  minTime?: string;
  status: StatusLevel | 'NORMAL' | 'CAUTION' | 'CRITICAL';
  safeRangeText: string;
  scientificSource: string;
  meaningEn: string;
  meaningHi: string;
  importanceEn: string;
  importanceHi: string;
  actionEn: string;
  actionHi: string;
  sparklineData?: number[];
}

export const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  friendlyName,
  technicalLabel,
  currentValue,
  unit,
  avgValue,
  minValue,
  maxValue,
  minTime = '4 AM',
  status,
  safeRangeText,
  scientificSource,
  meaningEn,
  meaningHi,
  importanceEn,
  importanceHi,
  actionEn,
  actionHi,
  sparklineData = [6.2, 5.8, 5.0, 4.2, 3.9, 4.8, 5.5, 6.4]
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { lang } = useLanguage();
  const strings = (I18N as any)[lang] || (I18N as any).hi || (I18N as any).en;

  const normalizedStatus: StatusLevel = 
    status === 'NORMAL' ? 'good' :
    status === 'CAUTION' ? 'watch' :
    status === 'CRITICAL' ? 'danger' :
    (status as StatusLevel) || 'good';

  const token = STATUS_TOKENS[normalizedStatus];

  // Simple SVG sparkline
  const minSpark = Math.min(...sparklineData);
  const maxSpark = Math.max(...sparklineData);
  const rangeSpark = maxSpark - minSpark || 1;
  const sparkPoints = sparklineData.map((val, idx) => {
    const x = (idx / (sparklineData.length - 1)) * 60;
    const y = 20 - ((val - minSpark) / rangeSpark) * 16;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div 
      className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 shadow-xs overflow-hidden ${
        normalizedStatus === 'danger' 
          ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-300 dark:ring-rose-900' 
          : normalizedStatus === 'watch'
            ? 'border-amber-300 dark:border-amber-900/60'
            : 'border-slate-200/90 dark:border-white/10 hover:border-slate-300'
      }`}
    >
      {/* Main Row / Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left flex flex-col space-y-3 cursor-pointer select-none"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center justify-between">
          {/* Parameter Title & Jargon Disclosure */}
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div>
              <div className="flex items-baseline space-x-1.5">
                <span className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  {friendlyName}
                </span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  ({technicalLabel})
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                {safeRangeText}
              </div>
            </div>
          </div>

          {/* Status Pill & Arrow */}
          <div className="flex items-center space-x-2">
            <StatusPill status={normalizedStatus} size="sm" />
            <div className="text-slate-400">
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>
        </div>

        {/* Current & 24h Metrics */}
        <div className="flex items-end justify-between pt-1 border-t border-slate-100 dark:border-white/5">
          <div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                {currentValue}
              </span>
              <span className="text-xs font-bold text-slate-400">
                {unit}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {strings.avg_label} {avgValue} {unit} · {strings.low_label} {minValue} (at {minTime})
            </div>
          </div>

          {/* Sparkline */}
          <div className="flex flex-col items-end">
            <svg className="w-16 h-6 overflow-visible" viewBox="0 0 60 22">
              <polyline
                fill="none"
                stroke={token.accent}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={sparkPoints}
              />
            </svg>
            <span className="text-[9px] text-slate-400 font-medium mt-1">24h trend</span>
          </div>
        </div>

        {/* What to do line (Verdict in simple words) */}
        <div className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1.5 ${token.bgLight} ${token.textLight} ${token.darkBg} ${token.darkText}`}>
          <span>{token.icon}</span>
          <span>{lang === 'hi' ? actionHi : actionEn}</span>
        </div>
      </button>

      {/* Expanded Accordion: Details, Science & Recommendations */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-slate-800/40 space-y-3 text-xs animate-in fade-in duration-150">
          <div>
            <h4 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">
              {lang === 'hi' ? 'इसका क्या मतलब है?' : 'What does this mean?'}
            </h4>
            <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              {lang === 'hi' ? meaningHi : meaningEn}
            </p>
          </div>

          <div>
            <h4 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">
              {lang === 'hi' ? 'मछलियों के लिए यह क्यों जरूरी है?' : 'Why it matters for your fish:'}
            </h4>
            <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              {lang === 'hi' ? importanceHi : importanceEn}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-400">
            <span>ⓘ Scientific source: {scientificSource}</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">ICAR-CIFA / FAO</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricCard;

