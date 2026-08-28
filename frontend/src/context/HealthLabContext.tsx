/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext, useContext, useState,
  useCallback, type ReactNode,
} from 'react';
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
import * as storage from '../lib/storage';
import { today, getStreak } from '../lib/date-utils';

// ── Context shape ──────────────────────────────────────────────────────────────
interface HealthLabState {
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
  todaysCheckin: DailyCheckin | null;
  todaysHabitLog: HabitLog | null;
  streak: number;

  saveProfile: (profile: UserProfile) => void;
  completeOnboarding: (profile: UserProfile) => void;
  saveCheckin: (checkin: DailyCheckin) => void;
  saveHabitLog: (log: HabitLog) => void;
  toggleHabit: (date: string, habitId: string) => void;
  addTrackedHabit: (habitId: string) => void;
  removeTrackedHabit: (habitId: string) => void;
  saveInsight: (insight: AIInsight) => void;
  saveExperiment: (exp: Experiment) => void;
  saveWhatIfScenario: (scenario: WhatIfScenario) => void;
  saveWearableData: (data: WearableData) => void;
  saveLifestyleEntry: (entry: LifestyleEntry) => void;
  saveCognitiveTest: (result: CognitiveTestResult) => void;
  saveConversation: (entry: ConversationEntry) => void;
  savePostureSnapshot: (snapshot: PostureSnapshot) => void;
  saveBaseline: (baseline: PersonalBaseline) => void;
  saveDataSource: (source: DataSourceConfig) => void;
  addTimelineEvent: (event: TimelineEvent) => void;
  addLearnedInsight: (insight: LearnedInsight) => void;
  refreshData: () => void;
  resetAll: () => void;
}

const HealthLabContext = createContext<HealthLabState | undefined>(undefined);

// ── Provider ───────────────────────────────────────────────────────────────────
export const HealthLabProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(() => storage.getProfile());
  const [checkins, setCheckins] = useState<DailyCheckin[]>(() => storage.getCheckins());
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>(() => storage.getHabitLogs());
  const [insights, setInsights] = useState<AIInsight[]>(() => storage.getInsights());
  const [experiments, setExperiments] = useState<Experiment[]>(() => storage.getExperiments());
  const [whatIfScenarios, setWhatIfScenarios] = useState<WhatIfScenario[]>(() => storage.getWhatIfScenarios());
  const [wearables, setWearables] = useState<WearableData[]>(() => storage.getWearableData());
  const [lifestyles, setLifestyles] = useState<LifestyleEntry[]>(() => storage.getLifestyleEntries());
  const [cognitives, setCognitives] = useState<CognitiveTestResult[]>(() => storage.getCognitiveTests());
  const [conversations, setConversations] = useState<ConversationEntry[]>(() => storage.getConversations());
  const [postureSnapshots, setPostureSnapshots] = useState<PostureSnapshot[]>(() => storage.getPostureSnapshots());
  const [baseline, setBaseline] = useState<PersonalBaseline | null>(() => storage.getBaseline());
  const [dataSources, setDataSources] = useState<DataSourceConfig[]>(() => storage.getDataSources());
  const [timeline, setTimeline] = useState<TimelineEvent[]>(() => storage.getTimeline());
  const [learnedInsights, setLearnedInsights] = useState<LearnedInsight[]>(() => storage.getLearnedInsights());

  const refreshData = useCallback(() => {
    setProfile(storage.getProfile());
    setCheckins(storage.getCheckins());
    setHabitLogs(storage.getHabitLogs());
    setInsights(storage.getInsights());
    setExperiments(storage.getExperiments());
    setWhatIfScenarios(storage.getWhatIfScenarios());
    setWearables(storage.getWearableData());
    setLifestyles(storage.getLifestyleEntries());
    setCognitives(storage.getCognitiveTests());
    setConversations(storage.getConversations());
    setPostureSnapshots(storage.getPostureSnapshots());
    setBaseline(storage.getBaseline());
    setDataSources(storage.getDataSources());
    setTimeline(storage.getTimeline());
    setLearnedInsights(storage.getLearnedInsights());
  }, []);

  const saveProfile = useCallback((p: UserProfile) => {
    storage.saveProfile(p);
    setProfile(p);
  }, []);

  const completeOnboarding = useCallback((p: UserProfile) => {
    const completed = { ...p, onboardingComplete: true };
    storage.saveProfile(completed);
    setProfile(completed);
  }, []);

  const saveCheckin = useCallback((c: DailyCheckin) => {
    storage.saveCheckin(c);
    setCheckins(storage.getCheckins());
  }, []);

  const saveHabitLog = useCallback((log: HabitLog) => {
    storage.saveHabitLog(log);
    setHabitLogs(storage.getHabitLogs());
  }, []);

  const toggleHabit = useCallback((date: string, habitId: string) => {
    const existing = storage.getHabitLogForDate(date);
    const habits = existing ? { ...existing.habits } : {};
    habits[habitId] = !habits[habitId];
    const log: HabitLog = { date, habits };
    storage.saveHabitLog(log);
    setHabitLogs(storage.getHabitLogs());
  }, []);

  const addTrackedHabit = useCallback((habitId: string) => {
    if (!profile) return;
    if (profile.trackedHabits.includes(habitId)) return;
    const updated = { ...profile, trackedHabits: [...profile.trackedHabits, habitId] };
    storage.saveProfile(updated);
    setProfile(updated);
  }, [profile]);

  const removeTrackedHabit = useCallback((habitId: string) => {
    if (!profile) return;
    const updated = { ...profile, trackedHabits: profile.trackedHabits.filter(h => h !== habitId) };
    storage.saveProfile(updated);
    setProfile(updated);
  }, [profile]);

  const saveInsight = useCallback((insight: AIInsight) => {
    storage.saveInsight(insight);
    setInsights(storage.getInsights());
  }, []);

  const saveExperiment = useCallback((exp: Experiment) => {
    storage.saveExperiment(exp);
    setExperiments(storage.getExperiments());
  }, []);

  const saveWhatIfScenario = useCallback((scenario: WhatIfScenario) => {
    storage.saveWhatIfScenario(scenario);
    setWhatIfScenarios(storage.getWhatIfScenarios());
  }, []);

  const saveWearableData_ = useCallback((data: WearableData) => {
    storage.saveWearableData(data);
    setWearables(storage.getWearableData());
  }, []);

  const saveLifestyleEntry_ = useCallback((entry: LifestyleEntry) => {
    storage.saveLifestyleEntry(entry);
    setLifestyles(storage.getLifestyleEntries());
  }, []);

  const saveCognitiveTest_ = useCallback((result: CognitiveTestResult) => {
    storage.saveCognitiveTest(result);
    setCognitives(storage.getCognitiveTests());
  }, []);

  const saveConversation_ = useCallback((entry: ConversationEntry) => {
    storage.saveConversation(entry);
    setConversations(storage.getConversations());
  }, []);

  const savePostureSnapshot_ = useCallback((snapshot: PostureSnapshot) => {
    storage.savePostureSnapshot(snapshot);
    setPostureSnapshots(storage.getPostureSnapshots());
  }, []);

  const saveBaseline_ = useCallback((b: PersonalBaseline) => {
    storage.saveBaseline(b);
    setBaseline(storage.getBaseline());
  }, []);

  const saveDataSource_ = useCallback((source: DataSourceConfig) => {
    storage.saveDataSource(source);
    setDataSources(storage.getDataSources());
  }, []);

  const addTimelineEvent_ = useCallback((event: TimelineEvent) => {
    storage.addTimelineEvent(event);
    setTimeline(storage.getTimeline());
  }, []);

  const addLearnedInsight_ = useCallback((insight: LearnedInsight) => {
    storage.addLearnedInsight(insight);
    setLearnedInsights(storage.getLearnedInsights());
  }, []);

  const resetAll = useCallback(() => {
    storage.resetAllData();
    refreshData();
  }, [refreshData]);

  const todaysCheckin = checkins.find(c => c.date === today()) || null;
  const todaysHabitLog = habitLogs.find(l => l.date === today()) || null;
  const streak = getStreak(checkins.map(c => c.date));

  return (
    <HealthLabContext.Provider value={{
      profile, checkins, habitLogs, insights, experiments, whatIfScenarios,
      wearables, lifestyles, cognitives, conversations, postureSnapshots,
      baseline, dataSources, timeline, learnedInsights,
      todaysCheckin, todaysHabitLog, streak,
      saveProfile, completeOnboarding, saveCheckin, saveHabitLog,
      toggleHabit, addTrackedHabit, removeTrackedHabit,
      saveInsight, saveExperiment, saveWhatIfScenario,
      saveWearableData: saveWearableData_,
      saveLifestyleEntry: saveLifestyleEntry_,
      saveCognitiveTest: saveCognitiveTest_,
      saveConversation: saveConversation_,
      savePostureSnapshot: savePostureSnapshot_,
      saveBaseline: saveBaseline_,
      saveDataSource: saveDataSource_,
      addTimelineEvent: addTimelineEvent_,
      addLearnedInsight: addLearnedInsight_,
      refreshData, resetAll,
    }}>
      {children}
    </HealthLabContext.Provider>
  );
};

export const useHealthLab = () => {
  const ctx = useContext(HealthLabContext);
  if (ctx === undefined) throw new Error('useHealthLab must be used within HealthLabProvider');
  return ctx;
};
