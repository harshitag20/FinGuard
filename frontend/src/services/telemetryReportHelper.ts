import { PondMetrics, TelemetryAlert } from '../types';
import { StatusLevel } from '../theme/tokens';

export interface ParameterAggregate {
  current: number;
  avg: number;
  min: number;
  max: number;
  minTime: string;
  maxTime: string;
  status: StatusLevel;
  breachCount: number;
}

export interface ProblemItem {
  id: string;
  titleEn: string;
  titleHi: string;
  timeRange: string;
  severity: 'watch' | 'danger';
  parameter: 'oxygen' | 'ammonia' | 'temp' | 'ph';
  actionLabelEn: string;
  actionLabelHi: string;
  actionType: 'aerator' | 'stop_feed' | 'water' | 'lime';
}

export interface DailyFarmReport {
  dateStr: string;
  overallStatus: StatusLevel;
  headlineEn: string;
  headlineHi: string;
  summaryEn: string;
  summaryHi: string;
  problemsCount: number;
  problems: ProblemItem[];
  parameters: {
    oxygen: ParameterAggregate;
    temp: ParameterAggregate;
    ph: ParameterAggregate;
    ammonia: ParameterAggregate;
  };
  hasData: boolean;
}

/**
 * Computes a 24-hour daily report aggregate from historical telemetry
 */
export function getDailyReport(
  history: PondMetrics[],
  currentMetrics?: PondMetrics,
  alerts: TelemetryAlert[] = []
): DailyFarmReport | null {
  // Combine history with current metrics
  const records = [...(history || [])];
  if (currentMetrics && !records.some(r => r.timestamp === currentMetrics.timestamp)) {
    records.unshift(currentMetrics);
  }

  if (records.length === 0) {
    return null;
  }

  // Helper to compute stats for a specific metric
  const computeStats = (
    key: 'oxygen' | 'temp' | 'ph' | 'ammonia',
    safeMin: number,
    safeMax: number
  ): ParameterAggregate => {
    const values = records.map(r => r[key]).filter((v): v is number => typeof v === 'number');
    if (values.length === 0) {
      const fallbackVal = currentMetrics ? currentMetrics[key] : 0;
      return {
        current: fallbackVal,
        avg: fallbackVal,
        min: fallbackVal,
        max: fallbackVal,
        minTime: '4 AM',
        maxTime: '2 PM',
        status: 'good',
        breachCount: 0
      };
    }

    const current = currentMetrics ? currentMetrics[key] : values[0];
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = Number((sum / values.length).toFixed(1));
    const min = Number(Math.min(...values).toFixed(1));
    const max = Number(Math.max(...values).toFixed(1));

    // Determine status
    let status: StatusLevel = 'good';
    if (key === 'oxygen') {
      if (current < 3.0 || min < 2.5) status = 'danger';
      else if (current < 5.0 || min < 4.0) status = 'watch';
    } else if (key === 'ammonia') {
      if (current > 0.25 || max > 0.3) status = 'danger';
      else if (current > 0.05 || max > 0.1) status = 'watch';
    } else if (key === 'temp') {
      if (current < 18 || current > 35) status = 'danger';
      else if (current < 25 || current > 32) status = 'watch';
    } else if (key === 'ph') {
      if (current < 6.5 || current > 9.2) status = 'danger';
      else if (current < 7.2 || current > 8.5) status = 'watch';
    }

    const breaches = values.filter(v => v < safeMin || v > safeMax).length;

    return {
      current,
      avg,
      min,
      max,
      minTime: '4 AM',
      maxTime: '3 PM',
      status,
      breachCount: breaches
    };
  };

  const oxygen = computeStats('oxygen', 5.0, 12.0);
  const temp = computeStats('temp', 26.0, 32.0);
  const ph = computeStats('ph', 7.2, 8.5);
  const ammonia = computeStats('ammonia', 0.0, 0.05);

  // Compile problems list from alerts & stats
  const problems: ProblemItem[] = [];

  if (oxygen.status === 'danger' || oxygen.min < 3.5) {
    problems.push({
      id: 'prob-oxygen',
      titleEn: 'Oxygen dipped low during night (down to ' + oxygen.min + ' mg/L)',
      titleHi: 'रात में ऑक्सीजन गिरकर ' + oxygen.min + ' mg/L तक पहुंच गई थी',
      timeRange: '3 AM – 5 AM',
      severity: 'danger',
      parameter: 'oxygen',
      actionLabelEn: 'Run aerator',
      actionLabelHi: 'एरेटर चलाएं',
      actionType: 'aerator'
    });
  } else if (oxygen.status === 'watch') {
    problems.push({
      id: 'prob-oxygen-watch',
      titleEn: 'Oxygen approached safe boundary at dawn',
      titleHi: 'सुबह ऑक्सीजन सुरक्षित सीमा के करीब आ गई थी',
      timeRange: '4 AM – 6 AM',
      severity: 'watch',
      parameter: 'oxygen',
      actionLabelEn: 'Check aerator belt',
      actionLabelHi: 'एरेटर बेल्ट जांचें',
      actionType: 'aerator'
    });
  }

  if (ammonia.status === 'danger' || ammonia.max > 0.15) {
    problems.push({
      id: 'prob-ammonia',
      titleEn: 'Ammonia waste buildup detected (' + ammonia.max + ' mg/L)',
      titleHi: 'अमोनिया कचरा बढ़ गया है (' + ammonia.max + ' mg/L)',
      timeRange: 'Yesterday afternoon',
      severity: 'danger',
      parameter: 'ammonia',
      actionLabelEn: 'Stop feeding today',
      actionLabelHi: 'आज चारा देना बंद करें',
      actionType: 'stop_feed'
    });
  }

  // Add any active critical alerts
  alerts.forEach((alert, idx) => {
    if (!problems.some(p => p.parameter === alert.parameter)) {
      problems.push({
        id: `alert-${idx}`,
        titleEn: alert.speciesImpactExplanation.slice(0, 60) + '...',
        titleHi: 'पानी के स्तर में गड़बड़ी पाई गई',
        timeRange: 'Recent',
        severity: alert.severity === 'CRITICAL' ? 'danger' : 'watch',
        parameter: alert.parameter as any,
        actionLabelEn: alert.cautiousAction || 'Run aerator',
        actionLabelHi: 'जरूरी कदम उठाएं',
        actionType: 'aerator'
      });
    }
  });

  // Overall status determination
  let overallStatus: StatusLevel = 'good';
  if (problems.some(p => p.severity === 'danger') || oxygen.status === 'danger' || ammonia.status === 'danger') {
    overallStatus = 'danger';
  } else if (problems.length > 0 || oxygen.status === 'watch' || temp.status === 'watch' || ph.status === 'watch' || ammonia.status === 'watch') {
    overallStatus = 'watch';
  }

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  let headlineEn = '🟢 Your pond is healthy today';
  let headlineHi = '🟢 आज आपका तालाब पूरी तरह सुरक्षित है';
  let summaryEn = 'Oxygen and water parameters are in the optimal range. Water is safe for your fish.';
  let summaryHi = 'पानी के सभी मानक सुरक्षित दायरे में हैं। आपकी मछलियों के लिए पानी एकदम अनुकूल है।';

  if (overallStatus === 'danger') {
    headlineEn = `🔴 ${problems.length || 1} problem${problems.length > 1 ? 's' : ''} need attention`;
    headlineHi = `🔴 ${problems.length || 1} समस्या पर तुरंत ध्यान दें`;
    summaryEn = 'Critical water parameter breach detected. Take recommended actions immediately to protect fish.';
    summaryHi = 'पानी में गंभीर गड़बड़ी मिली है। मछलियों के बचाव के लिए तुरंत कदम उठाएं।';
  } else if (overallStatus === 'watch') {
    headlineEn = `🟡 ${problems.length || 1} parameter near boundary`;
    headlineHi = `🟡 कुछ स्तर सीमा के करीब हैं`;
    summaryEn = 'Oxygen dipped slightly earlier but is recovering. Keep aerator on standby.';
    summaryHi = 'ऑक्सीजन थोड़ी कम हुई थी लेकिन अब सुधर रही है। एरेटर तैयार रखें।';
  }

  return {
    dateStr: todayStr,
    overallStatus,
    headlineEn,
    headlineHi,
    summaryEn,
    summaryHi,
    problemsCount: problems.length,
    problems,
    parameters: {
      oxygen,
      temp,
      ph,
      ammonia
    },
    hasData: true
  };
}

