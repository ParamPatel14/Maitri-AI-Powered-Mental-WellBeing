import type {
  DailyCheckin, ExerciseSession, ReadinessCategory, ReadinessFactor,
  ReadinessInput, ReadinessRecord, WearableData,
} from '../types/health-lab';

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const rating = (value: number) => clamp(((value - 1) / 4) * 100);
const inverseRating = (value: number) => 100 - rating(value);
const hoursScore = (hours: number) => clamp(100 - Math.abs(hours - 8) * 18);

export interface DailyReadiness {
  score: number | null;
  category: ReadinessCategory | 'incomplete';
  factors: ReadinessFactor[];
  missingInputs: string[];
  recommendation: string;
  assessmentKey: string;
  inputs: Record<string, number | string | null>;
}

/** Deterministic, local readiness calculation. `asOf` makes its time window reproducible. */
export function calculateDailyReadiness(params: {
  date: string;
  asOf: string;
  checkin?: DailyCheckin | null;
  readinessInput?: ReadinessInput | null;
  wearables?: WearableData[];
  sessions: ExerciseSession[];
}): DailyReadiness {
  const { date, asOf, checkin, readinessInput, sessions } = params;
  const asOfMs = new Date(asOf).getTime();
  const validAsOf = Number.isFinite(asOfMs) ? asOfMs : 0;
  const todayWearables = (params.wearables ?? []).filter(item => item.date === date);
  const wearableSleep = todayWearables.find(item => item.sleepHours != null)?.sleepHours;
  const values = {
    sleepDurationHours: wearableSleep ?? readinessInput?.sleepDurationHours ?? null,
    sleepQuality: checkin?.sleepQuality ?? readinessInput?.sleepQuality ?? null,
    energy: checkin?.energy ?? readinessInput?.energy ?? null,
    fatigue: readinessInput?.fatigue ?? null,
    mood: checkin?.mood ?? readinessInput?.mood ?? null,
  };
  const missingInputs: string[] = [];
  if (values.sleepDurationHours == null) missingInputs.push('sleep duration');
  if (values.sleepQuality == null) missingInputs.push('sleep quality');
  if (values.energy == null) missingInputs.push('energy');
  if (values.fatigue == null) missingInputs.push('fatigue');
  if (values.mood == null) missingInputs.push('mood');

  const recentSessions = sessions.filter(session => {
    const time = new Date(session.completedAt).getTime();
    return Number.isFinite(time) && time <= validAsOf && validAsOf - time <= 48 * 60 * 60 * 1000;
  });
  const sessionMinutes = recentSessions.reduce((sum, session) => sum + Math.max(0, session.durationSeconds) / 60, 0);
  const reportedMinutes = readinessInput?.recentActivityMinutes;
  const wearableMinutes = todayWearables.find(item => item.activeMinutes != null)?.activeMinutes;
  const activityMinutes = reportedMinutes ?? (recentSessions.length ? sessionMinutes : wearableMinutes ?? null);
  const activitySource = reportedMinutes != null ? 'User reported' : recentSessions.length ? 'Exercise session history · past 48 hours' : wearableMinutes != null ? 'Wearable' : null;

  const valuesText = (value: number | null, suffix = '') => value == null ? 'Not recorded' : `${value}${suffix}`;
  const factors: ReadinessFactor[] = [
    { key: 'sleep', label: 'Sleep', value: values.sleepDurationHours == null ? 'Duration missing' : `${values.sleepDurationHours.toFixed(1)} h · quality ${values.sleepQuality ?? 'missing'}/5`, normalizedScore: values.sleepDurationHours == null || values.sleepQuality == null ? null : (hoursScore(values.sleepDurationHours) + rating(values.sleepQuality)) / 2, weight: 25, contribution: null, source: wearableSleep != null ? 'Wearable duration + check-in quality' : 'Check-in / readiness check-in' },
    { key: 'energy', label: 'Energy', value: valuesText(values.energy, '/5'), normalizedScore: values.energy == null ? null : rating(values.energy), weight: 25, contribution: null, source: checkin ? 'Daily check-in' : 'Readiness check-in' },
    { key: 'fatigue', label: 'Fatigue', value: valuesText(values.fatigue, '/5'), normalizedScore: values.fatigue == null ? null : inverseRating(values.fatigue), weight: 25, contribution: null, source: 'Readiness check-in' },
    { key: 'mood', label: 'Mood', value: valuesText(values.mood, '/5'), normalizedScore: values.mood == null ? null : rating(values.mood), weight: 10, contribution: null, source: checkin ? 'Daily check-in' : 'Readiness check-in' },
  ];
  if (activityMinutes == null) missingInputs.push('recent activity');
  factors.push({
    key: 'activity', label: 'Recent activity & recovery',
    value: activityMinutes == null ? 'No recent activity data' : `${Math.round(activityMinutes)} min in past 48 h`,
    // A workout adds context, not a penalty. Recent load has a deliberately mild effect;
    // the fatigue factor is the stronger user-reported recovery signal.
    normalizedScore: activityMinutes == null ? null : clamp(100 - Math.max(0, activityMinutes - 30) * 0.25),
    weight: 15, contribution: null, source: activitySource ?? 'Missing',
  });

  const essentialComplete = missingInputs.every(item => item === 'recent activity');
  const available = factors.filter(factor => factor.normalizedScore != null);
  const totalWeight = available.reduce((sum, factor) => sum + factor.weight, 0);
  const score = essentialComplete && totalWeight > 0
    ? Math.round(available.reduce((sum, factor) => sum + (factor.normalizedScore ?? 0) * factor.weight, 0) / totalWeight)
    : null;
  const category: DailyReadiness['category'] = score == null ? 'incomplete' : score >= 80 ? 'high' : score >= 50 ? 'moderate' : 'low';
  const adjustedFactors = factors.map(factor => ({
    ...factor,
    contribution: score == null || factor.normalizedScore == null ? null : factor.normalizedScore * factor.weight / totalWeight,
  }));
  const recommendation = category === 'high'
    ? 'Follow your planned workout. Keep your usual intensity; readiness is not a reason to increase it.'
    : category === 'moderate'
      ? 'Consider a shorter or lighter session, use lower-intensity options, and take breaks as needed.'
      : category === 'low'
        ? 'Consider rest or gentle mobility today. Avoid high-intensity exercise if that feels right for you.'
        : 'Complete the short readiness check-in to see a personalized workout suggestion.';
  const inputs: Record<string, number | string | null> = {
    date, sleepDurationHours: values.sleepDurationHours, sleepQuality: values.sleepQuality,
    energy: values.energy, fatigue: values.fatigue, mood: values.mood,
    recentActivityMinutes: activityMinutes, recentSessionCount: recentSessions.length,
    recentSessionIds: recentSessions.map(item => item.id).sort().join(','),
  };
  const assessmentKey = JSON.stringify(inputs);
  return { score, category, factors: adjustedFactors, missingInputs, recommendation, assessmentKey, inputs };
}

export function toReadinessRecord(assessment: DailyReadiness, timestamp: string): ReadinessRecord | null {
  if (assessment.score == null || assessment.category === 'incomplete') return null;
  return {
    id: `readiness:${assessment.assessmentKey}`,
    assessmentKey: assessment.assessmentKey,
    date: String(assessment.inputs.date), timestamp, score: assessment.score,
    category: assessment.category, factors: assessment.factors.map(factor => ({ ...factor })),
    inputs: { ...assessment.inputs }, missingInputs: [...assessment.missingInputs],
    recommendation: assessment.recommendation,
  };
}
