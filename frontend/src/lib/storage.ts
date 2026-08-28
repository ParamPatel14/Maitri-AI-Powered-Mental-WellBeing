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
} from '../types/health-lab';

const STORE_KEY = 'maitri.healthlab';
const SCHEMA_VERSION = 2;

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
  };
}

export function loadStore(): HealthLabStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultStore();
    const parsed = JSON.parse(raw);
    if (parsed.version !== SCHEMA_VERSION) return defaultStore();
    return parsed;
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
