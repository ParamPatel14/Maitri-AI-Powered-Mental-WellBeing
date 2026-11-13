import type {
  UserProfile,
  DailyCheckin,
  HabitLog,
  AIInsight,
  Experiment,
  WhatIfScenario,
  WearableData,
  LifestyleEntry,
  CognitiveTestResult,
  ConversationEntry,
  PostureSnapshot,
  PersonalBaseline,
  DataSourceConfig,
  TimelineEvent,
  LearnedInsight,
  ExerciseSession,
  ReadinessInput,
  ReadinessRecord,
} from '../types/health-lab';

const STORE_KEY = 'maitri.healthlab';
const SCHEMA_VERSION = 5;

interface HealthLabStore {
  version: number;
  profile: UserProfile | null;
  checkins: DailyCheckin[];
  habitLogs: HabitLog[];
  insights: AIInsight[];
  experiments: Experiment[];
  whatIfScenarios: WhatIfScenario[];
  wearables: WearableData[];
  lifestyles: LifestyleEntry[];
  cognitives: CognitiveTestResult[];
  conversations: ConversationEntry[];
  postureSnapshots: PostureSnapshot[];
  baseline: PersonalBaseline | null;
  dataSources: DataSourceConfig[];
  timeline: TimelineEvent[];
  learnedInsights: LearnedInsight[];
  exerciseSessions: ExerciseSession[];
  readinessInputs: ReadinessInput[];
  readinessRecords: ReadinessRecord[];
}

function defaultStore(): HealthLabStore {
  return {
    version: SCHEMA_VERSION,
    profile: null,
    checkins: [],
    habitLogs: [],
    insights: [],
    experiments: [],
    whatIfScenarios: [],
    wearables: [],
    lifestyles: [],
    cognitives: [],
    conversations: [],
    postureSnapshots: [],
    baseline: null,
    dataSources: [],
    timeline: [],
    learnedInsights: [],
    exerciseSessions: [],
    readinessInputs: [],
    readinessRecords: [],
  };
}

function normalizeExerciseSession(value: unknown, index: number): ExerciseSession | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const startedAt = typeof raw.startedAt === 'string' ? raw.startedAt : null;
  const completedAt = typeof raw.completedAt === 'string' ? raw.completedAt : startedAt;
  if (!completedAt) return null;
  const date = typeof raw.date === 'string' ? raw.date : completedAt.slice(0, 10);
  const metrics = raw.metrics && typeof raw.metrics === 'object' && !Array.isArray(raw.metrics)
    ? Object.fromEntries(Object.entries(raw.metrics as Record<string, unknown>).filter(([, metric]) =>
      typeof metric === 'number' || typeof metric === 'string' || typeof metric === 'boolean')) as ExerciseSession['metrics']
    : {};
  const detectedFormIssues = Array.isArray(raw.detectedFormIssues)
    ? raw.detectedFormIssues.flatMap(issue => {
      if (!issue || typeof issue !== 'object') return [];
      const item = issue as Record<string, unknown>;
      return typeof item.name === 'string'
        ? [{ name: item.name, frameCount: typeof item.frameCount === 'number' ? item.frameCount : 1 }]
        : [];
    })
    : [];

  return {
    id: typeof raw.id === 'string' ? raw.id : `legacy-workout-${date}-${index}`,
    activityType: 'workout_session',
    source: 'live_exercise_coaching',
    date,
    exercise: typeof raw.exercise === 'string' ? raw.exercise : 'Exercise session',
    startedAt: startedAt ?? completedAt,
    completedAt,
    durationSeconds: typeof raw.durationSeconds === 'number' ? Math.max(0, raw.durationSeconds) : 0,
    repCount: typeof raw.repCount === 'number' ? Math.max(0, raw.repCount) : 0,
    ...(typeof raw.setsCompleted === 'number' ? { setsCompleted: Math.max(0, raw.setsCompleted) } : {}),
    formConsistencyScore: typeof raw.formConsistencyScore === 'number'
      ? raw.formConsistencyScore
      : typeof raw.sessionScore === 'number' ? raw.sessionScore : null,
    detectedFormIssues,
    completionStatus: raw.completionStatus === 'interrupted' ? 'interrupted' : 'completed',
    metrics,
    goalMode: raw.goalMode === 'Strength' || raw.goalMode === 'Endurance' ? raw.goalMode : 'Rehab',
    patientName: typeof raw.patientName === 'string' ? raw.patientName : null,
  };
}

export function loadStore(): HealthLabStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultStore();
    const parsed = JSON.parse(raw) as Partial<HealthLabStore>;
    return {
      ...defaultStore(),
      ...parsed,
      version: SCHEMA_VERSION,
      exerciseSessions: Array.isArray(parsed.exerciseSessions)
        ? parsed.exerciseSessions.map(normalizeExerciseSession).filter((item): item is ExerciseSession => item !== null)
          .filter((item, index, all) => all.findIndex(candidate => candidate.id === item.id) === index)
        : [],
      readinessInputs: Array.isArray(parsed.readinessInputs) ? parsed.readinessInputs : [],
      readinessRecords: Array.isArray(parsed.readinessRecords)
        ? parsed.readinessRecords.filter((item): item is ReadinessRecord => Boolean(item && typeof item === 'object' && typeof item.id === 'string' && typeof item.assessmentKey === 'string' && typeof item.score === 'number' && typeof item.timestamp === 'string'))
          .filter((item, index, all) => all.findIndex(candidate => candidate.assessmentKey === item.assessmentKey) === index)
        : [],
    };
  } catch {
    return defaultStore();
  }
}

export function saveStore(store: HealthLabStore): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Failed to save health lab data:', e);
  }
}

// ── Profile ────────────────────────────────────────────────────────────────────
export function getProfile(): UserProfile | null {
  return loadStore().profile;
}

export function saveProfile(profile: UserProfile): void {
  const store = loadStore();
  store.profile = profile;
  saveStore(store);
}

export function hasProfile(): boolean {
  return getProfile() !== null;
}

// ── Check-ins ──────────────────────────────────────────────────────────────────
export function getCheckins(): DailyCheckin[] {
  return loadStore().checkins;
}

export function getCheckinForDate(date: string): DailyCheckin | undefined {
  return loadStore().checkins.find(c => c.date === date);
}

export function saveCheckin(checkin: DailyCheckin): void {
  const store = loadStore();
  const idx = store.checkins.findIndex(c => c.date === checkin.date);
  if (idx >= 0) {
    store.checkins[idx] = checkin;
  } else {
    store.checkins.push(checkin);
  }
  store.checkins.sort((a, b) => a.date.localeCompare(b.date));
  saveStore(store);
}

// ── Habit Logs ─────────────────────────────────────────────────────────────────
export function getHabitLogs(): HabitLog[] {
  return loadStore().habitLogs;
}

export function getHabitLogForDate(date: string): HabitLog | undefined {
  return loadStore().habitLogs.find(l => l.date === date);
}

export function saveHabitLog(log: HabitLog): void {
  const store = loadStore();
  const idx = store.habitLogs.findIndex(l => l.date === log.date);
  if (idx >= 0) {
    store.habitLogs[idx] = log;
  } else {
    store.habitLogs.push(log);
  }
  store.habitLogs.sort((a, b) => a.date.localeCompare(b.date));
  saveStore(store);
}

// ── Insights ───────────────────────────────────────────────────────────────────
export function getInsights(): AIInsight[] {
  return loadStore().insights;
}

export function saveInsight(insight: AIInsight): void {
  const store = loadStore();
  const idx = store.insights.findIndex(i => i.id === insight.id);
  if (idx >= 0) {
    store.insights[idx] = insight;
  } else {
    store.insights.push(insight);
  }
  store.insights.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  saveStore(store);
}

export function isInsightStale(insight: AIInsight): boolean {
  const generated = new Date(insight.generatedAt);
  const now = new Date();
  const hours = (now.getTime() - generated.getTime()) / (1000 * 60 * 60);
  return hours > 24;
}

// ── Experiments ────────────────────────────────────────────────────────────────
export function getExperiments(): Experiment[] {
  return loadStore().experiments;
}

export function saveExperiment(exp: Experiment): void {
  const store = loadStore();
  const idx = store.experiments.findIndex(e => e.id === exp.id);
  if (idx >= 0) {
    store.experiments[idx] = exp;
  } else {
    store.experiments.push(exp);
  }
  saveStore(store);
}

// ── What-If ────────────────────────────────────────────────────────────────────
export function getWhatIfScenarios(): WhatIfScenario[] {
  return loadStore().whatIfScenarios;
}

export function saveWhatIfScenario(scenario: WhatIfScenario): void {
  const store = loadStore();
  store.whatIfScenarios.push(scenario);
  saveStore(store);
}

// ── Reset ──────────────────────────────────────────────────────────────────────
export function resetAllData(): void {
  localStorage.removeItem(STORE_KEY);
}

// ── Wearable Data ──────────────────────────────────────────────────────────────
export function getWearableData(): WearableData[] {
  return loadStore().wearables;
}

export function saveWearableData(data: WearableData): void {
  const store = loadStore();
  const idx = store.wearables.findIndex(w => w.date === data.date && w.source === data.source);
  if (idx >= 0) {
    store.wearables[idx] = data;
  } else {
    store.wearables.push(data);
  }
  store.wearables.sort((a, b) => a.date.localeCompare(b.date));
  saveStore(store);
}

// ── Lifestyle Entries ──────────────────────────────────────────────────────────
export function getLifestyleEntries(): LifestyleEntry[] {
  return loadStore().lifestyles;
}

export function saveLifestyleEntry(entry: LifestyleEntry): void {
  const store = loadStore();
  const idx = store.lifestyles.findIndex(l => l.date === entry.date);
  if (idx >= 0) {
    store.lifestyles[idx] = entry;
  } else {
    store.lifestyles.push(entry);
  }
  store.lifestyles.sort((a, b) => a.date.localeCompare(b.date));
  saveStore(store);
}

// ── Cognitive Tests ────────────────────────────────────────────────────────────
export function getCognitiveTests(): CognitiveTestResult[] {
  return loadStore().cognitives;
}

export function saveCognitiveTest(result: CognitiveTestResult): void {
  const store = loadStore();
  store.cognitives.push(result);
  store.cognitives.sort((a, b) => a.date.localeCompare(b.date));
  saveStore(store);
}

// ── Conversations ──────────────────────────────────────────────────────────────
export function getConversations(): ConversationEntry[] {
  return loadStore().conversations;
}

export function saveConversation(entry: ConversationEntry): void {
  const store = loadStore();
  store.conversations.push(entry);
  saveStore(store);
}

// ── Posture Snapshots ──────────────────────────────────────────────────────────
export function getPostureSnapshots(): PostureSnapshot[] {
  return loadStore().postureSnapshots;
}

export function savePostureSnapshot(snapshot: PostureSnapshot): void {
  const store = loadStore();
  store.postureSnapshots.push(snapshot);
  saveStore(store);
}

// ── Baseline ───────────────────────────────────────────────────────────────────
export function getBaseline(): PersonalBaseline | null {
  return loadStore().baseline;
}

export function saveBaseline(baseline: PersonalBaseline): void {
  const store = loadStore();
  store.baseline = baseline;
  saveStore(store);
}

// ── Data Sources ───────────────────────────────────────────────────────────────
export function getDataSources(): DataSourceConfig[] {
  return loadStore().dataSources;
}

export function saveDataSource(source: DataSourceConfig): void {
  const store = loadStore();
  const idx = store.dataSources.findIndex(s => s.id === source.id);
  if (idx >= 0) {
    store.dataSources[idx] = source;
  } else {
    store.dataSources.push(source);
  }
  saveStore(store);
}

// ── Timeline Events ───────────────────────────────────────────────────────────
export function getTimeline(): TimelineEvent[] {
  return loadStore().timeline;
}

export function addTimelineEvent(event: TimelineEvent): void {
  const store = loadStore();
  store.timeline.push(event);
  store.timeline.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  saveStore(store);
}

// ── Learned Insights ──────────────────────────────────────────────────────────
export function getLearnedInsights(): LearnedInsight[] {
  return loadStore().learnedInsights;
}

export function addLearnedInsight(insight: LearnedInsight): void {
  const store = loadStore();
  // Avoid duplicates by checking finding text
  const existing = store.learnedInsights.findIndex(i => i.finding === insight.finding);
  if (existing >= 0) {
    store.learnedInsights[existing] = { ...store.learnedInsights[existing], lastUpdated: insight.lastUpdated, strength: insight.strength };
  } else {
    store.learnedInsights.push(insight);
  }
  saveStore(store);
}

export function getLearnedInsightsByCategory(category: LearnedInsight['category']): LearnedInsight[] {
  return loadStore().learnedInsights.filter(i => i.category === category);
}

export function getExerciseSessions(): ExerciseSession[] {
  return loadStore().exerciseSessions;
}

export function saveExerciseSession(session: ExerciseSession): void {
  const store = loadStore();
  const existing = store.exerciseSessions.findIndex(item => item.id === session.id);
  if (existing >= 0) store.exerciseSessions[existing] = session;
  else store.exerciseSessions.push(session);
  store.exerciseSessions.sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  saveStore(store);
}

export function getReadinessInputs(): ReadinessInput[] {
  return loadStore().readinessInputs;
}

export function saveReadinessInput(input: ReadinessInput): void {
  const store = loadStore();
  const index = store.readinessInputs.findIndex(item => item.date === input.date);
  if (index >= 0) store.readinessInputs[index] = { ...store.readinessInputs[index], ...input };
  else store.readinessInputs.push(input);
  store.readinessInputs.sort((a, b) => a.date.localeCompare(b.date));
  saveStore(store);
}

export function getReadinessRecords(): ReadinessRecord[] {
  return loadStore().readinessRecords;
}

/** Idempotent append: an existing input snapshot is never rewritten. */
export function saveReadinessRecord(record: ReadinessRecord): void {
  const store = loadStore();
  if (store.readinessRecords.some(item => item.assessmentKey === record.assessmentKey)) return;
  store.readinessRecords.push(record);
  store.readinessRecords.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  saveStore(store);
}
