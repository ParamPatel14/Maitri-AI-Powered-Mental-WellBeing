import React from 'react';
import type { UserProfile } from '../../../../types/health-lab';

interface Props {
  profile: UserProfile;
}

export const SummaryStep: React.FC<Props> = ({ profile }) => (
  <div className="space-y-4">
    <p className="text-sm text-zinc-500">Here's what we've gathered. You can always change this later in your profile.</p>

    <div className="grid grid-cols-2 gap-3">
      <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
        <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-1">Name</div>
        <div className="text-sm font-medium">{profile.name}</div>
      </div>
      <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
        <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-1">Age Range</div>
        <div className="text-sm font-medium">{profile.ageRange}</div>
      </div>
      <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
        <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-1">Activity Level</div>
        <div className="text-sm font-medium">{profile.activityLevel.split('(')[0].trim()}</div>
      </div>
      <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
        <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-1">Sleep</div>
        <div className="text-sm font-medium">{profile.sleepHoursTypical}</div>
      </div>
    </div>

    {profile.generalGoals.length > 0 && (
      <div className="p-4 rounded-xl bg-violet-50 border border-violet-200">
        <div className="text-xs text-violet-600 uppercase tracking-wider font-semibold mb-2">Your Goals</div>
        <div className="flex flex-wrap gap-2">
          {profile.generalGoals.map(g => (
            <span key={g} className="text-xs bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full font-medium">{g}</span>
          ))}
        </div>
      </div>
    )}

    {profile.currentHabits.length > 0 && (
      <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
        <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-2">Current Habits ({profile.currentHabits.length})</div>
        <div className="flex flex-wrap gap-1.5">
          {profile.currentHabits.map(h => (
            <span key={h} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-1 rounded-full">{h}</span>
          ))}
        </div>
      </div>
    )}

    <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
      <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-1">Check-in Frequency</div>
      <div className="text-sm font-medium">{profile.checkInFrequency}</div>
    </div>
  </div>
);
