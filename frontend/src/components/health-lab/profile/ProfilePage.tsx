import React, { useState } from 'react';
import { User, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useHealthLab } from '../../../context/HealthLabContext';
import { SectionHeader } from '../shared/GlassCard';
import { CheckboxGroup } from '../shared/ScaleOptions';
import { GOAL_OPTIONS, CHECKIN_FREQUENCIES } from '../../../types/health-lab';
import type { UserProfile } from '../../../types/health-lab';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, saveProfile, resetAll } = useHealthLab();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UserProfile>(profile!);
  const [showReset, setShowReset] = useState(false);

  if (!profile) return null;

  const updateDraft = (partial: Partial<UserProfile>) => {
    setDraft(prev => ({ ...prev, ...partial }));
  };

  const handleSave = () => {
    saveProfile(draft);
    setEditing(false);
  };

  const handleReset = () => {
    resetAll();
    navigate('/');
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/health-lab/dashboard')}
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-800 transition-colors text-sm font-medium mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <SectionHeader
        title="Your Profile"
        subtitle="Manage your wellness settings"
        action={
          !editing ? (
            <button
              onClick={() => { setDraft(profile); setEditing(true); }}
              className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-semibold transition-all"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all"
              >
                Save Changes
              </button>
            </div>
          )
        }
      />

      {editing ? (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Name</label>
              <input
                type="text"
                value={draft.name}
                onChange={e => updateDraft({ name: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Age Range</label>
              <select
                value={draft.ageRange}
                onChange={e => updateDraft({ ageRange: e.target.value as UserProfile['ageRange'] })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-all appearance-none"
              >
                {['18-24', '25-34', '35-44', '45-54', '55-64', '65+'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Activity Level</label>
              <select
                value={draft.activityLevel}
                onChange={e => updateDraft({ activityLevel: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-all appearance-none"
              >
                {['Sedentary (little or no exercise)', 'Lightly active (light walks)', 'Moderately active (exercise 3-5x/week)', 'Very active (exercise 6-7x/week)'].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Sleep Hours</label>
              <select
                value={draft.sleepHoursTypical}
                onChange={e => updateDraft({ sleepHoursTypical: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-all appearance-none"
              >
                {['Less than 5', '5-6 hours', '7-8 hours', 'More than 8'].map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
            <label className="block text-sm font-semibold text-zinc-700 mb-3">Goals</label>
            <CheckboxGroup
              options={GOAL_OPTIONS}
              selected={draft.generalGoals}
              onChange={goals => updateDraft({ generalGoals: goals })}
              columns={2}
            />
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
            <label className="block text-sm font-semibold text-zinc-700 mb-2">Check-in Frequency</label>
            <select
              value={draft.checkInFrequency}
              onChange={e => updateDraft({ checkInFrequency: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-all appearance-none"
            >
              {CHECKIN_FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-violet-100 border border-violet-200">
                <User className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <div className="font-semibold">{profile.name}</div>
                <div className="text-xs text-zinc-400">{profile.ageRange} years</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Activity</div>
                <div className="text-sm font-medium mt-0.5">{profile.activityLevel.split('(')[0].trim()}</div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Sleep</div>
                <div className="text-sm font-medium mt-0.5">{profile.sleepHoursTypical}</div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Check-in</div>
                <div className="text-sm font-medium mt-0.5">{profile.checkInFrequency}</div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Experiments</div>
                <div className="text-sm font-medium mt-0.5">{profile.wantsExperiments ? 'Enabled' : 'Disabled'}</div>
              </div>
            </div>
          </div>

          {profile.generalGoals.length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
              <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-3">Goals</div>
              <div className="flex flex-wrap gap-2">
                {profile.generalGoals.map(g => (
                  <span key={g} className="text-xs bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full font-medium">{g}</span>
                ))}
              </div>
            </div>
          )}

          {profile.currentHabits.length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
              <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-3">Current Habits ({profile.currentHabits.length})</div>
              <div className="flex flex-wrap gap-1.5">
                {profile.currentHabits.map(h => (
                  <span key={h} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-1 rounded-full">{h}</span>
                ))}
              </div>
            </div>
          )}

          {/* Danger zone */}
          <div className="bg-white border border-red-200 rounded-2xl p-6 shadow-sm">
            <div className="text-xs text-red-500 uppercase tracking-wider font-semibold mb-2">Danger Zone</div>
            <p className="text-sm text-zinc-500 mb-4">This will delete all your data and reset the app.</p>
            {!showReset ? (
              <button
                onClick={() => setShowReset(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold transition-all"
              >
                <Trash2 className="w-4 h-4" /> Reset All Data
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowReset(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-600 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all"
                >
                  Yes, Delete Everything
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
