import React, { useState, useEffect } from 'react';
import { Activity, Stethoscope, Play, Loader2, AlertCircle, ArrowLeft, Zap } from 'lucide-react';
import { useMaitriStream } from '../context/MaitriStreamContext';
import type { RehabRecommendation } from '../types/maitri';

type Phase = 'input' | 'loading' | 'results' | 'error';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const MAX_CHARS = 500;

// ── Exercise card ──────────────────────────────────────────────────────────────
const ExerciseCard: React.FC<{
  rec: RehabRecommendation;
  available: boolean;
  onStart: (exercise: string) => void;
}> = ({ rec, available, onStart }) => (
  <div className="relative flex flex-col gap-4 p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60 hover:bg-emerald-500/10 transition-all duration-200">
    {/* Exercise name */}
    <div>
      <h3 className="text-lg font-bold mb-2 text-zinc-50">{rec.exercise}</h3>
      <p className="text-sm text-zinc-400 leading-relaxed">{rec.reason}</p>
    </div>

    {/* Action — disabled when module not yet implemented, but visually identical */}
    <button
      onClick={() => available && onStart(rec.exercise)}
      disabled={!available}
      title={available ? undefined : 'This exercise module is not yet available'}
      className="mt-auto flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-semibold rounded-xl px-4 py-2.5 text-sm transition-all duration-150 "
    >
      <Play className="w-4 h-4 fill-current" />
      Start Session
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
  const { availableExercises, startSession, isConnecting, error: wsError } = useMaitriStream();

  const [problem,         setProblem]         = useState('');
  const [phase,           setPhase]           = useState<Phase>('input');
  const [recommendations, setRecommendations] = useState<RehabRecommendation[]>([]);
  const [apiError,        setApiError]        = useState<string | null>(null);
  const [quickExercise,   setQuickExercise]   = useState('');

  // Seed the quick-start dropdown once the registry loads
  useEffect(() => {
    if (availableExercises.length > 0 && !quickExercise) {
      setQuickExercise(availableExercises[0]);
    }
  }, [availableExercises, quickExercise]);

  const isAvailable = (exercise: string) =>
    availableExercises.some(e => e.toLowerCase() === exercise.toLowerCase());

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
  if (isConnecting) return <ConnectingOverlay />;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
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
    );
  }

  // ── Results ──────────────────────────────────────────────────────────────────
  if (phase === 'results') {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 px-6 py-10">
        {/* Ambient */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Header */}
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

          {/* Exercise cards */}
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
                  onStart={startSession}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
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
            onClick={() => quickExercise && startSession(quickExercise)}
            disabled={!quickExercise}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] text-zinc-100 font-semibold rounded-xl px-4 py-2.5 text-sm transition-all duration-150 border border-zinc-700"
          >
            <Zap className="w-4 h-4 text-emerald-400" />
            Quick Start
          </button>
        </div>
      </div>
    </div>
  );
};
