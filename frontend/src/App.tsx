import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MaitriProvider, useMaitriStream } from './context/MaitriStreamContext';
import { LandingPage } from './components/LandingPage';
import { RehabScreen } from './components/RehabScreen';
import { ActiveSession } from './components/ActiveSession';
import { PsychologicalScreen } from './components/PsychologicalScreen';

const AppContent: React.FC = () => {
  const { isConnected, currentExercise } = useMaitriStream();

  // Once a session is active, show the monitoring view (overrides route)
  if (isConnected && currentExercise) {
    return <ActiveSession />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/physical" element={<RehabScreen />} />
      <Route path="/psychological" element={<PsychologicalScreen />} />
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
