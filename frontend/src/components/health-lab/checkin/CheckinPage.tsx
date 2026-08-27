import React, { useState } from 'react';
import { CalendarCheck, Check } from 'lucide-react';
import { useHealthLab } from '../../../context/HealthLabContext';
import { SectionHeader } from '../shared/GlassCard';
import { ScaleOptions } from '../shared/ScaleOptions';
import { today, formatDisplayDate } from '../../../lib/date-utils';
import { saveLifestyleEntry } from '../../../lib/data-collection';
import type { DailyCheckin, LifestyleEntry } from '../../../types/health-lab';
import {
  MOOD_EMOJIS, MOOD_LABELS, ENERGY_LABELS, SLEEP_LABELS, STRESS_LABELS,
  WENT_WELL_OPTIONS, WAS_HARD_OPTIONS,
  CAFFEINE_OPTIONS, CAFFEINE_LABELS,
  WATER_INTAKE, WATER_INTAKE_LABELS,
  SCREEN_BEFORE_BED, SCREEN_BEFORE_BED_LABELS,
} from '../../../types/health-lab';

export const CheckinPage: React.FC = () => {
  const { todaysCheckin, saveCheckin } = useHealthLab();
  const [mood, setMood] = useState<number | null>(todaysCheckin?.mood ?? null);
  const [energy, setEnergy] = useState<number | null>(todaysCheckin?.energy ?? null);
  const [sleepQuality, setSleepQuality] = useState<number | null>(todaysCheckin?.sleepQuality ?? null);
  const [stressLevel, setStressLevel] = useState<number | null>(todaysCheckin?.stressLevel ?? null);
  const [wentWell, setWentWell] = useState<string | null>(todaysCheckin?.wentWell ?? null);
  const [wasHard, setWasHard] = useState<string | null>(todaysCheckin?.wasHard ?? null);
  const [caffeine, setCaffeine] = useState<LifestyleEntry['caffeineIntake']>('none');
  const [water, setWater] = useState<LifestyleEntry['waterIntake']>('moderate');
  const [screenTime, setScreenTime] = useState<LifestyleEntry['screenTimeBeforeBed']>('none');
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

    // Also save lifestyle entry
    const lifestyle: LifestyleEntry = {
      date: today(),
      caffeineIntake: caffeine,
      alcoholIntake: 'none',
      mealRegularity: 'mostly_regular',
      waterIntake: water,
      outdoorTime: 'none',
      socialInteraction: 'moderate',
      screenTimeBeforeBed: screenTime,
      WorkHours: 'moderate',
      completedAt: new Date().toISOString(),
    };
    saveLifestyleEntry(lifestyle);

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

        {/* Lifestyle quick-log */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <label className="block text-sm font-semibold text-zinc-700 mb-3">Quick lifestyle check</label>
          <p className="text-xs text-zinc-400 mb-4">Helps us understand your daily patterns</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Caffeine today</label>
              <div className="flex gap-1.5">
                {CAFFEINE_LABELS.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setCaffeine(CAFFEINE_OPTIONS[i])}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                      caffeine === CAFFEINE_OPTIONS[i]
                        ? 'bg-violet-50 border-violet-400 text-violet-700'
                        : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Water intake</label>
              <div className="flex gap-1.5">
                {WATER_INTAKE_LABELS.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setWater(WATER_INTAKE[i])}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                      water === WATER_INTAKE[i]
                        ? 'bg-violet-50 border-violet-400 text-violet-700'
                        : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Screen time before bed</label>
              <div className="flex gap-1.5">
                {SCREEN_BEFORE_BED_LABELS.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setScreenTime(SCREEN_BEFORE_BED[i])}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                      screenTime === SCREEN_BEFORE_BED[i]
                        ? 'bg-violet-50 border-violet-400 text-violet-700'
                        : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
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
