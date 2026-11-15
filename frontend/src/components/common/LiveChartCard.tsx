import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ReferenceArea 
} from 'recharts';
import { StatusLevel, STATUS_TOKENS } from '../../theme/tokens';
import StatusPill from './StatusPill';
import { useLanguage } from '../../App';
import { I18N } from '../../i18n/translations';

export interface ChartDataPoint {
  timeStr: string;
  timestamp: number;
  value: number;
  isBreach?: boolean;
}

interface LiveChartCardProps {
  id: 'oxygen' | 'temp' | 'ph' | 'ammonia';
  title: string;
  technicalName: string;
  currentValue: number;
  unit: string;
  status: StatusLevel | 'NORMAL' | 'CAUTION' | 'CRITICAL';
  data: ChartDataPoint[];
  safeMin: number;
  safeMax: number;
  yMin: number;
  yMax: number;
  captionEn: string;
  captionHi: string;
}

// Custom Tooltip component for touch screens
const CustomTooltip = ({ active, payload, unit }: any) => {
  if (active && payload && payload.length) {
    const pt = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-xl text-xs shadow-lg border border-white/10">
        <div className="font-extrabold text-blue-300">
          {pt.value} {unit}
        </div>
        <div className="text-[10px] text-slate-300">
          {pt.timeStr}
        </div>
      </div>
    );
  }
  return null;
};

export const LiveChartCard: React.FC<LiveChartCardProps> = ({
  id,
  title,
  technicalName,
  currentValue,
  unit,
  status,
  data,
  safeMin,
  safeMax,
  yMin,
  yMax,
  captionEn,
  captionHi
}) => {
  const { lang } = useLanguage();

  const normalizedStatus: StatusLevel = 
    status === 'NORMAL' ? 'good' :
    status === 'CAUTION' ? 'watch' :
    status === 'CRITICAL' ? 'danger' :
    (status as StatusLevel) || 'good';

  const token = STATUS_TOKENS[normalizedStatus];

  // Dynamic stroke color for live line based on current status
  const lineColor = 
    normalizedStatus === 'danger' ? '#DC2626' :
    normalizedStatus === 'watch' ? '#D97706' :
    '#059669';

  // Format data for chart display
  const chartPoints = useMemo(() => {
    if (!data || data.length === 0) {
      return [
        { timeStr: '-2m', timestamp: Date.now() - 120000, value: currentValue },
        { timeStr: 'now', timestamp: Date.now(), value: currentValue }
      ];
    }
    return data;
  }, [data, currentValue]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-white/10 shadow-sm space-y-3">
      {/* Top Header: Friendly name + Technical badge + Status Pill */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-baseline space-x-1.5">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <span className="text-[11px] font-bold text-slate-400 uppercase">
              ({technicalName})
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
            {lang === 'hi' ? 'सुरक्षित दायरा:' : 'Safe zone:'} {safeMin} - {safeMax} {unit}
          </div>
        </div>

        <StatusPill status={normalizedStatus} size="sm" />
      </div>

      {/* Current Big Value */}
      <div className="flex items-baseline space-x-2">
        <span className="text-4xl font-black tracking-tight" style={{ color: token.accent }}>
          {currentValue}
        </span>
        <span className="text-sm font-bold text-slate-400">
          {unit}
        </span>
      </div>

      {/* Real-time Line Chart with Safe Zone Band */}
      <div className="w-full h-44 -mx-1" aria-label={`${title} real time chart`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartPoints} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
            {/* Shaded Green Safe Zone Band */}
            <ReferenceArea 
              y1={safeMin} 
              y2={safeMax} 
              fill="#10B981" 
              fillOpacity={0.12} 
              stroke="#059669"
              strokeOpacity={0.25}
              strokeDasharray="3 3"
            />

            <XAxis 
              dataKey="timeStr" 
              tick={{ fontSize: 10, fill: '#94A3B8' }} 
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={[yMin, yMax]} 
              tick={{ fontSize: 10, fill: '#94A3B8' }} 
              axisLine={false}
              tickLine={false}
              tickCount={4}
            />

            <Tooltip content={<CustomTooltip unit={unit} />} />

            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={lineColor} 
              strokeWidth={3} 
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (payload.isBreach || payload.value < safeMin || payload.value > safeMax) {
                  return (
                    <circle 
                      key={`dot-${cx}-${cy}`} 
                      cx={cx} 
                      cy={cy} 
                      r={4} 
                      fill="#DC2626" 
                      stroke="#FFFFFF" 
                      strokeWidth={1.5} 
                    />
                  );
                }
                return null;
              }}
              isAnimationActive={false} // Disable jittery animations on continuous tick updates
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Safe Zone Legend & Caption */}
      <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px]">
        <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/20 border border-emerald-500/50" />
          <span className="font-semibold">{lang === 'hi' ? 'हरा क्षेत्र = सुरक्षित' : 'Green area = Safe zone'}</span>
        </div>
        <span className="text-slate-400 font-medium">
          {lang === 'hi' ? 'लाइव स्ट्रीम' : 'Live stream'}
        </span>
      </div>

      {/* One-line Plain Language Caption */}
      <div className={`p-2.5 rounded-xl text-xs font-semibold leading-snug flex items-center space-x-1.5 ${token.bgLight} ${token.textLight} ${token.darkBg} ${token.darkText}`}>
        <span>{token.icon}</span>
        <span>{lang === 'hi' ? captionHi : captionEn}</span>
      </div>
    </div>
  );
};

export default LiveChartCard;

