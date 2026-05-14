"""
core/pose_engine.py
───────────────────
MediaPipe Pose wrapper shared by all exercise analysers.

Exports
-------
Point3D        — normalised 3-D joint coordinate
PoseLandmarks  — structured snapshot of key joints for one frame
extract_landmarks(frame) → (PoseLandmarks | None, raw_results)
draw_skeleton(frame, raw_results) → frame
"""

import cv2
import mediapipe as mp
import numpy as np
from dataclasses import dataclass
from typing import Optional

# ── MediaPipe singletons ───────────────────────────────────────────────────────
mp_pose          = mp.solutions.pose
mp_drawing       = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

_pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

# ── Data structures ────────────────────────────────────────────────────────────
@dataclass
class Point3D:
    """Normalised 3-D point as returned by MediaPipe (x, y in [0,1]; z relative depth)."""
    x: float
    y: float
    z: float


@dataclass
class PoseLandmarks:
    """
    Structured snapshot of the joints Maitri currently tracks.

    All coordinates are normalised (0–1 range), with (0,0) at the top-left
    of the frame.  z is a relative depth estimate (smaller = closer).

    If a future exercise needs additional landmarks (e.g. wrists, toes),
    add them here and update extract_landmarks() below.
    """
    # Upper body
    left_shoulder:  Point3D
    right_shoulder: Point3D
    left_ear:       Point3D
    right_ear:      Point3D
    # Core
    left_hip:       Point3D
    right_hip:      Point3D
    # Lower body
    left_knee:      Point3D
    right_knee:     Point3D
    left_ankle:     Point3D
    right_ankle:    Point3D
    # Derived
    neck:           Point3D   # midpoint of left/right shoulders


# ── Public API ─────────────────────────────────────────────────────────────────
def extract_landmarks(frame: np.ndarray) -> tuple[Optional[PoseLandmarks], object]:
    """
    Run MediaPipe Pose on one BGR frame.

    Returns
    -------
    landmarks : PoseLandmarks | None
        Structured joint data.  None when no person is detected.
    raw_results : mediapipe.python.solutions.pose.Pose result
        Raw MediaPipe output (pass to draw_skeleton to render the overlay).
    """
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = _pose.process(rgb)

    if not results.pose_landmarks:
        return None, results

    lms = results.pose_landmarks.landmark

    def _get(idx: int) -> Point3D:
        lm = lms[idx]
        return Point3D(x=lm.x, y=lm.y, z=lm.z)

    PL = mp_pose.PoseLandmark
    left_shoulder  = _get(PL.LEFT_SHOULDER.value)
    right_shoulder = _get(PL.RIGHT_SHOULDER.value)

    neck = Point3D(
        x=(left_shoulder.x + right_shoulder.x) / 2.0,
        y=(left_shoulder.y + right_shoulder.y) / 2.0,
        z=(left_shoulder.z + right_shoulder.z) / 2.0,
    )

    return PoseLandmarks(
        left_shoulder  = left_shoulder,
        right_shoulder = right_shoulder,
        left_ear       = _get(PL.LEFT_EAR.value),
        right_ear      = _get(PL.RIGHT_EAR.value),
        left_hip       = _get(PL.LEFT_HIP.value),
        right_hip      = _get(PL.RIGHT_HIP.value),
        left_knee      = _get(PL.LEFT_KNEE.value),
        right_knee     = _get(PL.RIGHT_KNEE.value),
        left_ankle     = _get(PL.LEFT_ANKLE.value),
        right_ankle    = _get(PL.RIGHT_ANKLE.value),
        neck           = neck,
    ), results


def draw_skeleton(frame: np.ndarray, raw_results) -> np.ndarray:
    """
    Draw the full 33-landmark MediaPipe skeleton onto *frame* in-place.
    Call this BEFORE any HUD overlays so the HUD renders on top.
    """
    if raw_results.pose_landmarks:
        mp_drawing.draw_landmarks(
            frame,
            raw_results.pose_landmarks,
            mp_pose.POSE_CONNECTIONS,
            landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style(),
        )
    return frame
