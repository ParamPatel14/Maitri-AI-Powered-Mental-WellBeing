"""Deadlift phase tracking, repetition counting, and basic form feedback."""

import time
from dataclasses import dataclass
from typing import Optional

import cv2

from core.base_analyser import BaseAnalyser, BaseResult
from core.geometry import calculate_angle, pt


@dataclass
class DeadliftResult(BaseResult):
    phase: str
    left_knee_angle: float
    right_knee_angle: float
    torso_angle: float
    excessive_trunk_fold: bool


class DeadliftAnalytics(BaseAnalyser):
    name = "Deadlifts"
    recommended_view = "side"

    def __init__(self):
        self._phase = "standing"
        self._rep_count = 0
        self._cue_times: dict[str, float] = {}

    def evaluate(self, landmarks) -> Optional[DeadliftResult]:
        if landmarks is None:
            return None

        left = calculate_angle(pt(landmarks.left_hip), pt(landmarks.left_knee), pt(landmarks.left_ankle))
        right = calculate_angle(pt(landmarks.right_hip), pt(landmarks.right_knee), pt(landmarks.right_ankle))
        hip = (pt(landmarks.left_hip) + pt(landmarks.right_hip)) / 2.0
        shoulder = (pt(landmarks.left_shoulder) + pt(landmarks.right_shoulder)) / 2.0
        knee = (pt(landmarks.left_knee) + pt(landmarks.right_knee)) / 2.0
        hip_hinge_angle = calculate_angle(shoulder, hip, knee)
        trunk_lean = calculate_angle(hip + [0.0, -1.0, 0.0], hip, shoulder)
        excessive_trunk_fold = hip_hinge_angle < 85.0
        rep_just_completed = False

        if self._phase == "standing" and trunk_lean > 20.0:
            self._phase = "lowering"
        elif self._phase == "lowering" and trunk_lean < 15.0:
            self._phase = "standing"
            self._rep_count += 1
            rep_just_completed = True

        feedback = (
            "Ease out of the deep hinge" if excessive_trunk_fold else
            f"Rep {self._rep_count} complete" if rep_just_completed else
            "Hinge at the hips, then stand tall"
        )
        return DeadliftResult(
            rep_count=self._rep_count,
            rep_just_completed=rep_just_completed,
            has_issue=bool(excessive_trunk_fold),
            feedback=feedback,
            phase=self._phase,
            left_knee_angle=float(left),
            right_knee_angle=float(right),
            torso_angle=float(trunk_lean),
            excessive_trunk_fold=bool(excessive_trunk_fold),
        )

    def draw_hud(self, frame, result: Optional[DeadliftResult]) -> None:
        if result is None:
            return
        color = (50, 60, 230) if result.has_issue else (60, 190, 120)
        cv2.putText(frame, f"DEADLIFTS  {result.rep_count}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2, cv2.LINE_AA)
        cv2.putText(frame, result.feedback, (20, frame.shape[0] - 24), cv2.FONT_HERSHEY_SIMPLEX, 0.65, color, 2, cv2.LINE_AA)

    def get_audio_cue(self, result: DeadliftResult) -> Optional[tuple[str, bool]]:
        now = time.time()
        if result.rep_just_completed:
            return (f"Rep {result.rep_count}", True)
        if result.excessive_trunk_fold and now - self._cue_times.get("form", 0.0) >= 2.5:
            self._cue_times["form"] = now
            return ("Ease out of the deep hinge", True)
        return None
