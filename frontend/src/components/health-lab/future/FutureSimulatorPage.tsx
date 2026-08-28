import React, { useState } from 'react';
import { Sparkles, RefreshCw, TrendingUp, TrendingDown, Minus, Plus, X, ArrowRight, Lightbulb } from 'lucide-react';
import { useHealthLab } from '../../../context/HealthLabContext';
import { SectionHeader, EmptyState } from '../shared/GlassCard';
import { simulateFuture, compareScenarios } from '../../../lib/ai-service';
import { today } from '../../../lib/date-utils';
import type {
  FutureSimulationResult,
  FutureTrend,
  ScenarioComparisonResult,
  Scenario,
} from '../../../types/health-lab';

const TREND_CONFIG: Record<FutureTrend, { color: string; icon: React.ReactNode; label: string }> = {
  improving: { color: 'text-emerald-600', icon: <TrendingUp className="w-4 h-4" />, label: 'Improving' },
  slightly_improving: { color: 'text-emerald-500', icon: <TrendingUp className="w-4 h-4" />, label: 'Slightly improving' },
  stable: { color: 'text-zinc-500', icon: <Minus className="w-4 h-4" />, label: 'Stable' },
  slightly_declining: { color: 'text-amber-500', icon: <TrendingDown className="w-4 h-4" />, label: 'Slightly declining' },
  declining: { color: 'text-red-500', icon: <TrendingDown className="w-4 h-4" />, label: 'Declining' },
  uncertain: { color: 'text-zinc-400', icon: <Minus className="w-4 h-4" />, label: 'Uncertain' },
};

const PRESET_SCENARIOS: Scenario[] = [
  { id: 'current', name: 'Current Lifestyle', description: 'Continue doing what you are currently doing', isCustom: false },
  { id: 'better_sleep', name: 'Better Sleep', description: 'Increase sleep to 7.5-8 hours consistently', isCustom: false },
  { id: 'more_exercise', name: 'More Exercise', description: 'Exercise 3 times per week', isCustom: false },
  { id: 'less_sitting', name: 'Less Sitting', description: 'Reduce sitting time, add daily walks', isCustom: false },
  { id: 'combined', name: 'Combined Improvement', description: 'Improve sleep + exercise + daily movement', isCustom: false },
];

export const FutureSimulatorPage: React.FC = () => {
  const { profile, checkins, habitLogs, experiments, lifestyles, wearables, addTimelineEvent } = useHealthLab();
  const [activeTab, setActiveTab] = useState<'forecast' | 'scenarios'>('forecast');
  const [simulation, setSimulation] = useState<FutureSimulationResult | null>(null);
  const [comparison, setComparison] = useState<ScenarioComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customScenarios, setCustomScenarios] = useState<Scenario[]>([]);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDesc, setNewScenarioDesc] = useState('');
  const [showAddScenario, setShowAddScenario] = useState(false);

  const hasEnoughData = checkins.length >= 7;
  const allScenarios = [...PRESET_SCENARIOS, ...customScenarios];

  const currentLifestyle = {
    avgSleepQuality: checkins.length > 0 ? checkins.slice(-7).reduce((s, c) => s + c.sleepQuality, 0) / Math.min(7, checkins.length) : 3,
    avgEnergy: checkins.length > 0 ? checkins.slice(-7).reduce((s, c) => s + c.energy, 0) / Math.min(7, checkins.length) : 3,
    avgMood: checkins.length > 0 ? checkins.slice(-7).reduce((s, c) => s + c.mood, 0) / Math.min(7, checkins.length) : 3,
    avgStress: checkins.length > 0 ? checkins.slice(-7).reduce((s, c) => s + c.stressLevel, 0) / Math.min(7, checkins.length) : 3,
    recentCheckins: checkins.slice(-14),
    lifestyleEntries: lifestyles.slice(-7),
    wearableData: wearables.slice(-7),
  };

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    try {
      const experimentResults = experiments
        .filter(e => e.status === 'complete' && e.result)
        .map(e => e.result!);
      const result = await simulateFuture(profile!, checkins, habitLogs, [], experimentResults, currentLifestyle);
      setSimulation(result);
      addTimelineEvent({
        id: crypto.randomUUID(),
        date: today(),
        type: 'future_predicted',
        title: 'Future prediction generated',
        description: result.summary,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to simulate future');
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    setLoading(true);
    setError(null);
    try {
      const experimentResults = experiments
        .filter(e => e.status === 'complete' && e.result)
        .map(e => e.result!);
      const scenarioData = allScenarios.map(s => ({
        name: s.name,
        description: s.description,
        changes: {} as Record<string, string>,
      }));
      const result = await compareScenarios(profile!, currentLifestyle, checkins, [], experimentResults, scenarioData);
      setComparison(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to compare scenarios');
    } finally {
      setLoading(false);
    }
  };

  const addCustomScenario = () => {
    if (!newScenarioName.trim() || !newScenarioDesc.trim()) return;
    setCustomScenarios(prev => [...prev, {
      id: crypto.randomUUID(),
      name: newScenarioName,
      description: newScenarioDesc,
      isCustom: true,
    }]);
    setNewScenarioName('');
    setNewScenarioDesc('');
    setShowAddScenario(false);
  };

  const removeCustomScenario = (id: string) => {
    setCustomScenarios(prev => prev.filter(s => s.id !== id));
  };

  const renderTrendMetric = (label: string, trend: FutureTrend, description: string) => {
    const config = TREND_CONFIG[trend];
    return (
      <div className="flex items-start gap-3 p-2 rounded-lg">
        <div className={`mt-0.5 ${config.color}`}>{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-700">{label}</span>
            <span className={`text-[10px] font-medium ${config.color}`}>{config.label}</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
    );
  };

  const renderScenarioMetric = (label: string, metric: { current: number; projected: number; change: number }) => {
    const isPositive = label === 'Stress' ? metric.change < 0 : metric.change > 0;
    const isNeutral = Math.abs(metric.change) < 0.1;
    return (
      <div className="text-center">
        <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">{label}</div>
        <div className="text-lg font-bold text-zinc-700">{metric.projected.toFixed(1)}</div>
        <div className={`text-[10px] font-semibold ${isNeutral ? 'text-zinc-400' : isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
          {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <SectionHeader
        title="Future Simulator"
        subtitle="See what your patterns might mean for the future"
      />

      {!hasEnoughData ? (
        <EmptyState
          icon={<Sparkles className="w-8 h-8" />}
          title="Not enough data yet"
          description={`You have ${checkins.length} check-in${checkins.length !== 1 ? 's' : ''}. We need at least 7 days of data to simulate future trends.`}
        />
      ) : (
        <>
          {/* Tab Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('forecast')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'forecast'
                  ? 'bg-violet-100 text-violet-700 border border-violet-200'
                  : 'bg-white text-zinc-500 border border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              Future Forecast
            </button>
            <button
              onClick={() => setActiveTab('scenarios')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'scenarios'
                  ? 'bg-violet-100 text-violet-700 border border-violet-200'
                  : 'bg-white text-zinc-500 border border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              Compare Scenarios
            </button>
          </div>

          {/* Forecast Tab */}
          {activeTab === 'forecast' && (
            <div>
              {!simulation && !loading && !error && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-violet-50 border border-violet-200 mb-4">
                    <Sparkles className="w-5 h-5 text-violet-600" />
                    <span className="text-sm font-medium text-violet-700">Ready to forecast your future</span>
                  </div>
                  <p className="text-xs text-zinc-400 mb-6 max-w-md mx-auto">
                    Based on your check-ins, habits, and discovered patterns, we'll estimate what might happen over the next 30-90 days if you continue your current lifestyle.
                  </p>
                  <button
                    onClick={handleSimulate}
                    className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all"
                  >
                    Simulate My Future
                  </button>
                </div>
              )}

              {loading && (
                <div className="text-center py-16">
                  <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-violet-50 border border-violet-200">
                    <RefreshCw className="w-5 h-5 text-violet-600 animate-spin" />
                    <span className="text-sm font-medium text-violet-700">Analyzing your patterns...</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-center py-16">
                  <p className="text-sm text-red-500 mb-4">{error}</p>
                  <button onClick={handleSimulate} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all">
                    Try Again
                  </button>
                </div>
              )}

              {simulation && (
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-200">
                    <p className="text-sm text-zinc-700 leading-relaxed">{simulation.summary}</p>
                  </div>

                  {simulation.timeframes.map((tf) => (
                    <div key={tf.period} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                      <h3 className="font-semibold text-sm text-zinc-800 mb-3">{tf.period}</h3>
                      <div className="grid grid-cols-2 gap-1">
                        {renderTrendMetric('Energy', tf.energy.trend, tf.energy.description)}
                        {renderTrendMetric('Sleep', tf.sleep.trend, tf.sleep.description)}
                        {renderTrendMetric('Stress', tf.stress.trend, tf.stress.description)}
                        {renderTrendMetric('Mood', tf.mood.trend, tf.mood.description)}
                        {renderTrendMetric('Activity', tf.activity.trend, tf.activity.description)}
                        {renderTrendMetric('Overall', tf.overall.trend, tf.overall.description)}
                      </div>
                    </div>
                  ))}

                  {simulation.keyInsights.length > 0 && (
                    <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-4 h-4 text-amber-600" />
                        <span className="font-semibold text-sm text-amber-800">Key Insights</span>
                      </div>
                      <ul className="space-y-2">
                        {simulation.keyInsights.map((insight, i) => (
                          <li key={i} className="text-xs text-zinc-600 leading-relaxed flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">•</span>
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-xs text-zinc-700 leading-relaxed"><span className="font-semibold">Suggestion:</span> {simulation.suggestion}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      <span className="font-semibold">Disclaimer:</span> These are estimates based on your personal data patterns, not medical predictions. Many factors can change your trajectory. Use this as a guide for self-reflection.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scenarios Tab */}
          {activeTab === 'scenarios' && (
            <div>
              {!comparison && !loading && !error && (
                <div>
                  <p className="text-xs text-zinc-400 mb-4">Select scenarios to compare. The AI will use your data and past experiment results to estimate how each scenario might affect you.</p>
                  <div className="space-y-2 mb-4">
                    {allScenarios.map((scenario) => (
                      <div key={scenario.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-zinc-200">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-zinc-700">{scenario.name}</div>
                          <div className="text-xs text-zinc-400">{scenario.description}</div>
                        </div>
                        {scenario.isCustom && (
                          <button onClick={() => removeCustomScenario(scenario.id)} className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {showAddScenario ? (
                    <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 mb-4">
                      <input
                        value={newScenarioName}
                        onChange={e => setNewScenarioName(e.target.value)}
                        placeholder="Scenario name"
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500 mb-2"
                      />
                      <input
                        value={newScenarioDesc}
                        onChange={e => setNewScenarioDesc(e.target.value)}
                        placeholder="What does this scenario involve?"
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500 mb-2"
                      />
                      <div className="flex gap-2">
                        <button onClick={addCustomScenario} className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold">Add</button>
                        <button onClick={() => setShowAddScenario(false)} className="px-3 py-1.5 rounded-lg bg-zinc-200 text-zinc-600 text-xs font-semibold">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddScenario(true)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-zinc-300 text-zinc-500 text-xs font-medium hover:bg-zinc-50 transition-all mb-4"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Custom Scenario
                    </button>
                  )}

                  <button
                    onClick={handleCompare}
                    className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" /> Compare All Scenarios
                  </button>
                </div>
              )}

              {loading && (
                <div className="text-center py-16">
                  <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-violet-50 border border-violet-200">
                    <RefreshCw className="w-5 h-5 text-violet-600 animate-spin" />
                    <span className="text-sm font-medium text-violet-700">Comparing scenarios...</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-center py-16">
                  <p className="text-sm text-red-500 mb-4">{error}</p>
                  <button onClick={handleCompare} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all">
                    Try Again
                  </button>
                </div>
              )}

              {comparison && (
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-200">
                    <p className="text-sm text-zinc-700 leading-relaxed">{comparison.summary}</p>
                  </div>

                  {/* Comparison Table */}
                  <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="grid grid-cols-6 gap-0 border-b border-zinc-200 bg-zinc-50">
                      <div className="p-3 text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Scenario</div>
                      <div className="p-3 text-center text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Energy</div>
                      <div className="p-3 text-center text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Stress</div>
                      <div className="p-3 text-center text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Sleep</div>
                      <div className="p-3 text-center text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Mood</div>
                      <div className="p-3 text-center text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Overall</div>
                    </div>
                    {comparison.scenarios.map((scenario, idx) => (
                      <div key={idx} className={`grid grid-cols-6 gap-0 border-b border-zinc-100 ${idx === 0 ? 'bg-zinc-50' : idx === comparison.scenarios.length - 1 ? 'bg-violet-50' : ''}`}>
                        <div className="p-3">
                          <div className="text-xs font-semibold text-zinc-700">{scenario.name}</div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">{scenario.description}</div>
                        </div>
                        {renderScenarioMetric('Energy', scenario.metrics.energy)}
                        {renderScenarioMetric('Stress', scenario.metrics.stress)}
                        {renderScenarioMetric('Sleep', scenario.metrics.sleep)}
                        {renderScenarioMetric('Mood', scenario.metrics.mood)}
                        {renderScenarioMetric('Overall', scenario.metrics.overall)}
                      </div>
                    ))}
                  </div>

                  {/* Scenario Insights */}
                  <div className="space-y-3">
                    {comparison.scenarios.map((scenario, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-white border border-zinc-200">
                        <div className="flex items-center gap-2 mb-2">
                          <ArrowRight className="w-3.5 h-3.5 text-violet-500" />
                          <span className="text-xs font-semibold text-zinc-700">{scenario.name}</span>
                        </div>
                        <p className="text-xs text-zinc-500 leading-relaxed">{scenario.insight}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-xs text-zinc-700 leading-relaxed"><span className="font-semibold">Recommendation:</span> {comparison.recommendation}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      <span className="font-semibold">Note:</span> These projections are based on your personal data patterns and past experiment results. They are estimates, not guarantees. Many factors can influence your actual outcomes.
                    </p>
                  </div>

                  <button
                    onClick={() => { setComparison(null); }}
                    className="w-full py-2.5 rounded-xl border border-zinc-200 text-zinc-500 text-xs font-semibold hover:bg-zinc-50 transition-all"
                  >
                    Reset and Try Different Scenarios
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
