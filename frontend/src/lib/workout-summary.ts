import type { ExerciseSession } from '../types/health-lab';

export interface ExerciseSessionDraft {
  id: string;
  exercise: string;
  startedAt: number;
  goalMode: ExerciseSession['goalMode'];
  patientName: string | null;
  issueFrameCounts: Record<string, number>;
  latestMetrics: Record<string, number | string | boolean>;
}

/** Create a compact Health Lab session record from one finalized coaching session. */
export function createExerciseSessionSummary(params: {
  session: ExerciseSessionDraft;
  completedAtMs: number;
  date: string;
  completionStatus: ExerciseSession['completionStatus'];
  repCount: number;
}): ExerciseSession {
  const { session, completedAtMs, date, completionStatus, repCount } = params;
  const completedAt = new Date(completedAtMs).toISOString();
  const score = session.latestMetrics.session_score ?? session.latestMetrics.good_rep_percent;
  return {
    id: session.id,
    activityType: 'workout_session',
    source: 'live_exercise_coaching',
    date,
    exercise: session.exercise,
    startedAt: new Date(session.startedAt).toISOString(),
    completedAt,
    durationSeconds: Math.max(0, Math.round((completedAtMs - session.startedAt) / 1000)),
    repCount: Math.max(0, repCount),
    formConsistencyScore: repCount > 0 && typeof score === 'number' ? score : null,
    detectedFormIssues: Object.entries(session.issueFrameCounts).map(([name, frameCount]) => ({ name, frameCount })),
    completionStatus,
    metrics: { ...session.latestMetrics },
    goalMode: session.goalMode,
    patientName: session.patientName,
  };
}
