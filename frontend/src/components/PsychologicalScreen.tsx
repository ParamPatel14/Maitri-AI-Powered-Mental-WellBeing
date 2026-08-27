import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, ArrowLeft, Heart, Wind, BookOpen, TrendingUp, Lock } from 'lucide-react';

const COMING_SOON_FEATURES = [
  {
    icon: Wind,
    title: 'Guided Breathing',
    description: 'Interactive breathing exercises with real-time pacing and calming visual cues.',
    color: 'emerald',
  },
  {
    icon: Heart,
    title: 'Mood Tracker',
    description: 'Log your daily mood and emotional state. Track patterns over time with AI insights.',
    color: 'rose',
  },
  {
    icon: BookOpen,
    title: 'Journaling',
    description: 'Structured journaling prompts based on CBT principles for emotional processing.',
    color: 'amber',
  },
  {
    icon: TrendingUp,
    title: 'Progress Analytics',
    description: 'Visualise your mental wellness journey with weekly and monthly trend charts.',
    color: 'sky',
  },
];

export const PsychologicalScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-zinc-50 text-zinc-950 px-6 overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-800 transition-colors mb-8 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 rounded-2xl bg-violet-100 border border-violet-200">
            <Brain className="w-8 h-8 text-violet-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Psychological Wellness</h1>
            <p className="text-zinc-500 text-sm mt-1">Building your mental wellness toolkit</p>
          </div>
        </div>

        {/* Coming soon badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold uppercase tracking-wider mb-8 ml-1">
          <Lock className="w-3.5 h-3.5" />
          Under Development
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COMING_SOON_FEATURES.map((feature) => {
            const Icon = feature.icon;
            const colorMap: Record<string, { bg: string; border: string; icon: string; dot: string }> = {
              emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', dot: 'bg-emerald-400' },
              rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    icon: 'text-rose-600',    dot: 'bg-rose-400' },
              amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   icon: 'text-amber-600',   dot: 'bg-amber-400' },
              sky:     { bg: 'bg-sky-50',     border: 'border-sky-200',     icon: 'text-sky-600',     dot: 'bg-sky-400' },
            };
            const c = colorMap[feature.color] || colorMap.emerald;

            return (
              <div
                key={feature.title}
                className={`p-6 rounded-2xl border ${c.border} ${c.bg} opacity-70`}
              >
                <Icon className={`w-6 h-6 ${c.icon} mb-3`} />
                <h3 className="font-bold text-lg mb-1">{feature.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Bottom note */}
        <div className="mt-10 p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm">
          <p className="text-zinc-600 text-sm leading-relaxed">
            <span className="font-semibold text-zinc-800">Coming soon.</span> We're working on bringing
            AI-powered psychological wellness tools to Maitri. In the meantime, explore our
            physical wellness features for guided exercise rehabilitation.
          </p>
        </div>
      </div>
    </div>
  );
};
