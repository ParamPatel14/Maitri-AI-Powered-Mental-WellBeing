"""
exercises/planks/hud.py
────────────────────────
Plank-specific HUD renderer.

Primary metric is HOLD TIME (displayed as M:SS), not rep count.
Hold count and best hold are shown in the metrics panel.
"""

import cv2
import numpy as np
from typing import Optional

from core.hud import (
    FONT, GREEN, RED, YELLOW, WHITE, DARK,
    blend_rect, draw_no_pose_warning,
)


def _fmt_time(seconds: float) -> str:
    """Format seconds as M:SS (e.g. 90.0 → '1:30')."""
    s = int(seconds)
    return f"{s // 60}:{s % 60:02d}"


def draw_plank_hud(frame: np.ndarray, result) -> None:
    """
    Render the plank HUD on *frame* in-place.

    Parameters
    ----------
    result : PlankResult | None
        Pass None to show the 'no pose detected' warning instead.

    HUD layout
    ----------
    Top-left   : hold timer (M:SS) — primary metric
    Top-centre : phase label (IN PLANK / RESTING)
    Top-right  : hold count, best hold, hip deviation
    Right col  : form flags
    Bottom bar : feedback message
    Border     : green (good form) / red (issue) / yellow (resting)
    """
    h, w = frame.shape[:2]

    if result is None:
        draw_no_pose_warning(frame)
        return

    # ── Border ─────────────────────────────────────────────────────────────────
    if result.phase == "resting":
        border_col = YELLOW
    else:
        border_col = RED if result.has_issue else GREEN
    cv2.rectangle(frame, (6, 6), (w - 6, h - 6), border_col, 3)

    # ── Hold timer (top-left) ───────────────────────────────────────────────────
    blend_rect(frame, 10, 10, 190, 80, DARK)
    cv2.putText(frame, "HOLD",               (20, 38),  FONT, 0.65, WHITE, 1, cv2.LINE_AA)
    time_str = _fmt_time(result.hold_seconds)
    cv2.putText(frame, time_str,             (20, 72),  FONT, 1.5,  GREEN, 3, cv2.LINE_AA)

    # ── Phase banner (top-centre) ───────────────────────────────────────────────
    phase_label = "IN PLANK" if result.phase == "in_plank" else "RESTING"
    phase_col   = GREEN if result.phase == "in_plank" else YELLOW

    text_sz, _ = cv2.getTextSize(phase_label, FONT, 0.9, 2)
    tx = (w - text_sz[0]) // 2
    blend_rect(frame, tx - 10, 10, tx + text_sz[0] + 10, 50, DARK)
    cv2.putText(frame, phase_label, (tx, 42), FONT, 0.9, phase_col, 2, cv2.LINE_AA)

    # ── Metrics panel (top-right) ───────────────────────────────────────────────
    panel_x = w - 220
    blend_rect(frame, panel_x, 10, w - 10, 155, DARK)

    metrics = [
        ("Holds",    str(result.rep_count)),
        ("Best",     _fmt_time(result.best_hold_seconds)),
        ("Hip Dev",  f"{result.hip_deviation:+.3f}"),
    ]
    for i, (label, val) in enumerate(metrics):
        y = 40 + i * 34
        cv2.putText(frame, f"{label}:", (panel_x + 8, y),   FONT, 0.55, WHITE,  1, cv2.LINE_AA)
        cv2.putText(frame, val,         (panel_x + 95, y),  FONT, 0.55, YELLOW, 1, cv2.LINE_AA)

    # ── Form flags (below metrics panel) ───────────────────────────────────────
    flags = []
    if result.sagging_hips:    flags.append(("Sagging Hips!",   RED))
    if result.piking_hips:     flags.append(("Piking Hips!",    RED))
    if result.shoulder_sinking: flags.append(("Shoulders Sinking!", RED))
    if result.head_dropping:   flags.append(("Head Dropping!",  RED))
    if not flags and result.phase == "in_plank":
        flags.append(("Form OK", GREEN))

    for i, (flag_text, flag_col) in enumerate(flags):
        y = 165 + i * 28
        blend_rect(frame, panel_x, y - 20, w - 10, y + 8, DARK)
        cv2.putText(frame, flag_text, (panel_x + 8, y), FONT, 0.6, flag_col, 2, cv2.LINE_AA)

    # ── Camera tip (shown before first hold) ────────────────────────────────────
    if result.rep_count == 0 and result.phase == "resting":
        tip = "Tip: Place camera to your side at floor level"
        (tw, _), _ = cv2.getTextSize(tip, FONT, 0.45, 1)
        tip_x = (w - tw) // 2
        blend_rect(frame, tip_x - 6, h - 90, tip_x + tw + 6, h - 66, DARK)
        cv2.putText(frame, tip, (tip_x, h - 72), FONT, 0.45, YELLOW, 1, cv2.LINE_AA)

    # ── Feedback bar (bottom) ───────────────────────────────────────────────────
    bar_y = h - 50
    blend_rect(frame, 10, bar_y - 10, w - 10, h - 10, DARK)
    fb_col = RED if result.has_issue else (GREEN if result.phase == "in_plank" else YELLOW)
    cv2.putText(frame, result.feedback, (20, bar_y + 22), FONT, 0.75, fb_col, 2, cv2.LINE_AA)
