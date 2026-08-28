// ── Profile ────────────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  name: string;
  ageRange: '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
  generalGoals: string[];
  sleepHoursTypical: string;
  sleepQualityBaseline: string;
  activityLevel: string;
  currentHabits: string[];
  trackedHabits: string[];
  checkInFrequency: string;
  wantsExperiments: boolean;
  energyPattern: string;
  onboardingComplete: boolean;
  createdAt: string;
}

// ── Daily Check-in ─────────────────────────────────────────────────────────────
export interface DailyCheckin {
  date: string;
  mood: 1 | 2 | 3 | 4 | 5;
  energy: 1 | 2 | 3 | 4 | 5;
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  stressLevel: 1 | 2 | 3 | 4 | 5;
  wentWell: string | null;
  wasHard: string | null;
  completedAt: string;
}

// ── Smartwatch / Wearable Data ─────────────────────────────────────────────────
export interface WearableData {
  date: string;
  source: 'manual' | 'apple_health' | 'google_fit' | 'garmin' | 'fitbit' | 'samsung_health';
  heartRateResting: number | null;     // bpm
  heartRateAvg: number | null;         // bpm
  heartRateMax: number | null;         // bpm
  steps: number | null;
  sleepHours: number | null;           // decimal hours
  sleepDeep: number | null;            // minutes
  sleepLight: number | null;           // minutes
  sleepRem: number | null;             // minutes
  sleepAwake: number | null;           // minutes
  caloriesBurned: number | null;
  activeMinutes: number | null;        // minutes
  floorsClimbed: number | null;
  bloodOxygen: number | null;          // percentage (90-100)
  stressScore: number | null;          // 0-100 (device-measured)
  skinTemp: number | null;             // celsius
  bodyBattery: number | null;          // 0-100 (Garmin-style)
  hrv: number | null;                  // ms (heart rate variability)
  recordedAt: string;
}

// ── Camera Posture Data ────────────────────────────────────────────────────────
export interface PostureSnapshot {
  date: string;
  time: string;
  shoulderAlignment: number | null;    // degrees from horizontal
  headForwardAngle: number | null;     // degrees
  spineCurvature: number | null;       // degrees
  hipTilt: number | null;              // degrees
  postureScore: number | null;         // 0-100
  capturedFrom: 'exercise_session' | 'manual_capture' | 'ambient_detection';
}

// ── Cognitive Test Results ─────────────────────────────────────────────────────
export type CognitiveTestType = 'reaction_time' | 'working_memory' | 'sustained_attention' | 'digit_span';

export interface CognitiveTestResult {
  id: string;
  date: string;
  testType: CognitiveTestType;
  score: number;                       // normalized 0-100
  rawMetrics: Record<string, number>;  // test-specific raw data
  durationMs: number;                  // how long the test took
  completedAt: string;
}

// ── Lifestyle Factors ──────────────────────────────────────────────────────────
export interface LifestyleEntry {
  date: string;
  caffeineIntake: 'none' | '1-2' | '3-4' | '5+';    // cups
  alcoholIntake: 'none' | '1-2' | '3+';               // drinks
  mealRegularity: 'skipped_meals' | 'irregular' | 'mostly_regular' | 'very_regular';
  waterIntake: 'low' | 'moderate' | 'high';
  outdoorTime: 'none' | 'less_30m' | '30m_1h' | '1h_plus';
  socialInteraction: 'none' | 'minimal' | 'moderate' | 'high';
  screenTimeBeforeBed: 'none' | 'less_30m' | '30m_1h' | '1h_plus';
  WorkHours: 'none' | 'light' | 'moderate' | 'heavy';
  completedAt: string;
}

// ── Conversational Check-in ────────────────────────────────────────────────────
export interface ConversationEntry {
  id: string;
  date: string;
  question: string;
  answer: string;
  category: 'mood' | 'energy' | 'sleep' | 'stress' | 'social' | 'activity' | 'lifestyle';
  sentimentScore: number | null;       // -1 to 1 (AI-analyzed)
  timestamp: string;
}

// ── Personal Baseline ──────────────────────────────────────────────────────────
export interface BaselineMetric {
  key: string;
  label: string;
  unit: string;
  personalAvg: number;                 // user's own average
  personalMin: number;                 // user's typical low
  personalMax: number;                 // user's typical high
  personalStd: number;                 // standard deviation
  todayValue: number | null;
  deviation: number | null;            // std deviations from mean
  status: 'normal' | 'slightly_low' | 'low' | 'slightly_high' | 'high' | 'no_data';
  dataPoints: number;                  // how many days of data
  trend: 'improving' | 'stable' | 'declining' | 'insufficient';
}

export interface PersonalBaseline {
  version: number;
  computedAt: string;
  dataRange: { from: string; to: string };
  totalDays: number;
  metrics: BaselineMetric[];
  readinessScore: number | null;       // 0-100, how confident we are in the baseline
}

export interface BaselineConfig {
  minDaysForBaseline: number;          // minimum data points to compute baseline
  outlierThreshold: number;            // std deviations to exclude outliers
  trendWindow: number;                 // days to look at for trend analysis
}

// ── Data Source Config ─────────────────────────────────────────────────────────
export interface DataSourceConfig {
  id: string;
  type: 'wearable' | 'camera' | 'manual' | 'cognitive' | 'conversation';
  name: string;
  enabled: boolean;
  lastSyncAt: string | null;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'manual';
  permissions: string[];
}

// ── Enhanced Store ─────────────────────────────────────────────────────────────
// (extends existing HealthLabStore)

// ── Habit Log ──────────────────────────────────────────────────────────────────
export interface HabitLog {
  date: string;
  habits: Record<string, boolean>;
}

// ── AI Insights ────────────────────────────────────────────────────────────────
export interface AIInsight {
  id: string;
  type: 'weekly_report' | 'pattern' | 'positive' | 'warning';
  title: string;
  body: string;
  generatedAt: string;
  weekStarting: string;
}

// ── Personal Experiment ────────────────────────────────────────────────────────
export type ExperimentStatus = 'planning' | 'active' | 'analyzing' | 'complete';

export interface Experiment {
  id: string;
  hypothesis: string;
  habitToTrack: string;
  outcomeToTrack: string;
  duration: 7 | 14;
  startDate: string | null;
  endDate: string | null;
  status: ExperimentStatus;
  result: ExperimentResult | null;
  createdAt: string;
  plan: ExperimentPlan | null;
}

export interface ExperimentPlan {
  title: string;
  hypothesis: string;
  goal: string;
  duration: number;
  dailyInstructions: string;
  trackingMetrics: string[];
  successCriteria: string;
  notes: string;
}

export interface ExperimentResult {
  summary: string;
  habitCompletionRate: number;
  moodWithHabit: number;
  moodWithoutHabit: number;
  recommendation: string;
  generatedAt: string;
}

// ── Enhanced Experiment Result v2 ──────────────────────────────────────────────
export interface ExperimentResultV2 {
  title: string;
  summary: string;
  verdict: 'success' | 'no_clear_change' | 'mixed';
  beforeMetrics: {
    averageMood: number;
    averageEnergy: number;
    averageSleepQuality: number;
    averageStress: number;
    dataPoints: number;
  };
  duringMetrics: {
    averageMood: number;
    averageEnergy: number;
    averageSleepQuality: number;
    averageStress: number;
    dataPoints: number;
    habitCompletionRate: number;
  };
  changes: Array<{
    metric: string;
    before: number;
    during: number;
    change: string;
    direction: 'improved' | 'declined' | 'no_clear_change';
  }>;
  interpretation: string;
  caveats: string;
  recommendation: string;
  nextExperimentSuggestion: string;
  generatedAt: string;
}

// ── Pattern Discovery ─────────────────────────────────────────────────────────
export interface DiscoveredPattern {
  id: string;
  title: string;
  observation: string;
  strength: 'strong' | 'moderate' | 'weak';
  type: 'positive' | 'neutral' | 'something_to_watch';
}

export interface PatternDiscoveryResult {
  patterns: DiscoveredPattern[];
  summary: string;
  generatedAt: string;
}

// ── Future Simulation ─────────────────────────────────────────────────────────
export type FutureTrend = 'improving' | 'stable' | 'declining' | 'slightly_improving' | 'slightly_declining' | 'uncertain';

export interface FutureMetricEstimate {
  trend: FutureTrend;
  description: string;
}

export interface FutureTimeframe {
  period: string;
  energy: FutureMetricEstimate;
  sleep: FutureMetricEstimate;
  stress: FutureMetricEstimate;
  mood: FutureMetricEstimate;
  activity: FutureMetricEstimate;
  overall: FutureMetricEstimate;
}

export interface FutureSimulationResult {
  summary: string;
  timeframes: FutureTimeframe[];
  keyInsights: string[];
  suggestion: string;
  generatedAt: string;
}

// ── Scenario Comparison ───────────────────────────────────────────────────────
export interface ScenarioMetricChange {
  current: number;
  projected: number;
  change: number;
}

export interface ScenarioMetrics {
  energy: ScenarioMetricChange;
  stress: ScenarioMetricChange;
  sleep: ScenarioMetricChange;
  mood: ScenarioMetricChange;
  overall: ScenarioMetricChange;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  isCustom: boolean;
}

export interface ScenarioResult {
  name: string;
  description: string;
  metrics: ScenarioMetrics;
  insight: string;
}

export interface ScenarioComparisonResult {
  summary: string;
  scenarios: ScenarioResult[];
  recommendation: string;
  generatedAt: string;
}

// ── What-If Scenario ───────────────────────────────────────────────────────────
export interface WhatIfScenario {
  id: string;
  question: string;
  answer: string;
  generatedAt: string;
}

// ── Predefined Options ─────────────────────────────────────────────────────────
export const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'] as const;

export const GOAL_OPTIONS = [
  'Feel more energetic',
  'Sleep better',
  'Reduce stress',
  'Build healthy habits',
  'Understand my patterns',
  'Feel more balanced',
  'Improve mood',
  'Have more focus',
] as const;

export const SLEEP_HOURS = ['Less than 5', '5-6 hours', '7-8 hours', 'More than 8'] as const;

export const SLEEP_QUALITY_OPTIONS = ['Usually poor', 'Hit or miss', 'Usually good', 'Usually great'] as const;

export const ENERGY_PATTERN = [
  'Drained most of the day',
  'Low mornings, better later',
  'Steady throughout',
  'Up and down',
  'Depends on the day',
] as const;

export const ACTIVITY_LEVELS = [
  'Sedentary (little or no exercise)',
  'Lightly active (light walks)',
  'Moderately active (exercise 3-5x/week)',
  'Very active (exercise 6-7x/week)',
] as const;

export const CHECKIN_FREQUENCIES = [
  'Daily',
  'A few times a week',
  'When I feel like it',
] as const;

export const HABIT_CATEGORIES = {
  Sleep: ['Consistent bedtime', 'No screens before bed', '8+ hours sleep'],
  Movement: ['Daily walk', 'Regular workout', 'Stretching or yoga'],
  Nutrition: ['Eating breakfast', 'Drinking enough water', 'Limiting sugar'],
  Social: ['Talking to a friend', 'Quality time with someone', 'Asking for help'],
  Mindfulness: ['Meditation', 'Journaling', 'Deep breathing'],
  'Screen Time': ['No phone first hour', 'Limited social media', 'Digital sunset'],
} as const;

export const WENT_WELL_OPTIONS = [
  'Exercise',
  'Good conversation',
  'Ate well',
  'Got enough sleep',
  'Achieved something',
  'Spent time outdoors',
  'Felt connected',
  'Learned something',
  'Was productive',
  'Felt grateful',
] as const;

export const WAS_HARD_OPTIONS = [
  'Poor sleep',
  'Skipped meals',
  'Felt isolated',
  'Too much screen time',
  'Work stress',
  'Conflict',
  'Felt unmotivated',
  'Physical discomfort',
  'Bad weather',
  'Felt anxious',
] as const;

export const MOOD_EMOJIS = ['😔', '😟', '😐', '🙂', '😊'] as const;
export const MOOD_LABELS = ['Terrible', 'Bad', 'Okay', 'Good', 'Great'] as const;
export const ENERGY_LABELS = ['Exhausted', 'Tired', 'Okay', 'Good', 'Energized'] as const;
export const SLEEP_LABELS = ['Terrible', 'Poor', 'Okay', 'Good', 'Great'] as const;
export const STRESS_LABELS = ['Overwhelmed', 'High', 'Moderate', 'Low', 'Calm'] as const;

export const WHAT_IF_SUGGESTIONS = [
  'What if I slept 8 hours every night?',
  'What if I walked 20 minutes daily?',
  'What if I reduced screen time before bed?',
  'What if I meditated each morning?',
  'What if I ate breakfast every day?',
  'What if I talked to a friend daily?',
] as const;

export const OUTCOME_OPTIONS = ['mood', 'energy', 'sleep quality', 'overall well-being'] as const;

// ── Wearable Options ───────────────────────────────────────────────────────────
export const WEARABLE_SOURCES = ['apple_health', 'google_fit', 'garmin', 'fitbit', 'samsung_health', 'manual'] as const;
export const WEARABLE_LABELS: Record<string, string> = {
  apple_health: 'Apple Health',
  google_fit: 'Google Fit',
  garmin: 'Garmin',
  fitbit: 'Fitbit',
  samsung_health: 'Samsung Health',
  manual: 'Manual Entry',
};

// ── Lifestyle Options ──────────────────────────────────────────────────────────
export const CAFFEINE_OPTIONS = ['none', '1-2', '3-4', '5+'] as const;
export const CAFFEINE_LABELS = ['No caffeine', '1-2 cups', '3-4 cups', '5+ cups'] as const;

export const ALCOHOL_OPTIONS = ['none', '1-2', '3+'] as const;
export const ALCOHOL_LABELS = ['None', '1-2 drinks', '3+ drinks'] as const;

export const MEAL_REGULARITY = ['skipped_meals', 'irregular', 'mostly_regular', 'very_regular'] as const;
export const MEAL_REGULARITY_LABELS = ['Skipped meals', 'Irregular', 'Mostly regular', 'Very regular'] as const;

export const WATER_INTAKE = ['low', 'moderate', 'high'] as const;
export const WATER_INTAKE_LABELS = ['Low', 'Moderate', 'High'] as const;

export const OUTDOOR_TIME = ['none', 'less_30m', '30m_1h', '1h_plus'] as const;
export const OUTDOOR_TIME_LABELS = ['None', 'Less than 30 min', '30 min - 1 hour', '1+ hours'] as const;

export const SOCIAL_LEVEL = ['none', 'minimal', 'moderate', 'high'] as const;
export const SOCIAL_LEVEL_LABELS = ['None', 'Minimal', 'Moderate', 'High'] as const;

export const SCREEN_BEFORE_BED = ['none', 'less_30m', '30m_1h', '1h_plus'] as const;
export const SCREEN_BEFORE_BED_LABELS = ['None', 'Less than 30 min', '30 min - 1 hour', '1+ hours'] as const;

export const WORK_LOAD = ['none', 'light', 'moderate', 'heavy'] as const;
export const WORK_LOAD_LABELS = ['No work', 'Light', 'Moderate', 'Heavy'] as const;

// ── Cognitive Test Options ─────────────────────────────────────────────────────
export const COGNITIVE_TEST_TYPES = ['reaction_time', 'working_memory', 'sustained_attention', 'digit_span'] as const;
export const COGNITIVE_TEST_LABELS: Record<string, string> = {
  reaction_time: 'Reaction Time',
  working_memory: 'Working Memory',
  sustained_attention: 'Sustained Attention',
  digit_span: 'Digit Span',
};

// ── Conversational Check-in Questions ──────────────────────────────────────────
export const DAILY_QUESTIONS = [
  { id: 'energy_desc', question: 'How would you describe your energy today?', category: 'energy' as const },
  { id: 'sleep_desc', question: 'How did you sleep last night?', category: 'sleep' as const },
  { id: 'stress_desc', question: 'What\'s your stress level like today?', category: 'stress' as const },
  { id: 'mood_desc', question: 'How are you feeling overall today?', category: 'mood' as const },
  { id: 'social_desc', question: 'Did you interact with anyone today?', category: 'social' as const },
  { id: 'activity_desc', question: 'Were you physically active today?', category: 'activity' as const },
  { id: 'highlight', question: 'What was the best part of your day so far?', category: 'mood' as const },
  { id: 'challenge', question: 'Anything challenging happen today?', category: 'stress' as const },
] as const;

// ── Timeline Events ───────────────────────────────────────────────────────────
export type TimelineEventType =
  | 'data_collection_started'
  | 'pattern_discovered'
  | 'experiment_started'
  | 'experiment_completed'
  | 'experiment_failed'
  | 'future_predicted'
  | 'baseline_computed'
  | 'milestone_reached'
  | 'insight_learned'
  | 'checkin_streak';

export interface TimelineEvent {
  id: string;
  date: string;
  type: TimelineEventType;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ── Learned Insights (cross-module knowledge) ─────────────────────────────────
export interface LearnedInsight {
  id: string;
  category: 'sleep' | 'energy' | 'mood' | 'stress' | 'activity' | 'social' | 'nutrition' | 'general';
  finding: string;
  evidence: string;
  strength: 'strong' | 'moderate' | 'weak';
  source: 'pattern_discovery' | 'experiment' | 'baseline' | 'checkin_analysis';
  discoveredAt: string;
  lastUpdated: string;
}

// ── Health Scientist Chat ─────────────────────────────────────────────────────
export interface HealthScientistMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  dataUsed?: string[];
  suggestedAction?: {
    type: 'create_experiment' | 'view_patterns' | 'view_timeline' | 'check_baseline';
    label: string;
  };
}
