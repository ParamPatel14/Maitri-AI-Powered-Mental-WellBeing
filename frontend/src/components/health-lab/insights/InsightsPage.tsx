import React, { useState } from 'react';
import { Sparkles, RefreshCw, TrendingUp, AlertTriangle, ThumbsUp, FileText } from 'lucide-react';
import { useHealthLab } from '../../../context/HealthLabContext';
import { SectionHeader } from '../shared/GlassCard';
import { generateWeeklyReport, findPatterns } from '../../../lib/ai-service';
import { isInsightStale } from '../../../lib/storage';
import type { AIInsight } from '../../../types/health-lab';

export const InsightsPage: React.FC = () => {
  const { profile, checkins, habitLogs, insights, saveInsight } = useHealthLab();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasData = checkins.length >= 3;

  const handleGenerateReport = async () => {
    if (!profile || checkins.length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const report = await generateWeeklyReport(profile, checkins, habitLogs);
      saveInsight(report);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleFindPatterns = async () => {
    if (!profile || checkins.length < 3) return;
    setLoading(true);
    setError(null);
    try {
      const patterns = await findPatterns(profile, checkins, habitLogs);
      patterns.forEach(p => saveInsight(p));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to find patterns');
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'weekly_report': return <FileText className="w-4 h-4" />;
      case 'pattern': return <TrendingUp className="w-4 h-4" />;
      case 'positive': return <ThumbsUp className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getInsightColor = (type: AIInsight['type']) => {
    switch (type) {
      case 'weekly_report': return { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'text-violet-600' };
      case 'pattern': return { bg: 'bg-sky-50', border: 'border-sky-200', icon: 'text-sky-600' };
      case 'positive': return { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600' };
      case 'warning': return { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600' };
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <SectionHeader
        title="AI Insights"
        subtitle="Let Maitri analyse your patterns"
      />

      {!hasData ? (
        <div className="text-center py-16">
          <div className="p-4 rounded-2xl bg-zinc-100 border border-zinc-200 inline-block mb-4 text-zinc-400">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Not enough data yet</h3>
          <p className="text-zinc-500 text-sm max-w-sm mx-auto">
            Complete at least 3 daily check-ins and track some habits to unlock AI-powered insights.
          </p>
        </div>
      ) : (
        <>
          {/* Action buttons */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={handleGenerateReport}
              disabled={loading || checkins.length < 2}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-sm"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Generate Weekly Report
            </button>
            <button
              onClick={handleFindPatterns}
              disabled={loading || checkins.length < 3}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-700 font-semibold text-sm transition-all shadow-sm"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              Find Patterns
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Insights list */}
          <div className="space-y-4">
            {insights.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                <p className="text-sm">No insights generated yet. Click a button above to start.</p>
              </div>
            ) : (
              insights.map(insight => {
                const colors = getInsightColor(insight.type);
                const stale = isInsightStale(insight);
                return (
                  <div key={insight.id} className={`p-5 rounded-2xl border ${colors.border} ${colors.bg}`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${colors.icon}`}>
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{insight.title}</h3>
                          {stale && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                              May be outdated
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line">{insight.body}</p>
                        <div className="text-xs text-zinc-400 mt-2">
                          {new Date(insight.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};
