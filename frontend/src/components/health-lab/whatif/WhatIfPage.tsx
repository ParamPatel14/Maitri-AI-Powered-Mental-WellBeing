import React, { useState } from 'react';
import { HelpCircle, Send, RefreshCw, MessageCircle } from 'lucide-react';
import { useHealthLab } from '../../../context/HealthLabContext';
import { SectionHeader, EmptyState } from '../shared/GlassCard';
import { getWhatIfAnswer } from '../../../lib/ai-service';
import { WHAT_IF_SUGGESTIONS } from '../../../types/health-lab';

export const WhatIfPage: React.FC = () => {
  const { profile, checkins, whatIfScenarios, saveWhatIfScenario } = useHealthLab();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasData = checkins.length >= 3;

  const handleSubmit = async (q?: string) => {
    const query = q || question;
    if (!query.trim() || !profile || checkins.length < 2) return;
    setLoading(true);
    setError(null);
    setQuestion(query);
    try {
      const scenario = await getWhatIfAnswer(profile, checkins, query);
      saveWhatIfScenario(scenario);
      setQuestion('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get answer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <SectionHeader
        title="What-If Scenarios"
        subtitle="Explore how changes might affect your well-being"
      />

      {!hasData ? (
        <EmptyState
          icon={<HelpCircle className="w-8 h-8" />}
          title="Not enough data yet"
          description="Complete at least 3 daily check-ins so we can give you personalised predictions based on your actual patterns."
        />
      ) : (
        <>
          {/* Input area */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm mb-6">
            <label className="block text-sm font-semibold text-zinc-700 mb-3">Ask a what-if question</label>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="What if I changed something..."
                className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-all"
              />
              <button
                onClick={() => handleSubmit()}
                disabled={loading || !question.trim()}
                className="px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>

            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2">
              {WHAT_IF_SUGGESTIONS.map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => handleSubmit(suggestion)}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs text-zinc-600 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Previous scenarios */}
          {whatIfScenarios.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Ask your first what-if question above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {whatIfScenarios.slice().reverse().map(scenario => (
                <div key={scenario.id} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-violet-100 text-violet-600 shrink-0">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-800 mb-2">{scenario.question}</p>
                      <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line">{scenario.answer}</p>
                      <div className="text-xs text-zinc-400 mt-3">
                        {new Date(scenario.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
