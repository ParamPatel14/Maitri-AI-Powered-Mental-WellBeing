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
        "left_hip",       "right_hip",
        "left_knee",      "right_knee",
        "left_ankle",     "right_ankle",
        "neck",
    ]
    return {
        name: {"x": pt.x, "y": pt.y, "z": pt.z}
        for name in names
        if (pt := getattr(landmarks, name, None)) is not None
    }


# ── Public API ─────────────────────────────────────────────────────────────────
def process_frame(
    jpeg_bytes: bytes,
    analyser: BaseAnalyser,
    audio=None,          # core.audio.AudioFeedback – used only when AUDIO_BACKEND=True
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
        return {"status": "decode_error", "timestamp": time.time(), "exercise": analyser.name, "audio_cue": None}

    h, w = frame.shape[:2]
    landmarks, _ = extract_landmarks(frame)
    result        = analyser.evaluate(landmarks) if landmarks is not None else None

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
            "audio_cue": audio_cue_payload,
        }

    return {
        "status":     "ok",
        "timestamp":  time.time(),
        "exercise":   analyser.name,
        "dimensions": {"width": w, "height": h},
        "result":     _serialise_result(result),
        "landmarks":  _serialise_landmarks(landmarks),
        "audio_cue":  audio_cue_payload,
    }
