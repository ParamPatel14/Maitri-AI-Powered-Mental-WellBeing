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

  const refreshData = useCallback(() => {
    setProfile(storage.getProfile());
    setCheckins(storage.getCheckins());
    setHabitLogs(storage.getHabitLogs());
    setInsights(storage.getInsights());
    setExperiments(storage.getExperiments());
    setWhatIfScenarios(storage.getWhatIfScenarios());
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
      todaysCheckin, todaysHabitLog, streak,
      saveProfile, completeOnboarding, saveCheckin, saveHabitLog,
      toggleHabit, addTrackedHabit, removeTrackedHabit,
      saveInsight, saveExperiment, saveWhatIfScenario,
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
