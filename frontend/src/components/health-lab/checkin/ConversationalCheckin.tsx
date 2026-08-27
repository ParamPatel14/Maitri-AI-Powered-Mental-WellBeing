import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, ArrowRight } from 'lucide-react';
import { useHealthLab } from '../../../context/HealthLabContext';
import { SectionHeader } from '../shared/GlassCard';
import { today } from '../../../lib/date-utils';
import { DAILY_QUESTIONS, CAFFEINE_OPTIONS, CAFFEINE_LABELS, WATER_INTAKE, WATER_INTAKE_LABELS, SCREEN_BEFORE_BED, SCREEN_BEFORE_BED_LABELS } from '../../../types/health-lab';
import type { ConversationEntry } from '../../../types/health-lab';

type ChatMessage = {
  role: 'ai' | 'user';
  text: string;
  timestamp: string;
};

const LIFESTYLE_QUESTIONS = [
  { id: 'caffeine', question: 'How much caffeine did you have today?', options: CAFFEINE_OPTIONS, labels: CAFFEINE_LABELS, category: 'lifestyle' as const },
  { id: 'water', question: 'How was your water intake?', options: WATER_INTAKE, labels: WATER_INTAKE_LABELS, category: 'lifestyle' as const },
  { id: 'screen', question: 'Screen time before bed last night?', options: SCREEN_BEFORE_BED, labels: SCREEN_BEFORE_BED_LABELS, category: 'lifestyle' as const },
];

export const ConversationalCheckin: React.FC = () => {
  const { saveConversation: saveConv, conversations } = useHealthLab();
  const scrollRef = useRef<HTMLDivElement>(null);

  const todayConversations = conversations.filter(c => c.date === today());
  const allQuestions = [...DAILY_QUESTIONS.slice(0, 4), ...LIFESTYLE_QUESTIONS];
  const hasAlreadyCompleted = todayConversations.length >= 4;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (hasAlreadyCompleted) {
      return [{
        role: 'ai' as const,
        text: `Welcome back! You've already checked in today. You answered ${todayConversations.length} questions. Come back tomorrow for your next check-in!`,
        timestamp: new Date().toISOString(),
      }];
    }
    return [{
      role: 'ai' as const,
      text: "Hey! Let's do a quick check-in. I'll ask you a few simple questions. Ready?",
      timestamp: new Date().toISOString(),
    }];
  });
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [isComplete, setIsComplete] = useState(hasAlreadyCompleted);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleStart = () => {
    const q = allQuestions[currentQuestionIdx];
    setMessages(prev => [...prev, {
      role: 'ai',
      text: q.question,
      timestamp: new Date().toISOString(),
    }]);
  };

  const handleAnswer = (answer: string) => {
    const q = allQuestions[currentQuestionIdx];

    // Save the answer
    const entry: ConversationEntry = {
      id: crypto.randomUUID(),
      date: today(),
      question: q.question,
      answer,
      category: q.category,
      sentimentScore: null,
      timestamp: new Date().toISOString(),
    };
    saveConv(entry);

    // Add user message
    const userMsg: ChatMessage = { role: 'user', text: answer, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    // Handle lifestyle select questions
    if ('options' in q) {
      setSelectedLifestyle(prev => ({ ...prev, [q.id]: answer }));
    }

    // Next question or complete
    const nextIdx = currentQuestionIdx + 1;
    if (nextIdx < allQuestions.length) {
      setCurrentQuestionIdx(nextIdx);
      setTimeout(() => {
        const nextQ = allQuestions[nextIdx];
        setMessages(prev => [...prev, {
          role: 'ai',
          text: nextQ.question,
          timestamp: new Date().toISOString(),
        }]);
      }, 500);
    } else {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'ai',
          text: "Thanks! That's all for today. Your answers help me understand your patterns better. See you tomorrow!",
          timestamp: new Date().toISOString(),
        }]);
        setIsComplete(true);
      }, 500);
    }
  };

  const currentQ = allQuestions[currentQuestionIdx];
  const showOptions = currentQ && 'options' in currentQ && messages.length > 0 && messages[messages.length - 1].role === 'ai' && !isComplete;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <SectionHeader
        title="Daily Check-in Chat"
        subtitle="Quick questions to track your patterns"
      />

      {hasAlreadyCompleted ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <div className="text-center py-8">
            <MessageCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-1">Already checked in today!</h3>
            <p className="text-sm text-zinc-500">Come back tomorrow for your next check-in.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Chat area */}
          <div ref={scrollRef} className="h-[400px] overflow-y-auto p-6 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white rounded-br-md'
                    : 'bg-zinc-100 text-zinc-800 rounded-bl-md'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input area */}
          <div className="border-t border-zinc-200 p-4">
            {!messages.length || (messages.length === 1 && !isComplete) ? (
              <button
                onClick={handleStart}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                Start Check-in <ArrowRight className="w-4 h-4" />
              </button>
            ) : showOptions && 'options' in currentQ ? (
              <div className="flex flex-wrap gap-2">
                {(currentQ as { options: readonly string[]; labels: readonly string[] }).labels.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer((currentQ as { options: readonly string[] }).options[i])}
                    className="px-4 py-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-violet-50 hover:border-violet-400 text-sm font-medium transition-all"
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : !isComplete ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type your answer..."
                  className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-all"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      handleAnswer(e.currentTarget.value.trim());
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    const input = (e.currentTarget.parentElement as HTMLElement).querySelector('input');
                    if (input?.value.trim()) {
                      handleAnswer(input.value.trim());
                      input.value = '';
                    }
                  }}
                  className="px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="text-center text-sm text-zinc-500 py-2">
                Check-in complete! Great job tracking your patterns.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
