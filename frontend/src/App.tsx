import React from 'react';
import { MaitriProvider, useMaitriStream } from './context/MaitriStreamContext';
import { OnboardingScreen } from './components/OnboardingScreen';
import { ActiveSession } from './components/ActiveSession';

const AppContent: React.FC = () => {
  const { isConnected, currentExercise } = useMaitriStream();

  if (isConnected && currentExercise) {
    return <ActiveSession />;
  }

  return <OnboardingScreen />;
};

function App() {
  return (
    <MaitriProvider>
      <AppContent />
    </MaitriProvider>
  );
}

export default App;
