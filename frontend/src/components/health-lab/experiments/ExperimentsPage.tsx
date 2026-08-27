import React, { useState } from 'react';
import { FlaskConical, Plus, Play, BarChart3, RefreshCw, ArrowLeft } from 'lucide-react';
import { useHealthLab } from '../../../context/HealthLabContext';
import { SectionHeader, EmptyState } from '../shared/GlassCard';
import { analyzeExperiment } from '../../../lib/ai-service';
import { today, addDays, daysBetween } from '../../../lib/date-utils';
import { HABIT_CATEGORIES, OUTCOME_OPTIONS } from '../../../types/health-lab';
import type { Experiment } from '../../../types/health-lab';

type WizardStep = 'pick' | 'duration' | 'review';

export const ExperimentsPage: React.FC = () => {
  const { profile, checkins, habitLogs, experiments, saveExperiment } = useHealthLab();
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>('pick');
  const [selectedHabit, setSelectedHabit] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState('mood');
  const [duration, setDuration] = useState<7 | 14>(7);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const trackedHabits = profile?.trackedHabits ?? [];
  const activeExperiment = experiments.find(e => e.status === 'active');

  const allHabits = trackedHabits.length > 0
    ? trackedHabits
    : Object.values(HABIT_CATEGORIES).flat();

  const handleStartExperiment = () => {
    if (!selectedHabit) return;
    const exp: Experiment = {
      id: crypto.randomUUID(),
      hypothesis: `I think ${selectedHabit} will improve my ${selectedOutcome}`,
      habitToTrack: selectedHabit,
      outcomeToTrack: selectedOutcome,
      duration,
      startDate: today(),
      endDate: addDays(today(), duration),
      status: 'active',
      result: null,
      createdAt: new Date().toISOString(),
    };
    saveExperiment(exp);
    setShowWizard(false);
    resetWizard();
  };

  const handleAnalyze = async (exp: Experiment) => {
    setAnalyzingId(exp.id);
    try {
      const result = await analyzeExperiment(exp, checkins, habitLogs);
      saveExperiment({ ...exp, status: 'complete', result });
    } catch (e) {
      console.error('Analysis failed:', e);
    } finally {
      setAnalyzingId(null);
    }
  };

  const resetWizard = () => {
    setWizardStep('pick');
    setSelectedHabit('');
    setSelectedOutcome('mood');
    setDuration(7);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <SectionHeader
        title="Personal Experiments"
        subtitle="Test whether habits affect your well-being"
        action={
          !activeExperiment ? (
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all"
            >
              <Plus className="w-4 h-4" /> New Experiment
            </button>
          ) : null
        }
      />

      {activeExperiment && (
        <div className="mb-8 p-6 bg-violet-50 border border-violet-200 rounded-2xl">
          <div className="flex items-center gap-2 text-violet-700 mb-2">
            <Play className="w-4 h-4" />
            <span className="font-semibold text-sm">Active Experiment</span>
          </div>
          <p className="text-sm text-zinc-700 mb-3">{activeExperiment.hypothesis}</p>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span>{activeExperiment.startDate} → {activeExperiment.endDate}</span>
            <span>{daysBetween(today(), activeExperiment.endDate!)} days remaining</span>
          </div>
          <div className="mt-3 h-2 bg-violet-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all"
              style={{
                width: `${Math.min(100, (daysBetween(activeExperiment.startDate!, today()) / activeExperiment.duration) * 100)}%`
              }}
            />
          </div>
        </div>
      )}

      {experiments.length === 0 && !showWizard ? (
        <EmptyState
          icon={<FlaskConical className="w-8 h-8" />}
          title="No experiments yet"
          description="Create a personal experiment to test whether a specific habit affects your mood, energy, or sleep."
          action={
            <button
              onClick={() => setShowWizard(true)}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all"
            >
              Start Your First Experiment
            </button>
          }
        />
      ) : !showWizard ? (
        <div className="space-y-4">
          {experiments.map(exp => (
            <div key={exp.id} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-2 ${
                    exp.status === 'active' ? 'bg-violet-100 text-violet-700' :
                    exp.status === 'complete' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-zinc-100 text-zinc-600'
                  }`}>
                    {exp.status === 'active' ? 'Active' : exp.status === 'complete' ? 'Complete' : exp.status}
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{exp.hypothesis}</h3>
                  <p className="text-xs text-zinc-500">{exp.startDate} → {exp.endDate} ({exp.duration} days)</p>
                </div>
                {exp.status === 'active' && !analyzingId && (
                  <button
                    onClick={() => handleAnalyze(exp)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Analyze Results
                  </button>
                )}
                {analyzingId === exp.id && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-100 text-zinc-500 text-xs font-semibold">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Analyzing...
                  </div>
                )}
              </div>

              {exp.result && (
                <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <p className="text-sm text-zinc-700 mb-3">{exp.result.summary}</p>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center p-2 rounded-lg bg-white border border-emerald-100">
                      <div className="text-lg font-bold text-emerald-600">{Math.round(exp.result.habitCompletionRate * 100)}%</div>
                      <div className="text-[10px] text-zinc-400">Completion</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white border border-emerald-100">
                      <div className="text-lg font-bold text-violet-600">{exp.result.moodWithHabit.toFixed(1)}</div>
                      <div className="text-[10px] text-zinc-400">Mood w/ habit</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white border border-emerald-100">
                      <div className="text-lg font-bold text-zinc-600">{exp.result.moodWithoutHabit.toFixed(1)}</div>
                      <div className="text-[10px] text-zinc-400">Mood w/o habit</div>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-700 font-medium">{exp.result.recommendation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {/* New Experiment Wizard */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-6">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-bold text-lg">New Experiment</h3>
              <button onClick={() => { setShowWizard(false); resetWizard(); }} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-400">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {wizardStep === 'pick' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2">Which habit do you want to test?</label>
                    <select
                      value={selectedHabit}
                      onChange={e => setSelectedHabit(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-all appearance-none"
                    >
                      <option value="">Select a habit...</option>
                      {allHabits.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2">What do you think it will affect?</label>
                    <select
                      value={selectedOutcome}
                      onChange={e => setSelectedOutcome(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-all appearance-none"
                    >
                      {OUTCOME_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {wizardStep === 'duration' && (
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-zinc-700 mb-3">How long?</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDuration(7)}
                      className={`flex-1 py-4 rounded-xl border text-sm font-semibold transition-all ${
                        duration === 7 ? 'bg-violet-50 border-violet-400 text-violet-700' : 'bg-white border-zinc-200 text-zinc-500'
                      }`}
                    >
                      1 week
                    </button>
                    <button
                      onClick={() => setDuration(14)}
                      className={`flex-1 py-4 rounded-xl border text-sm font-semibold transition-all ${
                        duration === 14 ? 'bg-violet-50 border-violet-400 text-violet-700' : 'bg-white border-zinc-200 text-zinc-500'
                      }`}
                    >
                      2 weeks
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 'review' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-violet-50 border border-violet-200">
                    <div className="text-xs text-violet-600 uppercase tracking-wider font-semibold mb-2">Your Experiment</div>
                    <p className="text-sm font-medium text-zinc-800">I think <span className="text-violet-600">{selectedHabit}</span> will improve my <span className="text-violet-600">{selectedOutcome}</span>.</p>
                    <div className="mt-3 text-xs text-zinc-500">
                      <p>Start: {today()}</p>
                      <p>End: {addDays(today(), duration)}</p>
                      <p>Duration: {duration} days</p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">Just check in daily and track your habits as usual. At the end, we'll analyse whether this habit actually makes a difference for you.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-100 flex justify-between">
              <button
                onClick={() => {
                  if (wizardStep === 'pick') { setShowWizard(false); resetWizard(); }
                  else setWizardStep(wizardStep === 'duration' ? 'pick' : 'duration');
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-100 transition-all"
              >
                Back
              </button>
              {wizardStep !== 'review' ? (
                <button
                  onClick={() => setWizardStep(wizardStep === 'pick' ? 'duration' : 'review')}
                  disabled={wizardStep === 'pick' && !selectedHabit}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleStartExperiment}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all"
                >
                  Start Experiment
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
