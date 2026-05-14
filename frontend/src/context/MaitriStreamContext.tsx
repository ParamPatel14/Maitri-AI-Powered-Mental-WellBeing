/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import type { MaitriFrame } from '../types/maitri';

interface MaitriContextState {
  availableExercises: string[];
  currentExercise: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  frame: MaitriFrame | null;
  error: string | null;
  startSession: (exercise: string) => void;
  stopSession: () => void;
}

const MaitriContext = createContext<MaitriContextState | undefined>(undefined);

export const MaitriProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [availableExercises, setAvailableExercises] = useState<string[]>([]);
  const [currentExercise, setCurrentExercise] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [frame, setFrame] = useState<MaitriFrame | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

  useEffect(() => {
    const fetchRegistry = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/registry`).catch(() => null);
        if (response && response.ok) {
          const data = await response.json();
          setAvailableExercises(data.exercises || ["Squats"]);
        } else {
          setAvailableExercises(["Squats"]);
        }
      } catch (err) {
        console.error("Failed to fetch exercises:", err);
        setAvailableExercises(["Squats"]);
      }
    };
    
    fetchRegistry();
  }, [BACKEND_URL]);

  const startSession = (exercise: string) => {
    setCurrentExercise(exercise);
    setIsConnecting(true);
    setError(null);
    
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        ws.send(JSON.stringify({ type: 'start', exercise }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as MaitriFrame;
          setFrame(data);
        } catch (e) {
          console.error("Failed to parse websocket frame", e);
        }
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
      };
      
      ws.onerror = () => {
        setError("WebSocket connection error. Make sure Maitri Core Service is running.");
        setIsConnected(false);
        setIsConnecting(false);
      };
      
      wsRef.current = ws;
    } catch (err) {
      setError("Failed to initialize WebSocket.");
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setCurrentExercise(null);
    setFrame(null);
    setIsConnected(false);
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <MaitriContext.Provider value={{
      availableExercises,
      currentExercise,
      isConnected,
      isConnecting,
      frame,
      error,
      startSession,
      stopSession
    }}>
      {children}
    </MaitriContext.Provider>
  );
};

export const useMaitriStream = () => {
  const context = useContext(MaitriContext);
  if (context === undefined) {
    throw new Error('useMaitriStream must be used within a MaitriProvider');
  }
  return context;
};
