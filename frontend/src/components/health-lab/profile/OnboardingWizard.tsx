import React, { useState } from 'react';
import { Brain, ArrowLeft, ArrowRight } from 'lucide-react';
import { StepIndicator } from '../shared/ScaleOptions';
import { useHealthLab } from '../../../context/HealthLabContext';
import type { UserProfile } from '../../../types/health-lab';
import { BasicInfoStep } from './wizard-steps/BasicInfoStep';
import { SleepEnergyStep } from './wizard-steps/SleepEnergyStep';
import { ActivityHabitsStep } from './wizard-steps/ActivityHabitsStep';
import { GoalsStep } from './wizard-steps/GoalsStep';
import { SummaryStep } from './wizard-steps/SummaryStep';

const TOTAL_STEPS = 5;

const emptyProfile: UserProfile = {
  id: crypto.randomUUID(),
  name: '',
  ageRange: '25-34',
  generalGoals: [],
  sleepHoursTypical: '7-8 hours',
  sleepQualityBaseline: 'Hit or miss',
  activityLevel: 'Moderately active (exercise 3-5x/week)',
  currentHabits: [],
  trackedHabits: [],
  checkInFrequency: 'Daily',
  wantsExperiments: true,
  energyPattern: 'Steady throughout the day',
  onboardingComplete: false,
  createdAt: new Date().toISOString(),
};

export const OnboardingWizard: React.FC = () => {
  const { completeOnboarding } = useHealthLab();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);

  const update = (partial: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...partial }));
  };

  const canNext = () => {
    if (step === 1) return profile.name.trim().length > 0;
    return true;
  };

  const handleFinish = () => {
    completeOnboarding({ ...profile, createdAt: new Date().toISOString() });
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-zinc-50 text-zinc-950 px-6 overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl flex flex-col max-h-screen">
        {/* Header */}
        <div className="text-center mb-6 shrink-0">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-100 border border-violet-200 text-violet-700 text-xs font-semibold uppercase tracking-wider mb-4">
            <Brain className="w-3.5 h-3.5" />
            Welcome to Health Lab
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Let's get to know you</h1>
          <p className="text-zinc-500 text-sm">This helps us personalise your wellness journey. Takes about 1 minute.</p>
        </div>

        {/* Step indicator */}
        <div className="flex justify-center mb-6 shrink-0">
          <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />
        </div>

        {/* Step content - scrollable */}
        <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm overflow-y-auto flex-1 min-h-0">
          {step === 1 && <BasicInfoStep profile={profile} update={update} />}
          {step === 2 && <SleepEnergyStep profile={profile} update={update} />}
          {step === 3 && <ActivityHabitsStep profile={profile} update={update} />}
          {step === 4 && <GoalsStep profile={profile} update={update} />}
          {step === 5 && <SummaryStep profile={profile} />}
        </div>

        {/* Navigation - always visible */}
        <div className="flex items-center justify-between mt-4 shrink-0">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 disabled:opacity-0 disabled:pointer-events-none transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {step < TOTAL_STEPS ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-2.5 text-sm transition-all duration-150 shadow-sm"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl px-6 py-2.5 text-sm transition-all duration-150 shadow-sm"
            >
              Start My Journey
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
