export interface Point3D {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface MaitriMetrics {
  phase: string;
  knee_cave?: boolean;
  forward_lean?: boolean;
  depth_reached?: boolean;
  left_knee_angle: number;
  right_knee_angle: number;
  torso_angle: number;
  hip_to_knee_ratio: number;
  [key: string]: unknown;
}

export interface MaitriResult {
  rep_count: number;
  rep_just_completed: boolean;
  has_issue: boolean;
  feedback: string;
  metrics: MaitriMetrics;
}

export interface AudioCue {
  text: string;
  urgent: boolean;
}

export interface MaitriFrame {
  timestamp: number;
  exercise: string;
  status: string;
  dimensions: { width: number; height: number };
  result: MaitriResult;
  landmarks: Record<string, Point3D>;
  audio_cue: AudioCue | null;
}

// ── Rehabilitation types ───────────────────────────────────────────────────────
export interface RehabRecommendation {
  exercise: string;
  reason:   string;
}

export interface RehabResponse {
  recommendations: RehabRecommendation[];
}
