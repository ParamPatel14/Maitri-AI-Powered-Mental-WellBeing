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


def signed_body_deviation(hip, shoulder, ankle) -> float:
    """
    Signed perpendicular distance of *hip* from the shoulder–ankle line
    using only the 2-D (x, y) normalised coordinates.

    Positive  → hip is BELOW the line (sagging toward the floor).
    Negative  → hip is ABOVE the line (piking toward the ceiling).

    Returns 0.0 for front-on camera angles where the shoulder–ankle line
    is nearly vertical (line length < 1e-6 in normalised space).

    All intermediate numpy types are cast to Python float before return
    so the result is always JSON-serialisable.
    """
    s = np.array([float(shoulder.x), float(shoulder.y)])
    a = np.array([float(ankle.x),    float(ankle.y)])
    h = np.array([float(hip.x),      float(hip.y)])

    line_vec = a - s
    line_len = float(np.linalg.norm(line_vec))
    if line_len < 1e-6:
        return 0.0

    cross = float(np.cross(line_vec, h - s))
    return float(cross / line_len)
