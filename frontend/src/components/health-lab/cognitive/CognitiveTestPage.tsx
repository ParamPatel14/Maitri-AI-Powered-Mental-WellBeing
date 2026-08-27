import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Brain, Zap, Eye, Hash, Timer, CheckCircle } from 'lucide-react';
import { useHealthLab } from '../../../context/HealthLabContext';
import { SectionHeader } from '../shared/GlassCard';
import { today } from '../../../lib/date-utils';
import type { CognitiveTestType, CognitiveTestResult } from '../../../types/health-lab';

// ── Reaction Time Test ─────────────────────────────────────────────────────────
const ReactionTimeTest: React.FC<{ onComplete: (score: number, raw: Record<string, number>) => void }> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'waiting' | 'ready' | 'go' | 'result'>('waiting');
  const [startTime, setStartTime] = useState(0);
  const [reactionTime, setReactionTime] = useState(0);
  const [attempts, setAttempts] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startRound = useCallback(() => {
    setPhase('ready');
    const delay = 1000 + Math.random() * 3000;
    timerRef.current = setTimeout(() => {
      setPhase('go');
      setStartTime(Date.now());
    }, delay);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    startRound();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const handleClick = () => {
    if (phase === 'go') {
      const rt = Date.now() - startTime;
      setReactionTime(rt);
      const newAttempts = [...attempts, rt];
      setAttempts(newAttempts);
      setPhase('result');

      if (newAttempts.length >= 5) {
        const avg = newAttempts.reduce((a, b) => a + b, 0) / newAttempts.length;
        // Score: 100 = fast (150ms), 0 = slow (800ms+)
        const score = Math.max(0, Math.min(100, Math.round(100 - ((avg - 150) / 5))));
        onComplete(score, { avgReactionTime: Math.round(avg), bestReactionTime: Math.min(...newAttempts), attempts: newAttempts.length });
      } else {
        setTimeout(() => startRound(), 1000);
      }
    } else if (phase === 'ready') {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhase('waiting');
      setAttempts([...attempts, 999]); // penalize early click
      setTimeout(() => startRound(), 500);
    }
  };

  return (
    <div className="text-center py-8">
      <div className="text-sm text-zinc-500 mb-4">Attempt {Math.min(attempts.length + 1, 5)} of 5</div>
      <button
        onClick={handleClick}
        className={`w-40 h-40 rounded-full text-lg font-bold transition-all duration-200 ${
          phase === 'waiting' || phase === 'result'
            ? 'bg-zinc-200 text-zinc-500'
            : phase === 'ready'
              ? 'bg-amber-400 text-white hover:bg-amber-500'
              : 'bg-emerald-500 text-white hover:bg-emerald-600 animate-pulse'
        }`}
      >
        {phase === 'waiting' && 'Get ready...'}
        {phase === 'ready' && 'Wait for green...'}
        {phase === 'go' && 'CLICK NOW!'}
        {phase === 'result' && `${reactionTime}ms`}
      </button>
      {phase === 'result' && (
        <div className="mt-4 text-sm text-zinc-500">
          {reactionTime < 200 ? 'Excellent!' : reactionTime < 300 ? 'Good!' : 'Keep practicing!'}
        </div>
      )}
    </div>
  );
};

// ── Working Memory Test (N-Back) ───────────────────────────────────────────────
const WorkingMemoryTest: React.FC<{ onComplete: (score: number, raw: Record<string, number>) => void }> = ({ onComplete }) => {
  const [sequence] = useState(() => Array.from({ length: 12 }, () => Math.floor(Math.random() * 9) + 1));
  const [phase, setPhase] = useState<'showing' | 'answering' | 'result'>('showing');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<boolean[]>([]);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (phase === 'showing' && currentIndex < sequence.length) {
      const timer = setTimeout(() => {
        setCurrentIndex(i => i + 1);
        if (currentIndex >= 2) {
          setPhase('answering');
          setCurrentIndex(0);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [phase, currentIndex, sequence.length]);

  const handleAnswer = (saidYes: boolean) => {
    const isMatch = currentIndex >= 2 && sequence[currentIndex] === sequence[currentIndex - 2];
    const correct = saidYes === isMatch;
    const newAnswers = [...userAnswers, correct];
    setUserAnswers(newAnswers);

    if (currentIndex + 1 >= sequence.length - 2) {
      // Done
      const correctCount = newAnswers.filter(Boolean).length;
      const total = newAnswers.length;
      const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
      setShowResult(true);
      setTimeout(() => onComplete(score, { correctCount, total, accuracy: score }), 2000);
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  if (showResult) {
    const correctCount = userAnswers.filter(Boolean).length;
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        <div className="text-2xl font-bold">{correctCount}/{userAnswers.length}</div>
        <div className="text-sm text-zinc-500">correct matches</div>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <div className="text-sm text-zinc-500 mb-4">
        {phase === 'showing' ? `Memorizing... (${currentIndex + 1}/${Math.min(3, sequence.length)})` :
         `Does this match the one 2 steps back? (${currentIndex + 1}/${sequence.length - 2})`}
      </div>
      <div className="text-6xl font-mono font-bold mb-6 h-20 flex items-center justify-center">
        {phase === 'showing' ? sequence[currentIndex] : sequence[currentIndex + 2]}
      </div>
      {phase === 'answering' && (
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => handleAnswer(true)}
            className="px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-all"
          >
            Same
          </button>
          <button
            onClick={() => handleAnswer(false)}
            className="px-8 py-3 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-semibold transition-all"
          >
            Different
          </button>
        </div>
      )}
    </div>
  );
};

// ── Sustained Attention Test ───────────────────────────────────────────────────
const SustainedAttentionTest: React.FC<{ onComplete: (score: number, raw: Record<string, number>) => void }> = ({ onComplete }) => {
  const [targets, setTargets] = useState(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      isTarget: Math.random() < 0.3,
      clicked: false,
    }))
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [falseAlarms, setFalseAlarms] = useState(0);

  if (currentIndex >= targets.length) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        <div className="text-sm text-zinc-500">Test complete! Calculating...</div>
      </div>
    );
  }

  const current = targets[currentIndex];

  const handleClick = () => {
    if (current.isTarget) {
      setHits(h => h + 1);
    } else {
      setFalseAlarms(f => f + 1);
    }
    setTargets(ts => ts.map((t, i) => i === currentIndex ? { ...t, clicked: true } : t));
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    if (nextIndex >= targets.length) {
      const totalTargets = targets.filter(t => t.isTarget).length;
      const newHits = current.isTarget ? hits + 1 : hits;
      const newFA = current.isTarget ? falseAlarms : falseAlarms + 1;
      const score = totalTargets > 0 ? Math.round((newHits / totalTargets) * 100) : 0;
      setTimeout(() => onComplete(score, { hits: newHits, misses, falseAlarms: newFA, totalTargets }), 100);
    }
  };

  const handleSkip = () => {
    if (current.isTarget) {
      setMisses(m => m + 1);
    }
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    if (nextIndex >= targets.length) {
      const totalTargets = targets.filter(t => t.isTarget).length;
      const newMisses = current.isTarget ? misses + 1 : misses;
      const score = totalTargets > 0 ? Math.round((hits / totalTargets) * 100) : 0;
      setTimeout(() => onComplete(score, { hits, misses: newMisses, falseAlarms, totalTargets }), 100);
    }
  };

  return (
    <div className="text-center py-8">
      <div className="text-sm text-zinc-500 mb-4">
        Tap when you see the target ({currentIndex + 1}/{targets.length})
      </div>
      <div className="text-5xl mb-6 h-20 flex items-center justify-center">
        {current.isTarget ? '★' : '○'}
      </div>
      <div className="flex gap-4 justify-center">
        <button
          onClick={handleClick}
          className="px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-all"
        >
          Target!
        </button>
        <button
          onClick={handleSkip}
          className="px-8 py-3 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-semibold transition-all"
        >
          Skip
        </button>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const TEST_COMPONENTS: Record<CognitiveTestType, React.FC<{ onComplete: (score: number, raw: Record<string, number>) => void }>> = {
  reaction_time: ReactionTimeTest,
  working_memory: WorkingMemoryTest,
  sustained_attention: SustainedAttentionTest,
  digit_span: WorkingMemoryTest, // reuse for now
};

const TEST_INFO: Record<CognitiveTestType, { title: string; description: string; icon: React.ReactNode; duration: string }> = {
  reaction_time: {
    title: 'Reaction Time',
    description: 'How quickly can you respond to visual cues? Measures processing speed.',
    icon: <Zap className="w-5 h-5" />,
    duration: '~30 seconds',
  },
  working_memory: {
    title: 'Working Memory',
    description: 'Can you remember and compare items in sequence? Tests short-term memory.',
    icon: <Brain className="w-5 h-5" />,
    duration: '~60 seconds',
  },
  sustained_attention: {
    title: 'Sustained Attention',
    description: 'How well can you focus on detecting specific targets over time?',
    icon: <Eye className="w-5 h-5" />,
    duration: '~45 seconds',
  },
  digit_span: {
    title: 'Digit Span',
    description: 'How many digits can you hold in memory? Classic cognitive measure.',
    icon: <Hash className="w-5 h-5" />,
    duration: '~45 seconds',
  },
};

export const CognitiveTestPage: React.FC = () => {
  const { saveCognitiveTest: saveTest } = useHealthLab();
  const [activeTest, setActiveTest] = useState<CognitiveTestType | null>(null);
  const [completedTests, setCompletedTests] = useState<CognitiveTestType[]>([]);

  const handleComplete = (score: number, raw: Record<string, number>) => {
    if (!activeTest) return;
    const result: CognitiveTestResult = {
      id: crypto.randomUUID(),
      date: today(),
      testType: activeTest,
      score,
      rawMetrics: raw,
      durationMs: 0,
      completedAt: new Date().toISOString(),
    };
    saveTest(result);
    setCompletedTests([...completedTests, activeTest]);
    setActiveTest(null);
  };

  const TestComponent = activeTest ? TEST_COMPONENTS[activeTest] : null;

  if (activeTest && TestComponent) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <button
          onClick={() => setActiveTest(null)}
          className="text-sm text-zinc-500 hover:text-zinc-800 mb-4"
        >
          ← Back to tests
        </button>
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-lg mb-1">{TEST_INFO[activeTest].title}</h2>
          <p className="text-sm text-zinc-500 mb-4">{TEST_INFO[activeTest].description}</p>
          <ReactionTimeTest onComplete={handleComplete} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <SectionHeader
        title="Cognitive Tests"
        subtitle="Quick mental performance checks"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.keys(TEST_INFO) as CognitiveTestType[]).map(type => {
          const info = TEST_INFO[type];
          const isCompleted = completedTests.includes(type);
          return (
            <button
              key={type}
              onClick={() => setActiveTest(type)}
              className={`p-5 rounded-2xl border text-left transition-all duration-200 ${
                isCompleted
                  ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400'
                  : 'bg-white border-zinc-200 hover:border-violet-400 hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-xl ${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-100 text-violet-600'}`}>
                  {info.icon}
                </div>
                {isCompleted && <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto" />}
              </div>
              <h3 className="font-semibold text-sm mb-1">{info.title}</h3>
              <p className="text-xs text-zinc-500 mb-2">{info.description}</p>
              <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                <Timer className="w-3 h-3" />
                {info.duration}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
