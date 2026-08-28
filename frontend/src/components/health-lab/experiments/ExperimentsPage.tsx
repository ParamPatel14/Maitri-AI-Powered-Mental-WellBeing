import React, { useState } from 'react';
import { FlaskConical, Plus, Play, BarChart3, RefreshCw, ArrowLeft, Check, Calendar, Target, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { useHealthLab } from '../../../context/HealthLabContext';
import { SectionHeader, EmptyState } from '../shared/GlassCard';
import { createExperimentPlan, analyzeExperimentV2 } from '../../../lib/ai-service';
import { today, addDays, daysBetween } from '../../../lib/date-utils';
import { ScaleOptions } from '../shared/ScaleOptions';
import type { Experiment, ExperimentPlan, ExperimentResultV2 } from '../../../types/health-lab';
import { ENERGY_LABELS, MOOD_LABELS, SLEEP_LABELS, STRESS_LABELS } from '../../../types/health-lab';

type WizardStep = 'idea' | 'plan' | 'review';

export const ExperimentsPage: React.FC = () => {
  const { profile, checkins, habitLogs, experiments, saveExperiment, addTimelineEvent } = useHealthLab();
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>('idea');
  const [hypothesis, setHypothesis] = useState('');
  const [plan, setPlan] = useState<ExperimentPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  // Daily tracking state for active experiments
  const [trackingMood, setTrackingMood] = useState<number | null>(null);
  const [trackingEnergy, setTrackingEnergy] = useState<number | null>(null);
  const [trackingSleep, setTrackingSleep] = useState<number | null>(null);
  const [trackingStress, setTrackingStress] = useState<number | null>(null);
  const [trackingSaved, setTrackingSaved] = useState(false);

  const activeExperiment = experiments.find(e => e.status === 'active');
  const completedExperiments = experiments.filter(e => e.status === 'complete');
  const [viewingResult, setViewingResult] = useState<ExperimentResultV2 | null>(null);

  const PRESET_IDEAS = [
    'I want to see whether sleeping more makes me feel better',
    'I want to test if daily walks improve my energy',
    'I want to see if less screen time before bed helps my sleep',
    'I want to test if meditation reduces my stress',
    'I want to see if eating breakfast improves my mood',
  ];

  const handleCreatePlan = async () => {
    if (!hypothesis.trim()) return;
    setPlanLoading(true);
    try {
      const result = await createExperimentPlan(profile!, checkins, hypothesis);
      setPlan(result);
      setWizardStep('plan');
    } catch {
      // Fallback plan if AI fails
      setPlan({
        title: 'My Experiment',
        hypothesis,
        goal: 'Find out if this habit makes a difference',
        duration: 14,
        dailyInstructions: 'Try to maintain this habit each day and check in daily.',
        trackingMetrics: ['mood', 'energy', 'sleep_quality', 'stress'],
        successCriteria: 'Consistent improvement in at least one tracked metric',
        notes: 'Remember: consistency is key. Even small changes matter.',
      });
      setWizardStep('plan');
    } finally {
      setPlanLoading(false);
    }
  };

  const handleStartExperiment = () => {
    if (!plan) return;
    const exp: Experiment = {
      id: crypto.randomUUID(),
      hypothesis: plan.hypothesis,
      habitToTrack: plan.title,
      outcomeToTrack: plan.trackingMetrics[0] || 'mood',
      duration: (plan.duration === 7 || plan.duration === 14) ? plan.duration : 14,
      startDate: today(),
      endDate: addDays(today(), plan.duration),
      status: 'active',
      result: null,
      createdAt: new Date().toISOString(),
      plan,
    };
    saveExperiment(exp);
    addTimelineEvent({
      id: crypto.randomUUID(),
      date: today(),
      type: 'experiment_started',
      title: `Started experiment: ${plan.title}`,
      description: plan.hypothesis,
      metadata: { experimentId: exp.id, duration: plan.duration },
      createdAt: new Date().toISOString(),
    });
    setShowWizard(false);
    resetWizard();
  };

  const handleTrackDay = () => {
    if (trackingMood === null || trackingEnergy === null || trackingSleep === null || trackingStress === null) return;

    setTrackingSaved(true);
    setTimeout(() => {
      setTrackingSaved(false);
      setTrackingMood(null);
      setTrackingEnergy(null);
      setTrackingSleep(null);
      setTrackingStress(null);
    }, 1500);
  };

  const handleAnalyze = async (exp: Experiment) => {
    setAnalyzingId(exp.id);
    try {
      const startDate = exp.startDate!;

      // Before = checkins from 2 weeks before experiment to start
      const beforeStart = addDays(startDate, -14);
      const beforeCheckins = checkins.filter(c => c.date >= beforeStart && c.date < startDate);

      // During = checkins during experiment period
      const duringCheckins = checkins.filter(c => c.date >= startDate && c.date <= exp.endDate!);
      const duringHabits = habitLogs.filter(h => h.date >= startDate && h.date <= exp.endDate!);

      const result = await analyzeExperimentV2(exp, beforeCheckins, duringCheckins, duringHabits, []);
      saveExperiment({
        ...exp,
        status: 'complete',
        result: {
          summary: result.summary,
          habitCompletionRate: result.duringMetrics.habitCompletionRate,
          moodWithHabit: result.duringMetrics.averageMood,
          moodWithoutHabit: result.beforeMetrics.averageMood,
          recommendation: result.recommendation,
          generatedAt: result.generatedAt,
        },
      });
      addTimelineEvent({
        id: crypto.randomUUID(),
        date: today(),
        type: result.verdict === 'success' ? 'experiment_completed' : 'experiment_failed',
        title: result.title,
        description: result.summary,
        metadata: { experimentId: exp.id, verdict: result.verdict },
        createdAt: new Date().toISOString(),
      });
      setViewingResult(result);
    } catch (e) {
      console.error('Analysis failed:', e);
    } finally {
      setAnalyzingId(null);
    }
  };

  const resetWizard = () => {
    setWizardStep('idea');
    setHypothesis('');
    setPlan(null);
  };

  const daysRemaining = activeExperiment ? daysBetween(today(), activeExperiment.endDate!) : 0;
  const daysElapsed = activeExperiment ? daysBetween(activeExperiment.startDate!, today()) : 0;
  const progress = activeExperiment ? Math.min(100, (daysElapsed / activeExperiment.duration) * 100) : 0;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <SectionHeader
        title="Personal Experiments"
        subtitle="Test whether habits affect your well-being"
        action={
          !activeExperiment && !showWizard ? (
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all"
            >
              <Plus className="w-4 h-4" /> New Experiment
            </button>
          ) : null
        }
      />

      {/* Active Experiment - Daily Tracking */}
      {activeExperiment && !showWizard && (
        <div className="mb-8">
          <div className="p-6 bg-violet-50 border border-violet-200 rounded-2xl mb-4">
            <div className="flex items-center gap-2 text-violet-700 mb-2">
              <Play className="w-4 h-4" />
              <span className="font-semibold text-sm">Active Experiment</span>
            </div>
            <p className="text-sm text-zinc-700 mb-2 font-medium">{activeExperiment.plan?.title || activeExperiment.habitToTrack}</p>
            <p className="text-xs text-zinc-500 mb-3">{activeExperiment.plan?.hypothesis || activeExperiment.hypothesis}</p>
            <div className="flex items-center gap-4 text-xs text-zinc-500 mb-3">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{activeExperiment.startDate} → {activeExperiment.endDate}</span>
              <span className="font-semibold text-violet-600">{daysRemaining} days remaining</span>
            </div>
            <div className="h-2 bg-violet-100 rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            {activeExperiment.plan && (
              <div className="mt-4 p-3 rounded-xl bg-white border border-violet-100">
                <p className="text-xs font-semibold text-zinc-600 mb-1">Daily instructions:</p>
                <p className="text-xs text-zinc-500">{activeExperiment.plan.dailyInstructions}</p>
              </div>
            )}
          </div>

          {/* Quick Daily Tracking */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-sm text-zinc-700 mb-4">How are you feeling today?</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 mb-2 block">Mood</label>
                <ScaleOptions labels={MOOD_LABELS} value={trackingMood} onChange={setTrackingMood} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-2 block">Energy</label>
                <ScaleOptions labels={ENERGY_LABELS} value={trackingEnergy} onChange={setTrackingEnergy} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-2 block">Sleep quality</label>
                <ScaleOptions labels={SLEEP_LABELS} value={trackingSleep} onChange={setTrackingSleep} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-2 block">Stress level</label>
                <ScaleOptions labels={STRESS_LABELS} value={trackingStress} onChange={setTrackingStress} />
              </div>
              <button
                onClick={() => handleTrackDay()}
                disabled={trackingMood === null || trackingEnergy === null || trackingSleep === null || trackingStress === null}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                  trackingSaved
                    ? 'bg-emerald-500 text-white'
                    : trackingMood !== null && trackingEnergy !== null && trackingSleep !== null && trackingStress !== null
                      ? 'bg-violet-600 hover:bg-violet-700 text-white'
                      : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                }`}
              >
                {trackingSaved ? <><Check className="w-4 h-4" /> Logged!</> : <><Check className="w-4 h-4" /> Log Today</>}
              </button>
            </div>
          </div>

          {/* Analyze button (show when experiment period is over or nearly over) */}
          {daysRemaining <= 2 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => handleAnalyze(activeExperiment)}
                disabled={analyzingId === activeExperiment.id}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all"
              >
                {analyzingId === activeExperiment.id ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...</>
                ) : (
                  <><BarChart3 className="w-4 h-4" /> Analyze Results</>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Viewing Results */}
      {viewingResult && (
        <div className="mb-8 p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-sm">{viewingResult.title}</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                viewingResult.verdict === 'success' ? 'bg-emerald-100 text-emerald-700' :
                viewingResult.verdict === 'mixed' ? 'bg-amber-100 text-amber-700' :
                'bg-zinc-100 text-zinc-600'
              }`}>
                {viewingResult.verdict === 'success' ? 'Positive Result' :
                 viewingResult.verdict === 'mixed' ? 'Mixed Results' :
                 'No Clear Change'}
              </span>
            </div>
            <button onClick={() => setViewingResult(null)} className="text-xs text-zinc-400 hover:text-zinc-600">Close</button>
          </div>

          <p className="text-sm text-zinc-700 mb-4">{viewingResult.summary}</p>

          {/* No change banner */}
          {viewingResult.verdict === 'no_clear_change' && (
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-zinc-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-zinc-700 mb-1">This experiment did not show a meaningful improvement.</p>
                  <p className="text-xs text-zinc-500">That's valuable information! It tells us what doesn't work for you right now.</p>
                </div>
              </div>
            </div>
          )}

          {/* Before vs During comparison */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold mb-2">Before Experiment</div>
              <div className="space-y-1.5">
                {viewingResult.changes.map((ch) => (
                  <div key={ch.metric} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">{ch.metric}</span>
                    <span className="font-medium text-zinc-700">{ch.before.toFixed(1)}</span>
                  </div>
                ))}
                <div className="text-[10px] text-zinc-400 pt-1">{viewingResult.beforeMetrics.dataPoints} days of data</div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-violet-50 border border-violet-200">
              <div className="text-[10px] text-violet-500 uppercase tracking-wider font-semibold mb-2">During Experiment</div>
              <div className="space-y-1.5">
                {viewingResult.changes.map((ch) => (
                  <div key={ch.metric} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">{ch.metric}</span>
                    <span className="font-medium text-violet-700">{ch.during.toFixed(1)}</span>
                  </div>
                ))}
                <div className="text-[10px] text-zinc-400 pt-1">{viewingResult.duringMetrics.dataPoints} days · {Math.round(viewingResult.duringMetrics.habitCompletionRate * 100)}% completion</div>
              </div>
            </div>
          </div>

          {/* Changes */}
          <div className="space-y-2 mb-4">
            {viewingResult.changes.map((ch) => (
              <div key={ch.metric} className="flex items-center gap-3 text-xs">
                {ch.direction === 'improved' ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> :
                 ch.direction === 'declined' ? <TrendingDown className="w-3.5 h-3.5 text-red-500" /> :
                 <Minus className="w-3.5 h-3.5 text-zinc-400" />}
                <span className="text-zinc-600">{ch.metric}:</span>
                <span className={`font-semibold ${ch.direction === 'improved' ? 'text-emerald-600' : ch.direction === 'declined' ? 'text-red-600' : 'text-zinc-500'}`}>
                  {ch.change}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 mb-3">
            <p className="text-xs text-zinc-700 leading-relaxed">{viewingResult.interpretation}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 mb-3">
            <p className="text-xs text-zinc-600 leading-relaxed"><span className="font-semibold">Things to keep in mind:</span> {viewingResult.caveats}</p>
          </div>
          <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 mb-3">
            <p className="text-xs text-zinc-700 leading-relaxed"><span className="font-semibold">Recommendation:</span> {viewingResult.recommendation}</p>
          </div>
          {viewingResult.nextExperimentSuggestion && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
              <p className="text-xs text-zinc-700 leading-relaxed"><span className="font-semibold">Want to try something else?</span> {viewingResult.nextExperimentSuggestion}</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {experiments.length === 0 && !showWizard && !activeExperiment && (
        <EmptyState
          icon={<FlaskConical className="w-8 h-8" />}
          title="No experiments yet"
          description="Create a personal experiment to test whether a specific habit affects your mood, energy, or sleep."
          action={
            <button
              onClick={() => setShowWizard(true)}
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all"
            >
              Start Your First Experiment
            </button>
          }
        />
      )}

      {/* Past experiments */}
      {!showWizard && completedExperiments.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs text-zinc-400 uppercase tracking-wider font-semibold px-1">Past Experiments</h3>
          {completedExperiments.map(exp => (
            <div key={exp.id} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-2 bg-emerald-100 text-emerald-700">
                    Complete
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{exp.habitToTrack}</h3>
                  <p className="text-xs text-zinc-500">{exp.startDate} → {exp.endDate}</p>
                </div>
                <button
                  onClick={() => setViewingResult(exp.result as unknown as ExperimentResultV2)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-xs font-medium transition-all"
                >
                  <BarChart3 className="w-3.5 h-3.5" /> View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Experiment Wizard */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-6">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-bold text-lg">New Experiment</h3>
              <button onClick={() => { setShowWizard(false); resetWizard(); }} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-400">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {wizardStep === 'idea' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2">What do you want to test?</label>
                    <p className="text-xs text-zinc-400 mb-3">Describe what you think might improve your well-being</p>
                    <textarea
                      value={hypothesis}
                      onChange={e => setHypothesis(e.target.value)}
                      placeholder="e.g., I want to see whether sleeping more makes me feel better"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-all resize-none h-24"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 mb-2">Or pick an idea:</p>
                    <div className="space-y-2">
                      {PRESET_IDEAS.map((idea) => (
                        <button
                          key={idea}
                          onClick={() => setHypothesis(idea)}
                          className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                            hypothesis === idea
                              ? 'bg-violet-50 border-violet-400 text-violet-700'
                              : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
                          }`}
                        >
                          {idea}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 'plan' && plan && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-violet-50 border border-violet-200">
                    <div className="text-xs text-violet-600 uppercase tracking-wider font-semibold mb-2">Experiment Plan</div>
                    <h4 className="font-semibold text-sm text-zinc-800 mb-1">{plan.title}</h4>
                    <p className="text-xs text-zinc-600 mb-3">{plan.hypothesis}</p>
                    <div className="space-y-2 text-xs text-zinc-500">
                      <div className="flex items-center gap-2"><Target className="w-3 h-3 text-violet-500" /> Goal: {plan.goal}</div>
                      <div className="flex items-center gap-2"><Calendar className="w-3 h-3 text-violet-500" /> Duration: {plan.duration} days</div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                    <p className="text-xs font-semibold text-zinc-600 mb-1">What to do each day:</p>
                    <p className="text-xs text-zinc-500">{plan.dailyInstructions}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                    <p className="text-xs font-semibold text-zinc-600 mb-1">What we'll track:</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {plan.trackingMetrics.map(m => (
                        <span key={m} className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-medium">{m}</span>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-xs font-semibold text-emerald-700 mb-1">Success looks like:</p>
                    <p className="text-xs text-zinc-600">{plan.successCriteria}</p>
                  </div>
                </div>
              )}

              {wizardStep === 'review' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-violet-50 border border-violet-200">
                    <div className="text-xs text-violet-600 uppercase tracking-wider font-semibold mb-2">Ready to start?</div>
                    <p className="text-sm text-zinc-700">{plan?.hypothesis}</p>
                    <div className="mt-3 text-xs text-zinc-500">
                      <p>Start: {today()}</p>
                      <p>End: {addDays(today(), plan?.duration || 14)}</p>
                      <p>Duration: {plan?.duration || 14} days</p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">Each day during the experiment, we'll ask you a few quick questions. At the end, we'll compare your data from before and during the experiment.</p>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-xs text-zinc-600"><span className="font-semibold">Remember:</span> We'll look for patterns in your data, but we can't prove that one thing caused another. Many factors affect how you feel each day.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-100 flex justify-between">
              <button
                onClick={() => {
                  if (wizardStep === 'idea') { setShowWizard(false); resetWizard(); }
                  else setWizardStep(wizardStep === 'plan' ? 'idea' : 'plan');
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-100 transition-all"
              >
                Back
              </button>
              {wizardStep === 'idea' ? (
                <button
                  onClick={handleCreatePlan}
                  disabled={!hypothesis.trim() || planLoading}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all flex items-center gap-2"
                >
                  {planLoading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating plan...</> : 'Create Plan'}
                </button>
              ) : wizardStep === 'plan' ? (
                <button
                  onClick={() => setWizardStep('review')}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all"
                >
                  Review
                </button>
              ) : (
                <button
                  onClick={handleStartExperiment}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all flex items-center gap-2"
                >
                  <Play className="w-4 h-4" /> Start Experiment
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
