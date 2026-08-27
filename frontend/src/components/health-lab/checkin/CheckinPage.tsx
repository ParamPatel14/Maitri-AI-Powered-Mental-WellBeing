import React, { useState } from 'react';
import { CalendarCheck, Check } from 'lucide-react';
import { useHealthLab } from '../../../context/HealthLabContext';
import { SectionHeader } from '../shared/GlassCard';
import { ScaleOptions } from '../shared/ScaleOptions';
import { today, formatDisplayDate } from '../../../lib/date-utils';
import type { DailyCheckin } from '../../../types/health-lab';
import {
  MOOD_EMOJIS, MOOD_LABELS, ENERGY_LABELS, SLEEP_LABELS, STRESS_LABELS,
  WENT_WELL_OPTIONS, WAS_HARD_OPTIONS,
} from '../../../types/health-lab';

export const CheckinPage: React.FC = () => {
  const { todaysCheckin, saveCheckin } = useHealthLab();
  const [mood, setMood] = useState<number | null>(todaysCheckin?.mood ?? null);
  const [energy, setEnergy] = useState<number | null>(todaysCheckin?.energy ?? null);
  const [sleepQuality, setSleepQuality] = useState<number | null>(todaysCheckin?.sleepQuality ?? null);
  const [stressLevel, setStressLevel] = useState<number | null>(todaysCheckin?.stressLevel ?? null);
  const [wentWell, setWentWell] = useState<string | null>(todaysCheckin?.wentWell ?? null);
  const [wasHard, setWasHard] = useState<string | null>(todaysCheckin?.wasHard ?? null);
  const [saved, setSaved] = useState(false);

  const canSave = mood !== null && energy !== null && sleepQuality !== null && stressLevel !== null;

  const handleSave = () => {
    if (!canSave) return;
    const checkin: DailyCheckin = {
      date: today(),
      mood: mood as DailyCheckin['mood'],
      energy: energy as DailyCheckin['energy'],
      sleepQuality: sleepQuality as DailyCheckin['sleepQuality'],
      stressLevel: stressLevel as DailyCheckin['stressLevel'],
      wentWell,
      wasHard,
      completedAt: new Date().toISOString(),
    };
    saveCheckin(checkin);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <SectionHeader
        title="Daily Check-in"
        subtitle={formatDisplayDate(today())}
      />

      <div className="space-y-6">
        {/* Mood */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <label className="block text-sm font-semibold text-zinc-700 mb-3">How are you feeling today?</label>
          <ScaleOptions labels={MOOD_LABELS} value={mood} onChange={setMood} emojis={MOOD_EMOJIS} />
        </div>

        {/* Energy */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <label className="block text-sm font-semibold text-zinc-700 mb-3">Energy level?</label>
          <ScaleOptions labels={ENERGY_LABELS} value={energy} onChange={setEnergy} />
        </div>

        {/* Sleep */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <label className="block text-sm font-semibold text-zinc-700 mb-3">How did you sleep last night?</label>
          <ScaleOptions labels={SLEEP_LABELS} value={sleepQuality} onChange={setSleepQuality} />
        </div>

        {/* Stress */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <label className="block text-sm font-semibold text-zinc-700 mb-3">Stress level?</label>
          <ScaleOptions labels={STRESS_LABELS} value={stressLevel} onChange={setStressLevel} />
        </div>

        {/* Went well */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <label className="block text-sm font-semibold text-zinc-700 mb-2">What went well today?</label>
          <p className="text-xs text-zinc-400 mb-3">Optional</p>
          <select
            value={wentWell || ''}
            onChange={e => setWentWell(e.target.value || null)}
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-all appearance-none"
          >
            <option value="">Skip</option>
            {WENT_WELL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>

        {/* Was hard */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <label className="block text-sm font-semibold text-zinc-700 mb-2">What was hard today?</label>
          <p className="text-xs text-zinc-400 mb-3">Optional</p>
          <select
            value={wasHard || ''}
            onChange={e => setWasHard(e.target.value || null)}
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-all appearance-none"
          >
            <option value="">Skip</option>
            {WAS_HARD_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm ${
            saved
              ? 'bg-emerald-500 text-white'
              : canSave
                ? 'bg-violet-600 hover:bg-violet-700 text-white'
                : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
          }`}
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <CalendarCheck className="w-4 h-4" />
              Log My Day
            </>
          )}
        </button>
      </div>
    </div>
  );
};
