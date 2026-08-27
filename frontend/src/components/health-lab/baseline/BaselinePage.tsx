import React, { useMemo } from 'react';
import { Target, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { useHealthLab } from '../../../context/HealthLabContext';
import { SectionHeader, EmptyState } from '../shared/GlassCard';
import { computeBaseline, getTrendLabel } from '../../../lib/baseline';
import type { BaselineMetric } from '../../../types/health-lab';

const StatusBadge: React.FC<{ status: BaselineMetric['status'] }> = ({ status }) => {
  const styles: Record<string, string> = {
    normal: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    slightly_low: 'bg-amber-50 text-amber-600 border-amber-200',
    low: 'bg-red-50 text-red-600 border-red-200',
    slightly_high: 'bg-amber-50 text-amber-600 border-amber-200',
    high: 'bg-red-50 text-red-600 border-red-200',
    no_data: 'bg-zinc-100 text-zinc-400 border-zinc-200',
  };
  const labels: Record<string, string> = {
    normal: 'Normal',
    slightly_low: 'Slightly Low',
    low: 'Low',
    slightly_high: 'Slightly High',
    high: 'High',
    no_data: 'No Data',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

const TrendBadge: React.FC<{ trend: BaselineMetric['trend'] }> = ({ trend }) => {
  const Icon = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;
  const color = trend === 'improving' ? 'text-emerald-600' : trend === 'declining' ? 'text-amber-600' : 'text-zinc-400';
  return (
    <div className={`flex items-center gap-1 text-[10px] ${color}`}>
      <Icon className="w-3 h-3" />
      {getTrendLabel(trend)}
    </div>
  );
};

const MetricRow: React.FC<{ metric: BaselineMetric }> = ({ metric }) => {
  const devPercent = metric.personalStd > 0 && metric.deviation !== null
    ? Math.min(100, Math.abs(metric.deviation) * 25)
    : 0;

  return (
    <div className="p-4 bg-white border border-zinc-200 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="font-semibold text-sm">{metric.label}</span>
          <span className="text-xs text-zinc-400 ml-2">{metric.unit}</span>
        </div>
        <StatusBadge status={metric.status} />
      </div>

      {metric.status !== 'no_data' ? (
        <>
          <div className="flex items-center gap-4 text-xs text-zinc-500 mb-2">
            <span>Your avg: <strong className="text-zinc-700">{metric.personalAvg}{metric.unit}</strong></span>
            {metric.todayValue !== null && (
              <span>Today: <strong className="text-zinc-700">{metric.todayValue}{metric.unit}</strong></span>
            )}
            <span>Range: {metric.personalMin}–{metric.personalMax}</span>
          </div>

          {/* Deviation bar */}
          {metric.deviation !== null && (
            <div className="mt-2">
              <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    metric.deviation < -1 ? 'bg-red-400' :
                    metric.deviation < -0.5 ? 'bg-amber-400' :
                    metric.deviation > 1 ? 'bg-red-400' :
                    metric.deviation > 0.5 ? 'bg-amber-400' :
                    'bg-emerald-400'
                  }`}
                  style={{ width: `${devPercent}%` }}
                />
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">
                {Math.abs(metric.deviation).toFixed(1)} std devs from your norm
              </div>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <TrendBadge trend={metric.trend} />
            <span className="text-[10px] text-zinc-400">{metric.dataPoints} days of data</span>
          </div>
        </>
      ) : (
        <p className="text-xs text-zinc-400">Start logging to see your personal baseline.</p>
      )}
    </div>
  );
};

export const BaselinePage: React.FC = () => {
  const { checkins, wearables, lifestyles, cognitives, baseline, saveBaseline } = useHealthLab();

  const computedBaseline = useMemo(() => {
    if (checkins.length < 3 && wearables.length < 3 && lifestyles.length < 3) return null;
    return computeBaseline({ checkins, wearables, lifestyles, cognitives });
  }, [checkins, wearables, lifestyles, cognitives]);

  // Auto-save if baseline is fresh and differs
  const displayBaseline = computedBaseline || baseline;

  const handleCompute = () => {
    if (!computedBaseline) return;
    saveBaseline(computedBaseline);
  };

  if (!displayBaseline || displayBaseline.totalDays < 3) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <SectionHeader title="Personal Baseline" subtitle="Your personal normal ranges" />
        <EmptyState
          icon={<Target className="w-8 h-8" />}
          title="Building your baseline"
          description="We need at least 3 days of data to compute your personal baseline. Keep logging your daily check-ins and we'll learn what's normal for you."
        />
      </div>
    );
  }

  const coreMetrics = displayBaseline.metrics.filter(m =>
    ['mood', 'energy', 'sleepQuality', 'stressLevel', 'heartRateResting', 'steps', 'sleepHours'].includes(m.key)
  );
  const lifestyleMetrics = displayBaseline.metrics.filter(m =>
    ['caffeine', 'alcohol', 'mealRegularity', 'waterIntake', 'outdoorTime', 'socialLevel', 'screenBeforeBed', 'workLoad'].includes(m.key)
  );
  const cognitiveMetrics = displayBaseline.metrics.filter(m =>
    m.key.startsWith('cognitive_')
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <SectionHeader
        title="Personal Baseline"
        subtitle={`Your personal normal ranges from ${displayBaseline.totalDays} days of data`}
        action={
          <button
            onClick={handleCompute}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all"
          >
            Recalculate
          </button>
        }
      />

      {/* Readiness score */}
      {displayBaseline.readinessScore !== null && (
        <div className="mb-6 p-4 bg-white border border-zinc-200 rounded-2xl flex items-center gap-4">
          <div className="relative w-14 h-14">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e4e4e7" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.5" fill="none" stroke="#8b5cf6" strokeWidth="3"
                strokeDasharray={`${displayBaseline.readinessScore} ${100 - displayBaseline.readinessScore}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-violet-600">
              {displayBaseline.readinessScore}%
            </div>
          </div>
          <div>
            <div className="font-semibold text-sm">Baseline Confidence</div>
            <div className="text-xs text-zinc-500">
              {displayBaseline.readinessScore >= 80
                ? 'Your baseline is well-established across most metrics.'
                : displayBaseline.readinessScore >= 50
                  ? 'Your baseline is forming. Keep logging to improve accuracy.'
                  : 'Your baseline needs more data. Log daily for better insights.'}
            </div>
          </div>
        </div>
      )}

      {/* Core metrics */}
      {coreMetrics.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-3">Core Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {coreMetrics.map(m => <MetricRow key={m.key} metric={m} />)}
          </div>
        </div>
      )}

      {/* Lifestyle metrics */}
      {lifestyleMetrics.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-3">Lifestyle Factors</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lifestyleMetrics.map(m => <MetricRow key={m.key} metric={m} />)}
          </div>
        </div>
      )}

      {/* Cognitive metrics */}
      {cognitiveMetrics.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-3">Cognitive Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cognitiveMetrics.map(m => <MetricRow key={m.key} metric={m} />)}
          </div>
        </div>
      )}

      {/* Data range */}
      <div className="mt-6 p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-500">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span className="font-semibold">How baselines work</span>
        </div>
        <p>
          Your baseline is computed from your own data, not population averages. It shows what's normal for YOU.
          As you log more days, your baseline becomes more accurate. Outliers are automatically excluded.
          Deviations show how today compares to your personal normal.
        </p>
      </div>
    </div>
  );
};
