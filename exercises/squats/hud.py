"""
exercises/squats/hud.py
────────────────────────
Squat-specific HUD renderer.

Builds on the shared primitives in core.hud to draw a dark semi-transparent
overlay with rep count, phase banner, joint angle metrics, form flags, and
a feedback bar.
"""

import cv2
import numpy as np
from typing import Optional

from core.hud import (
    FONT, GREEN, RED, YELLOW, WHITE, DARK,
    blend_rect, draw_no_pose_warning,
)


def draw_squat_hud(frame: np.ndarray, result) -> None:
    """
    Render the squat HUD on *frame* in-place.

    Parameters
    ----------
    result : SquatResult | None
        Pass None to show the "no pose detected" warning instead.

    HUD layout
    ----------
    Top-left   : rep counter
    Top-centre : phase label (STANDING / DESCENDING / BOTTOM / ASCENDING)
    Top-right  : joint angle metrics + form flags
    Bottom bar : feedback message
    Border     : green (good form) / red (issue detected)
    """
    h, w = frame.shape[:2]

    if result is None:
        draw_no_pose_warning(frame)
        return

    # ── Border ────────────────────────────────────────────────────────────────
    border_col = RED if result.has_issue else GREEN
    cv2.rectangle(frame, (6, 6), (w - 6, h - 6), border_col, 3)

    # ── Rep counter (top-left) ────────────────────────────────────────────────
    blend_rect(frame, 10, 10, 180, 80, DARK)
    cv2.putText(frame, "REPS",              (20, 38),  FONT, 0.65, WHITE, 1, cv2.LINE_AA)
    cv2.putText(frame, str(result.rep_count), (20, 72), FONT, 1.6,  GREEN, 3, cv2.LINE_AA)

    # ── Phase banner (top-centre) ─────────────────────────────────────────────
    phase_label = result.phase.upper()
    phase_col   = {
        "standing":   GREEN,
        "descending": YELLOW,
        "bottom":     YELLOW,
        "ascending":  GREEN,
    }.get(result.phase, WHITE)

    text_sz, _ = cv2.getTextSize(phase_label, FONT, 0.9, 2)
    tx = (w - text_sz[0]) // 2
    blend_rect(frame, tx - 10, 10, tx + text_sz[0] + 10, 50, DARK)
    cv2.putText(frame, phase_label, (tx, 42), FONT, 0.9, phase_col, 2, cv2.LINE_AA)

    # ── Metrics panel (top-right) ─────────────────────────────────────────────
    panel_x = w - 210
    blend_rect(frame, panel_x, 10, w - 10, 210, DARK)

    metrics = [
        ("L Knee", f"{result.left_knee_angle:5.1f}\u00b0"),
        ("R Knee", f"{result.right_knee_angle:5.1f}\u00b0"),
        ("Torso",  f"{result.torso_angle:5.1f}\u00b0"),
        ("K/H",    f"{result.hip_to_knee_ratio:.2f}"),
        ("Score",  f"{result.session_score:5.1f}"),
    ]
    for i, (label, val) in enumerate(metrics):
        y = 40 + i * 34
        cv2.putText(frame, f"{label}:", (panel_x + 8, y),  FONT, 0.55, WHITE,  1, cv2.LINE_AA)
        cv2.putText(frame, val,          (panel_x + 90, y), FONT, 0.55, YELLOW, 1, cv2.LINE_AA)

    # ── Form flags (below metrics panel) ─────────────────────────────────────
    flags = []
    if result.knee_cave:    flags.append(("Knee Cave!", RED))
    if result.forward_lean: flags.append(("Lean!",      RED))
    if result.depth_reached: flags.append(("Depth OK",  GREEN))

    for i, (flag_text, flag_col) in enumerate(flags):
        y = 185 + i * 28
        blend_rect(frame, panel_x, y - 20, w - 10, y + 8, DARK)
        cv2.putText(frame, flag_text, (panel_x + 8, y), FONT, 0.6, flag_col, 2, cv2.LINE_AA)

    # ── Feedback bar (bottom) ─────────────────────────────────────────────────
    bar_y = h - 50
    blend_rect(frame, 10, bar_y - 10, w - 10, h - 10, DARK)
    fb_col = RED if result.has_issue else GREEN
    cv2.putText(frame, result.feedback, (20, bar_y + 22), FONT, 0.75, fb_col, 2, cv2.LINE_AA)
