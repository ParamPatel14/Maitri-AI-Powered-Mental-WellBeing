/**
 * baseline.ts
 * ───────────
 * Personal baseline engine. Computes "what is normal for this user"
 * from their own data, not generic population averages.
 *
 * Baselines improve as more data is collected.
 * Outliers are excluded using configurable thresholds.
 */

import type {
  DailyCheckin,
  WearableData,
  LifestyleEntry,
  CognitiveTestResult,
  PersonalBaseline,
  BaselineMetric,
  BaselineConfig,
} from '../types/health-lab';
import { today, getLastNDays } from './date-utils';

const DEFAULT_CONFIG: BaselineConfig = {
  minDaysForBaseline: 5,
  outlierThreshold: 2,     // 2 standard deviations
  trendWindow: 14,
};

// ── Math Helpers ───────────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const low = Math.floor(idx);
  const high = Math.ceil(idx);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (idx - low);
}

function removeOutliers(arr: number[], threshold: number): number[] {
  if (arr.length < 4) return arr;
  const m = mean(arr);
  const s = std(arr);
  if (s === 0) return arr;
  return arr.filter(x => Math.abs(x - m) <= threshold * s);
}

function detectTrend(values: number[]): 'improving' | 'stable' | 'declining' | 'insufficient' {
  if (values.length < 4) return 'insufficient';
  const half = Math.floor(values.length / 2);
  const firstHalf = mean(values.slice(0, half));
  const secondHalf = mean(values.slice(half));
  const diff = secondHalf - firstHalf;
  const overallStd = std(values);
  if (overallStd === 0) return 'stable';
  const zScore = diff / (overallStd / Math.sqrt(half));
  if (zScore > 1.0) return 'improving';
  if (zScore < -1.0) return 'declining';
  return 'stable';
}

function getStatus(deviation: number | null): BaselineMetric['status'] {
  if (deviation === null) return 'no_data';
  const abs = Math.abs(deviation);
  if (abs <= 0.5) return 'normal';
  if (abs <= 1.0) return deviation < 0 ? 'slightly_low' : 'slightly_high';
  return deviation < 0 ? 'low' : 'high';
}

// ── Extract Time Series ────────────────────────────────────────────────────────

function extractCheckinMetrics(checkins: DailyCheckin[]): Record<string, number[]> {
  const metrics: Record<string, number[]> = {};
  const keys: (keyof DailyCheckin)[] = ['mood', 'energy', 'sleepQuality', 'stressLevel'];

  for (const key of keys) {
    metrics[key] = checkins
      .map(c => c[key])
      .filter((v): v is number => typeof v === 'number');
  }

  return metrics;
}

function extractWearableMetrics(wearables: WearableData[]): Record<string, number[]> {
  const metrics: Record<string, number[]> = {};
  const numericKeys: (keyof WearableData)[] = [
    'heartRateResting', 'heartRateAvg', 'steps', 'sleepHours',
    'caloriesBurned', 'activeMinutes', 'bloodOxygen', 'stressScore',
    'hrv', 'bodyBattery',
  ];

  for (const key of numericKeys) {
    metrics[key] = wearables
      .map(w => w[key])
      .filter((v): v is number => typeof v === 'number' && v !== null);
  }

  return metrics;
}

function extractLifestyleMetrics(lifestyles: LifestyleEntry[]): Record<string, number[]> {
  const metrics: Record<string, number[]> = {};

  // Map categorical to numeric for analysis
  const caffeineMap = { none: 0, '1-2': 1.5, '3-4': 3.5, '5+': 5 };
  const alcoholMap = { none: 0, '1-2': 1.5, '3+': 3 };
  const regularityMap = { skipped_meals: 0, irregular: 1, mostly_regular: 2, very_regular: 3 };
  const waterMap = { low: 0, moderate: 1, high: 2 };
  const outdoorMap = { none: 0, less_30m: 0.5, '30m_1h': 1, '1h_plus': 2 };
  const socialMap = { none: 0, minimal: 1, moderate: 2, high: 3 };
  const screenMap = { none: 0, less_30m: 0.5, '30m_1h': 1, '1h_plus': 2 };
  const workMap = { none: 0, light: 1, moderate: 2, heavy: 3 };

  metrics.caffeine = lifestyles.map(l => caffeineMap[l.caffeineIntake] ?? 0);
  metrics.alcohol = lifestyles.map(l => alcoholMap[l.alcoholIntake] ?? 0);
  metrics.mealRegularity = lifestyles.map(l => regularityMap[l.mealRegularity] ?? 1);
  metrics.waterIntake = lifestyles.map(l => waterMap[l.waterIntake] ?? 1);
  metrics.outdoorTime = lifestyles.map(l => outdoorMap[l.outdoorTime] ?? 0);
  metrics.socialLevel = lifestyles.map(l => socialMap[l.socialInteraction] ?? 1);
  metrics.screenBeforeBed = lifestyles.map(l => screenMap[l.screenTimeBeforeBed] ?? 1);
  metrics.workLoad = lifestyles.map(l => workMap[l.WorkHours] ?? 1);

  return metrics;
}

function extractCognitiveMetrics(tests: CognitiveTestResult[]): Record<string, number[]> {
  const metrics: Record<string, number[]> = {};

  // Group by test type and compute average score
  const byType: Record<string, number[]> = {};
  for (const t of tests) {
    if (!byType[t.testType]) byType[t.testType] = [];
    byType[t.testType].push(t.score);
  }

  for (const [type, scores] of Object.entries(byType)) {
    metrics[`cognitive_${type}`] = scores;
  }

  // Also extract raw metrics if available
  for (const t of tests) {
    for (const [key, val] of Object.entries(t.rawMetrics)) {
      const metricKey = `cognitive_${t.testType}_${key}`;
      if (!metrics[metricKey]) metrics[metricKey] = [];
      metrics[metricKey].push(val);
    }
  }

  return metrics;
}

// ── Metric Labels & Units ──────────────────────────────────────────────────────

const METRIC_META: Record<string, { label: string; unit: string }> = {
  mood: { label: 'Mood', unit: '/5' },
  energy: { label: 'Energy Level', unit: '/5' },
  sleepQuality: { label: 'Sleep Quality', unit: '/5' },
  stressLevel: { label: 'Stress Level', unit: '/5' },
  heartRateResting: { label: 'Resting Heart Rate', unit: 'bpm' },
  heartRateAvg: { label: 'Avg Heart Rate', unit: 'bpm' },
  steps: { label: 'Daily Steps', unit: 'steps' },
  sleepHours: { label: 'Sleep Duration', unit: 'hrs' },
  caloriesBurned: { label: 'Calories Burned', unit: 'kcal' },
  activeMinutes: { label: 'Active Minutes', unit: 'min' },
  bloodOxygen: { label: 'Blood Oxygen', unit: '%' },
  stressScore: { label: 'Device Stress', unit: '/100' },
  hrv: { label: 'Heart Rate Var.', unit: 'ms' },
  bodyBattery: { label: 'Body Battery', unit: '/100' },
  caffeine: { label: 'Caffeine Intake', unit: 'cups' },
  alcohol: { label: 'Alcohol Intake', unit: 'drinks' },
  mealRegularity: { label: 'Meal Regularity', unit: '/3' },
  waterIntake: { label: 'Water Intake', unit: '/2' },
  outdoorTime: { label: 'Outdoor Time', unit: 'hrs' },
  socialLevel: { label: 'Social Interaction', unit: '/3' },
  screenBeforeBed: { label: 'Screen Before Bed', unit: 'hrs' },
  workLoad: { label: 'Work Load', unit: '/3' },
  cognitive_reaction_time: { label: 'Reaction Time', unit: '/100' },
  cognitive_working_memory: { label: 'Working Memory', unit: '/100' },
  cognitive_sustained_attention: { label: 'Sustained Attention', unit: '/100' },
  cognitive_digit_span: { label: 'Digit Span', unit: '/100' },
};

// ── Main Baseline Computation ──────────────────────────────────────────────────

export function computeBaseline(params: {
  checkins: DailyCheckin[];
  wearables: WearableData[];
  lifestyles: LifestyleEntry[];
  cognitives: CognitiveTestResult[];
  config?: Partial<BaselineConfig>;
}): PersonalBaseline {
  const config = { ...DEFAULT_CONFIG, ...params.config };
  const today_ = today();

  // Gather all metrics
  const allMetrics: Record<string, number[]> = {
    ...extractCheckinMetrics(params.checkins),
    ...extractWearableMetrics(params.wearables),
    ...extractLifestyleMetrics(params.lifestyles),
    ...extractCognitiveMetrics(params.cognitives),
  };

  // Build today's values from checkins
  const todayCheckin = params.checkins.find(c => c.date === today_);
  const todayWearable = params.wearables.find(w => w.date === today_);
  const todayLifestyle = params.lifestyles.find(l => l.date === today_);

  const todayValues: Record<string, number | null> = {};
  if (todayCheckin) {
    todayValues.mood = todayCheckin.mood;
    todayValues.energy = todayCheckin.energy;
    todayValues.sleepQuality = todayCheckin.sleepQuality;
    todayValues.stressLevel = todayCheckin.stressLevel;
  }
  if (todayWearable) {
    todayValues.heartRateResting = todayWearable.heartRateResting;
    todayValues.steps = todayWearable.steps;
    todayValues.sleepHours = todayWearable.sleepHours;
    todayValues.hrv = todayWearable.hrv;
    todayValues.bodyBattery = todayWearable.bodyBattery;
  }
  if (todayLifestyle) {
    todayValues.caffeine = { none: 0, '1-2': 1.5, '3-4': 3.5, '5+': 5 }[todayLifestyle.caffeineIntake];
    todayValues.outdoorTime = { none: 0, less_30m: 0.5, '30m_1h': 1, '1h_plus': 2 }[todayLifestyle.outdoorTime];
  }

  // Compute baseline for each metric
  const metrics: BaselineMetric[] = [];

  for (const [key, values] of Object.entries(allMetrics)) {
    if (values.length === 0) continue;

    const cleaned = removeOutliers(values, config.outlierThreshold);
    const p = cleaned.length >= config.minDaysForBaseline ? cleaned : values;
    const m = METRIC_META[key] || { label: key, unit: '' };

    const personalAvg = mean(p);
    const personalStd = std(p);
    const todayVal = todayValues[key] ?? null;
    const deviation = todayVal !== null && personalStd > 0
      ? (todayVal - personalAvg) / personalStd
      : null;

    // Determine trend from recent data
    const recentDays = getLastNDays(config.trendWindow);
    const recentValues = params.checkins
      .filter(c => recentDays.includes(c.date))
      .map(c => (c as Record<string, unknown>)[key] as number)
      .filter(v => typeof v === 'number');
    const trend = recentValues.length >= 4 ? detectTrend(recentValues) : 'insufficient';

    metrics.push({
      key,
      label: m.label,
      unit: m.unit,
      personalAvg: Math.round(personalAvg * 100) / 100,
      personalMin: Math.round(percentile(p, 10) * 100) / 100,
      personalMax: Math.round(percentile(p, 90) * 100) / 100,
      personalStd: Math.round(personalStd * 100) / 100,
      todayValue: todayVal,
      deviation,
      status: getStatus(deviation),
      dataPoints: values.length,
      trend,
    });
  }

  // Sort: core checkin metrics first, then wearable, then lifestyle, then cognitive
  const sortOrder = ['mood', 'energy', 'sleepQuality', 'stressLevel', 'heartRateResting', 'steps', 'sleepHours'];
  metrics.sort((a, b) => {
    const ai = sortOrder.indexOf(a.key);
    const bi = sortOrder.indexOf(b.key);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.label.localeCompare(b.label);
  });

  // Readiness score: based on how many metrics have enough data
  const metricsWithEnoughData = metrics.filter(m => m.dataPoints >= config.minDaysForBaseline).length;
  const readinessScore = metrics.length > 0
    ? Math.round((metricsWithEnoughData / metrics.length) * 100)
    : null;

  // Find date range
  const allDates = [
    ...params.checkins.map(c => c.date),
    ...params.wearables.map(w => w.date),
    ...params.lifestyles.map(l => l.date),
  ].sort();

  return {
    version: 1,
    computedAt: new Date().toISOString(),
    dataRange: {
      from: allDates[0] || today_,
      to: allDates[allDates.length - 1] || today_,
    },
    totalDays: new Set(allDates).size,
    metrics,
    readinessScore,
  };
}

// ── Get summary text for a metric ──────────────────────────────────────────────

export function getMetricSummary(metric: BaselineMetric): string {
  if (metric.status === 'no_data') return `No data for ${metric.label}`;
  if (metric.status === 'normal') return `${metric.label} is in your normal range`;
  if (metric.status === 'slightly_low') return `${metric.label} is slightly below your norm`;
  if (metric.status === 'low') return `${metric.label} is notably below your norm`;
  if (metric.status === 'slightly_high') return `${metric.label} is slightly above your norm`;
  if (metric.status === 'high') return `${metric.label} is notably above your norm`;
  return '';
}

export function getDeviationEmoji(status: BaselineMetric['status']): string {
  switch (status) {
    case 'normal': return '';
    case 'slightly_low': return '';
    case 'low': return '';
    case 'slightly_high': return '';
    case 'high': return '';
    case 'no_data': return '';
  }
}

export function getTrendLabel(trend: BaselineMetric['trend']): string {
  switch (trend) {
    case 'improving': return 'Trending up';
    case 'stable': return 'Stable';
    case 'declining': return 'Trending down';
    case 'insufficient': return 'Need more data';
  }
}
