import React, { useState } from 'react';
import { useMaitriStream } from '../context/MaitriStreamContext';
import { Activity, Play, AlertCircle } from 'lucide-react';

export const OnboardingScreen: React.FC = () => {
  const { availableExercises, startSession, isConnecting, error } = useMaitriStream();
  const [selectedExercise, setSelectedExercise] = useState<string>('Squats');

  if (isConnecting) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-800 border-t-emerald-500"></div>
          <h2 className="text-xl font-medium tracking-wide">Connecting to Maitri Core Service...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-zinc-950 text-zinc-50 overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center justify-center mb-8 gap-3">
          <Activity className="w-8 h-8 text-emerald-500" />
          <h1 className="text-3xl font-bold tracking-tight">Maitri Core</h1>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Select Exercise Module</label>
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all appearance-none"
            >
              {availableExercises.map((ex) => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => startSession(selectedExercise)}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-xl px-4 py-3 transition-all active:scale-[0.98]"
          >
            <Play className="w-5 h-5 fill-current" />
            Start Session
          </button>
        </div>
      </div>
    </div>
  );
};
