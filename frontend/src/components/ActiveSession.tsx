import React from 'react';
import { PerformanceHUD } from './PerformanceHUD';
import { TelemetryStack } from './TelemetryStack';
import { useMaitriStream } from '../context/MaitriStreamContext';
import { LogOut } from 'lucide-react';

export const ActiveSession: React.FC = () => {
  const { currentExercise, stopSession, patient, goalMode } = useMaitriStream();

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-50 text-zinc-950 overflow-hidden">
      <header className="h-16 shrink-0 flex items-center justify-between px-6 border-b border-zinc-200 bg-white/80 backdrop-blur-sm z-20">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <h1 className="font-semibold text-lg tracking-wide">
            Maitri Core <span className="text-zinc-400 font-normal">/</span> {currentExercise}
          </h1>
          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-500">
            {patient?.name ? <span className="px-2 py-1 rounded-full border border-zinc-200 bg-zinc-50">{patient.name}</span> : null}
            <span className="px-2 py-1 rounded-full border border-zinc-200 bg-zinc-50">{goalMode}</span>
          </div>
        </div>
        <button 
          onClick={stopSession}
          className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-200"
        >
          <LogOut className="w-4 h-4" />
          End Session
        </button>
      </header>

      <div className="flex-1 flex min-h-0">
        <div className="w-2/3 h-full">
          <PerformanceHUD />
        </div>
        <div className="w-1/3 h-full border-l border-zinc-200 bg-white/80">
          <TelemetryStack />
        </div>
      </div>
    </div>
  );
};
