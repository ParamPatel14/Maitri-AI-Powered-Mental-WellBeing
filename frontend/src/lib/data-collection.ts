/**
 * data-collection.ts
 * ───────────────────
 * Multi-source data intake service.
 * Normalizes data from different sources into a consistent format.
 * Gradually builds a richer picture of the user's well-being.
 */

import type {
  WearableData,
  LifestyleEntry,
  CognitiveTestResult,
  CognitiveTestType,
  ConversationEntry,
  PostureSnapshot,
} from '../types/health-lab';
import * as storage from './storage';

// ── Wearable Data ──────────────────────────────────────────────────────────────

export function saveWearableData(data: WearableData): void {
  storage.saveWearableData(data);
}

export function getWearableDataForDate(date: string): WearableData | undefined {
  return storage.getWearableData().find(w => w.date === date);
}

export function getWearableDataRange(from: string, to: string): WearableData[] {
  return storage.getWearableData().filter(w => w.date >= from && w.date <= to);
}

// ── Manual Wearable Entry (simulated) ──────────────────────────────────────────

export function createManualWearableEntry(params: {
  date: string;
  heartRateResting?: number;
  steps?: number;
  sleepHours?: number;
  hrv?: number;
  bodyBattery?: number;
  caloriesBurned?: number;
  activeMinutes?: number;
}): WearableData {
  return {
    date: params.date,
    source: 'manual',
    heartRateResting: params.heartRateResting ?? null,
    heartRateAvg: null,
    heartRateMax: null,
    steps: params.steps ?? null,
    sleepHours: params.sleepHours ?? null,
    sleepDeep: null,
    sleepLight: null,
    sleepRem: null,
    sleepAwake: null,
    caloriesBurned: params.caloriesBurned ?? null,
    activeMinutes: params.activeMinutes ?? null,
    floorsClimbed: null,
    bloodOxygen: null,
    stressScore: null,
    skinTemp: null,
    bodyBattery: params.bodyBattery ?? null,
    hrv: params.hrv ?? null,
    recordedAt: new Date().toISOString(),
  };
}

// ── Lifestyle Data ─────────────────────────────────────────────────────────────

export function saveLifestyleEntry(entry: LifestyleEntry): void {
  storage.saveLifestyleEntry(entry);
}

export function getLifestyleEntryForDate(date: string): LifestyleEntry | undefined {
  return storage.getLifestyleEntries().find(l => l.date === date);
}

// ── Cognitive Tests ────────────────────────────────────────────────────────────

export function saveCognitiveTest(result: CognitiveTestResult): void {
  storage.saveCognitiveTest(result);
}

export function getCognitiveTests(): CognitiveTestResult[] {
  return storage.getCognitiveTests();
}

export function getCognitiveTestsByType(type: CognitiveTestType): CognitiveTestResult[] {
  return storage.getCognitiveTests().filter(t => t.testType === type);
}

// ── Conversational Check-in ────────────────────────────────────────────────────

export function saveConversation(entry: ConversationEntry): void {
  storage.saveConversation(entry);
}

export function getConversationsForDate(date: string): ConversationEntry[] {
  return storage.getConversations().filter(c => c.date === date);
}

// ── Posture Snapshots ──────────────────────────────────────────────────────────

export function savePostureSnapshot(snapshot: PostureSnapshot): void {
  storage.savePostureSnapshot(snapshot);
}

export function getPostureSnapshots(): PostureSnapshot[] {
  return storage.getPostureSnapshots();
}

// ── Quick Lifestyle Survey (3 questions, < 15 seconds) ─────────────────────────

export interface QuickSurvey {
  caffeine: LifestyleEntry['caffeineIntake'];
  water: LifestyleEntry['waterIntake'];
  screenTime: LifestyleEntry['screenTimeBeforeBed'];
}

export function getQuickSurveyForDate(date: string): QuickSurvey | null {
  const entry = getLifestyleEntryForDate(date);
  if (!entry) return null;
  return {
    caffeine: entry.caffeineIntake,
    water: entry.waterIntake,
    screenTime: entry.screenTimeBeforeBed,
  };
}

export function saveQuickSurvey(date: string, survey: QuickSurvey): void {
  const existing = getLifestyleEntryForDate(date);
  const entry: LifestyleEntry = {
    date,
    caffeineIntake: survey.caffeine,
    alcoholIntake: existing?.alcoholIntake ?? 'none',
    mealRegularity: existing?.mealRegularity ?? 'mostly_regular',
    waterIntake: survey.water,
    outdoorTime: existing?.outdoorTime ?? 'none',
    socialInteraction: existing?.socialInteraction ?? 'moderate',
    screenTimeBeforeBed: survey.screenTime,
    WorkHours: existing?.WorkHours ?? 'moderate',
    completedAt: new Date().toISOString(),
  };
  saveLifestyleEntry(entry);
}

// ── Data Completeness Score ────────────────────────────────────────────────────

export function getDataCompleteness(date: string): {
  score: number;
  sources: Array<{ name: string; available: boolean; icon: string }>;
} {
  const checkin = storage.getCheckinForDate(date);
  const wearable = getWearableDataForDate(date);
  const lifestyle = getLifestyleEntryForDate(date);
  const cognitives = storage.getCognitiveTests().filter(t => t.date === date);
  const conversations = getConversationsForDate(date);

  const sources = [
    { name: 'Daily Check-in', available: !!checkin, icon: 'calendar' },
    { name: 'Wearable Data', available: !!wearable, icon: 'watch' },
    { name: 'Lifestyle Log', available: !!lifestyle, icon: 'coffee' },
    { name: 'Cognitive Test', available: cognitives.length > 0, icon: 'brain' },
    { name: 'AI Conversation', available: conversations.length > 0, icon: 'message' },
  ];

  const availableCount = sources.filter(s => s.available).length;
  const score = Math.round((availableCount / sources.length) * 100);

  return { score, sources };
}

// ── Streak & Consistency ───────────────────────────────────────────────────────

export function getCollectionStreak(): number {
  const checkins = storage.getCheckins();
  if (checkins.length === 0) return 0;

  const dates = checkins.map(c => c.date).sort().reverse();
  const today = new Date().toISOString().slice(0, 10);

  if (dates[0] !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dates[0] !== yesterday.toISOString().slice(0, 10)) return 0;
  }

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
