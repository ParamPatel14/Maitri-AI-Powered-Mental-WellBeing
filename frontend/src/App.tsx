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
import { BaselinePage } from './components/health-lab/baseline/BaselinePage';
import { CognitiveTestPage } from './components/health-lab/cognitive/CognitiveTestPage';
import { DataSourcesPage } from './components/health-lab/datasources/DataSourcesPage';
import { ConversationalCheckin } from './components/health-lab/checkin/ConversationalCheckin';
import { PatternDiscoveryPage } from './components/health-lab/patterns/PatternDiscoveryPage';
import { FutureSimulatorPage } from './components/health-lab/future/FutureSimulatorPage';
import { TimelinePage } from './components/health-lab/timeline/TimelinePage';
import { HealthScientistPage } from './components/health-lab/scientist/HealthScientistPage';

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
        <Route path="chat" element={<ConversationalCheckin />} />
        <Route path="habits" element={<HabitsPage />} />
        <Route path="scientist" element={<HealthScientistPage />} />
        <Route path="patterns" element={<PatternDiscoveryPage />} />
        <Route path="baseline" element={<BaselinePage />} />
        <Route path="cognitive" element={<CognitiveTestPage />} />
        <Route path="datasources" element={<DataSourcesPage />} />
        <Route path="insights" element={<InsightsPage />} />
        <Route path="experiments" element={<ExperimentsPage />} />
        <Route path="what-if" element={<WhatIfPage />} />
        <Route path="future" element={<FutureSimulatorPage />} />
        <Route path="timeline" element={<TimelinePage />} />
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
