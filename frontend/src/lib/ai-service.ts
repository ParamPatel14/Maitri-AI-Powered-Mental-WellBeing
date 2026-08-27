import type {
  UserProfile,
  DailyCheckin,
  HabitLog,
  AIInsight,
  Experiment,
  ExperimentResult,
  WhatIfScenario,
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
