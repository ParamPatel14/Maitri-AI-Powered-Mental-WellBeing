"""Front-view lunge phase tracking with conservative rep counting."""

import math
import time
from dataclasses import dataclass
from typing import Optional

import cv2

from core.base_analyser import BaseAnalyser, BaseResult
from core.geometry import calculate_angle, pt


@dataclass
class LungeResult(BaseResult):
    phase: str
    left_knee_angle: float
    right_knee_angle: float
    minimum_knee_angle: float
    shallow_lunge: bool
    knee_alignment_issue: bool
    excessive_forward_lean: bool
    camera_view: str


class LungeAnalytics(BaseAnalyser):
    name = "Lunges"
    recommended_view = "front"

    def __init__(self, down_angle: float = 140.0, bottom_angle: float = 115.0, up_angle: float = 155.0):
        self.down_angle = down_angle
        self.bottom_angle = bottom_angle
        self.up_angle = up_angle
        self._phase = "waiting_for_stand"
        self._rep_count = 0
        self._minimum_knee_angle = 180.0
        self._last_minimum_knee_angle = 180.0
        self._reached_bottom = False
        self._last_valid_at: float | None = None
        self._cue_times: dict[str, float] = {}

    @staticmethod
    def _visible(landmarks, names: tuple[str, ...], threshold: float = 0.55) -> bool:
        for name in names:
            point = getattr(landmarks, name, None)
            if point is None:
                return False
            visibility = getattr(point, "visibility", 1.0)
            if visibility is not None and float(visibility) < threshold:
                return False
            if not all(math.isfinite(float(getattr(point, axis, math.nan))) for axis in ("x", "y", "z")):
                return False
        return True

    def _cancel_incomplete(self) -> None:
        self._phase = "waiting_for_stand"
        self._minimum_knee_angle = 180.0
        self._reached_bottom = False

    def on_tracking_lost(self) -> None:
        self._cancel_incomplete()
        self._last_valid_at = None

    def evaluate(self, landmarks) -> Optional[LungeResult]:
        if landmarks is None:
            self._cancel_incomplete()
            self._last_valid_at = None
            return None

        now = time.monotonic()
        if self._last_valid_at is not None and now - self._last_valid_at > 1.0:
            self._cancel_incomplete()
        self._last_valid_at = now

        required = ("left_shoulder", "right_shoulder", "left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle")
        view = str(getattr(landmarks, "camera_view", "unknown"))
        if not self._visible(landmarks, required):
            self._cancel_incomplete()
            return self._result(0.0, 0.0, False, False, "Keep shoulders, hips, knees, and ankles visible", view)
        if view != "front":
            self._cancel_incomplete()
            return self._result(0.0, 0.0, False, False, "Face the camera for knee alignment", view)

        try:
            left_hip, right_hip = pt(landmarks.left_hip), pt(landmarks.right_hip)
            left_knee, right_knee = pt(landmarks.left_knee), pt(landmarks.right_knee)
            left_ankle, right_ankle = pt(landmarks.left_ankle), pt(landmarks.right_ankle)
            left_angle = calculate_angle(left_hip, left_knee, left_ankle)
            right_angle = calculate_angle(right_hip, right_knee, right_ankle)
            shoulder = (pt(landmarks.left_shoulder) + pt(landmarks.right_shoulder)) / 2.0
            hip = (left_hip + right_hip) / 2.0
            trunk_angle = calculate_angle(shoulder, hip, hip + [0.0, -1.0, 0.0])
        except (AttributeError, TypeError, ValueError, ZeroDivisionError):
            self._cancel_incomplete()
            return self._result(0.0, 0.0, False, False, "Reposition so your full body is visible", view)

        active_angle = min(left_angle, right_angle)
        shallow = False
        rep_just_completed = False

        if self._phase in ("waiting_for_stand", "standing"):
            if left_angle >= self.up_angle and right_angle >= self.up_angle:
                self._phase = "standing"
            if self._phase == "standing" and active_angle < self.down_angle:
                self._phase = "lowering"
                self._minimum_knee_angle = active_angle
                self._reached_bottom = active_angle <= self.bottom_angle
        elif self._phase in ("lowering", "bottom", "ascending"):
            self._minimum_knee_angle = min(self._minimum_knee_angle, active_angle)
            self._reached_bottom = self._reached_bottom or active_angle <= self.bottom_angle
            if self._reached_bottom and active_angle > self._minimum_knee_angle + 8.0:
                self._phase = "ascending"
            elif self._reached_bottom and self._phase != "ascending":
                self._phase = "bottom"
            if left_angle >= self.up_angle and right_angle >= self.up_angle:
                self._last_minimum_knee_angle = self._minimum_knee_angle
                if self._reached_bottom:
                    self._rep_count += 1
                    rep_just_completed = True
                else:
                    shallow = True
                self._phase = "standing"
                self._minimum_knee_angle = 180.0
                self._reached_bottom = False

        knee_alignment_issue = (
            abs(float(landmarks.left_knee.x) - float(landmarks.left_ankle.x)) > 0.09
            or abs(float(landmarks.right_knee.x) - float(landmarks.right_ankle.x)) > 0.09
        )
        excessive_forward_lean = trunk_angle > 35.0
        feedback = (
            "Return upright and keep the front knee over the foot" if knee_alignment_issue else
            "Keep your chest upright" if excessive_forward_lean else
            "Use a comfortable depth, then return to standing" if shallow else
            f"Rep {self._rep_count} complete" if rep_just_completed else
            "Step back under control" if self._phase in ("lowering", "bottom", "ascending") else
            "Stand tall to begin a lunge"
        )
        return LungeResult(
            rep_count=self._rep_count,
            rep_just_completed=rep_just_completed,
            has_issue=bool(knee_alignment_issue or excessive_forward_lean or shallow),
            feedback=feedback,
            phase=self._phase,
            left_knee_angle=float(left_angle),
            right_knee_angle=float(right_angle),
            minimum_knee_angle=float(self._minimum_knee_angle if self._phase in ("lowering", "bottom", "ascending") else self._last_minimum_knee_angle),
            shallow_lunge=shallow,
            knee_alignment_issue=knee_alignment_issue,
            excessive_forward_lean=excessive_forward_lean,
            camera_view=view,
        )

    def _result(self, left: float, right: float, shallow: bool, issue: bool, feedback: str, view: str) -> LungeResult:
        return LungeResult(
            rep_count=self._rep_count, rep_just_completed=False, has_issue=issue or shallow,
            feedback=feedback, phase=self._phase, left_knee_angle=left, right_knee_angle=right,
            minimum_knee_angle=self._minimum_knee_angle, shallow_lunge=shallow,
            knee_alignment_issue=False, excessive_forward_lean=False, camera_view=view,
        )

    def draw_hud(self, frame, result: Optional[LungeResult]) -> None:
        if result is None:
            return
        color = (50, 60, 230) if result.has_issue else (60, 190, 120)
        cv2.putText(frame, f"LUNGES  {result.rep_count}  {result.phase.upper()}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2, cv2.LINE_AA)
        cv2.putText(frame, result.feedback, (20, frame.shape[0] - 24), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2, cv2.LINE_AA)

    def get_audio_cue(self, result: LungeResult) -> Optional[tuple[str, bool]]:
        now = time.monotonic()
        if result.rep_just_completed:
            return (f"Rep {result.rep_count}", True)
        if result.has_issue and now - self._cue_times.get("form", 0.0) >= 2.5:
            self._cue_times["form"] = now
            return (result.feedback, True)
        return None
