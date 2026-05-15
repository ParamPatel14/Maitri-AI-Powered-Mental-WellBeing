"""
exercises/push_ups/hud.py
──────────────────────────
Push-up specific HUD renderer.

Mirrors the layout of exercises/squats/hud.py using the same shared
primitives from core.hud so all exercises look visually consistent.

HUD layout
──────────
Top-left   : rep counter
Top-centre : phase label  (UP / DESCENDING / BOTTOM / ASCENDING)
Top-right  : elbow angle + hip deviation metric panel
Right col  : form flags   (Sag / Pike / Flare / Half-Rep)
Bottom bar : feedback message
Border     : green (good form) / red (issue detected)
"""

import cv2
import numpy as np
from typing import Optional

from core.hud import (
    FONT, GREEN, RED, YELLOW, WHITE, DARK,
    blend_rect, draw_no_pose_warning,
)


def draw_pushup_hud(frame: np.ndarray, result) -> None:
    """
    Render the push-up HUD on *frame* in-place.

    Parameters
    ----------
    result : PushUpResult | None
        Pass None to show the 'no pose detected' warning instead.
    """
    h, w = frame.shape[:2]

    if result is None:
        draw_no_pose_warning(frame)
        return

    # ── Border ─────────────────────────────────────────────────────────────────
    border_col = RED if result.has_issue else GREEN
    cv2.rectangle(frame, (6, 6), (w - 6, h - 6), border_col, 3)

    # ── Rep counter (top-left) ──────────────────────────────────────────────────
    blend_rect(frame, 10, 10, 180, 80, DARK)
    cv2.putText(frame, "REPS",                 (20, 38),  FONT, 0.65, WHITE, 1, cv2.LINE_AA)
    cv2.putText(frame, str(result.rep_count),  (20, 72),  FONT, 1.6,  GREEN, 3, cv2.LINE_AA)

    # ── Phase banner (top-centre) ───────────────────────────────────────────────
    phase_label = result.phase.upper()
    phase_col = {
        "up":         GREEN,
        "descending": YELLOW,
        "bottom":     YELLOW,
        "ascending":  GREEN,
    }.get(result.phase, WHITE)

    text_sz, _ = cv2.getTextSize(phase_label, FONT, 0.9, 2)
    tx = (w - text_sz[0]) // 2
    blend_rect(frame, tx - 10, 10, tx + text_sz[0] + 10, 50, DARK)
    cv2.putText(frame, phase_label, (tx, 42), FONT, 0.9, phase_col, 2, cv2.LINE_AA)

    # ── Metrics panel (top-right) ───────────────────────────────────────────────
    panel_x = w - 210
    blend_rect(frame, panel_x, 10, w - 10, 155, DARK)

    metrics = [
        ("Elbow",  f"{result.elbow_angle:5.1f}\u00b0"),
        ("Hip Dev", f"{result.hip_deviation:+.3f}"),
        ("E/S",     f"{result.elbow_flare_ratio:.2f}"),
    ]
    for i, (label, val) in enumerate(metrics):
        y = 40 + i * 34
        cv2.putText(frame, f"{label}:", (panel_x + 8, y),  FONT, 0.55, WHITE,  1, cv2.LINE_AA)
        cv2.putText(frame, val,         (panel_x + 90, y), FONT, 0.55, YELLOW, 1, cv2.LINE_AA)

    # ── Form flags (below metrics panel) ───────────────────────────────────────
    flags = []
    if result.sagging_hips:  flags.append(("Sagging Hips!", RED))
    if result.piking_hips:   flags.append(("Piking Hips!",  RED))
    if result.elbow_flare:   flags.append(("Elbow Flare!",  RED))
    if result.half_rep:      flags.append(("Half Rep!",     YELLOW))
    if not flags and result.phase in ("descending", "bottom", "ascending"):
        flags.append(("Form OK", GREEN))

    for i, (flag_text, flag_col) in enumerate(flags):
        y = 165 + i * 28
        blend_rect(frame, panel_x, y - 20, w - 10, y + 8, DARK)
        cv2.putText(frame, flag_text, (panel_x + 8, y), FONT, 0.6, flag_col, 2, cv2.LINE_AA)

    # ── Camera tip (shown when in "up" phase = start of session) ───────────────
    if result.phase == "up" and result.rep_count == 0:
        tip = "Tip: Place camera to your side for best analysis"
        (tw, _), _ = cv2.getTextSize(tip, FONT, 0.45, 1)
        tip_x = (w - tw) // 2
        blend_rect(frame, tip_x - 6, h - 90, tip_x + tw + 6, h - 66, DARK)
        cv2.putText(frame, tip, (tip_x, h - 72), FONT, 0.45, YELLOW, 1, cv2.LINE_AA)

    # ── Feedback bar (bottom) ───────────────────────────────────────────────────
    bar_y = h - 50
    blend_rect(frame, 10, bar_y - 10, w - 10, h - 10, DARK)
    fb_col = RED if result.has_issue else GREEN
    cv2.putText(frame, result.feedback, (20, bar_y + 22), FONT, 0.75, fb_col, 2, cv2.LINE_AA)
