import React from 'react';
import type { UserProfile } from '../../../../types/health-lab';
import { AGE_RANGES } from '../../../../types/health-lab';

interface Props {
  profile: UserProfile;
  update: (p: Partial<UserProfile>) => void;
}

export const BasicInfoStep: React.FC<Props> = ({ profile, update }) => (
  <div className="space-y-6">
    <div>
      <label className="block text-sm font-semibold text-zinc-700 mb-2">What should we call you?</label>
      <input
        type="text"
        value={profile.name}
        onChange={e => update({ name: e.target.value })}
        placeholder="Your name"
        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
        autoFocus
      />
    </div>

    <div>
      <label className="block text-sm font-semibold text-zinc-700 mb-2">Your age range</label>
      <select
        value={profile.ageRange}
        onChange={e => update({ ageRange: e.target.value as UserProfile['ageRange'] })}
        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-all appearance-none"
      >
        {AGE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
    </div>

    <div>
      <label className="block text-sm font-semibold text-zinc-700 mb-2">What best describes you right now?</label>
      <select
        value={profile.activityLevel}
        onChange={e => update({ activityLevel: e.target.value })}
        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-all appearance-none"
      >
        <option value="Sedentary (little or no exercise)">Sedentary (little or no exercise)</option>
        <option value="Lightly active (light walks)">Lightly active (light walks)</option>
        <option value="Moderately active (exercise 3-5x/week)">Moderately active (exercise 3-5x/week)</option>
        <option value="Very active (exercise 6-7x/week)">Very active (exercise 6-7x/week)</option>
      </select>
    </div>
  </div>
);
