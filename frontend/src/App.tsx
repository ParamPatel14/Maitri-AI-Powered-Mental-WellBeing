import React from 'react';
import { MaitriProvider, useMaitriStream } from './context/MaitriStreamContext';
import { RehabScreen } from './components/RehabScreen';
import { ActiveSession } from './components/ActiveSession';

const AppContent: React.FC = () => {
  const { isConnected, currentExercise } = useMaitriStream();

  // Once a session is active, show the monitoring view
  if (isConnected && currentExercise) {
    return <ActiveSession />;
  }

  // RehabScreen is the new root landing page (replaces OnboardingScreen).
  // It handles both the AI rehab plan flow and the quick-start dropdown.
  return <RehabScreen />;
};

function App() {
  return (
    <MaitriProvider>
      <AppContent />
    </MaitriProvider>
  );
}

export default App;
