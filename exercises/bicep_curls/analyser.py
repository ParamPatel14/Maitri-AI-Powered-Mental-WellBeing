import time
from dataclasses import dataclass
from typing import Optional

from core.base_analyser import BaseAnalyser, BaseResult
from core.geometry import calculate_angle, pt
from exercises.bicep_curls.hud import draw_bicep_curl_hud


@dataclass
class BicepCurlResult(BaseResult):
    phase_left: str
    phase_right: str
    left_elbow_angle: float
    right_elbow_angle: float
    left_rep_count: int
    right_rep_count: int
    swinging: bool


class BicepCurlAnalytics(BaseAnalyser):
    name = "Bicep Curls"
    recommended_view = "front"

    def __init__(
        self,
        curl_down_angle: float = 70.0,
        curl_up_angle: float = 155.0,
        swing_threshold: float = 0.14,
    ):
        self.curl_down_angle = curl_down_angle
        self.curl_up_angle = curl_up_angle
        self.swing_threshold = swing_threshold

        self._phase_left = "down"
        self._phase_right = "down"
        self._left_reps = 0
        self._right_reps = 0
        self._cue_times: dict[str, float] = {}

    def evaluate(self, landmarks) -> Optional[BicepCurlResult]:
        if landmarks is None:
            return None

        left_elbow_angle = calculate_angle(
            pt(landmarks.left_shoulder), pt(landmarks.left_elbow), pt(landmarks.left_wrist)
        )
        right_elbow_angle = calculate_angle(
            pt(landmarks.right_shoulder), pt(landmarks.right_elbow), pt(landmarks.right_wrist)
        )

        swinging = (abs(landmarks.left_elbow.x - landmarks.left_shoulder.x) > self.swing_threshold) or (
            abs(landmarks.right_elbow.x - landmarks.right_shoulder.x) > self.swing_threshold
        )

        rep_just_completed = False

        if self._phase_left == "down":
            if left_elbow_angle < self.curl_down_angle:
                self._phase_left = "up"
        elif self._phase_left == "up":
            if left_elbow_angle > self.curl_up_angle:
                self._phase_left = "down"
                self._left_reps += 1
                rep_just_completed = True

        if self._phase_right == "down":
            if right_elbow_angle < self.curl_down_angle:
                self._phase_right = "up"
        elif self._phase_right == "up":
            if right_elbow_angle > self.curl_up_angle:
                self._phase_right = "down"
                self._right_reps += 1
                rep_just_completed = True

        total_reps = self._left_reps + self._right_reps

        if swinging:
            feedback = "Keep elbows close, avoid swinging"
        else:
            if rep_just_completed:
                feedback = f"Rep {total_reps} done!"
            else:
                feedback = "Smooth curls, control the lowering"

        return BicepCurlResult(
            rep_count=total_reps,
            rep_just_completed=rep_just_completed,
            has_issue=swinging,
            feedback=feedback,
            phase_left=self._phase_left,
            phase_right=self._phase_right,
            left_elbow_angle=float(left_elbow_angle),
            right_elbow_angle=float(right_elbow_angle),
            left_rep_count=int(self._left_reps),
            right_rep_count=int(self._right_reps),
            swinging=bool(swinging),
        )

    def draw_hud(self, frame, result: Optional[BicepCurlResult]) -> None:
        draw_bicep_curl_hud(frame, result)

    def get_audio_cue(self, result: BicepCurlResult) -> Optional[tuple[str, bool]]:
        now = time.time()

        if result.rep_just_completed:
            if now - self._cue_times.get("rep", 0.0) >= 0.6:
                self._cue_times["rep"] = now
                return (f"Rep {result.rep_count}", True)

        if result.swinging:
            if now - self._cue_times.get("swing", 0.0) >= 2.5:
                self._cue_times["swing"] = now
                return ("Keep your elbows still", True)

        return None

