import React from 'react';
import { Activity, Brain, ArrowRight, Sparkles } from 'lucide-react';

interface LandingPageProps {
  onSelect: (mode: 'physical' | 'psychological') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelect }) => {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-zinc-50 text-zinc-950 px-6 overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-emerald-500/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-violet-500/8 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Wellness Platform
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            Welcome to <span className="text-emerald-600">Maitri</span>
          </h1>
          <p className="text-zinc-500 text-lg max-w-xl mx-auto leading-relaxed">
            Your personal wellness companion. Choose a path to begin your journey towards better health.
          </p>
        </div>

        {/* Two-path cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Physical Wellness Card */}
          <button
            onClick={() => onSelect('physical')}
            className="group relative text-left p-8 rounded-3xl border border-emerald-200 bg-white hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300"
          >
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center mb-6 group-hover:bg-emerald-500 group-hover:border-emerald-500 transition-all duration-300">
              <Activity className="w-7 h-7 text-emerald-600 group-hover:text-white transition-colors duration-300" />
            </div>

            <h2 className="text-2xl font-bold mb-3">Physical Wellness</h2>
            <p className="text-zinc-500 text-sm leading-relaxed mb-6">
              AI-guided exercise rehabilitation with real-time pose analysis, form correction, and personalised rehab plans.
            </p>

            {/* Feature list */}
            <ul className="space-y-2 mb-8">
              {['Real-time pose tracking', 'Smart form correction', 'Personalised rehab plans', 'Live audio coaching'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-zinc-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm group-hover:gap-3 transition-all duration-300">
              Get Started <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          {/* Psychological Wellness Card */}
          <button
            onClick={() => onSelect('psychological')}
            className="group relative text-left p-8 rounded-3xl border border-violet-200 bg-white hover:border-violet-400 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-300"
          >
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-violet-100 border border-violet-200 flex items-center justify-center mb-6 group-hover:bg-violet-500 group-hover:border-violet-500 transition-all duration-300">
              <Brain className="w-7 h-7 text-violet-600 group-hover:text-white transition-colors duration-300" />
            </div>

            <h2 className="text-2xl font-bold mb-3">Psychological Wellness</h2>
            <p className="text-zinc-500 text-sm leading-relaxed mb-6">
              Guided mental wellness exercises, mood tracking, and cognitive behavioural techniques powered by AI.
            </p>

            {/* Feature list */}
            <ul className="space-y-2 mb-8">
              {['Guided meditation & breathing', 'Mood tracking & journaling', 'CBT-based exercises', 'Stress management tools'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-zinc-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2 text-violet-600 font-semibold text-sm group-hover:gap-3 transition-all duration-300">
              Coming Soon <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-400 text-xs mt-10">
          Built with care by the Maitri Team
        </p>
      </div>
    </div>
  );
};
