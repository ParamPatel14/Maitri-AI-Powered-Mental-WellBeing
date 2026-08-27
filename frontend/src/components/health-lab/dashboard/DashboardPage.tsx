import React from 'react';
import { Flame, TrendingUp, Sparkles } from 'lucide-react';
import { useHealthLab } from '../../../context/HealthLabContext';
import { SectionHeader } from '../shared/GlassCard';
import { getLastNDays } from '../../../lib/date-utils';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

export const DashboardPage: React.FC = () => {
  const { profile, checkins, habitLogs, streak, insights, experiments } = useHealthLab();

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

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <SectionHeader
        title={`Welcome back, ${profile?.name || 'there'}`}
        subtitle="Here's your wellness overview"
      />

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
                    formatter={(v: number) => [`${v}/5`, 'Mood']}
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
                    formatter={(v: number) => [`${v}/5`, 'Energy']}
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
                <span>{activeExperiment.startDate} → {activeExperiment.endDate}</span>
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
