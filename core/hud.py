"""
core/hud.py
───────────
Reusable HUD rendering primitives shared by all exercise overlay modules.

Exercise-specific HUDs (e.g. exercises/squats/hud.py) import these
building blocks so colours and typography stay consistent across all
workout modes.
"""

import cv2
import numpy as np

# ── Design tokens ──────────────────────────────────────────────────────────────
FONT         = cv2.FONT_HERSHEY_SIMPLEX
GREEN        = (0, 230, 0)
RED          = (0, 0, 230)
YELLOW       = (0, 210, 255)
WHITE        = (255, 255, 255)
DARK         = (20, 20, 20)
PANEL_ALPHA  = 0.55


# ── Primitives ─────────────────────────────────────────────────────────────────
def blend_rect(
    frame: np.ndarray,
    x1: int, y1: int, x2: int, y2: int,
    color: tuple,
    alpha: float = PANEL_ALPHA,
) -> None:
    """
    Draw a semi-transparent filled rectangle on *frame* in-place.

    Parameters
    ----------
    alpha : float
        Opacity of the filled rectangle (0 = invisible, 1 = opaque).
    """
    overlay = frame.copy()
    cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)
    cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)


def draw_source_label(frame: np.ndarray, label: str) -> None:
    """
    Render a small grey 'Source: <label>' tag in the bottom-right corner.
    Call after all other overlays so it always appears on top.
    """
    h, w = frame.shape[:2]
    text = f"Source: {label}"
    (lw, _), _ = cv2.getTextSize(text, FONT, 0.45, 1)
    cv2.putText(frame, text, (w - lw - 10, h - 8),
                FONT, 0.45, (160, 160, 160), 1, cv2.LINE_AA)


def draw_no_pose_warning(frame: np.ndarray) -> None:
    """Render a yellow warning when no pose is detected in the frame."""
    cv2.putText(frame, "No pose detected \u2013 step into frame",
                (20, 50), FONT, 0.8, YELLOW, 2, cv2.LINE_AA)


def resize_to_window(
    frame: np.ndarray,
    target_w: int = 960,
    target_h: int = 540,
) -> np.ndarray:
    """
    Scale *frame* to fit within (target_w × target_h) while preserving
    its original aspect ratio.  Any unused space is filled with black
    (letterbox for wide frames, pillarbox for tall/vertical frames).

    This is purely a display utility — the original *frame* is not
    modified.  Analysis and HUD rendering always happen on the original
    before calling this function.

    Parameters
    ----------
    target_w, target_h : int
        Fixed display canvas size in pixels.  Default: 960 × 540.
    """
    h, w = frame.shape[:2]
    scale  = min(target_w / w, target_h / h)
    new_w  = int(w * scale)
    new_h  = int(h * scale)

    resized = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)

    # Black canvas at the fixed target size
    canvas = np.zeros((target_h, target_w, 3), dtype=np.uint8)

    # Paste the resized frame centred in the canvas
    x_off = (target_w - new_w) // 2
    y_off = (target_h - new_h) // 2
    canvas[y_off : y_off + new_h, x_off : x_off + new_w] = resized

    return canvas
