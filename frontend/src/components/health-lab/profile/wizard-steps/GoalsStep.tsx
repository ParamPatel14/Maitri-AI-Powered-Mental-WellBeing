import React from 'react';
import type { UserProfile } from '../../../../types/health-lab';
import { GOAL_OPTIONS, CHECKIN_FREQUENCIES } from '../../../../types/health-lab';
import { CheckboxGroup } from '../../shared/ScaleOptions';

interface Props {
  profile: UserProfile;
  update: (p: Partial<UserProfile>) => void;
}

export const GoalsStep: React.FC<Props> = ({ profile, update }) => (
  <div className="space-y-6">
    <div>
      <label className="block text-sm font-semibold text-zinc-700 mb-3">What matters most to you right now?</label>
      <CheckboxGroup
        options={GOAL_OPTIONS}
        selected={profile.generalGoals}
        onChange={goals => update({ generalGoals: goals })}
        columns={2}
      />
    </div>

    <div>
      <label className="block text-sm font-semibold text-zinc-700 mb-2">How often do you want to check in?</label>
      <select
        value={profile.checkInFrequency}
        onChange={e => update({ checkInFrequency: e.target.value })}
        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-all appearance-none"
      >
        {CHECKIN_FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
    </div>

    <div>
      <label className="block text-sm font-semibold text-zinc-700 mb-3">Would you like to try personal experiments?</label>
      <p className="text-xs text-zinc-400 mb-3">Test whether specific habits affect your well-being.</p>
      <div className="flex gap-3">
        <button
          onClick={() => update({ wantsExperiments: true })}
          className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all ${
            profile.wantsExperiments
              ? 'bg-violet-50 border-violet-400 text-violet-700'
              : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
          }`}
        >
          Yes, I like testing things
        </button>
        <button
          onClick={() => update({ wantsExperiments: false })}
          className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all ${
            !profile.wantsExperiments
              ? 'bg-violet-50 border-violet-400 text-violet-700'
              : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
          }`}
        >
          Not yet
        </button>
      </div>
    </div>
  </div>
);
