"""
backend/pipeline.py
────────────────────
Server-mode per-frame processor.

Receives a raw JPEG frame as bytes, runs MediaPipe + the selected
exercise analyser, and returns a JSON-serialisable dict ready to
broadcast over the WebSocket.

Audio routing
─────────────
AUDIO_BACKEND = False  (default)
    Audio cues are returned inside the payload as {"text": ..., "urgent": ...}
    so the frontend can speak them via the Web Speech API.

AUDIO_BACKEND = True
    Audio cues are spoken server-side via pyttsx3 (requires core.audio).
    Set this to True to fall back to backend audio if frontend TTS breaks.
"""

import cv2
import dataclasses
import numpy as np
import time
from typing import Optional

from core.pose_engine import extract_landmarks
from core.base_analyser import BaseAnalyser, BaseResult

# ── Audio routing flag ─────────────────────────────────────────────────────────
# Flip to True to restore backend pyttsx3 audio instantly.
AUDIO_BACKEND: bool = False


@dataclasses.dataclass
class CalibrationState:
    duration_s: float = 15.0
    state: str = "not_started"  # not_started | running | complete
    started_at: float | None = None
    sample_count: int = 0
    sum_hip_width: float = 0.0
    sum_knee_width: float = 0.0
    sum_torso_height: float = 0.0
    sum_view_ratio: float = 0.0
    sum_hip_to_knee_ratio: float = 0.0
    baseline: dict | None = None

    def start(self) -> None:
        self.state = "running"
        self.started_at = time.time()
        self.sample_count = 0
        self.sum_hip_width = 0.0
        self.sum_knee_width = 0.0
        self.sum_torso_height = 0.0
        self.sum_view_ratio = 0.0
        self.sum_hip_to_knee_ratio = 0.0
        self.baseline = None

    def progress(self) -> float:
        if self.state != "running" or self.started_at is None:
            return 0.0 if self.state != "complete" else 1.0
        return float(min(1.0, max(0.0, (time.time() - self.started_at) / self.duration_s)))

    def update(self, landmarks, *, recommended_view: str) -> tuple[str, bool]:
        if self.state != "running":
            return ("", False)

        if landmarks is None:
            return ("Move into frame", False)

        pose_quality = float(getattr(landmarks, "pose_quality", 0.0) or 0.0)
        if pose_quality < 0.65:
            return ("Hold still and make sure your full body is visible", False)

        torso_height = float(abs(landmarks.neck.y - ((landmarks.left_hip.y + landmarks.right_hip.y) / 2.0)))
        if torso_height > 0.65:
            return ("Step back a little", False)
        if torso_height < 0.22:
            return ("Step closer to the camera", False)

        camera_view = str(getattr(landmarks, "camera_view", "unknown"))
        if recommended_view in ("side", "front") and camera_view != recommended_view:
            return ("Turn sideways to the camera", False) if recommended_view == "side" else ("Face the camera", False)

        hip_width = float(abs(landmarks.left_hip.x - landmarks.right_hip.x))
        knee_width = float(abs(landmarks.left_knee.x - landmarks.right_knee.x))
        hip_to_knee_ratio = float(knee_width / (hip_width + 1e-6))

        shoulder_width = float(abs(landmarks.left_shoulder.x - landmarks.right_shoulder.x))
        view_ratio = float(shoulder_width / (torso_height + 1e-6))

        self.sample_count += 1
        self.sum_hip_width += hip_width
        self.sum_knee_width += knee_width
        self.sum_torso_height += torso_height
        self.sum_view_ratio += view_ratio
        self.sum_hip_to_knee_ratio += hip_to_knee_ratio

        if self.started_at is not None and (time.time() - self.started_at) >= self.duration_s and self.sample_count >= 8:
            avg_hip_width = self.sum_hip_width / self.sample_count
            avg_knee_width = self.sum_knee_width / self.sample_count
            avg_torso_height = self.sum_torso_height / self.sample_count
            avg_view_ratio = self.sum_view_ratio / self.sample_count
            avg_hip_to_knee_ratio = self.sum_hip_to_knee_ratio / self.sample_count

            if avg_view_ratio < 0.35:
                avg_camera_view = "side"
            elif avg_view_ratio > 0.55:
                avg_camera_view = "front"
            else:
                avg_camera_view = "unknown"

            self.baseline = {
                "hip_width": avg_hip_width,
                "knee_width": avg_knee_width,
                "torso_height": avg_torso_height,
                "view_ratio": avg_view_ratio,
                "camera_view": avg_camera_view,
                "hip_to_knee_ratio": avg_hip_to_knee_ratio,
            }
            self.state = "complete"
            return ("Calibration complete", True)

        return ("Calibrating… hold position", False)


# ── Frame decoding ─────────────────────────────────────────────────────────────
def decode_frame(jpeg_bytes: bytes) -> Optional[np.ndarray]:
    """Decode raw JPEG bytes into a BGR numpy array.  Returns None on failure."""
    arr = np.frombuffer(jpeg_bytes, np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return frame if frame is not None else None


# ── Serialisation helpers ──────────────────────────────────────────────────────
def _serialise_result(result: BaseResult) -> dict:
    """
    Flatten a BaseResult subclass into a dict with a nested 'metrics' key.

    Layout matches frontend type MaitriResult exactly:
      { rep_count, rep_just_completed, has_issue, feedback, metrics: {...} }
    """
    d = dataclasses.asdict(result)
    base_keys = {"rep_count", "rep_just_completed", "has_issue", "feedback"}
    return {
        "rep_count":          d["rep_count"],
        "rep_just_completed": d["rep_just_completed"],
        "has_issue":          d["has_issue"],
        "feedback":           d["feedback"],
        "metrics":            {k: v for k, v in d.items() if k not in base_keys},
    }


def _serialise_landmarks(landmarks) -> dict:
    """Convert a PoseLandmarks instance to a plain dict of {name: {x,y,z}}."""
    if landmarks is None:
        return {}
    names = [
        "left_shoulder", "right_shoulder",
        "left_ear",       "right_ear",
        "left_elbow",     "right_elbow",
        "left_wrist",     "right_wrist",
        "left_hip",       "right_hip",
        "left_knee",      "right_knee",
        "left_ankle",     "right_ankle",
        "neck",
    ]
    out: dict[str, dict] = {}
    for name in names:
        pt = getattr(landmarks, name, None)
        if pt is None:
            continue
        d: dict[str, float] = {"x": float(pt.x), "y": float(pt.y), "z": float(pt.z)}
        if getattr(pt, "visibility", None) is not None:
            d["visibility"] = float(pt.visibility)
        out[name] = d
    return out


# ── Public API ─────────────────────────────────────────────────────────────────
def process_frame(
    jpeg_bytes: bytes,
    analyser: BaseAnalyser,
    audio=None,          # core.audio.AudioFeedback – used only when AUDIO_BACKEND=True
    calibration: CalibrationState | None = None,
    session: dict | None = None,
) -> dict:
    """
    Process one JPEG frame through the full analysis pipeline.

    Returns a JSON-serialisable payload dict to send over WebSocket.

    Payload shape (status "ok"):
      {
        status, timestamp, exercise, dimensions,
        result: MaitriResult,
        landmarks: Record<name, {x,y,z}>,
        audio_cue: {text, urgent} | null
      }

    Payload shape (status "no_pose" | "decode_error"):
      { status, timestamp, exercise, audio_cue }
    """
    frame = decode_frame(jpeg_bytes)
    if frame is None:
        return {
            "status": "decode_error",
            "timestamp": time.time(),
            "exercise": analyser.name,
            "pose": {"quality": 0.0, "camera_view": "none", "recommended_view": str(getattr(analyser, "recommended_view", "unknown") or "unknown")},
            "calibration": None,
            "audio_cue": None,
        }

    h, w = frame.shape[:2]
    landmarks, _ = extract_landmarks(frame)

    pose_payload = {
        "quality": float(getattr(landmarks, "pose_quality", 0.0) or 0.0) if landmarks is not None else 0.0,
        "camera_view": str(getattr(landmarks, "camera_view", "none")) if landmarks is not None else "none",
        "recommended_view": str(getattr(analyser, "recommended_view", "unknown") or "unknown"),
    }

    calibration_payload = None
    if calibration is not None:
        if calibration.state == "not_started":
            calibration.start()

        msg, just_completed = calibration.update(landmarks, recommended_view=pose_payload["recommended_view"])
        calibration_payload = {
            "state": calibration.state,
            "progress": calibration.progress(),
            "message": msg,
            "baseline": calibration.baseline if calibration.state == "complete" else None,
        }

        if just_completed and calibration.baseline is not None:
            analyser.configure(
                goal_mode=(session or {}).get("goal_mode"),
                calibration=calibration.baseline,
                patient=(session or {}).get("patient"),
            )

        if calibration.state != "complete":
            return {
                "status": "calibrating" if landmarks is not None else "no_pose",
                "timestamp": time.time(),
                "exercise": analyser.name,
                "dimensions": {"width": w, "height": h},
                "landmarks": _serialise_landmarks(landmarks),
                "pose": pose_payload,
                "calibration": calibration_payload,
                "audio_cue": None,
            }

    result = analyser.evaluate(landmarks) if landmarks is not None else None

    # ── Audio routing ──────────────────────────────────────────────────────────
    audio_cue_payload = None
    if result is not None:
        cue = analyser.get_audio_cue(result)
        if cue:
            text, urgent = cue
            if AUDIO_BACKEND and audio is not None:
                audio.say_urgent(text) if urgent else audio.say(text)
            else:
                audio_cue_payload = {"text": text, "urgent": urgent}

    if landmarks is None or result is None:
        return {
            "status":    "no_pose",
            "timestamp": time.time(),
            "exercise":  analyser.name,
            "pose":      pose_payload,
            "calibration": calibration_payload,
            "audio_cue": audio_cue_payload,
        }

    return {
        "status":     "ok",
        "timestamp":  time.time(),
        "exercise":   analyser.name,
        "dimensions": {"width": w, "height": h},
        "result":     _serialise_result(result),
        "landmarks":  _serialise_landmarks(landmarks),
        "pose":       pose_payload,
        "calibration": calibration_payload,
        "audio_cue":  audio_cue_payload,
    }
