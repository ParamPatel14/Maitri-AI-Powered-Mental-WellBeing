import React from 'react';
import { Activity, ArrowRight, CalendarCheck, Dumbbell, Flame, Gauge, Heart, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useHealthLab } from '../../../context/HealthLabContext';
import { SectionHeader } from '../shared/GlassCard';
import { getLastNDays, today } from '../../../lib/date-utils';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { DailyReadinessCard } from '../shared/DailyReadinessCard';
import { buildWellnessToday } from '../../../lib/wellness-today';

export const DashboardPage: React.FC = () => {
  const { profile, checkins, habitLogs, streak, insights, experiments, exerciseSessions, readinessInputs, wearables, wellnessActivities } = useHealthLab();

  const last30 = getLastNDays(30);
  const last7 = getLastNDays(7);

  // Compute mood/energy data for sparklines
  const moodData = last30.map(date => {
    const c = checkins.find(ci => ci.date === date);
    return { date, value: c?.mood ?? null };
  }).filter(d => d.value !== null);

  const energyData = last30.map(date => {
    const c = checkins.find(ci => ci.date === date);
    return { date, value: c?.energy ?? null };
  }).filter(d => d.value !== null);

  // Habit completion this week
  const thisWeekLogs = habitLogs.filter(l => last7.includes(l.date));
  const trackedHabits = profile?.trackedHabits ?? [];
  let totalPossible = 0;
  let totalDone = 0;
  thisWeekLogs.forEach(log => {
    trackedHabits.forEach(h => {
      totalPossible++;
      if (log.habits[h]) totalDone++;
    });
  });
  const habitCompletion = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;

  // Recent insights
  const recentInsights = insights.slice(0, 3);

  // Active experiment
  const activeExperiment = experiments.find(e => e.status === 'active');
  const wellnessToday = buildWellnessToday({
    date: today(),
    asOf: new Date().toISOString(),
    checkins,
    readinessInputs,
    wearables,
    sessions: exerciseSessions,
    habitLog: habitLogs.find(item => item.date === today()),
    profile,
    activities: wellnessActivities,
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <SectionHeader
        title={`Welcome back, ${profile?.name || 'there'}`}
        subtitle="Here's your wellness overview"
      />

      <section aria-labelledby="wellness-today-title" className="mb-7 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-zinc-100 bg-gradient-to-r from-emerald-50 via-white to-violet-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Your connected wellness overview</div>
            <h2 id="wellness-today-title" className="mt-1 text-xl font-black tracking-tight text-zinc-900">MY WELLNESS TODAY</h2>
            <p className="mt-1 text-sm text-zinc-500">Readiness, daily check-ins, movement, and habits in one place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/physical" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"><Zap className="h-4 w-4" />Start Exercise</Link>
            <Link to="/health-lab/checkin" className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"><Heart className="h-4 w-4 text-violet-600" />Health Lab</Link>
            <Link to="/health-lab/timeline" className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"><Activity className="h-4 w-4 text-sky-600" />Wellness Timeline</Link>
            <a href="#readiness-details" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"><Gauge className="h-4 w-4" />Readiness Details</a>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800"><Gauge className="h-4 w-4" />Today’s readiness</div>
            <div className="mt-2 flex items-end gap-2">
              <span className="font-mono text-4xl font-black leading-none text-zinc-900">{wellnessToday.readiness.score ?? '—'}</span>
              <span className="pb-1 text-xs font-semibold capitalize text-zinc-600">{wellnessToday.readiness.category === 'incomplete' ? 'check-in needed' : `${wellnessToday.readiness.category} readiness`}</span>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-zinc-600">
              <span>Energy <b className="text-zinc-900">{wellnessToday.energy == null ? '—' : `${wellnessToday.energy}/5`}</b></span>
              <span>Mood <b className="text-zinc-900">{wellnessToday.mood == null ? '—' : `${wellnessToday.mood}/5`}</b></span>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600"><Dumbbell className="h-4 w-4 text-emerald-700" />Last completed workout</div>
            {wellnessToday.lastWorkout ? <>
              <div className="mt-2 text-base font-bold text-zinc-900">{wellnessToday.lastWorkout.exercise}</div>
              <div className="mt-1 text-xs text-zinc-500">{wellnessToday.lastWorkout.repCount} reps · {Math.round(wellnessToday.lastWorkout.durationSeconds / 60)} min · {wellnessToday.lastWorkout.date}</div>
              <div className="mt-1 text-[10px] text-zinc-400">{wellnessToday.lastWorkout.completionStatus === 'completed' ? 'Completed' : 'Interrupted'}</div>
            </> : <p className="mt-3 text-sm text-zinc-400">No completed exercise session yet.</p>}
          </div>

          <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-violet-800"><CalendarCheck className="h-4 w-4" />Habit progress today</div>
            {wellnessToday.habitCompletionPercent == null
              ? <p className="mt-3 text-sm text-zinc-500">Choose habits to track in Health Lab.</p>
              : <><div className="mt-2 text-2xl font-black text-zinc-900">{wellnessToday.completedHabits}<span className="text-sm font-semibold text-zinc-500"> / {wellnessToday.trackedHabits} done</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-violet-100"><div className="h-full rounded-full bg-violet-500" style={{ width: `${wellnessToday.habitCompletionPercent}%` }} /></div><div className="mt-1 text-[10px] text-zinc-500">{wellnessToday.habitCompletionPercent}% of today’s tracked habits</div></>}
          </div>

          <div className="rounded-2xl border border-zinc-200 p-4 sm:col-span-2 lg:col-span-1">
            <div className="mb-2 text-xs font-semibold text-zinc-700">Recent exercise performance</div>
            {wellnessToday.recentPerformance.length ? <div className="space-y-2">
              {wellnessToday.recentPerformance.map(session => <div key={session.id} className="flex items-center justify-between gap-2 text-xs"><span className="truncate font-medium text-zinc-700">{session.exercise} <span className="text-zinc-400">· {session.date}</span></span><span className="shrink-0 text-zinc-500">{session.repCount} reps{session.formConsistencyScore == null ? '' : ` · ${Math.round(session.formConsistencyScore)}% form`}</span></div>)}
            </div> : <p className="text-sm text-zinc-400">Session metrics will appear here after exercise.</p>}
          </div>

          <div className="rounded-2xl border border-zinc-200 p-4 sm:col-span-2">
            <div className="mb-2 flex items-center justify-between"><div className="text-xs font-semibold text-zinc-700">Recent wellness activity</div><Link to="/health-lab/timeline" className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-800">View timeline <ArrowRight className="h-3 w-3" /></Link></div>
            {wellnessToday.recentActivities.length ? <div className="grid gap-2 sm:grid-cols-3">
              {wellnessToday.recentActivities.map(activity => <div key={activity.id} className="min-w-0 rounded-xl bg-zinc-50 px-3 py-2"><div className="truncate text-xs font-semibold text-zinc-700">{activity.title}</div><div className="mt-1 line-clamp-2 text-[10px] text-zinc-500">{activity.summary}</div></div>)}
            </div> : <p className="text-sm text-zinc-400">Check-ins, habits, and exercise sessions will show here.</p>}
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:col-span-2 lg:col-span-3">
            <div className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><div><div className="text-xs font-bold uppercase tracking-wide text-amber-800">A suggestion for today</div><p className="mt-1 text-sm leading-relaxed text-zinc-700">{wellnessToday.suggestion}</p></div></div>
          </div>
        </div>
      </section>

      <section id="readiness-details" aria-labelledby="readiness-details-title" className="scroll-mt-5">
        <h2 id="readiness-details-title" className="sr-only">Readiness details</h2>
        <DailyReadinessCard />
      </section>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Streak */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-500 mb-3">
            <Flame className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-semibold">Streak</span>
          </div>
          <div className="text-4xl font-black font-mono text-zinc-800">{streak}</div>
          <div className="text-xs text-zinc-400 mt-1">consecutive days</div>
        </div>

        {/* Mood trend */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-500 mb-3">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-semibold">Mood</span>
          </div>
          {moodData.length > 1 ? (
            <div className="h-12">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={moodData}>
                  <XAxis dataKey="date" hide />
                  <YAxis domain={[1, 5]} hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: '0.75rem', fontSize: 12 }}
                    labelFormatter={() => ''}
                    formatter={v => [`${v ?? '—'}/5`, 'Mood']}
                  />
                  <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-12 flex items-center text-xs text-zinc-400">Not enough data yet</div>
          )}
          <div className="text-xs text-zinc-400 mt-1">last 30 days</div>
        </div>

        {/* Energy trend */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-500 mb-3">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-semibold">Energy</span>
          </div>
          {energyData.length > 1 ? (
            <div className="h-12">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={energyData}>
                  <XAxis dataKey="date" hide />
                  <YAxis domain={[1, 5]} hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: '0.75rem', fontSize: 12 }}
                    labelFormatter={() => ''}
                    formatter={v => [`${v ?? '—'}/5`, 'Energy']}
                  />
                  <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-12 flex items-center text-xs text-zinc-400">Not enough data yet</div>
          )}
          <div className="text-xs text-zinc-400 mt-1">last 30 days</div>
        </div>

        {/* Habit completion */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-500 mb-3">
            <span className="text-xs uppercase tracking-wider font-semibold">Habits</span>
          </div>
          <div className="relative w-16 h-16">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e4e4e7" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.5" fill="none" stroke="#8b5cf6" strokeWidth="3"
                strokeDasharray={`${habitCompletion} ${100 - habitCompletion}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-zinc-800">
              {habitCompletion}%
            </div>
          </div>
          <div className="text-xs text-zinc-400 mt-2">this week</div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent insights */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold">Recent Insights</span>
          </div>
          {recentInsights.length === 0 ? (
            <p className="text-sm text-zinc-400 py-4">No insights yet. Complete a few check-ins to unlock AI analysis.</p>
          ) : (
            <div className="space-y-3">
              {recentInsights.map(insight => (
                <div key={insight.id} className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                  <div className="text-sm font-medium mb-1">{insight.title}</div>
                  <div className="text-xs text-zinc-500 line-clamp-2">{insight.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active experiment */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-semibold">Active Experiment</span>
          </div>
          {activeExperiment ? (
            <div className="p-4 rounded-xl bg-violet-50 border border-violet-200">
              <div className="text-sm font-medium mb-2">{activeExperiment.hypothesis}</div>
              <div className="flex items-center gap-2 text-xs text-violet-600">
                <span>{activeExperiment.startDate} â†’ {activeExperiment.endDate}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-400 py-4">No active experiments. Start one to test your hypotheses.</p>
          )}
        </div>
      </div>
    </div>
  );
};
