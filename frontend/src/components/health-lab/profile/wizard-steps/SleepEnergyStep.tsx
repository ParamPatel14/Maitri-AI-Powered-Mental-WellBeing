import React from 'react';
import type { UserProfile } from '../../../../types/health-lab';
import { SLEEP_HOURS, SLEEP_QUALITY_OPTIONS, ENERGY_PATTERN } from '../../../../types/health-lab';

interface Props {
  profile: UserProfile;
  update: (p: Partial<UserProfile>) => void;
}

export const SleepEnergyStep: React.FC<Props> = ({ profile, update }) => (
  <div className="space-y-6">
    <div>
      <label className="block text-sm font-semibold text-zinc-700 mb-2">How much do you usually sleep?</label>
      <select
        value={profile.sleepHoursTypical}
        onChange={e => update({ sleepHoursTypical: e.target.value })}
        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-all appearance-none"
      >
        {SLEEP_HOURS.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
    </div>

    <div>
      <label className="block text-sm font-semibold text-zinc-700 mb-2">How's your sleep quality usually?</label>
      <select
        value={profile.sleepQualityBaseline}
        onChange={e => update({ sleepQualityBaseline: e.target.value })}
        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-all appearance-none"
      >
        {SLEEP_QUALITY_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
      </select>
    </div>

    <div>
      <label className="block text-sm font-semibold text-zinc-700 mb-2">Your typical energy pattern?</label>
      <select
        value={profile.energyPattern || ENERGY_PATTERN[2]}
        onChange={e => update({ energyPattern: e.target.value })}
        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-all appearance-none"
      >
        {ENERGY_PATTERN.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
    </div>
  </div>
);
