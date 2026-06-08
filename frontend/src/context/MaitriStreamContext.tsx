/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext, useContext, useState, useEffect,
  useRef, useCallback, type ReactNode,
} from 'react';
import type { MaitriFrame } from '../types/maitri';

// ── Context shape ──────────────────────────────────────────────────────────────
interface MaitriContextState {
  availableExercises: string[];
  currentExercise:    string | null;
  isConnected:        boolean;
  isConnecting:       boolean;
  frame:              MaitriFrame | null;
  error:              string | null;
  patient:            { id: string; name: string } | null;
  goalMode:           'Rehab' | 'Strength' | 'Endurance';
  setPatientName:     (name: string) => void;
  setGoalMode:        (mode: 'Rehab' | 'Strength' | 'Endurance') => void;
  startSession:  (exercise: string) => void;
  stopSession:   () => void;
  /** Send a base64 data-URL JPEG frame to the backend for analysis. */
  sendFrame:     (dataUrl: string) => void;
}

const MaitriContext = createContext<MaitriContextState | undefined>(undefined);

// ── Audio helper (Web Speech API) ──────────────────────────────────────────────
/**
 * Speak a coaching cue via the browser's speech synthesis.
 *
 * urgent = true  → cancels any current utterance and speaks immediately
 * urgent = false → speaks only if synthesis is currently idle
 *
 * To switch to backend audio (pyttsx3) instead:
 *   1. Set AUDIO_BACKEND = True in backend/pipeline.py
 *   2. Remove the audio_cue handling block in the ws.onmessage handler below
 */
function speakCue(text: string, urgent: boolean): void {
  if (!('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  if (urgent) {
    synth.cancel();
  } else if (synth.speaking) {
    return;
  }
  synth.speak(new SpeechSynthesisUtterance(text));
}

// ── Provider ───────────────────────────────────────────────────────────────────
export const MaitriProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [availableExercises, setAvailableExercises] = useState<string[]>([]);
  const [currentExercise,    setCurrentExercise]    = useState<string | null>(null);
  const [isConnected,        setIsConnected]        = useState(false);
  const [isConnecting,       setIsConnecting]       = useState(false);
  const [frame,              setFrame]              = useState<MaitriFrame | null>(null);
  const [error,              setError]              = useState<string | null>(null);
  const [patient,            setPatient]            = useState<{ id: string; name: string } | null>(null);
  const [goalMode,           setGoalMode]           = useState<'Rehab' | 'Strength' | 'Endurance'>('Rehab');

  const wsRef = useRef<WebSocket | null>(null);

  const RAW_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
  const RAW_WS_URL      = import.meta.env.VITE_WS_URL      || 'ws://127.0.0.1:8000/ws';

  const BACKEND_URL = String(RAW_BACKEND_URL)
    .replace('https://localhost', 'http://127.0.0.1')
    .replace('http://localhost', 'http://127.0.0.1');

  const WS_URL = String(RAW_WS_URL)
    .replace('wss://localhost', 'ws://127.0.0.1')
    .replace('ws://localhost', 'ws://127.0.0.1');
  const CALIBRATION_SECONDS = Number(import.meta.env.VITE_CALIBRATION_SECONDS || 15);

  useEffect(() => {
    try {
      const storedPatient = localStorage.getItem('maitri.patient');
      if (storedPatient) setPatient(JSON.parse(storedPatient));
      const storedGoal = localStorage.getItem('maitri.goalMode');
      if (storedGoal === 'Rehab' || storedGoal === 'Strength' || storedGoal === 'Endurance') {
        setGoalMode(storedGoal);
      }
    } catch {
      setPatient(null);
      setGoalMode('Rehab');
    }
  }, []);

  const setPatientName = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      setPatient(null);
      try { localStorage.removeItem('maitri.patient'); } catch {}
      return;
    }
    const next = { id: (patient?.id || (crypto?.randomUUID?.() ?? `local-${Date.now()}`)), name: trimmed };
    setPatient(next);
    try { localStorage.setItem('maitri.patient', JSON.stringify(next)); } catch {}
  }, [patient?.id]);

  const setGoalModePersist = useCallback((mode: 'Rehab' | 'Strength' | 'Endurance') => {
    setGoalMode(mode);
    try { localStorage.setItem('maitri.goalMode', mode); } catch {}
  }, []);

  // ── Fetch exercise registry on boot ─────────────────────────────────────────
  useEffect(() => {
    const fetchRegistry = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/registry`).catch(() => null);
        if (res?.ok) {
          const data = await res.json();
          setAvailableExercises(data.exercises ?? ['Squats']);
        } else {
          setAvailableExercises(['Squats']);
        }
      } catch {
        setAvailableExercises(['Squats']);
      }
    };
    fetchRegistry();
  }, [BACKEND_URL]);

  // ── WebSocket cleanup on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      wsRef.current?.close();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // ── sendFrame ────────────────────────────────────────────────────────────────
  const sendFrame = useCallback((dataUrl: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'frame', data: dataUrl }));
  }, []);

  // ── startSession ─────────────────────────────────────────────────────────────
  const startSession = useCallback((exercise: string) => {
    setCurrentExercise(exercise);
    setIsConnecting(true);
    setError(null);
    setFrame(null);

    wsRef.current?.close();

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setIsConnecting(false);
      ws.send(JSON.stringify({
        type: 'start',
        exercise,
        goal_mode: goalMode,
        patient,
        calibration_seconds: CALIBRATION_SECONDS,
      }));
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data as string);
        const status: string = payload.status;

        if (status === 'session_started') {
          setIsConnected(true);
          return;
        }

        if (status === 'error') {
          setError(payload.message ?? 'Unknown backend error');
          return;
        }

        if (status === 'ok' || status === 'no_pose' || status === 'calibrating' || status === 'decode_error') {
          setFrame(payload as MaitriFrame);

          // ── Web Speech API audio routing ───────────────────────────────────
          // To switch to backend audio: set AUDIO_BACKEND=True in
          // backend/pipeline.py and remove the block below.
          if (payload.audio_cue) {
            speakCue(payload.audio_cue.text, payload.audio_cue.urgent);
          }
        }
      } catch (e) {
        console.error('Failed to parse WebSocket frame:', e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsConnecting(false);
    };

    ws.onerror = () => {
      setError('Cannot reach Maitri Core Service. Start the backend with: uvicorn backend.server:app --port 8000');
      setIsConnected(false);
      setIsConnecting(false);
    };

    wsRef.current = ws;
  }, [WS_URL, goalMode, patient, CALIBRATION_SECONDS]);

  // ── stopSession ──────────────────────────────────────────────────────────────
  const stopSession = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
      wsRef.current.close();
    }
    wsRef.current = null;
    setCurrentExercise(null);
    setFrame(null);
    setIsConnected(false);
    window.speechSynthesis?.cancel();
  }, []);

  return (
    <MaitriContext.Provider value={{
      availableExercises, currentExercise,
      isConnected, isConnecting,
      frame, error,
      patient, goalMode,
      setPatientName,
      setGoalMode: setGoalModePersist,
      startSession, stopSession, sendFrame,
    }}>
      {children}
    </MaitriContext.Provider>
  );
};

export const useMaitriStream = () => {
  const ctx = useContext(MaitriContext);
  if (ctx === undefined) {
    throw new Error('useMaitriStream must be used within a MaitriProvider');
  }
  return ctx;
};
