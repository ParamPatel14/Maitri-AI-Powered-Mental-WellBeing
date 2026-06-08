import time
import numpy as np
from dataclasses import dataclass
from typing import Optional

from core.base_analyser import BaseAnalyser, BaseResult
from core.geometry import calculate_angle, pt
from exercises.shoulder_press.hud import draw_shoulder_press_hud


@dataclass
class ShoulderPressResult(BaseResult):
    phase: str
    left_elbow_angle: float
    right_elbow_angle: float
    torso_angle: float
    back_arch: bool


class ShoulderPressAnalytics(BaseAnalyser):
    name = "Shoulder Press"
    recommended_view = "front"

    def __init__(
        self,
        press_down_angle: float = 110.0,
        press_up_angle: float = 160.0,
        max_torso_lean_deg: float = 35.0,
    ):
        self.press_down_angle = press_down_angle
        self.press_up_angle = press_up_angle
        self.max_torso_lean_deg = max_torso_lean_deg

        self._phase = "down"
        self._rep_count = 0
        self._cue_times: dict[str, float] = {}

    def evaluate(self, landmarks) -> Optional[ShoulderPressResult]:
        if landmarks is None:
            return None

        left_elbow_angle = calculate_angle(
            pt(landmarks.left_shoulder), pt(landmarks.left_elbow), pt(landmarks.left_wrist)
        )
        right_elbow_angle = calculate_angle(
            pt(landmarks.right_shoulder), pt(landmarks.right_elbow), pt(landmarks.right_wrist)
        )
        avg_elbow = (left_elbow_angle + right_elbow_angle) / 2.0

        mid_shoulder = (pt(landmarks.left_shoulder) + pt(landmarks.right_shoulder)) / 2.0
        mid_hip = (pt(landmarks.left_hip) + pt(landmarks.right_hip)) / 2.0
        vertical_ref = mid_hip + np.array([0.0, -1.0, 0.0])
        torso_angle = calculate_angle(vertical_ref, mid_hip, mid_shoulder)
        back_arch = torso_angle > self.max_torso_lean_deg

        wrists_above_shoulders = bool(
            (landmarks.left_wrist.y < landmarks.left_shoulder.y) and (landmarks.right_wrist.y < landmarks.right_shoulder.y)
        )

        rep_just_completed = False

        if self._phase == "down":
            if avg_elbow >= self.press_up_angle and wrists_above_shoulders:
                self._phase = "up"
        elif self._phase == "up":
            if avg_elbow <= self.press_down_angle:
                self._phase = "down"
                self._rep_count += 1
                rep_just_completed = True

        if back_arch:
            feedback = "Keep ribs down, avoid arching"
        else:
            feedback = f"Rep {self._rep_count} done!" if rep_just_completed else "Press smoothly overhead"

        return ShoulderPressResult(
            rep_count=int(self._rep_count),
            rep_just_completed=bool(rep_just_completed),
            has_issue=bool(back_arch),
            feedback=str(feedback),
            phase=str(self._phase),
            left_elbow_angle=float(left_elbow_angle),
            right_elbow_angle=float(right_elbow_angle),
            torso_angle=float(torso_angle),
            back_arch=bool(back_arch),
        )

    def draw_hud(self, frame, result: Optional[ShoulderPressResult]) -> None:
        draw_shoulder_press_hud(frame, result)

    def get_audio_cue(self, result: ShoulderPressResult) -> Optional[tuple[str, bool]]:
        now = time.time()

        if result.rep_just_completed:
            if now - self._cue_times.get("rep", 0.0) >= 0.6:
                self._cue_times["rep"] = now
                return (f"Rep {result.rep_count}", True)

        if result.back_arch:
            if now - self._cue_times.get("arch", 0.0) >= 2.5:
                self._cue_times["arch"] = now
                return ("Keep your ribs down", True)

        return None

