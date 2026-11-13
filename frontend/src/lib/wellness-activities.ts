import type {
  AIInsight,
  CognitiveTestResult,
  ConversationEntry,
  DailyCheckin,
  Experiment,
  ExerciseSession,
  HabitLog,
  LifestyleEntry,
  PostureSnapshot,
  ReadinessRecord,
  TimelineEvent,
  WearableData,
  WellnessActivity,
} from '../types/health-lab';

function fallbackTimestamp(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return new Date(0).toISOString();
  const [, year, month, day] = match;
  const timestamp = new Date(Number(year), Number(month) - 1, Number(day), 12);
  return Number.isNaN(timestamp.getTime()) ? new Date(0).toISOString() : timestamp.toISOString();
}

function timestampOrDate(timestamp: string | undefined, date: string): Pick<WellnessActivity, 'timestamp' | 'timePrecision'> {
  if (timestamp && !Number.isNaN(new Date(timestamp).getTime())) {
    return { timestamp, timePrecision: 'exact' };
  }
  return { timestamp: fallbackTimestamp(date), timePrecision: 'date_only' };
}

interface WellnessActivityInput {
  sessions: ExerciseSession[];
  checkins: DailyCheckin[];
  habitLogs: HabitLog[];
  cognitives: CognitiveTestResult[];
  wearables: WearableData[];
  lifestyles: LifestyleEntry[];
  postureSnapshots: PostureSnapshot[];
  conversations: ConversationEntry[];
  insights: AIInsight[];
  experiments: Experiment[];
  timeline: TimelineEvent[];
  readinessRecords: ReadinessRecord[];
}

/** Build a chronological feed from existing Health Lab records without persisting duplicate activity rows. */
export function buildWellnessActivities(input: WellnessActivityInput): WellnessActivity[] {
  const activities: WellnessActivity[] = [];

  input.readinessRecords.forEach(record => activities.push({
    id: record.id,
    activityType: 'readiness_assessment',
    source: 'health_lab',
    timestamp: record.timestamp,
    timePrecision: 'exact',
    title: 'Daily readiness',
    summary: `${record.score}/100 · ${record.category} readiness`,
    data: { ...record },
  }));

  input.sessions.forEach(session => {
    const duration = session.durationSeconds < 60
      ? `${session.durationSeconds} sec`
      : `${Math.round(session.durationSeconds / 60)} min`;
    const metricLabels: Record<string, string> = {
      best_hold_seconds: 'Best hold',
      last_rep_tempo_s: 'Last rep tempo',
      last_rep_depth_deg: 'Last rep depth',
      last_rep_symmetry: 'Last rep symmetry',
      elbow_angle: 'Elbow angle',
      torso_angle: 'Torso angle',
    };
    const performance = Object.entries(session.metrics)
      .filter(([key, value]) => metricLabels[key] && typeof value === 'number')
      .slice(0, 2)
      .map(([key, value]) => `${metricLabels[key]} ${Math.round((value as number) * 10) / 10}${key.endsWith('_seconds') || key.endsWith('_s') ? 's' : '°'}`);
    activities.push({
      id: session.id,
      activityType: 'workout_session',
      source: session.source,
      timestamp: session.completedAt,
      timePrecision: 'exact',
      title: session.exercise,
      summary: `${session.repCount} reps · ${duration}${session.formConsistencyScore == null ? '' : ` · ${Math.round(session.formConsistencyScore)}% form consistency`}${performance.length ? ` · ${performance.join(' · ')}` : ''}${session.detectedFormIssues.length ? ` · ${session.detectedFormIssues.length} form cue${session.detectedFormIssues.length === 1 ? '' : 's'}` : ''}${session.completionStatus === 'interrupted' ? ' · interrupted' : ''}`,
      data: { ...session },
    });
  });

  input.checkins.forEach(checkin => activities.push({
    id: `checkin:${checkin.date}`,
    activityType: 'daily_checkin',
    source: 'health_lab',
    ...timestampOrDate(checkin.completedAt, checkin.date),
    title: 'Daily wellness check-in',
    summary: `Mood ${checkin.mood}/5 · Energy ${checkin.energy}/5 · Sleep ${checkin.sleepQuality}/5`,
    data: { ...checkin },
  }));

  input.habitLogs.forEach(log => Object.entries(log.habits).filter(([, completed]) => completed).forEach(([habitId]) => activities.push({
    id: `habit:${log.date}:${habitId}`,
    activityType: 'habit_completion',
    source: 'health_lab',
    ...timestampOrDate(log.updatedAt, log.date),
    title: 'Habit completed',
    summary: habitId.replaceAll('_', ' '),
    data: { date: log.date, habitId, completed: true },
  })));

  input.cognitives.forEach(result => activities.push({
    id: `cognitive:${result.id}`,
    activityType: 'cognitive_test',
    source: 'health_lab',
    ...timestampOrDate(result.completedAt, result.date),
    title: `${result.testType.replaceAll('_', ' ')} assessment`,
    summary: `Score ${Math.round(result.score)}/100 · ${Math.round(result.durationMs / 1000)} sec`,
    data: { ...result },
  }));

  input.wearables.forEach(entry => activities.push({
    id: `wearable:${entry.source}:${entry.date}`,
    activityType: 'wearable_entry',
    source: entry.source === 'manual' ? 'manual' : 'wearable',
    ...timestampOrDate(entry.recordedAt, entry.date),
    title: `${entry.source.replaceAll('_', ' ')} data recorded`,
    summary: [entry.steps == null ? null : `${entry.steps.toLocaleString()} steps`, entry.sleepHours == null ? null : `${entry.sleepHours} hours sleep`, entry.heartRateResting == null ? null : `${entry.heartRateResting} bpm resting HR`].filter(Boolean).join(' · ') || 'Wellness data added',
    data: { ...entry },
  }));

  input.lifestyles.forEach(entry => activities.push({
    id: `lifestyle:${entry.date}`,
    activityType: 'lifestyle_entry',
    source: 'health_lab',
    ...timestampOrDate(entry.completedAt, entry.date),
    title: 'Lifestyle log completed',
    summary: `Water: ${entry.waterIntake.replaceAll('_', ' ')} · Outdoors: ${entry.outdoorTime.replaceAll('_', ' ')}`,
    data: { ...entry },
  }));

  input.postureSnapshots.forEach((snapshot, index) => activities.push({
    id: `posture:${snapshot.date}:${snapshot.time}:${index}`,
    activityType: 'posture_snapshot',
    source: 'health_lab',
    ...timestampOrDate(snapshot.time ? `${snapshot.date}T${snapshot.time}` : undefined, snapshot.date),
    title: 'Posture assessment',
    summary: snapshot.postureScore == null ? 'Posture snapshot recorded' : `Posture score ${Math.round(snapshot.postureScore)}/100`,
    data: { ...snapshot },
  }));

  input.conversations.forEach(entry => activities.push({
    id: `conversation:${entry.id}`,
    activityType: 'conversation',
    source: 'health_lab',
    ...timestampOrDate(entry.timestamp, entry.date),
    title: 'Wellness conversation',
    summary: entry.answer,
    data: { ...entry },
  }));

  input.insights.forEach(insight => activities.push({
    id: `insight:${insight.id}`,
    activityType: 'insight',
    source: 'health_lab',
    ...timestampOrDate(insight.generatedAt, insight.weekStarting),
    title: insight.title,
    summary: insight.body,
    data: { ...insight },
  }));

  const experimentsWithTimelineEvents = new Set(input.timeline
    .filter(event => event.type === 'experiment_started' || event.type === 'experiment_completed' || event.type === 'experiment_failed')
    .map(event => event.metadata?.experimentId)
    .filter((id): id is string => typeof id === 'string'));
  input.experiments.filter(experiment => !experimentsWithTimelineEvents.has(experiment.id)).forEach(experiment => activities.push({
    id: `experiment:${experiment.id}`,
    activityType: 'experiment',
    source: 'health_lab',
    ...timestampOrDate(experiment.createdAt, experiment.startDate || experiment.endDate || ''),
    title: 'Personal experiment',
    summary: `${experiment.hypothesis} · ${experiment.status}`,
    data: { ...experiment },
  }));

  const persistedWorkoutKeys = new Set(input.sessions.map(session => `${session.date}|${session.exercise}|${session.repCount}`));
  input.timeline.filter(event => event.type === 'exercise_session_completed').forEach(event => {
    const exercise = typeof event.metadata?.exercise === 'string' ? event.metadata.exercise : 'Workout session';
    const repCount = typeof event.metadata?.repCount === 'number' ? event.metadata.repCount : null;
    const legacyKey = `${event.date}|${exercise}|${repCount}`;
    if (persistedWorkoutKeys.has(legacyKey)) return;
    activities.push({
      id: `legacy-workout-event:${event.id}`,
      activityType: 'workout_session',
      source: 'live_exercise_coaching',
      ...timestampOrDate(event.createdAt, event.date),
      title: exercise,
      summary: event.description || 'Workout session recorded',
      data: { ...event.metadata, legacyTimelineEventId: event.id, completionStatus: 'completed' },
    });
  });

  input.timeline.filter(event => event.type !== 'exercise_session_completed').forEach(event => activities.push({
    id: `event:${event.id}`,
    activityType: 'timeline_event',
    source: 'health_lab',
    ...timestampOrDate(event.createdAt, event.date),
    title: event.title,
    summary: event.description,
    data: { ...event },
  }));

  return activities.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
