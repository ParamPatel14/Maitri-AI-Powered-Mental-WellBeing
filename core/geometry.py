"""
core/geometry.py
────────────────
Pure-NumPy geometric helpers shared by all exercise analysers.

All functions operate on plain Python sequences, NumPy arrays, or any
object with .x / .y / .z float attributes (e.g. core.pose_engine.Point3D).
"""

import numpy as np


def calculate_angle(p1, p2, p3) -> float:
    """
    Return the interior angle (degrees) at vertex *p2* formed by rays
    p2→p1 and p2→p3.

    Works for both 2-D (shape (2,)) and 3-D (shape (3,)) inputs.
    Uses arctan2(|cross|, dot) for numerical stability near 0° and 180°.
    """
    p1, p2, p3 = np.array(p1, dtype=float), np.array(p2, dtype=float), np.array(p3, dtype=float)
    v1, v2 = p1 - p2, p3 - p2

    dot = np.dot(v1, v2)
    if v1.shape == (2,):
        cross_mag = abs(float(np.cross(v1, v2)))          # 2-D: scalar
    else:
        cross_mag = float(np.linalg.norm(np.cross(v1, v2)))  # 3-D: vector magnitude

    return float(np.degrees(np.arctan2(cross_mag, dot)))


def pt(landmark) -> np.ndarray:
    """
    Convert a landmark with .x / .y / .z attributes (Point3D) to a
    NumPy float64 array of shape (3,).

    Example
    -------
    >>> angle = calculate_angle(pt(lm.left_hip), pt(lm.left_knee), pt(lm.left_ankle))
    """
    return np.array([landmark.x, landmark.y, landmark.z], dtype=float)
