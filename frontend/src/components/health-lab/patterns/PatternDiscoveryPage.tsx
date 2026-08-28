import React, { useState } from 'react';
import { Sparkles, RefreshCw, Lightbulb, AlertTriangle, TrendingUp, Heart } from 'lucide-react';
import { useHealthLab } from '../../../context/HealthLabContext';
import { SectionHeader, EmptyState } from '../shared/GlassCard';
import { discoverPatterns } from '../../../lib/ai-service';
import { today } from '../../../lib/date-utils';
import type { PatternDiscoveryResult, DiscoveredPattern } from '../../../types/health-lab';

const STYLES: Record<DiscoveredPattern['strength'], { bg: string; border: string; icon: React.ReactNode; label: string }> = {
  strong: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: <TrendingUp className="w-4 h-4 text-emerald-600" />,
    label: 'Strong pattern',
  },
  moderate: {
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    icon: <Lightbulb className="w-4 h-4 text-violet-600" />,
    label: 'Moderate pattern',
  },
  weak: {
    bg: 'bg-zinc-50',
    border: 'border-zinc-200',
    icon: <Sparkles className="w-4 h-4 text-zinc-400" />,
    label: 'Early signal',
  },
};

const TYPE_ICONS: Record<DiscoveredPattern['type'], { color: string; icon: React.ReactNode }> = {
  positive: { color: 'text-emerald-600', icon: <Heart className="w-4 h-4" /> },
  neutral: { color: 'text-violet-600', icon: <Lightbulb className="w-4 h-4" /> },
  something_to_watch: { color: 'text-amber-600', icon: <AlertTriangle className="w-4 h-4" /> },
};

export const PatternDiscoveryPage: React.FC = () => {
  const { profile, checkins, habitLogs, lifestyles, wearables, addTimelineEvent, addLearnedInsight } = useHealthLab();
  const [result, setResult] = useState<PatternDiscoveryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasEnoughData = checkins.length >= 5;

  const handleDiscover = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await discoverPatterns(profile!, checkins, habitLogs, lifestyles, wearables);
      setResult(res);

      // Emit timeline event
      addTimelineEvent({
        id: crypto.randomUUID(),
        date: today(),
        type: 'pattern_discovered',
        title: `Discovered ${res.patterns.length} pattern${res.patterns.length !== 1 ? 's' : ''}`,
        description: res.summary,
        metadata: { patternCount: res.patterns.length },
        createdAt: new Date().toISOString(),
      });

      // Add strong patterns as learned insights
      res.patterns
        .filter(p => p.strength === 'strong')
        .forEach(p => {
          addLearnedInsight({
            id: crypto.randomUUID(),
            category: 'general',
            finding: p.title,
            evidence: p.observation,
            strength: p.strength,
            source: 'pattern_discovery',
            discoveredAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          });
        });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to discover patterns');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <SectionHeader
        title="What Makes Me Feel Good?"
        subtitle="Discover patterns in your data"
        action={
          hasEnoughData && !loading ? (
            <button
              onClick={handleDiscover}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all"
            >
              {result ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {result ? 'Discover Again' : 'Find My Patterns'}
            </button>
          ) : null
        }
      />

      {!hasEnoughData ? (
        <EmptyState
          icon={<Sparkles className="w-8 h-8" />}
          title="Not enough data yet"
          description={`You have ${checkins.length} check-in${checkins.length !== 1 ? 's' : ''}. We need at least 5 days of data to start finding patterns in your wellness.`}
        />
      ) : loading ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-violet-50 border border-violet-200">
            <RefreshCw className="w-5 h-5 text-violet-600 animate-spin" />
            <span className="text-sm font-medium text-violet-700">Analyzing your data patterns...</span>
          </div>
          <p className="text-xs text-zinc-400 mt-4">This may take a moment</p>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-red-50 border border-red-200">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-red-700">{error}</span>
          </div>
          <button
            onClick={handleDiscover}
            className="mt-4 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all"
          >
            Try Again
          </button>
        </div>
      ) : result ? (
        <div className="space-y-6">
          {/* Summary */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-50 to-emerald-50 border border-violet-200">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-violet-600" />
              <span className="font-semibold text-sm text-violet-800">What We Found</span>
            </div>
            <p className="text-sm text-zinc-700 leading-relaxed">{result.summary}</p>
          </div>

          {/* Patterns */}
          <div className="space-y-4">
            {result.patterns.map((pattern) => {
              const style = STYLES[pattern.strength];
              const typeStyle = TYPE_ICONS[pattern.type];
              return (
                <div
                  key={pattern.id}
                  className={`p-5 rounded-2xl border ${style.bg} ${style.border} transition-all`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {style.icon}
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{style.label}</span>
                    </div>
                    <div className={typeStyle.color}>
                      {typeStyle.icon}
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm text-zinc-800 mb-2">{pattern.title}</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">{pattern.observation}</p>
                </div>
              );
            })}
          </div>

          {/* Disclaimer */}
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
            <p className="text-xs text-zinc-500 leading-relaxed">
              <span className="font-semibold">Important:</span> These patterns come from your own data and show correlations, not causes. Many factors affect how you feel each day. Use these insights as a starting point for self-reflection, not as medical advice.
            </p>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<Lightbulb className="w-8 h-8" />}
          title="Ready to discover your patterns?"
          description="We'll analyze your check-ins, habits, and lifestyle data to find what's associated with your best days."
          action={
            <button
              onClick={handleDiscover}
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all"
            >
              Find My Patterns
            </button>
          }
        />
      )}
    </div>
  );
};
