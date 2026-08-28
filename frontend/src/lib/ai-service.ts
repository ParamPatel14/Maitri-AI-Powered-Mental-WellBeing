import type {
  UserProfile,
  DailyCheckin,
  HabitLog,
  AIInsight,
  Experiment,
  ExperimentResult,
  ExperimentResultV2,
  WhatIfScenario,
  PersonalBaseline,
  CognitiveTestResult,
  PatternDiscoveryResult,
  ExperimentPlan,
  LifestyleEntry,
  WearableData,
  FutureSimulationResult,
  ScenarioComparisonResult,
  DiscoveredPattern,
  HealthScientistMessage,
  LearnedInsight,
} from '../types/health-lab';

const RAW_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
const BACKEND_URL = String(RAW_BACKEND_URL)
  .replace('https://localhost', 'http://127.0.0.1')
  .replace('http://localhost', 'http://127.0.0.1');

async function callAnalyze(task: string, data: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${BACKEND_URL}/health-lab/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, ...data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `Analysis failed (${res.status})`);
  }
  const json = await res.json();
  return json.result;
}

export async function generateWeeklyReport(
  profile: UserProfile,
  checkins: DailyCheckin[],
  habitLogs: HabitLog[],
): Promise<AIInsight> {
  const result = await callAnalyze('weekly_report', { profile, checkins, habit_logs: habitLogs }) as {
    title: string;
    body: string;
  };
  const weekStart = checkins.length > 0 ? checkins[0].date : new Date().toISOString().slice(0, 10);
  return {
    id: crypto.randomUUID(),
    type: 'weekly_report',
    title: result.title,
    body: result.body,
    generatedAt: new Date().toISOString(),
    weekStarting: weekStart,
  };
}

export async function findPatterns(
  profile: UserProfile,
  checkins: DailyCheckin[],
  habitLogs: HabitLog[],
): Promise<AIInsight[]> {
  const result = await callAnalyze('pattern_finder', { profile, checkins, habit_logs: habitLogs }) as {
    patterns: Array<{ title: string; body: string; type: 'pattern' | 'positive' | 'warning' }>;
  };
  return (result.patterns || []).map(p => ({
    id: crypto.randomUUID(),
    type: p.type,
    title: p.title,
    body: p.body,
    generatedAt: new Date().toISOString(),
    weekStarting: checkins.length > 0 ? checkins[0].date : new Date().toISOString().slice(0, 10),
  }));
}

export async function analyzeExperiment(
  experiment: Experiment,
  checkins: DailyCheckin[],
  habitLogs: HabitLog[],
): Promise<ExperimentResult> {
  const result = await callAnalyze('experiment_analysis', {
    experiment,
    checkins,
    habit_logs: habitLogs,
  }) as ExperimentResult;
  return {
    ...result,
    generatedAt: new Date().toISOString(),
  };
}

export async function getWhatIfAnswer(
  profile: UserProfile,
  checkins: DailyCheckin[],
  question: string,
): Promise<WhatIfScenario> {
  const result = await callAnalyze('what_if', { profile, checkins, question }) as {
    answer: string;
  };
  return {
    id: crypto.randomUUID(),
    question,
    answer: result.answer,
    generatedAt: new Date().toISOString(),
  };
}

export async function interpretBaseline(
  profile: UserProfile,
  baseline: PersonalBaseline,
  todayValues: Record<string, number | null>,
): Promise<{ title: string; body: string }> {
  const result = await callAnalyze('baseline_interpretation', {
    profile,
    baseline,
    today_values: todayValues,
  }) as { title: string; body: string };
  return result;
}

export async function analyzeCognitive(
  profile: UserProfile,
  results: CognitiveTestResult[],
  checkins: DailyCheckin[],
): Promise<{ title: string; body: string }> {
  const result = await callAnalyze('cognitive_analysis', {
    profile,
    results,
    checkins,
  }) as { title: string; body: string };
  return result;
}

export async function discoverPatterns(
  profile: UserProfile,
  checkins: DailyCheckin[],
  habitLogs: HabitLog[],
  lifestyles: LifestyleEntry[],
  wearables: WearableData[],
): Promise<PatternDiscoveryResult> {
  const result = await callAnalyze('pattern_discovery', {
    profile,
    checkins,
    habit_logs: habitLogs,
    lifestyles,
    wearables,
  }) as { patterns: Array<{ title: string; observation: string; strength: string; type: string }>; summary: string };
  return {
    patterns: (result.patterns || []).map(p => ({
      id: crypto.randomUUID(),
      title: p.title,
      observation: p.observation,
      strength: p.strength as 'strong' | 'moderate' | 'weak',
      type: p.type as 'positive' | 'neutral' | 'something_to_watch',
    })),
    summary: result.summary,
    generatedAt: new Date().toISOString(),
  };
}

export async function createExperimentPlan(
  profile: UserProfile,
  checkins: DailyCheckin[],
  hypothesis: string,
): Promise<ExperimentPlan> {
  const result = await callAnalyze('experiment_plan', {
    profile,
    checkins,
    hypothesis,
  }) as ExperimentPlan;
  return result;
}

export async function analyzeExperimentV2(
  experiment: Experiment,
  beforeCheckins: DailyCheckin[],
  duringCheckins: DailyCheckin[],
  duringHabits: HabitLog[],
  learnedPatterns: DiscoveredPattern[],
): Promise<ExperimentResultV2> {
  const result = await callAnalyze('experiment_analysis_v2', {
    experiment,
    before_checkins: beforeCheckins,
    during_checkins: duringCheckins,
    during_habits: duringHabits,
    learned_patterns: learnedPatterns,
  }) as ExperimentResultV2;
  return {
    ...result,
    generatedAt: new Date().toISOString(),
  };
}

export async function simulateFuture(
  profile: UserProfile,
  checkins: DailyCheckin[],
  habitLogs: HabitLog[],
  patterns: DiscoveredPattern[],
  experimentResults: ExperimentResult[],
  currentLifestyle: Record<string, unknown>,
): Promise<FutureSimulationResult> {
  const result = await callAnalyze('future_simulation', {
    profile,
    checkins,
    habit_logs: habitLogs,
    patterns,
    experiment_results: experimentResults,
    current_lifestyle: currentLifestyle,
  }) as Omit<FutureSimulationResult, 'generatedAt'>;
  return {
    ...result,
    generatedAt: new Date().toISOString(),
  };
}

export async function compareScenarios(
  profile: UserProfile,
  currentLifestyle: Record<string, unknown>,
  checkins: DailyCheckin[],
  patterns: DiscoveredPattern[],
  experimentResults: ExperimentResult[],
  scenarios: Array<{ name: string; description: string; changes: Record<string, string> }>,
): Promise<ScenarioComparisonResult> {
  const result = await callAnalyze('scenario_comparison', {
    profile,
    current_lifestyle: currentLifestyle,
    checkins,
    patterns,
    experiment_results: experimentResults,
    scenarios,
  }) as Omit<ScenarioComparisonResult, 'generatedAt'>;
  return {
    ...result,
    generatedAt: new Date().toISOString(),
  };
}

export async function chatWithHealthScientist(
  profile: UserProfile,
  checkins: DailyCheckin[],
  habitLogs: HabitLog[],
  lifestyles: LifestyleEntry[],
  wearables: WearableData[],
  patterns: DiscoveredPattern[],
  experiments: Experiment[],
  learnedInsights: LearnedInsight[],
  conversationHistory: Array<{ role: string; content: string }>,
  userMessage: string,
): Promise<{ response: string; dataUsed: string[]; suggestedAction: HealthScientistMessage['suggestedAction'] }> {
  const result = await callAnalyze('health_scientist_chat', {
    profile,
    checkins,
    habit_logs: habitLogs,
    lifestyles,
    wearables,
    patterns,
    experiments,
    learned_insights: learnedInsights,
    conversation_history: conversationHistory,
    user_message: userMessage,
  }) as { response: string; dataUsed: string[]; suggestedAction: HealthScientistMessage['suggestedAction'] };
  return result;
}
