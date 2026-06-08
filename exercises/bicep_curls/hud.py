import cv2
import numpy as np
from core.hud import FONT, GREEN, RED, YELLOW, WHITE, DARK, blend_rect, draw_no_pose_warning


def draw_bicep_curl_hud(frame: np.ndarray, result) -> None:
    h, w = frame.shape[:2]

    if result is None:
        draw_no_pose_warning(frame)
        return

    border_col = RED if result.has_issue else GREEN
    cv2.rectangle(frame, (6, 6), (w - 6, h - 6), border_col, 3)

    blend_rect(frame, 10, 10, 220, 90, DARK)
    cv2.putText(frame, "REPS", (20, 38), FONT, 0.65, WHITE, 1, cv2.LINE_AA)
    cv2.putText(frame, str(result.rep_count), (20, 74), FONT, 1.6, GREEN, 3, cv2.LINE_AA)

    panel_x = w - 250
    blend_rect(frame, panel_x, 10, w - 10, 160, DARK)
    cv2.putText(frame, f"L: {result.left_elbow_angle:5.1f}°", (panel_x + 12, 48), FONT, 0.65, YELLOW, 2, cv2.LINE_AA)
    cv2.putText(frame, f"R: {result.right_elbow_angle:5.1f}°", (panel_x + 12, 86), FONT, 0.65, YELLOW, 2, cv2.LINE_AA)
    cv2.putText(frame, f"L reps: {result.left_rep_count}", (panel_x + 12, 124), FONT, 0.55, WHITE, 1, cv2.LINE_AA)
    cv2.putText(frame, f"R reps: {result.right_rep_count}", (panel_x + 130, 124), FONT, 0.55, WHITE, 1, cv2.LINE_AA)

    bar_y = h - 50
    blend_rect(frame, 10, bar_y - 10, w - 10, h - 10, DARK)
    fb_col = RED if result.has_issue else GREEN
    cv2.putText(frame, result.feedback, (20, bar_y + 22), FONT, 0.75, fb_col, 2, cv2.LINE_AA)

