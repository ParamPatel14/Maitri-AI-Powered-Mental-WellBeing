import React, { useState, useRef, useEffect } from 'react';
import { Send, FlaskConical, Sparkles, Target, Clock, RefreshCw } from 'lucide-react';
import { useHealthLab } from '../../../context/HealthLabContext';
import { chatWithHealthScientist, discoverPatterns } from '../../../lib/ai-service';
import { today } from '../../../lib/date-utils';
import type { HealthScientistMessage, DiscoveredPattern } from '../../../types/health-lab';

export const HealthScientistPage: React.FC = () => {
  const { profile, checkins, habitLogs, lifestyles, wearables, experiments, learnedInsights, addTimelineEvent } = useHealthLab();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasEnoughData = checkins.length >= 3;

  const [messages, setMessages] = useState<HealthScientistMessage[]>(() => [{
    id: crypto.randomUUID(),
    role: 'assistant' as const,
    content: hasEnoughData
      ? `Hey! I'm your Personal Health Scientist. I can look at your data and help you understand your patterns.\n\nYou can ask me things like:\n• "Why am I feeling tired?"\n• "What affects my mood?"\n• "Can we test if sleep is the problem?"\n\nWhat would you like to know?`
      : `Hey! I'm your Personal Health Scientist. I'm still learning about you — you have ${checkins.length} check-in${checkins.length !== 1 ? 's' : ''} so far.\n\nOnce you have more data, I'll be able to analyze your patterns and help you understand what affects your well-being.\n\nIn the meantime, keep checking in daily!`,
    timestamp: new Date().toISOString(),
  }]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: HealthScientistMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Get or discover patterns
      let patterns: DiscoveredPattern[] = [];
      try {
        const patternResult = await discoverPatterns(profile!, checkins, habitLogs, lifestyles, wearables);
        patterns = patternResult.patterns;
      } catch {
        // Patterns may fail, continue without them
      }

      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const result = await chatWithHealthScientist(
        profile!,
        checkins,
        habitLogs,
        lifestyles,
        wearables,
        patterns,
        experiments,
        learnedInsights,
        conversationHistory,
        userMsg.content,
      );

      const assistantMsg: HealthScientistMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.response,
        timestamp: new Date().toISOString(),
        dataUsed: result.dataUsed,
        suggestedAction: result.suggestedAction,
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Log timeline event for significant conversations
      if (result.suggestedAction?.type === 'create_experiment') {
        addTimelineEvent({
          id: crypto.randomUUID(),
          date: today(),
          type: 'insight_learned',
          title: 'Discussed potential experiment',
          description: `You and the AI discussed: "${userMsg.content.slice(0, 80)}"`,
          createdAt: new Date().toISOString(),
        });
      }
    } catch {
      const errorMsg: HealthScientistMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "I'm having trouble connecting to my analysis engine right now. Could you try again in a moment?",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderSuggestedAction = (action: HealthScientistMessage['suggestedAction']) => {
    if (!action) return null;
    const icons: Record<string, React.ReactNode> = {
      create_experiment: <FlaskConical className="w-3.5 h-3.5" />,
      view_patterns: <Sparkles className="w-3.5 h-3.5" />,
      view_timeline: <Clock className="w-3.5 h-3.5" />,
      check_baseline: <Target className="w-3.5 h-3.5" />,
    };
    const links: Record<string, string> = {
      create_experiment: '/health-lab/experiments',
      view_patterns: '/health-lab/patterns',
      view_timeline: '/health-lab/timeline',
      check_baseline: '/health-lab/baseline',
    };
    return (
      <a
        href={links[action.type] || '#'}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-2 rounded-lg bg-violet-100 text-violet-700 text-xs font-medium hover:bg-violet-200 transition-colors"
      >
        {icons[action.type]}
        {action.label}
      </a>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-zinc-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-100 border border-violet-200">
            <Sparkles className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <div className="font-bold text-sm">Health Scientist</div>
            <div className="text-[10px] text-zinc-400">
              {hasEnoughData ? 'Analyzing your data patterns' : `Learning from ${checkins.length} check-ins`}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-violet-600 text-white rounded-br-md'
                : 'bg-white border border-zinc-200 text-zinc-700 rounded-bl-md shadow-sm'
            }`}>
              <div className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</div>
              {msg.role === 'assistant' && msg.dataUsed && msg.dataUsed.length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-100">
                  <div className="text-[10px] text-zinc-400 mb-1">Based on:</div>
                  <div className="flex flex-wrap gap-1">
                    {msg.dataUsed.map((d, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-zinc-100 text-[10px] text-zinc-500">{d}</span>
                    ))}
                  </div>
                </div>
              )}
              {msg.role === 'assistant' && renderSuggestedAction(msg.suggestedAction)}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-zinc-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-zinc-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="text-xs">Analyzing your data...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-200 bg-white">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasEnoughData ? "Ask about your patterns..." : "Keep checking in to unlock insights..."}
            disabled={!hasEnoughData || loading}
            className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading || !hasEnoughData}
            className="px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
