import React from 'react';
import { ShieldCheck, ArrowRight, FileText, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../App';
import { I18N } from '../../i18n/translations';

export interface SchemeItem {
  id: string;
  simpleTitleEn: string;
  simpleTitleHi: string;
  officialTitle: string;
  benefitEn: string;
  benefitHi: string;
  eligibilityChips: string[];
  tag: 'SUBSIDY' | 'LOAN' | 'TRAINING' | 'EQUIPMENT';
  isBestMatch?: boolean;
  portalLink: string;
  domain: string;
}

interface SchemeCardProps {
  scheme: SchemeItem;
  onApplyNow: (scheme: SchemeItem) => void;
  onViewDocuments: (scheme: SchemeItem) => void;
}

export const SchemeCard: React.FC<SchemeCardProps> = ({
  scheme,
  onApplyNow,
  onViewDocuments
}) => {
  const { lang } = useLanguage();
  const strings = I18N[lang as 'en' | 'hi'] || I18N.en;

  const tagLabel = 
    scheme.tag === 'SUBSIDY' ? strings.tag_subsidy :
    scheme.tag === 'LOAN' ? strings.tag_loan :
    scheme.tag === 'TRAINING' ? strings.tag_training :
    strings.tag_equipment;

  const tagColor =
    scheme.tag === 'SUBSIDY' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
    scheme.tag === 'LOAN' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
    scheme.tag === 'TRAINING' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' :
    'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl p-4 border transition-all space-y-3.5 shadow-sm ${
      scheme.isBestMatch 
        ? 'border-2 border-emerald-500 ring-2 ring-emerald-500/20' 
        : 'border-slate-200/90 dark:border-white/10'
    }`}>
      {/* Top row: Best Match Badge or Tag & Verified Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {scheme.isBestMatch && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
              {strings.best_match_badge}
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${tagColor}`}>
            {tagLabel}
          </span>
        </div>

        {/* Small .gov.in verified badge */}
        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
          <ShieldCheck size={12} className="text-blue-600 dark:text-blue-400" />
          <span>{strings.verified_gov}</span>
        </span>
      </div>

      {/* Scheme Name & Official Name */}
      <div>
        <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 leading-snug">
          {lang === 'hi' ? scheme.simpleTitleHi : scheme.simpleTitleEn}
        </h3>
        <p className="text-xs text-slate-400 font-semibold mt-0.5 truncate">
          {scheme.officialTitle}
        </p>
      </div>

      {/* One-line Plain Benefit */}
      <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 p-3 rounded-xl">
        <div className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200 flex items-start space-x-1.5 leading-snug">
          <span className="text-base shrink-0 leading-none">💰</span>
          <span>{lang === 'hi' ? scheme.benefitHi : scheme.benefitEn}</span>
        </div>
      </div>

      {/* Who Can Apply Chips */}
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
          {lang === 'hi' ? 'कौन आवेदन कर सकता है:' : 'Who can apply:'}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {scheme.eligibilityChips.map((chip, idx) => (
            <span 
              key={idx}
              className="text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-lg border border-slate-200/60 dark:border-white/5"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      {/* Stacked Action Buttons on Mobile (No cutoffs) */}
      <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-white/5">
        <button
          type="button"
          onClick={() => onApplyNow(scheme)}
          className="w-full min-h-[48px] py-3 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center space-x-2 shadow-sm transition-all active:scale-[0.98]"
        >
          <span>{strings.btn_apply_now}</span>
          <ArrowRight size={16} />
        </button>

        <button
          type="button"
          onClick={() => onViewDocuments(scheme)}
          className="w-full min-h-[48px] py-2.5 px-4 rounded-xl font-bold text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center justify-center space-x-1.5 transition-all active:scale-[0.98]"
        >
          <FileText size={15} />
          <span>{strings.btn_view_docs}</span>
        </button>
      </div>
    </div>
  );
};

export default SchemeCard;

