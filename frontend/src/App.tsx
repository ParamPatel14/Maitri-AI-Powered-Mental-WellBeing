import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MaitriProvider, useMaitriStream } from './context/MaitriStreamContext';
import { HealthLabProvider } from './context/HealthLabContext';
import { LandingPage } from './components/LandingPage';
import { RehabScreen } from './components/RehabScreen';
import { ActiveSession } from './components/ActiveSession';
import { HealthLabShell } from './components/health-lab/HealthLabShell';
import { DashboardPage } from './components/health-lab/dashboard/DashboardPage';
import { CheckinPage } from './components/health-lab/checkin/CheckinPage';
import { HabitsPage } from './components/health-lab/habits/HabitsPage';
import { InsightsPage } from './components/health-lab/insights/InsightsPage';
import { ExperimentsPage } from './components/health-lab/experiments/ExperimentsPage';
import { WhatIfPage } from './components/health-lab/whatif/WhatIfPage';
import { ProfilePage } from './components/health-lab/profile/ProfilePage';

const AppContent: React.FC = () => {
  const { isConnected, currentExercise } = useMaitriStream();

  if (isConnected && currentExercise) {
    return <ActiveSession />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/physical" element={<RehabScreen />} />
      <Route path="/health-lab" element={<HealthLabProvider><HealthLabShell /></HealthLabProvider>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="checkin" element={<CheckinPage />} />
        <Route path="habits" element={<HabitsPage />} />
        <Route path="insights" element={<InsightsPage />} />
        <Route path="experiments" element={<ExperimentsPage />} />
        <Route path="what-if" element={<WhatIfPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="/psychological" element={<Navigate to="/health-lab" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <MaitriProvider>
      <AppContent />
    </MaitriProvider>
  );
}

export default App;
