/**
 * FinGuard Design Tokens
 * Tailored for small/marginal fish farmers in India:
 * - High sunlight contrast (WCAG AA+)
 * - Minimum 48x48dp touch targets
 * - Body text min 16px, key numbers 32px+
 * - Consistent 16px radius and 16px grid
 * - Traffic-light status pairing: Color + Icon + Plain Text Word
 */

export type StatusLevel = 'good' | 'watch' | 'danger';

export interface StatusToken {
  level: StatusLevel;
  icon: string; // Emoji indicator
  labelEn: string;
  labelHi: string;
  actionEn: string;
  actionHi: string;
  bgLight: string;
  textLight: string;
  borderLight: string;
  accent: string;
  darkBg: string;
  darkText: string;
}

export const STATUS_TOKENS: Record<StatusLevel, StatusToken> = {
  good: {
    level: 'good',
    icon: '🟢',
    labelEn: 'Good',
    labelHi: 'सुरक्षित (अच्छा)',
    actionEn: 'Water is safe. No action needed.',
    actionHi: 'पानी सुरक्षित है। कोई कार्रवाई जरूरी नहीं।',
    bgLight: 'bg-emerald-50',
    textLight: 'text-emerald-800',
    borderLight: 'border-emerald-200',
    accent: '#059669',
    darkBg: 'dark:bg-emerald-950/40',
    darkText: 'dark:text-emerald-300'
  },
  watch: {
    level: 'watch',
    icon: '🟡',
    labelEn: 'Be careful',
    labelHi: 'सावधान (ध्यान दें)',
    actionEn: 'Approaching limit. Monitor pond closely.',
    actionHi: 'सीमा के करीब है। तालाब पर नजर रखें।',
    bgLight: 'bg-amber-50',
    textLight: 'text-amber-800',
    borderLight: 'border-amber-200',
    accent: '#D97706',
    darkBg: 'dark:bg-amber-950/40',
    darkText: 'dark:text-amber-300'
  },
  danger: {
    level: 'danger',
    icon: '🔴',
    labelEn: 'Act now',
    labelHi: 'खतरा (तुरंत कदम उठाएं)',
    actionEn: 'Immediate action needed to protect fish!',
    actionHi: 'मछलियों की सुरक्षा के लिए तुरंत कदम उठाएं!',
    bgLight: 'bg-rose-50',
    textLight: 'text-rose-800',
    borderLight: 'border-rose-200',
    accent: '#DC2626',
    darkBg: 'dark:bg-rose-950/40',
    darkText: 'dark:text-rose-300'
  }
};

export const UI_CLASSES = {
  card: 'bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-white/10 shadow-sm transition-all',
  heroCard: 'bg-white dark:bg-slate-900 rounded-3xl p-5 border-2 shadow-md transition-all',
  touchTarget: 'min-h-[48px] min-w-[48px] flex items-center justify-center',
  primaryButton: 'min-h-[48px] w-full py-3 px-5 rounded-2xl font-bold text-base flex items-center justify-center space-x-2 transition-all active:scale-[0.98] shadow-sm',
  secondaryButton: 'min-h-[48px] w-full py-3 px-4 rounded-2xl font-semibold text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center space-x-2 transition-all active:scale-[0.98]',
  iconButton: 'min-h-[48px] min-w-[48px] p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all active:scale-95',
  sectionTitle: 'text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight',
  sectionSubtitle: 'text-xs text-slate-500 dark:text-slate-400 font-medium',
  bigNumber: 'text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100',
  bodyText: 'text-base text-slate-700 dark:text-slate-300 leading-relaxed'
};

