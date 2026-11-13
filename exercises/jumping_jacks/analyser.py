"""Front-view jumping-jack cycle tracking and basic coordination feedback."""

import math
import time
from dataclasses import dataclass
from typing import Optional

import cv2

from core.base_analyser import BaseAnalyser, BaseResult


@dataclass
class JumpingJackResult(BaseResult):
    phase: str
    arms_open: bool
    legs_open: bool
    incomplete_movement: bool
    coordination_issue: bool
    camera_view: str


class JumpingJackAnalytics(BaseAnalyser):
    name = "Jumping Jacks"
    recommended_view = "front"

    def __init__(self):
        self._phase = "waiting_for_closed"
        self._rep_count = 0
        self._reached_open = False
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
            if not all(math.isfinite(float(getattr(point, axis, math.nan))) for axis in ("x", "y")):
                return False
        return True

    def _cancel_incomplete(self) -> None:
        self._phase = "waiting_for_closed"
        self._reached_open = False

    def on_tracking_lost(self) -> None:
        self._cancel_incomplete()
        self._last_valid_at = None

    def evaluate(self, landmarks) -> Optional[JumpingJackResult]:
        if landmarks is None:
            self._cancel_incomplete()
            self._last_valid_at = None
            return None

        now = time.monotonic()
        if self._last_valid_at is not None and now - self._last_valid_at > 1.0:
            self._cancel_incomplete()
        self._last_valid_at = now
        view = str(getattr(landmarks, "camera_view", "unknown"))
        required = (
            "left_shoulder", "right_shoulder", "left_elbow", "right_elbow", "left_wrist", "right_wrist",
            "left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle",
        )
        if not self._visible(landmarks, required):
            self._cancel_incomplete()
            return self._result(view, False, False, False, "Keep arms, shoulders, hips, and legs visible")
        if view != "front":
            self._cancel_incomplete()
            return self._result(view, False, False, False, "Face the camera so both arms and legs stay visible")

        try:
            left_arm_open = landmarks.left_wrist.y < landmarks.left_shoulder.y - 0.05
            right_arm_open = landmarks.right_wrist.y < landmarks.right_shoulder.y - 0.05
            left_arm_closed = landmarks.left_wrist.y >= landmarks.left_shoulder.y
            right_arm_closed = landmarks.right_wrist.y >= landmarks.right_shoulder.y
            left_leg_apart = abs(float(landmarks.left_ankle.x) - float(landmarks.left_hip.x)) > 0.06
            right_leg_apart = abs(float(landmarks.right_ankle.x) - float(landmarks.right_hip.x)) > 0.06
        except (AttributeError, TypeError, ValueError):
            self._cancel_incomplete()
            return self._result(view, False, False, False, "Reposition so your full body is visible")

        arms_open = left_arm_open and right_arm_open
        legs_open = left_leg_apart and right_leg_apart
        is_open = arms_open and legs_open
        is_closed = left_arm_closed and right_arm_closed and not left_leg_apart and not right_leg_apart
        coordination_issue = left_arm_open != right_arm_open or left_leg_apart != right_leg_apart
        incomplete = False
        rep_just_completed = False

        if self._phase == "waiting_for_closed":
            if is_closed:
                self._phase = "closed"
        elif self._phase == "closed":
            if arms_open or legs_open:
                self._phase = "opening"
                if is_open:
                    self._phase = "open"
                    self._reached_open = True
        elif self._phase == "opening":
            if is_open:
                self._phase = "open"
                self._reached_open = True
            elif is_closed:
                incomplete = True
                self._phase = "closed"
                self._reached_open = False
        elif self._phase == "open":
            if is_closed:
                self._rep_count += 1
                rep_just_completed = True
                self._phase = "closed"
                self._reached_open = False
            elif not is_open:
                self._phase = "closing"
        elif self._phase == "closing":
            if is_closed:
                if self._reached_open:
                    self._rep_count += 1
                    rep_just_completed = True
                else:
                    incomplete = True
                self._phase = "closed"
                self._reached_open = False
            elif is_open:
                self._phase = "open"
                self._reached_open = True

        feedback = (
            "Match both arms and legs" if coordination_issue else
            "Open arms overhead and step both feet apart" if incomplete else
            f"Rep {self._rep_count} complete" if rep_just_completed else
            "Bring arms overhead and feet apart" if self._phase in ("opening", "open") else
            "Return arms and feet together" if self._phase == "closing" else
            "Begin standing with arms by your sides"
        )
        return JumpingJackResult(
            rep_count=self._rep_count,
            rep_just_completed=rep_just_completed,
            has_issue=bool(coordination_issue or incomplete),
            feedback=feedback,
            phase=self._phase,
            arms_open=arms_open,
            legs_open=legs_open,
            incomplete_movement=incomplete,
            coordination_issue=coordination_issue,
            camera_view=view,
        )

    def _result(self, view: str, issue: bool, incomplete: bool, coordination: bool, feedback: str) -> JumpingJackResult:
        return JumpingJackResult(
            rep_count=self._rep_count, rep_just_completed=False, has_issue=issue,
            feedback=feedback, phase=self._phase, arms_open=False, legs_open=False,
            incomplete_movement=incomplete, coordination_issue=coordination, camera_view=view,
        )

    def draw_hud(self, frame, result: Optional[JumpingJackResult]) -> None:
        if result is None:
            return
        color = (50, 60, 230) if result.has_issue else (60, 190, 120)
        cv2.putText(frame, f"JACKS  {result.rep_count}  {result.phase.upper()}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2, cv2.LINE_AA)
        cv2.putText(frame, result.feedback, (20, frame.shape[0] - 24), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2, cv2.LINE_AA)

    def get_audio_cue(self, result: JumpingJackResult) -> Optional[tuple[str, bool]]:
        now = time.monotonic()
        if result.rep_just_completed:
            return (f"Rep {result.rep_count}", True)
        if result.has_issue and now - self._cue_times.get("issue", 0.0) >= 2.5:
            self._cue_times["issue"] = now
            return (result.feedback, True)
        return None
