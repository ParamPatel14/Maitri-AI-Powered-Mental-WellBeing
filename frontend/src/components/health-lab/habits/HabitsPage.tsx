import React, { useState } from 'react';
import { CheckSquare, Plus, X } from 'lucide-react';
import { useHealthLab } from '../../../context/HealthLabContext';
import { SectionHeader } from '../shared/GlassCard';
import { today, subtractDays, formatShortDate, getDayOfWeek } from '../../../lib/date-utils';
import { HABIT_CATEGORIES } from '../../../types/health-lab';

export const HabitsPage: React.FC = () => {
  const { profile, habitLogs, toggleHabit, addTrackedHabit, removeTrackedHabit } = useHealthLab();
  const [showAddModal, setShowAddModal] = useState(false);

  const trackedHabits = profile?.trackedHabits ?? [];
  const weekDays = Array.from({ length: 7 }, (_, i) => subtractDays(today(), 6 - i));

  const getHabitLog = (date: string) => habitLogs.find(l => l.date === date);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <SectionHeader
        title="Habit Tracker"
        subtitle="This week's habits"
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all"
          >
            <Plus className="w-4 h-4" /> Add Habits
          </button>
        }
      />

      {trackedHabits.length === 0 ? (
        <div className="text-center py-16">
          <div className="p-4 rounded-2xl bg-zinc-100 border border-zinc-200 inline-block mb-4 text-zinc-400">
            <CheckSquare className="w-8 h-8" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No habits tracked yet</h3>
          <p className="text-zinc-500 text-sm mb-4">Add some habits to start tracking your daily patterns.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all"
          >
            Add Your First Habit
          </button>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b border-zinc-200 bg-zinc-50">
            <div className="px-4 py-3 text-xs text-zinc-400 uppercase tracking-wider font-semibold">Habit</div>
            {weekDays.map(day => (
              <div key={day} className={`px-2 py-3 text-center text-xs font-semibold ${day === today() ? 'text-violet-600 bg-violet-50' : 'text-zinc-500'}`}>
                <div>{getDayOfWeek(day)}</div>
                <div className="text-[10px] font-normal">{formatShortDate(day)}</div>
              </div>
            ))}
          </div>

          {/* Habit rows grouped by category */}
          {Object.entries(HABIT_CATEGORIES).map(([category, habits]) => {
            const trackedInCategory = habits.filter(h => trackedHabits.includes(h));
            if (trackedInCategory.length === 0) return null;

            return (
              <div key={category}>
                <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-100">
                  <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">{category}</span>
                </div>
                {trackedInCategory.map(habit => (
                  <div key={habit} className="grid grid-cols-[200px_repeat(7,1fr)] border-b border-zinc-100 last:border-b-0 group">
                    <div className="px-4 py-3 flex items-center justify-between">
                      <span className="text-sm text-zinc-700 truncate">{habit}</span>
                      <button
                        onClick={() => removeTrackedHabit(habit)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {weekDays.map(day => {
                      const log = getHabitLog(day);
                      const isChecked = log?.habits[habit] ?? false;
                      return (
                        <div key={day} className={`flex items-center justify-center ${day === today() ? 'bg-violet-50/50' : ''}`}>
                          <button
                            onClick={() => toggleHabit(day, habit)}
                            className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-150 ${
                              isChecked
                                ? 'bg-violet-500 border-violet-500 text-white'
                                : 'border-zinc-200 hover:border-zinc-400'
                            }`}
                          >
                            {isChecked && (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Add habit modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-6">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-bold text-lg">Add Habits to Track</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {Object.entries(HABIT_CATEGORIES).map(([category, habits]) => (
                <div key={category}>
                  <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-2">{category}</div>
                  <div className="space-y-1.5">
                    {habits.map(habit => {
                      const isTracked = trackedHabits.includes(habit);
                      return (
                        <button
                          key={habit}
                          onClick={() => isTracked ? removeTrackedHabit(habit) : addTrackedHabit(habit)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left text-sm transition-all ${
                            isTracked
                              ? 'bg-violet-50 border-violet-400 text-violet-700'
                              : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                            isTracked ? 'bg-violet-500 border-violet-500' : 'border-zinc-300'
                          }`}>
                            {isTracked && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          {habit}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-zinc-100">
              <button
                onClick={() => setShowAddModal(false)}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
