import React, { useState, useEffect } from 'react';
import { Activity, Stethoscope, Play, Loader2, AlertCircle, ArrowLeft, Zap } from 'lucide-react';
import { useMaitriStream } from '../context/MaitriStreamContext';
import type { RehabRecommendation } from '../types/maitri';

type Phase = 'input' | 'loading' | 'results' | 'error';

const RAW_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
const BACKEND_URL = String(RAW_BACKEND_URL)
  .replace('https://localhost', 'http://127.0.0.1')
  .replace('http://localhost', 'http://127.0.0.1');
const MAX_CHARS = 500;

const EXERCISE_TUTORIALS: Record<string, { recommendedView: 'side' | 'front' | 'either'; setup: string[]; steps: string[]; tips: string[] }> = {
  'Squats': {
    recommendedView: 'side',
    setup: [
      'Place camera at hip height or slightly lower.',
      'Stand far enough back so your full body is visible.',
      'Turn to a side view (profile) for best depth + torso tracking.',
    ],
    steps: [
      'Feet about shoulder-width, chest up.',
      'Lower down under control until comfortable depth.',
      'Drive up through heels to stand tall.',
    ],
    tips: [
      'Keep knees tracking over toes.',
      'Keep torso stable; avoid excessive forward lean.',
    ],
  },
  'Push-ups': {
    recommendedView: 'side',
    setup: [
      'Place camera near floor level, about 1 meter to the side.',
      'Keep your full body in frame (head to ankles).',
    ],
    steps: [
      'Start in a straight plank line.',
      'Lower chest toward floor with control.',
      'Press back up; chest and hips rise together.',
    ],
    tips: [
      'Keep core tight; avoid hips sagging or piking.',
      'Elbows around 45° from the body.',
    ],
  },
  'Planks': {
    recommendedView: 'side',
    setup: [
      'Place camera near floor level, about 1 meter to the side.',
      'Keep shoulders, hips, and ankles visible.',
    ],
    steps: [
      'Set a straight line from shoulders to ankles.',
      'Hold while breathing steadily.',
    ],
    tips: [
      'Avoid hips dropping or lifting.',
      'Keep head neutral (don’t look forward/up).',
    ],
  },
  'Bicep Curls': {
    recommendedView: 'either',
    setup: [
      'Stand facing the camera or at a 45° angle.',
      'Keep shoulders and elbows visible.',
    ],
    steps: [
      'Start with arms extended down.',
      'Curl up smoothly, then lower with control.',
    ],
    tips: [
      'Keep elbows close to your torso.',
      'Avoid swinging your body.',
    ],
  },
  'Shoulder Press': {
    recommendedView: 'either',
    setup: [
      'Stand facing the camera with full upper body visible.',
      'Keep wrists, elbows, and shoulders in frame.',
    ],
    steps: [
      'Start with elbows down and hands near shoulder height.',
      'Press up overhead, then lower under control.',
    ],
    tips: [
      'Don’t arch your lower back.',
      'Move smoothly; avoid locking out aggressively.',
    ],
  },
};

// ── Exercise card ──────────────────────────────────────────────────────────────
const ExerciseCard: React.FC<{
  rec: RehabRecommendation;
  available: boolean;
  onOpen: (exercise: string) => void;
}> = ({ rec, available, onOpen }) => (
  <div className="relative flex flex-col gap-4 p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60 hover:bg-emerald-500/10 transition-all duration-200">
    {/* Exercise name */}
    <div>
      <h3 className="text-lg font-bold mb-2 text-zinc-50">{rec.exercise}</h3>
      <p className="text-sm text-zinc-400 leading-relaxed">{rec.reason}</p>
    </div>

    {/* Action — disabled when module not yet implemented, but visually identical */}
    <button
      onClick={() => onOpen(rec.exercise)}
      className="mt-auto flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-semibold rounded-xl px-4 py-2.5 text-sm transition-all duration-150 "
    >
      <Play className="w-4 h-4 fill-current" />
      View Tutorial
    </button>
  </div>
);

// ── Connecting overlay ─────────────────────────────────────────────────────────
const ConnectingOverlay: React.FC = () => (
  <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-zinc-50">
    <div className="flex flex-col items-center gap-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-800 border-t-emerald-500" />
      <h2 className="text-xl font-medium tracking-wide">Connecting to Maitri Core Service...</h2>
    </div>
  </div>
);

// ── Main screen ────────────────────────────────────────────────────────────────
export const RehabScreen: React.FC = () => {
  const { availableExercises, startSession, isConnecting, error: wsError, patient, goalMode, setPatientName, setGoalMode } = useMaitriStream();

  const [problem,         setProblem]         = useState('');
  const [phase,           setPhase]           = useState<Phase>('input');
  const [recommendations, setRecommendations] = useState<RehabRecommendation[]>([]);
  const [apiError,        setApiError]        = useState<string | null>(null);
  const [quickExercise,   setQuickExercise]   = useState('');
  const [tutorialFor,     setTutorialFor]     = useState<string | null>(null);

  // Seed the quick-start dropdown once the registry loads
  useEffect(() => {
    if (availableExercises.length > 0 && !quickExercise) {
      setQuickExercise(availableExercises[0]);
    }
  }, [availableExercises, quickExercise]);

  const isAvailable = (exercise: string) =>
    availableExercises.some(e => e.toLowerCase() === exercise.toLowerCase());

  const openTutorial = (exercise: string) => {
    setTutorialFor(exercise);
  };

  const tutorialModal = tutorialFor ? (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
      <div className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-950 text-zinc-50 shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-zinc-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Tutorial</div>
              <div className="text-2xl font-bold">{tutorialFor}</div>
              <div className="mt-2 text-sm text-zinc-400">
                {patient?.name ? `Patient: ${patient.name} • ` : ''}Mode: {goalMode}
              </div>
            </div>
            <button
              onClick={() => setTutorialFor(null)}
              className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-sm font-semibold"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {(() => {
            const t = EXERCISE_TUTORIALS[tutorialFor] || EXERCISE_TUTORIALS['Squats'];
            const view = t.recommendedView;
            const viewLabel = view === 'either' ? 'Either view' : (view === 'side' ? 'Side view' : 'Front view');
            const canStart = isAvailable(tutorialFor);

            return (
              <>
                <div className="md:col-span-1">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Camera</div>
                  <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/40">
                    <div className="text-sm font-semibold">{viewLabel}</div>
                    <div className="text-xs text-zinc-400 mt-1">We calibrate first to reduce false positives.</div>
                  </div>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 gap-4">
                  <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/40">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Setup</div>
                    <ul className="text-sm text-zinc-200 space-y-1">
                      {t.setup.map((s) => <li key={s}>• {s}</li>)}
                    </ul>
                  </div>
                  <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/40">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">How To</div>
                    <ul className="text-sm text-zinc-200 space-y-1">
                      {t.steps.map((s) => <li key={s}>• {s}</li>)}
                    </ul>
                  </div>
                  <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/40">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Tips</div>
                    <ul className="text-sm text-zinc-200 space-y-1">
                      {t.tips.map((s) => <li key={s}>• {s}</li>)}
                    </ul>
                  </div>
                </div>
              </>
            );
          })()}
        </div>

        <div className="p-6 border-t border-zinc-900 flex flex-col md:flex-row gap-3 justify-end">
          <button
            onClick={() => setTutorialFor(null)}
            className="px-5 py-3 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-sm font-semibold"
          >
            Back
          </button>
          <button
            onClick={() => { if (isAvailable(tutorialFor)) { startSession(tutorialFor); setTutorialFor(null); } }}
            disabled={!isAvailable(tutorialFor)}
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 text-sm font-bold"
          >
            Start (Calibration First)
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const handleGeneratePlan = async () => {
    if (!problem.trim()) return;
    setPhase('loading');
    setApiError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/recommend`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ problem }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to get recommendations');
      }
      const data = await res.json();
      setRecommendations(data.recommendations ?? []);
      setPhase('results');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setPhase('error');
    }
  };

  // Connecting overlay takes priority
  if (isConnecting) return <>{tutorialModal}<ConnectingOverlay /></>;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <>
        {tutorialModal}
        <div className="flex h-screen w-full flex-col items-center justify-center bg-zinc-950 text-zinc-50 gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl" />
            <Loader2 className="relative w-16 h-16 text-emerald-500 animate-spin" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-1">Analysing your condition...</h2>
            <p className="text-zinc-400 text-sm">Maitri AI is building your personalised plan</p>
          </div>
        </div>
      </>
    );
  }

  // ── Results ──────────────────────────────────────────────────────────────────
  if (phase === 'results') {
    return (
      <>
        {tutorialModal}
        <div className="min-h-screen bg-zinc-950 text-zinc-50 px-6 py-10">
          <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto">
            <button
              onClick={() => setPhase('input')}
              className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors mb-8 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Assessment
            </button>

            <div className="flex items-center gap-3 mb-2">
              <Stethoscope className="w-7 h-7 text-emerald-500" />
              <h1 className="text-2xl font-bold">Your Personalised Rehab Plan</h1>
            </div>
            <p className="text-zinc-400 text-sm mb-8 ml-10">
              Based on: <span className="text-zinc-300 italic">"{problem}"</span>
            </p>

            {recommendations.length === 0 ? (
              <div className="text-center text-zinc-400 py-16">
                <p>No recommendations returned. Try rephrasing your problem.</p>
                <button
                  onClick={() => setPhase('input')}
                  className="mt-4 text-emerald-400 hover:text-emerald-300 underline text-sm"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recommendations.map(rec => (
                  <ExerciseCard
                    key={rec.exercise}
                    rec={rec}
                    available={isAvailable(rec.exercise)}
                    onOpen={openTutorial}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <>
        {tutorialModal}
        <div className="flex h-screen w-full flex-col items-center justify-center bg-zinc-950 text-zinc-50 gap-6 px-6">
          <div className="w-full max-w-md p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm text-red-300 mb-6">{apiError}</p>
            <button
              onClick={() => setPhase('input')}
              className="flex items-center gap-2 mx-auto text-sm font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Assessment
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Input (default landing page) ─────────────────────────────────────────────
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-zinc-950 text-zinc-50 px-6 overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl">
        {/* Logo / Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Activity className="w-6 h-6 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Maitri</h1>
        </div>
        <p className="text-zinc-400 text-sm mb-8 ml-1">AI-powered exercise rehabilitation</p>

        {/* WebSocket error banner */}
        {wsError && (
          <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{wsError}</p>
          </div>
        )}

        {/* Problem input card */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 mb-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope className="w-5 h-5 text-emerald-400" />
            <label className="font-semibold text-zinc-100">Describe your physical problem</label>
          </div>
          <textarea
            value={problem}
            onChange={e => setProblem(e.target.value.slice(0, MAX_CHARS))}
            placeholder="e.g. I have persistent knee pain after running, especially when going downstairs. My left knee swells after exercise..."
            rows={4}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-zinc-600">{problem.length} / {MAX_CHARS}</span>
            <button
              onClick={handleGeneratePlan}
              disabled={!problem.trim()}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] text-zinc-950 font-semibold rounded-xl px-5 py-2.5 text-sm transition-all duration-150"
            >
              <Stethoscope className="w-4 h-4" />
              Generate My Rehab Plan
            </button>
          </div>
        </div>

        {/* Quick start divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-xs text-zinc-600 uppercase tracking-wider">or jump straight in</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 backdrop-blur-sm">
            <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Patient</label>
            <input
              value={patient?.name ?? ''}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Patient name (optional)"
              className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition-all"
            />
          </div>
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 backdrop-blur-sm">
            <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Goal Mode</label>
            <select
              value={goalMode}
              onChange={(e) => setGoalMode(e.target.value as 'Rehab' | 'Strength' | 'Endurance')}
              className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition-all appearance-none"
            >
              <option value="Rehab">Rehab</option>
              <option value="Strength">Strength</option>
              <option value="Endurance">Endurance</option>
            </select>
          </div>
        </div>

        {/* Quick start */}
        <div className="flex gap-3">
          <select
            value={quickExercise}
            onChange={e => setQuickExercise(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition-all appearance-none"
          >
            {availableExercises.length === 0
              ? <option>Loading exercises...</option>
              : availableExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)
            }
          </select>
          <button
            onClick={() => quickExercise && openTutorial(quickExercise)}
            disabled={!quickExercise}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] text-zinc-100 font-semibold rounded-xl px-4 py-2.5 text-sm transition-all duration-150 border border-zinc-700"
          >
            <Zap className="w-4 h-4 text-emerald-400" />
            View Tutorial
          </button>
        </div>

        <div className="mt-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Tutorial Library</div>
            <div className="text-xs text-zinc-500">Pick any exercise to preview instructions</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(availableExercises.length ? availableExercises : ['Squats']).map((ex) => (
              <button
                key={ex}
                onClick={() => openTutorial(ex)}
                className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900 text-sm font-semibold"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>
      {tutorialModal}
    </div>
  );
};
