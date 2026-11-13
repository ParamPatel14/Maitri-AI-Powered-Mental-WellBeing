import type {
  DailyCheckin, ExerciseSession, HabitLog, ReadinessInput,
  UserProfile, WearableData, WellnessActivity,
} from '../types/health-lab';
import { calculateDailyReadiness, type DailyReadiness } from './readiness';

export interface WellnessTodaySummary {
  readiness: DailyReadiness;
  energy: number | null;
  mood: number | null;
  lastWorkout: ExerciseSession | null;
  recentPerformance: ExerciseSession[];
  completedHabits: number;
  trackedHabits: number;
  habitCompletionPercent: number | null;
  recentActivities: WellnessActivity[];
  suggestion: string;
}

export function buildWellnessToday(params: {
  date: string;
  asOf: string;
  checkins: DailyCheckin[];
  readinessInputs: ReadinessInput[];
  wearables: WearableData[];
  sessions: ExerciseSession[];
  habitLog?: HabitLog | null;
  profile?: UserProfile | null;
  activities: WellnessActivity[];
}): WellnessTodaySummary {
  const checkin = params.checkins.find(item => item.date === params.date) ?? null;
  const readinessInput = params.readinessInputs.find(item => item.date === params.date) ?? null;
  const readiness = calculateDailyReadiness({
    date: params.date,
    asOf: params.asOf,
    checkin,
    readinessInput,
    wearables: params.wearables,
    sessions: params.sessions,
  });
  const sessions = [...params.sessions]
    .filter(session => session.completionStatus === 'completed')
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const tracked = params.profile?.trackedHabits ?? [];
  const completed = tracked.filter(id => Boolean(params.habitLog?.habits[id])).length;
  const recentActivities = [...params.activities].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 3);

  return {
    readiness,
    energy: checkin?.energy ?? readinessInput?.energy ?? null,
    mood: checkin?.mood ?? readinessInput?.mood ?? null,
    lastWorkout: sessions[0] ?? null,
    recentPerformance: sessions.slice(0, 3),
    completedHabits: completed,
    trackedHabits: tracked.length,
    habitCompletionPercent: tracked.length > 0 ? Math.round((completed / tracked.length) * 100) : null,
    recentActivities,
    suggestion: readiness.recommendation,
  };
}
