import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Gauge } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useHealthLab } from '../../../context/HealthLabContext';
import { today } from '../../../lib/date-utils';
import { calculateDailyReadiness, toReadinessRecord } from '../../../lib/readiness';
import type { ReadinessInput } from '../../../types/health-lab';

const ratingFields = [
  { key: 'sleepQuality', label: 'Sleep quality', options: ['Very poor', 'Poor', 'Okay', 'Good', 'Very good'] },
  { key: 'energy', label: 'Energy', options: ['Very low', 'Low', 'Okay', 'Good', 'Very high'] },
  { key: 'fatigue', label: 'Fatigue', options: ['None', 'Mild', 'Moderate', 'High', 'Very high'] },
  { key: 'mood', label: 'Mood', options: ['Very low', 'Low', 'Okay', 'Good', 'Very good'] },
] as const;

interface DailyReadinessCardProps {
  compact?: boolean;
}

export const DailyReadinessCard: React.FC<DailyReadinessCardProps> = ({ compact = false }) => {
  const {
    checkins, readinessInputs, readinessRecords, wearables, exerciseSessions,
    saveReadinessInput, saveReadinessRecord,
  } = useHealthLab();
  const date = today();
  const currentCheckin = checkins.find(item => item.date === date) ?? null;
  const supplemental = readinessInputs.find(item => item.date === date) ?? null;
  const assessment = useMemo(() => calculateDailyReadiness({
    date, asOf: new Date().toISOString(), checkin: currentCheckin,
    readinessInput: supplemental, wearables, sessions: exerciseSessions,
  }), [date, currentCheckin, supplemental, wearables, exerciseSessions]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const missingEssential = assessment.missingInputs.filter(field => field !== 'recent activity');
  const incomplete = missingEssential.length > 0;
  const needsInput = assessment.missingInputs.length > 0;
  const scoreColor = assessment.score == null ? '#a1a1aa' : assessment.score >= 80 ? '#059669' : assessment.score >= 50 ? '#d97706' : '#e11d48';
  const savedToday = readinessRecords.find(record => record.date === date && record.assessmentKey === assessment.assessmentKey);
  const inputTimestamps = [supplemental?.updatedAt, currentCheckin?.completedAt, ...wearables.filter(item => item.date === date).map(item => item.recordedAt)]
    .filter((value): value is string => Boolean(value && !Number.isNaN(new Date(value).getTime())));
  const inputsUpdatedAt = inputTimestamps.sort((a, b) => b.localeCompare(a))[0];
  const trend = readinessRecords.slice(-14).map(record => ({
    date: new Date(record.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: record.score,
  }));

  const saveInputs = () => {
    const input: ReadinessInput = { date, updatedAt: new Date().toISOString() };
    for (const field of ratingFields) {
      if (!draft[field.key]) continue;
      const value = Number(draft[field.key]) as 1 | 2 | 3 | 4 | 5;
      if (field.key === 'fatigue') input.fatigue = value;
      else if (field.key === 'mood') input.mood = value;
      else if (field.key === 'energy') input.energy = value;
      else input.sleepQuality = value;
    }
    if (draft.sleepDurationHours) input.sleepDurationHours = Number(draft.sleepDurationHours);
    if (draft.recentActivityMinutes !== undefined && draft.recentActivityMinutes !== '') input.recentActivityMinutes = Number(draft.recentActivityMinutes);
    saveReadinessInput(input);
    setDraft({});
  };

  const saveSnapshot = () => {
    const record = toReadinessRecord(assessment, new Date().toISOString());
    if (record) saveReadinessRecord(record);
  };

  const control = (key: string, label: string, choices: Array<[string, string]>) => (
    <label key={key} className="block text-xs font-medium text-zinc-600">
      {label}
      <select value={draft[key] ?? ''} onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))}
        className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-800 outline-none focus:border-emerald-500">
        <option value="">Choose…</option>
        {choices.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </label>
  );

  return (
    <section className={`rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm ${compact ? 'p-4' : 'mb-6 p-5 md:p-6'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${scoreColor} ${assessment.score ?? 0}%, #e4e4e7 0)` }}>
            <div className="grid h-[4.15rem] w-[4.15rem] place-items-center rounded-full bg-white text-center">
              <div><div className="font-mono text-2xl font-black leading-none text-zinc-900">{assessment.score ?? '—'}</div><div className="mt-1 text-[9px] uppercase tracking-wide text-zinc-400">/ 100</div></div>
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-800"><Gauge className="h-4 w-4" /> Daily Readiness</div>
            <div className="mt-1 text-lg font-bold capitalize text-zinc-900">{assessment.category === 'incomplete' ? 'Check-in needed' : `${assessment.category} readiness`}</div>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-600">{assessment.recommendation}</p>
            {!compact && <p className="mt-2 text-[11px] text-zinc-400">{inputsUpdatedAt ? `Inputs last updated ${new Date(inputsUpdatedAt).toLocaleString()}` : 'No wellness inputs recorded for today yet'}</p>}
          </div>
        </div>
        <div className="flex gap-2 sm:shrink-0">
          {assessment.score != null && !savedToday && <button onClick={saveSnapshot} className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50">Save today’s score</button>}
          {compact && <Link to="/health-lab/dashboard" className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">Details <ArrowUpRight className="h-3.5 w-3.5" /></Link>}
        </div>
      </div>

      <div className={`mt-4 grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-5'}`}>
        {assessment.factors.map(factor => (
          <div key={factor.key} className="rounded-xl border border-zinc-100 bg-white/85 px-3 py-2">
            <div className="flex justify-between gap-1 text-xs font-semibold text-zinc-700"><span>{factor.label}</span><span>{factor.normalizedScore == null ? '—' : Math.round(factor.normalizedScore)}</span></div>
            <div className="mt-1 text-[10px] text-zinc-500">{factor.value}</div>
            <div className="mt-1 text-[9px] text-zinc-400">Base weight {factor.weight}% · {factor.source}</div>
          </div>
        ))}
      </div>

      {assessment.missingInputs.length > 0 && <p className="mt-3 text-xs text-amber-800">{incomplete ? 'Needed for a score: ' : 'Optional context missing: '}{assessment.missingInputs.join(', ')}. Missing values are not treated as zero.</p>}

      {needsInput && (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-zinc-800">{incomplete ? 'Quick readiness check-in' : 'Add optional activity context'}</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {missingEssential.includes('sleep duration') && <label className="text-xs font-medium text-zinc-600">Sleep duration (hours)<input type="number" min="0" max="24" step="0.5" value={draft.sleepDurationHours ?? ''} onChange={event => setDraft(current => ({ ...current, sleepDurationHours: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-xs outline-none focus:border-emerald-500" /></label>}
            {ratingFields.map(field => {
              const alreadyAnswered = field.key === 'mood' ? currentCheckin?.mood != null : field.key === 'energy' ? currentCheckin?.energy != null : field.key === 'sleepQuality' ? currentCheckin?.sleepQuality != null : supplemental?.fatigue != null;
              if (alreadyAnswered) return null;
              const targetKey = field.key === 'fatigue' ? 'fatigue' : field.key;
              return control(targetKey, field.label, field.options.map((text, index) => [String(index + 1), `${index + 1} · ${text}`] as [string, string]));
            })}
            {assessment.missingInputs.includes('recent activity') && <>
              {control('recentActivityMinutes', 'Physical activity in past 48 hours (optional)', [['0', 'None'], ['15', 'About 15 min'], ['30', 'About 30 min'], ['60', 'About 1 hour'], ['90', '90+ min']])}
            </>}
          </div>
          <button onClick={saveInputs} disabled={!Object.values(draft).some(value => value !== '')} className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">Save check-in</button>
        </div>
      )}

      {!compact && <div className="mt-5 border-t border-emerald-100 pt-4">
        <div className="mb-2 flex items-center justify-between"><div className="text-xs font-semibold text-zinc-700">Saved readiness history</div><div className="text-[10px] text-zinc-400">Snapshots stay unchanged when inputs change</div></div>
        {trend.length > 1 ? <div className="h-28"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend}><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={28} /><Tooltip /><Line dataKey="score" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div> : <p className="text-xs text-zinc-500">Save today’s score to begin a readiness trend.</p>}
        {savedToday && <div className="mt-2 text-[10px] text-zinc-400">Last saved {new Date(savedToday.timestamp).toLocaleString()}</div>}
        <p className="mt-2 text-[10px] text-zinc-400">Categories: high 80–100, moderate 50–79, low 0–49. These are general wellness guidance, not a medical assessment. You choose whether and how to exercise.</p>
      </div>}
    </section>
  );
};
