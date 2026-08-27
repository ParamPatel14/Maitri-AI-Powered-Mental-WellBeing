import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar/Sidebar';
import { useHealthLab } from '../../context/HealthLabContext';
import { OnboardingWizard } from './profile/OnboardingWizard';

export const HealthLabShell: React.FC = () => {
  const { profile } = useHealthLab();

  if (!profile?.onboardingComplete) {
    return <OnboardingWizard />;
  }

  return (
    <div className="flex h-screen w-full bg-zinc-50 text-zinc-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
