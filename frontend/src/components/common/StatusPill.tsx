import React from 'react';
import { StatusLevel, STATUS_TOKENS } from '../../theme/tokens';
import { useLanguage } from '../../App';

interface StatusPillProps {
  status: StatusLevel | 'NORMAL' | 'CAUTION' | 'CRITICAL';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, className = '', size = 'md' }) => {
  const { lang } = useLanguage();

  // Normalize status string
  const normalized: StatusLevel = 
    status === 'NORMAL' ? 'good' :
    status === 'CAUTION' ? 'watch' :
    status === 'CRITICAL' ? 'danger' :
    (status as StatusLevel) || 'good';

  const token = STATUS_TOKENS[normalized] || STATUS_TOKENS.good;
  const label = lang === 'hi' ? token.labelHi : token.labelEn;

  const sizeClasses = 
    size === 'sm' ? 'px-2 py-0.5 text-xs' :
    size === 'lg' ? 'px-3.5 py-1.5 text-sm font-extrabold' :
    'px-2.5 py-1 text-xs font-bold';

  return (
    <span
      className={`inline-flex items-center space-x-1.5 rounded-full border shadow-xs ${token.bgLight} ${token.textLight} ${token.borderLight} ${token.darkBg} ${token.darkText} ${sizeClasses} ${className}`}
      role="status"
      aria-label={label}
    >
      <span className="shrink-0 text-xs" aria-hidden="true">{token.icon}</span>
      <span className="tracking-tight uppercase font-black">{label}</span>
    </span>
  );
};

export default StatusPill;

