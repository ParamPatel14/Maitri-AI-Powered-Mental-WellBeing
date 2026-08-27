import React, { useState } from 'react';
import type { UserProfile } from '../../../../types/health-lab';
import { HABIT_CATEGORIES } from '../../../../types/health-lab';

interface Props {
  profile: UserProfile;
  update: (p: Partial<UserProfile>) => void;
}

export const ActivityHabitsStep: React.FC<Props> = ({ profile, update }) => {
  const [expandedCat, setExpandedCat] = useState<string | null>(Object.keys(HABIT_CATEGORIES)[0]);

  const toggleHabit = (habit: string) => {
    const current = profile.currentHabits;
    if (current.includes(habit)) {
      update({ currentHabits: current.filter(h => h !== habit) });
    } else {
      update({ currentHabits: [...current, habit] });
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">Select the habits you already follow. This helps us understand your baseline.</p>

      <div className="space-y-2">
        {Object.entries(HABIT_CATEGORIES).map(([category, habits]) => {
          const isExpanded = expandedCat === category;
          const selectedCount = habits.filter(h => profile.currentHabits.includes(h)).length;

          return (
            <div key={category} className="border border-zinc-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedCat(isExpanded ? null : category)}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
              >
                <span className="font-semibold text-sm text-zinc-700">{category}</span>
                {selectedCount > 0 && (
                  <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                    {selectedCount}
                  </span>
                )}
              </button>
              {isExpanded && (
                <div className="p-3 space-y-2">
                  {habits.map(habit => {
                    const isChecked = profile.currentHabits.includes(habit);
                    return (
                      <button
                        key={habit}
                        onClick={() => toggleHabit(habit)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-all duration-150 ${
                          isChecked
                            ? 'bg-violet-50 border-violet-400 text-violet-700'
                            : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                          isChecked ? 'bg-violet-500 border-violet-500' : 'border-zinc-300'
                        }`}>
                          {isChecked && (
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
