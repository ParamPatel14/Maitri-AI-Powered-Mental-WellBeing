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
    goal_mode          : active coaching mode
    last_rep_score     : 0–100 quality score of the most recently completed rep
    session_score      : 0–100 average score across completed reps
    good_rep_percent   : percent of reps considered "good"
    last_rep_tempo_s   : seconds from descent start to standing
    last_rep_depth_deg : minimum knee angle achieved in last rep (smaller = deeper)
    last_rep_symmetry  : abs(left_min - right_min) knee angle diff (degrees)
    last_rep_wobble    : stddev of mid-hip x during last rep (normalised units)
    """
    phase:              str    # "standing" | "descending" | "bottom" | "ascending"
    knee_cave:          bool
    forward_lean:       bool
    depth_reached:      bool
    left_knee_angle:    float
    right_knee_angle:   float
    torso_angle:        float
    hip_to_knee_ratio:  float
    goal_mode:          str
    last_rep_score:     float
    session_score:      float
    good_rep_percent:   float
    last_rep_tempo_s:   float
    last_rep_depth_deg: float
    last_rep_symmetry:  float
    last_rep_wobble:    float


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
    recommended_view = "side"

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
        self._good_reps = 0

        self.goal_mode = "Rehab"
        self._tempo_range = (2.5, 5.0)
        self._depth_target = self.depth_angle

        self._rep_start_time: float | None = None
        self._min_knee_this_rep: float = 180.0
        self._min_left_knee_this_rep: float = 180.0
        self._min_right_knee_this_rep: float = 180.0
        self._hip_x_samples: list[float] = []
        self._rep_had_issue: bool = False

        self._rep_scores: list[float] = []
        self._rep_depths: list[float] = []
        self._smoothed_knee_angle: float | None = None
        self._missing_pose_frames: int = 0
        self._stand_frames: int = 0
        self._desc_frames: int = 0

        # Per-cue last-spoken timestamps (seconds since epoch).
        # Keys: "knee_cave", "forward_lean", "last_form",
        #       "phase_standing", "phase_descending", "phase_bottom", "phase_ascending"
        self._cue_times: dict[str, float] = {}

    # ── BaseAnalyser implementation ────────────────────────────────────────────
    def configure(self, *, goal_mode: str | None = None, calibration: dict | None = None, patient: dict | None = None) -> None:
        if goal_mode:
            self.goal_mode = str(goal_mode)

        if self.goal_mode.lower() == "strength":
            self._tempo_range = (2.0, 4.0)
            self._depth_target = min(self.depth_angle, 90.0)
            self.max_torso_lean_deg = min(self.max_torso_lean_deg, 35.0)
        elif self.goal_mode.lower() == "endurance":
            self._tempo_range = (1.2, 2.8)
            self._depth_target = max(self.depth_angle, 100.0)
            self.max_torso_lean_deg = max(self.max_torso_lean_deg, 45.0)
        else:
            self._tempo_range = (2.5, 5.0)
            self._depth_target = max(self.depth_angle, 100.0)
            self.max_torso_lean_deg = max(self.max_torso_lean_deg, 45.0)

        if calibration and isinstance(calibration, dict):
            baseline_ratio = calibration.get("hip_to_knee_ratio")
            try:
                if baseline_ratio is not None:
                    baseline_ratio_f = float(baseline_ratio)
                    self.knee_cave_ratio = max(0.55, min(self.knee_cave_ratio, baseline_ratio_f * 0.80))
            except Exception:
                pass

    def evaluate(self, landmarks) -> Optional[SquatResult]:
        """
        Process one frame of PoseLandmarks.
        Returns a SquatResult or None if landmarks is None.
        """
        if landmarks is None:
            self._missing_pose_frames += 1
            if self._missing_pose_frames >= 30:
                self._phase = "standing"
                self._rep_start_time = None
                self._min_knee_this_rep = 180.0
                self._min_left_knee_this_rep = 180.0
                self._min_right_knee_this_rep = 180.0
                self._hip_x_samples = []
                self._rep_had_issue = False
                self._smoothed_knee_angle = None
                self._stand_frames = 0
                self._desc_frames = 0
            return None
        self._missing_pose_frames = 0

        pose_quality = float(getattr(landmarks, "pose_quality", 1.0) or 0.0)
        camera_view = str(getattr(landmarks, "camera_view", "unknown"))
        knee_cave_enabled = (camera_view == "front") and (pose_quality >= 0.65)
        forward_lean_enabled = (camera_view in ("side", "unknown")) and (pose_quality >= 0.65)

        # 1. Knee angles (hip → knee → ankle)
        left_knee_angle  = calculate_angle(pt(landmarks.left_hip),  pt(landmarks.left_knee),  pt(landmarks.left_ankle))
        right_knee_angle = calculate_angle(pt(landmarks.right_hip), pt(landmarks.right_knee), pt(landmarks.right_ankle))
        left_vis = float(min(landmarks.left_hip.visibility or 0.0, landmarks.left_knee.visibility or 0.0, landmarks.left_ankle.visibility or 0.0))
        right_vis = float(min(landmarks.right_hip.visibility or 0.0, landmarks.right_knee.visibility or 0.0, landmarks.right_ankle.visibility or 0.0))
        if left_vis >= right_vis + 0.10:
            avg_knee_angle = float(left_knee_angle)
        elif right_vis >= left_vis + 0.10:
            avg_knee_angle = float(right_knee_angle)
        else:
            avg_knee_angle = float((left_knee_angle + right_knee_angle) / 2.0)

        alpha = 0.35
        if self._smoothed_knee_angle is None:
            self._smoothed_knee_angle = avg_knee_angle
        else:
            self._smoothed_knee_angle = (alpha * avg_knee_angle) + ((1.0 - alpha) * self._smoothed_knee_angle)
        knee_angle_for_phase = float(self._smoothed_knee_angle)

        # 2. Phase state machine
        rep_just_completed = False
        if self._phase == "standing":
            if knee_angle_for_phase < self.squat_down_angle:
                self._desc_frames += 1
            else:
                self._desc_frames = 0
            if self._desc_frames >= 3:
                self._phase = "descending"
                self._rep_start_time = time.time()
                self._min_knee_this_rep = 180.0
                self._min_left_knee_this_rep = 180.0
                self._min_right_knee_this_rep = 180.0
                self._hip_x_samples = []
                self._rep_had_issue = False
                self._stand_frames = 0
        elif self._phase == "descending":
            if knee_angle_for_phase <= self.depth_angle:
                self._phase = "bottom"
            elif knee_angle_for_phase > self.squat_up_angle:
                self._phase = "standing"   # came back up without reaching depth
                self._rep_start_time = None
                self._hip_x_samples = []
                self._rep_had_issue = False
                self._min_knee_this_rep = 180.0
                self._min_left_knee_this_rep = 180.0
                self._min_right_knee_this_rep = 180.0
                self._desc_frames = 0
        elif self._phase == "bottom":
            if knee_angle_for_phase > self.squat_down_angle:
                self._phase = "ascending"
        elif self._phase == "ascending":
            if knee_angle_for_phase >= self.squat_up_angle:
                self._stand_frames += 1
            else:
                self._stand_frames = 0
            if self._stand_frames >= 3:
                self._phase = "standing"
                self._rep_count += 1
                rep_just_completed = True
                self._stand_frames = 0
                self._desc_frames = 0

        # 3. Torso lean
        mid_shoulder = (pt(landmarks.left_shoulder) + pt(landmarks.right_shoulder)) / 2.0
        mid_hip      = (pt(landmarks.left_hip)      + pt(landmarks.right_hip))      / 2.0
        vertical_ref = mid_hip + np.array([0.0, -1.0, 0.0])
        torso_angle  = calculate_angle(vertical_ref, mid_hip, mid_shoulder)
        forward_lean = bool(forward_lean_enabled and (torso_angle > self.max_torso_lean_deg))

        # 4. Knee cave
        knee_width        = abs(landmarks.left_knee.x - landmarks.right_knee.x)
        hip_width         = abs(landmarks.left_hip.x  - landmarks.right_hip.x)
        hip_to_knee_ratio = knee_width / (hip_width + 1e-6)
        knee_cave         = bool(knee_cave_enabled and (hip_to_knee_ratio < self.knee_cave_ratio))

        # 5. Depth
        depth_reached = avg_knee_angle <= self.depth_angle

        if self._phase in ("descending", "bottom", "ascending"):
            self._min_knee_this_rep = min(self._min_knee_this_rep, avg_knee_angle)
            self._min_left_knee_this_rep = min(self._min_left_knee_this_rep, left_knee_angle)
            self._min_right_knee_this_rep = min(self._min_right_knee_this_rep, right_knee_angle)
            self._hip_x_samples.append(float(mid_hip[0]))
            if knee_cave or forward_lean:
                self._rep_had_issue = True

        # 6. Feedback text
        issues = []
        if knee_cave:    issues.append("Push knees out!")
        if forward_lean: issues.append("Keep chest up!")

        if rep_just_completed:
            feedback = f"Rep {self._rep_count} done!"
        elif not issues:
            if self._phase == "bottom":
                feedback = "Hold - drive up!"
            elif self._phase == "descending":
                feedback = "Lower with control"
            elif self._phase == "ascending":
                feedback = "Drive up"
            else:
                feedback = "Good form - keep going"
        else:
            feedback = "  |  ".join(issues)

        has_issue = knee_cave or forward_lean

        last_rep_score = float(self._rep_scores[-1]) if self._rep_scores else 0.0
        session_score = float(sum(self._rep_scores) / len(self._rep_scores)) if self._rep_scores else 0.0
        good_rep_percent = float((self._good_reps / self._rep_count) * 100.0) if self._rep_count > 0 else 0.0
        last_rep_tempo_s = float(getattr(self, "_last_rep_tempo_s", 0.0))
        last_rep_depth_deg = float(getattr(self, "_last_rep_depth_deg", 0.0))
        last_rep_symmetry = float(getattr(self, "_last_rep_symmetry", 0.0))
        last_rep_wobble = float(getattr(self, "_last_rep_wobble", 0.0))

        if rep_just_completed and self._rep_start_time is not None:
            rep_end = time.time()
            tempo_s = float(rep_end - self._rep_start_time)
            depth_deg = float(self._min_knee_this_rep)
            symmetry_deg = float(abs(self._min_left_knee_this_rep - self._min_right_knee_this_rep))
            wobble = float(np.std(np.array(self._hip_x_samples, dtype=float))) if self._hip_x_samples else 0.0

            depth_target = float(self._depth_target)
            if depth_deg <= depth_target:
                depth_score = 1.0
            elif depth_deg <= depth_target + 25.0:
                depth_score = float(max(0.0, 1.0 - ((depth_deg - depth_target) / 25.0)))
            else:
                depth_score = 0.0

            t_min, t_max = self._tempo_range
            if t_min <= tempo_s <= t_max:
                tempo_score = 1.0
            else:
                if tempo_s < t_min:
                    tempo_score = float(max(0.0, 1.0 - ((t_min - tempo_s) / max(0.5, t_min))))
                else:
                    tempo_score = float(max(0.0, 1.0 - ((tempo_s - t_max) / max(1.0, t_max))))

            if symmetry_deg <= 10.0:
                symmetry_score = 1.0
            elif symmetry_deg <= 25.0:
                symmetry_score = float(max(0.0, 1.0 - ((symmetry_deg - 10.0) / 15.0)))
            else:
                symmetry_score = 0.0

            if wobble <= 0.015:
                stability_score = 1.0
            elif wobble <= 0.05:
                stability_score = float(max(0.0, 1.0 - ((wobble - 0.015) / 0.035)))
            else:
                stability_score = 0.0

            score = (0.35 * depth_score) + (0.25 * tempo_score) + (0.20 * symmetry_score) + (0.20 * stability_score)
            if self._rep_had_issue:
                score *= 0.7
            rep_score = float(round(score * 100.0, 1))

            self._rep_scores.append(rep_score)
            self._rep_depths.append(depth_deg)

            self._last_rep_tempo_s = tempo_s
            self._last_rep_depth_deg = depth_deg
            self._last_rep_symmetry = symmetry_deg
            self._last_rep_wobble = wobble

            if (rep_score >= 75.0) and (not self._rep_had_issue) and (depth_deg <= depth_target + 10.0):
                self._good_reps += 1

            last_rep_score = rep_score
            session_score = float(sum(self._rep_scores) / len(self._rep_scores))
            good_rep_percent = float((self._good_reps / self._rep_count) * 100.0) if self._rep_count > 0 else 0.0
            last_rep_tempo_s = tempo_s
            last_rep_depth_deg = depth_deg
            last_rep_symmetry = symmetry_deg
            last_rep_wobble = wobble

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
            goal_mode          = self.goal_mode,
            last_rep_score     = last_rep_score,
            session_score      = session_score,
            good_rep_percent   = good_rep_percent,
            last_rep_tempo_s   = last_rep_tempo_s,
            last_rep_depth_deg = last_rep_depth_deg,
            last_rep_symmetry  = last_rep_symmetry,
            last_rep_wobble    = last_rep_wobble,
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
