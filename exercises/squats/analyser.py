"""
exercises/squats/analyser.py
─────────────────────────────
Squat-specific rule engine: phase tracking, rep counting, and form checks.

Imports shared math from core.geometry and inherits the plugin contract
from core.base_analyser so main.py never needs exercise-specific imports.
"""

import numpy as np
import time
from dataclasses import dataclass
from typing import Optional

from core.base_analyser import BaseAnalyser, BaseResult
from core.geometry import calculate_angle, pt
from exercises.squats.hud import draw_squat_hud


# ── Result ─────────────────────────────────────────────────────────────────────
@dataclass
class SquatResult(BaseResult):
    """
    Extends BaseResult with squat-specific metrics.

    BaseResult fields (inherited)
    ─────────────────────────────
    rep_count          : int
    rep_just_completed : bool
    has_issue          : bool   (True when knee_cave or forward_lean)
    feedback           : str

    Squat-specific fields
    ─────────────────────
    phase              : current movement phase
    knee_cave          : knees collapsing inward
    forward_lean       : excessive torso tilt
    depth_reached      : hip reached parallel (knee angle ≤ depth threshold)
    left_knee_angle    : hip→knee→ankle angle, left side (degrees)
    right_knee_angle   : hip→knee→ankle angle, right side (degrees)
    torso_angle        : shoulder–hip deviation from vertical (degrees)
    hip_to_knee_ratio  : knee-width / hip-width  (<1 = cave, >1 = wide)
    """
    phase:              str    # "standing" | "descending" | "bottom" | "ascending"
    knee_cave:          bool
    forward_lean:       bool
    depth_reached:      bool
    left_knee_angle:    float
    right_knee_angle:   float
    torso_angle:        float
    hip_to_knee_ratio:  float


# ── Analyser ───────────────────────────────────────────────────────────────────
class SquatAnalytics(BaseAnalyser):
    """
    Stateful rule engine for squat analysis.

    Phase state machine
    ───────────────────
    standing → descending → bottom → ascending → standing  (= 1 rep)

    Tunable thresholds (constructor kwargs)
    ───────────────────────────────────────
    squat_down_angle   : knee angle (°) below which descent is detected   (110)
    squat_up_angle     : knee angle (°) above which standing is confirmed  (160)
    depth_angle        : target knee angle (°) for "parallel" depth        (90)
    max_torso_lean_deg : max torso tilt from vertical before alert (°)     (40)
    knee_cave_ratio    : min knee-width/hip-width ratio before alert       (0.70)
    """

    name = "Squats"

    def __init__(
        self,
        squat_down_angle:   float = 110.0,
        squat_up_angle:     float = 160.0,
        depth_angle:        float = 90.0,
        max_torso_lean_deg: float = 40.0,
        knee_cave_ratio:    float = 0.70,
    ):
        self.squat_down_angle   = squat_down_angle
        self.squat_up_angle     = squat_up_angle
        self.depth_angle        = depth_angle
        self.max_torso_lean_deg = max_torso_lean_deg
        self.knee_cave_ratio    = knee_cave_ratio

        self._phase     = "standing"
        self._rep_count = 0

        # Per-cue last-spoken timestamps (seconds since epoch).
        # Keys: "knee_cave", "forward_lean", "last_form",
        #       "phase_standing", "phase_descending", "phase_bottom", "phase_ascending"
        self._cue_times: dict[str, float] = {}

    # ── BaseAnalyser implementation ────────────────────────────────────────────
    def evaluate(self, landmarks) -> Optional[SquatResult]:
        """
        Process one frame of PoseLandmarks.
        Returns a SquatResult or None if landmarks is None.
        """
        if landmarks is None:
            return None

        # 1. Knee angles (hip → knee → ankle)
        left_knee_angle  = calculate_angle(pt(landmarks.left_hip),  pt(landmarks.left_knee),  pt(landmarks.left_ankle))
        right_knee_angle = calculate_angle(pt(landmarks.right_hip), pt(landmarks.right_knee), pt(landmarks.right_ankle))
        avg_knee_angle   = (left_knee_angle + right_knee_angle) / 2.0

        # 2. Phase state machine
        rep_just_completed = False
        if self._phase == "standing":
            if avg_knee_angle < self.squat_down_angle:
                self._phase = "descending"
        elif self._phase == "descending":
            if avg_knee_angle <= self.depth_angle:
                self._phase = "bottom"
            elif avg_knee_angle > self.squat_up_angle:
                self._phase = "standing"   # came back up without reaching depth
        elif self._phase == "bottom":
            if avg_knee_angle > self.squat_down_angle:
                self._phase = "ascending"
        elif self._phase == "ascending":
            if avg_knee_angle >= self.squat_up_angle:
                self._phase = "standing"
                self._rep_count += 1
                rep_just_completed = True

        # 3. Torso lean
        mid_shoulder = (pt(landmarks.left_shoulder) + pt(landmarks.right_shoulder)) / 2.0
        mid_hip      = (pt(landmarks.left_hip)      + pt(landmarks.right_hip))      / 2.0
        vertical_ref = mid_hip + np.array([0.0, -1.0, 0.0])
        torso_angle  = calculate_angle(vertical_ref, mid_hip, mid_shoulder)
        forward_lean = torso_angle > self.max_torso_lean_deg

        # 4. Knee cave
        knee_width        = abs(landmarks.left_knee.x - landmarks.right_knee.x)
        hip_width         = abs(landmarks.left_hip.x  - landmarks.right_hip.x)
        hip_to_knee_ratio = knee_width / (hip_width + 1e-6)
        knee_cave         = hip_to_knee_ratio < self.knee_cave_ratio

        # 5. Depth
        depth_reached = avg_knee_angle <= self.depth_angle

        # 6. Feedback text
        issues = []
        if knee_cave:    issues.append("Push knees out!")
        if forward_lean: issues.append("Keep chest up!")
        if self._phase == "bottom" and not depth_reached:
            issues.append("Go deeper!")

        if not issues:
            if self._phase in ("bottom", "ascending"):
                feedback = "Good depth - drive up!"
            elif rep_just_completed:
                feedback = f"Rep {self._rep_count} done!"
            else:
                feedback = "Good form - keep going"
        else:
            feedback = "  |  ".join(issues)

        has_issue = knee_cave or forward_lean

        return SquatResult(
            # BaseResult fields
            rep_count          = self._rep_count,
            rep_just_completed = rep_just_completed,
            has_issue          = has_issue,
            feedback           = feedback,
            # Squat-specific fields
            phase              = self._phase,
            knee_cave          = knee_cave,
            forward_lean       = forward_lean,
            depth_reached      = depth_reached,
            left_knee_angle    = left_knee_angle,
            right_knee_angle   = right_knee_angle,
            torso_angle        = torso_angle,
            hip_to_knee_ratio  = hip_to_knee_ratio,
        )

    def draw_hud(self, frame, result: Optional[SquatResult]) -> None:
        """Delegate to the squats-specific HUD renderer."""
        draw_squat_hud(frame, result)

    def get_audio_cue(self, result: SquatResult) -> Optional[tuple[str, bool]]:
        """
        Return (cue_text, is_urgent) for this frame, or None.

        Cooldown design
        ───────────────
        TIER 1 – Rep completion
            Fires immediately on the frame the rep is detected.
            Clears all cooldown timers so coaching restarts fresh.
            is_urgent = True

        TIER 2 – Form corrections  (is_urgent = True)
            Each error type has its own 2-second cooldown so it can
            fire independently of the other error.  Uses say_urgent()
            so the cue displaces any low-priority phase cue waiting
            in the queue.

        TIER 3 – Phase coaching  (is_urgent = False)
            6-second cooldown per phase.  Suppressed entirely for
            3 seconds after any form error so corrections dominate.
        """
        now = time.time()

        # ── TIER 1: Rep completion ─────────────────────────────────────────
        if result.rep_just_completed:
            self._cue_times.clear()          # reset so next rep starts fresh
            self._cue_times["rep"] = now
            return (f"Rep {result.rep_count} complete. Good job!", True)

        # ── TIER 2: Form corrections ────────────────────────────────────────
        FORM_COOLDOWN = 2.0   # seconds between repeating the same form cue

        if result.knee_cave:
            if now - self._cue_times.get("knee_cave", 0.0) >= FORM_COOLDOWN:
                self._cue_times["knee_cave"]  = now
                self._cue_times["last_form"]  = now
                return ("Knees caving in, push them out", True)

        if result.forward_lean:
            if now - self._cue_times.get("forward_lean", 0.0) >= FORM_COOLDOWN:
                self._cue_times["forward_lean"] = now
                self._cue_times["last_form"]    = now
                return ("Keep your chest up, don't lean forward", True)

        # ── TIER 3: Phase coaching ─────────────────────────────────────────
        PHASE_COOLDOWN  = 6.0   # seconds between phase coaching repeats
        FORM_SUPPRESS   = 3.0   # seconds to suppress phase cues after a form error

        # Don't give phase coaching right after a form correction —
        # keep the audio channel clear for the correction to repeat if needed
        if now - self._cue_times.get("last_form", 0.0) < FORM_SUPPRESS:
            return None

        phase     = result.phase
        phase_key = f"phase_{phase}"

        if now - self._cue_times.get(phase_key, 0.0) >= PHASE_COOLDOWN:
            cues = {
                "standing":   "Stand tall, feet shoulder width apart",
                "descending": "Lower down slowly, keep weight in your heels",
                "bottom":     "Great depth, now drive back up" if result.depth_reached
                              else "Go deeper, try to get parallel",
                "ascending":  "Drive through your heels, almost there",
            }
            cue = cues.get(phase)
            if cue:
                self._cue_times[phase_key] = now
                return (cue, False)          # low-priority: dropped if TTS busy

        return None
