import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

let vite;
let readiness;
let storage;
let wellnessActivities;
let wellnessToday;
let workoutSummary;
let healthLabContext;
let DashboardPage;
let TimelinePage;
let DailyReadinessCard;
let aiService;
let today;

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

globalThis.localStorage = new MemoryStorage();

before(async () => {
  vite = await createServer({
    configFile: 'vite.config.ts',
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
  });
  [readiness, storage, wellnessActivities, wellnessToday, workoutSummary, healthLabContext, aiService] = await Promise.all([
    vite.ssrLoadModule('/src/lib/readiness.ts'),
    vite.ssrLoadModule('/src/lib/storage.ts'),
    vite.ssrLoadModule('/src/lib/wellness-activities.ts'),
    vite.ssrLoadModule('/src/lib/wellness-today.ts'),
    vite.ssrLoadModule('/src/lib/workout-summary.ts'),
    vite.ssrLoadModule('/src/context/HealthLabContext.tsx'),
    vite.ssrLoadModule('/src/lib/ai-service.ts'),
  ]);
  ({ today } = await vite.ssrLoadModule('/src/lib/date-utils.ts'));
  ({ DashboardPage } = await vite.ssrLoadModule('/src/components/health-lab/dashboard/DashboardPage.tsx'));
  ({ TimelinePage } = await vite.ssrLoadModule('/src/components/health-lab/timeline/TimelinePage.tsx'));
  ({ DailyReadinessCard } = await vite.ssrLoadModule('/src/components/health-lab/shared/DailyReadinessCard.tsx'));
});

after(async () => {
  await vite?.close();
});

function checkin(date) {
  return { date, mood: 4, energy: 4, sleepQuality: 4, stressLevel: 2, wentWell: null, wasHard: null, completedAt: `${date}T08:00:00.000Z` };
}

function sessionDraft(startedAt = Date.now() - 5 * 60_000) {
  return {
    id: 'workout-session-1', exercise: 'Push-ups', startedAt,
    goalMode: 'Strength', patientName: null,
    issueFrameCounts: { hip_sag: 2 },
    latestMetrics: { session_score: 87, last_rep_tempo_s: 2.4 },
  };
}

function seedStore() {
  localStorage.clear();
  const date = today();
  const now = Date.now();
  const workout = workoutSummary.createExerciseSessionSummary({
    session: sessionDraft(now - 5 * 60_000), completedAtMs: now, date,
    completionStatus: 'completed', repCount: 12,
  });
  const input = { date, sleepDurationHours: 8, fatigue: 1, recentActivityMinutes: 12, updatedAt: new Date(now).toISOString() };
  const score = readiness.calculateDailyReadiness({
    date, asOf: new Date(now).toISOString(), checkin: checkin(date), readinessInput: input,
    wearables: [], sessions: [workout],
  });
  const record = readiness.toReadinessRecord(score, new Date(now).toISOString());
  localStorage.setItem('maitri.healthlab', JSON.stringify({
    version: 5,
    profile: { id: 'p1', name: 'Ari', trackedHabits: ['walk', 'water'] },
    checkins: [checkin(date)],
    habitLogs: [{ date, habits: { walk: true, water: false }, updatedAt: new Date(now).toISOString() }],
    exerciseSessions: [workout],
    readinessInputs: [input],
    readinessRecords: record ? [record] : [],
    wearables: [], insights: [], experiments: [], cognitives: [], lifestyles: [],
    conversations: [], postureSnapshots: [], timeline: [], learnedInsights: [], dataSources: [],
  }));
  return { date, workout, record };
}

test('readiness requires essential inputs, reweights optional activity, and uses category recommendations', () => {
  const date = today();
  const asOf = new Date().toISOString();
  const full = readiness.calculateDailyReadiness({
    date, asOf, checkin: checkin(date),
    readinessInput: { date, sleepDurationHours: 8, fatigue: 1, recentActivityMinutes: 0, updatedAt: asOf },
    sessions: [], wearables: [],
  });
  assert.equal(full.category, 'high');
  assert.equal(full.score, 88);
  assert.match(full.recommendation, /usual intensity/);

  const moderate = readiness.calculateDailyReadiness({
    date, asOf, checkin: { ...checkin(date), mood: 3, energy: 3, sleepQuality: 3 },
    readinessInput: { date, sleepDurationHours: 8, fatigue: 3, updatedAt: asOf },
    sessions: [], wearables: [],
  });
  assert.equal(moderate.category, 'moderate');
  assert.match(moderate.recommendation, /shorter or lighter/);
  assert.ok(moderate.missingInputs.includes('recent activity'));

  const low = readiness.calculateDailyReadiness({
    date, asOf, checkin: { ...checkin(date), mood: 1, energy: 1, sleepQuality: 1 },
    readinessInput: { date, sleepDurationHours: 0, fatigue: 5, recentActivityMinutes: 500, updatedAt: asOf },
    sessions: [], wearables: [],
  });
  assert.equal(low.category, 'low');
  assert.match(low.recommendation, /rest or gentle mobility/);

  const missing = readiness.calculateDailyReadiness({ date, asOf, sessions: [], wearables: [] });
  assert.equal(missing.score, null);
  assert.equal(missing.category, 'incomplete');
  assert.ok(missing.missingInputs.includes('fatigue'));
  assert.ok(missing.factors.every(factor => factor.normalizedScore === null));
});

test('workout summaries preserve meaningful metrics and Health Lab storage migrates older records safely', () => {
  const date = today();
  const startedAt = Date.now() - 60_000;
  const summary = workoutSummary.createExerciseSessionSummary({
    session: sessionDraft(startedAt), completedAtMs: startedAt + 30_000, date,
    completionStatus: 'completed', repCount: 12,
  });
  assert.equal(summary.durationSeconds, 30);
  assert.equal(summary.formConsistencyScore, 87);
  assert.deepEqual(summary.detectedFormIssues, [{ name: 'hip_sag', frameCount: 2 }]);
  assert.equal(summary.metrics.last_rep_tempo_s, 2.4);

  localStorage.setItem('maitri.healthlab', JSON.stringify({
    version: 4,
    exerciseSessions: [{ id: 'legacy', date, exercise: 'Squats', startedAt: new Date(startedAt).toISOString(), completedAt: new Date(startedAt + 1_000).toISOString(), sessionScore: 76 }],
  }));
  const migrated = storage.loadStore();
  assert.equal(migrated.version, 5);
  assert.equal(migrated.exerciseSessions[0].formConsistencyScore, 76);
  assert.deepEqual(migrated.readinessInputs, []);
  assert.deepEqual(migrated.readinessRecords, []);

  localStorage.clear();
  storage.saveExerciseSession(summary);
  storage.saveExerciseSession({ ...summary, repCount: 99 });
  assert.equal(storage.getExerciseSessions().length, 1);

  const snapshot = { id: 'r1', assessmentKey: 'key-1', date, timestamp: new Date().toISOString(), score: 84, category: 'high', factors: [], inputs: {}, missingInputs: [], recommendation: 'Follow your plan' };
  storage.saveReadinessRecord(snapshot);
  storage.saveReadinessRecord({ ...snapshot, timestamp: new Date(Date.now() + 1000).toISOString(), score: 20, category: 'low' });
  assert.equal(storage.getReadinessRecords().length, 1);
  assert.equal(storage.getReadinessRecords()[0].score, 84);
});

test('wellness summary combines readiness, check-in, workout, habits, and activity from stored records', () => {
  const { date, workout } = seedStore();
  const activities = wellnessActivities.buildWellnessActivities({
    sessions: [workout], checkins: [checkin(date)], habitLogs: [{ date, habits: { walk: true, water: false } }],
    cognitives: [], wearables: [], lifestyles: [], postureSnapshots: [], conversations: [], insights: [],
    experiments: [], timeline: [], readinessRecords: [],
  });
  const summary = wellnessToday.buildWellnessToday({
    date, asOf: new Date().toISOString(), checkins: [checkin(date)],
    readinessInputs: [{ date, sleepDurationHours: 8, fatigue: 1, updatedAt: new Date().toISOString() }],
    wearables: [], sessions: [workout], habitLog: { date, habits: { walk: true, water: false } },
    profile: { trackedHabits: ['walk', 'water'] }, activities,
  });
  assert.equal(summary.readiness.category, 'high');
  assert.equal(summary.energy, 4);
  assert.equal(summary.mood, 4);
  assert.equal(summary.lastWorkout.id, workout.id);
  assert.equal(summary.habitCompletionPercent, 50);
  assert.ok(summary.recentActivities.some(activity => activity.activityType === 'workout_session'));
  assert.match(summary.suggestion, /usual intensity/);
});

test('dashboard and timeline render the unified wellness records and navigation', async () => {
  seedStore();
  const { HealthLabProvider } = healthLabContext;
  const dashboardMarkup = renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(HealthLabProvider, null, createElement(DashboardPage)),
  ));
  assert.match(dashboardMarkup, /MY WELLNESS TODAY/);
  assert.match(dashboardMarkup, /Start Exercise/);
  assert.match(dashboardMarkup, /Wellness Timeline/);
  assert.match(dashboardMarkup, /Readiness Details/);
  assert.match(dashboardMarkup, /12 reps/);
  assert.match(dashboardMarkup, /Habit progress today/);
  assert.match(dashboardMarkup, /A suggestion for today/);

  const timelineMarkup = renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(HealthLabProvider, null, createElement(TimelinePage)),
  ));
  assert.match(timelineMarkup, /Wellness Timeline/);
  assert.match(timelineMarkup, /Push-ups/);
  assert.match(timelineMarkup, /Live Coaching/);
  assert.match(timelineMarkup, /Daily wellness check-in/);
});

test('readiness check-in rendering identifies missing essentials instead of showing a fabricated score', () => {
  localStorage.clear();
  const { HealthLabProvider } = healthLabContext;
  const markup = renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(HealthLabProvider, null, createElement(DailyReadinessCard)),
  ));
  assert.match(markup, /Check-in needed/);
  assert.match(markup, /Quick readiness check-in/);
  assert.match(markup, /sleep duration, sleep quality, energy, fatigue, mood/);
  assert.match(markup, /Missing values are not treated as zero/);
});

test('Health Scientist receives new workout and readiness records without a separate discovery call', async () => {
  const { date, workout, record } = seedStore();
  storage.saveExerciseSession(workout);
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return { ok: true, json: async () => ({ result: { response: 'Based on your records, your recent push-up session was logged.', dataUsed: ['workout history'], suggestedAction: null } }) };
  };
  try {
    await aiService.chatWithHealthScientist(
      { name: 'Ari' }, [checkin(date)], [], [], [], [], [], [], [], 'How has my exercise changed?',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(requestBody.exercise_sessions.length, 1);
  assert.equal(requestBody.performance_trends[0].exercise, 'Push-ups');
  assert.equal(requestBody.performance_trends[0].latest_reps, 12);
  assert.equal(requestBody.readiness_records[0].assessmentKey, record.assessmentKey);
  assert.ok(Array.isArray(requestBody.cognitive_tests));
});

test('integrated wellness flow carries readiness and a completed workout through setup, timeline, and Health Scientist data', async () => {
  const { date } = seedStore();
  const currentInput = { date, sleepDurationHours: 8, fatigue: 1, recentActivityMinutes: 0, updatedAt: new Date().toISOString() };
  storage.saveReadinessInput(currentInput);
  const currentScore = readiness.calculateDailyReadiness({
    date, asOf: new Date().toISOString(), checkin: checkin(date), readinessInput: currentInput,
    wearables: [], sessions: [],
  });
  assert.equal(currentScore.category, 'high');

  const { HealthLabProvider } = healthLabContext;
  const setupMarkup = renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(HealthLabProvider, null, createElement(DailyReadinessCard, { compact: true })),
  ));
  assert.match(setupMarkup, /high readiness/);
  assert.match(setupMarkup, /Details/);

  storage.saveStore({ ...storage.loadStore(), exerciseSessions: [] });
  const startedAt = Date.now() - 90_000;
  const session = workoutSummary.createExerciseSessionSummary({
    session: sessionDraft(startedAt), completedAtMs: Date.now(), date,
    completionStatus: 'completed', repCount: 14,
  });
  storage.saveExerciseSession(session);

  const timelineMarkup = renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(HealthLabProvider, null, createElement(TimelinePage)),
  ));
  assert.match(timelineMarkup, /Push-ups/);
  assert.match(timelineMarkup, /14 reps/);

  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return { ok: true, json: async () => ({ result: { response: 'Your session is recorded.', dataUsed: ['workout history'], suggestedAction: null } }) };
  };
  try {
    await aiService.chatWithHealthScientist(
      { name: 'Ari' }, [checkin(date)], [], [], [], [], [], [], [], 'How is my exercise going?',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(requestBody.exercise_sessions.at(-1).repCount, 14);
  assert.equal(requestBody.performance_trends[0].latest_reps, 14);
  assert.equal(requestBody.readiness_records.length, 1);
});
