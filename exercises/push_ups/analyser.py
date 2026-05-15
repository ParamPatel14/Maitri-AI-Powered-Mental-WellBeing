"""
exercises/push_ups/analyser.py
──────────────────────────────
Push-up specific rule engine: phase tracking, rep counting, and form checks.

Camera recommendation
─────────────────────
Place the camera at floor level, ~1–1.5 m to the side (profile view).
Hip sag/pike detection is most reliable from the side.
Elbow flare detection works from a front or 45° view.

Phase state machine
───────────────────
    up  ─► descending  ─► bottom  ─► ascending  ─► up   (+1 rep)
    up  ─► descending  ─► up      (came back without depth = half-rep flag)

Form errors checked
───────────────────
1. Sagging hips   – hip drops below shoulder–ankle line
2. Piking hips    – hip rises above shoulder–ankle line
3. Elbow flare    – elbows significantly wider than shoulders (front/angled view)
4. Half rep       – rep completed without elbow angle ever reaching ≤ 90°
"""

import time
import numpy as np
from dataclasses import dataclass
from typing import Optional

from core.base_analyser import BaseAnalyser, BaseResult
from core.geometry      import calculate_angle, pt, signed_body_deviation
from exercises.push_ups.hud import draw_pushup_hud


# ── Result ─────────────────────────────────────────────────────────────────────
@dataclass
class PushUpResult(BaseResult):
    """
    Extends BaseResult with push-up specific metrics.

    BaseResult fields (inherited)
    ─────────────────────────────
    rep_count          : int
    rep_just_completed : bool
    has_issue          : bool
    feedback           : str

    Push-up specific fields
    ───────────────────────
    phase              : current movement phase
    elbow_angle        : average shoulder→elbow→wrist angle (°)
    hip_deviation      : signed distance of hip from shoulder–ankle line
                         (+ = sagging below,  − = piking above)
    elbow_flare_ratio  : elbow_width / shoulder_width (1.0 = aligned)
    sagging_hips       : hip dropped below the plank line
    piking_hips        : hip raised above the plank line
    elbow_flare        : elbows flaring too wide
    half_rep           : rep completed without reaching full depth (90°)
    """
    phase:             str    # "up" | "descending" | "bottom" | "ascending"
    elbow_angle:       float
    hip_deviation:     float
    elbow_flare_ratio: float
    sagging_hips:      bool
    piking_hips:       bool
    elbow_flare:       bool
    half_rep:          bool


# ── Geometry helper ────────────────────────────────────────────────────────────
def _signed_hip_deviation(hip, shoulder, ankle) -> float:
    """
    Return the signed perpendicular distance of *hip* from the line
    defined by *shoulder* and *ankle* (2-D, x/y only, normalised coords).

    Positive  → hip is BELOW the line (sagging, toward the floor).
    Negative  → hip is ABOVE the line (piking, toward the ceiling).

    Works robustly for side-profile views; returns ~0 for front views where
    all three x-coordinates collapse together.
    """
    s = np.array([shoulder.x, shoulder.y])
    a = np.array([ankle.x,    ankle.y])
    h = np.array([hip.x,      hip.y])

    line_vec = a - s
    if np.linalg.norm(line_vec) < 1e-6:
        return 0.0

    # Signed area / length = signed perpendicular distance
    cross = float(np.cross(line_vec, h - s))
    return float(cross / float(np.linalg.norm(line_vec)))


# ── Analyser ───────────────────────────────────────────────────────────────────
class PushUpAnalytics(BaseAnalyser):
    """
    Stateful rule engine for push-up analysis.

    Tunable thresholds (constructor kwargs)
    ───────────────────────────────────────
    elbow_up_angle     : elbow angle (°) above which arms are "extended"   (155)
    elbow_mid_angle    : elbow angle (°) used as descent/ascent trigger    (120)
    elbow_bottom_angle : target depth  — elbows at this angle = full rep   (90)
    sag_threshold      : hip deviation above which sagging is flagged      (0.05)
    pike_threshold     : hip deviation below which piking is flagged       (0.05)
    flare_ratio        : elbow/shoulder width ratio above which flare      (1.30)
                         is flagged
    """

    name = "Push-ups"

    def __init__(
        self,
        elbow_up_angle:     float = 155.0,
        elbow_mid_angle:    float = 120.0,
        elbow_bottom_angle: float = 90.0,
        sag_threshold:      float = 0.05,
        pike_threshold:     float = 0.05,
        flare_ratio:        float = 1.30,
    ):
        self.elbow_up_angle     = elbow_up_angle
        self.elbow_mid_angle    = elbow_mid_angle
        self.elbow_bottom_angle = elbow_bottom_angle
        self.sag_threshold      = sag_threshold
        self.pike_threshold     = pike_threshold
        self.flare_ratio        = flare_ratio

        self._phase     = "up"
        self._rep_count = 0

        # Track minimum elbow angle within the current rep for half-rep detection
        self._min_elbow_this_rep: float = 180.0

        # Per-cue last-spoken timestamps (same cooldown pattern as squats)
        self._cue_times: dict[str, float] = {}

    # ── BaseAnalyser implementation ────────────────────────────────────────────
    def evaluate(self, landmarks) -> Optional[PushUpResult]:
        if landmarks is None:
            return None

        # 1. Elbow angles  (shoulder → elbow → wrist)
        left_elbow_angle  = calculate_angle(
            pt(landmarks.left_shoulder),  pt(landmarks.left_elbow),  pt(landmarks.left_wrist)
        )
        right_elbow_angle = calculate_angle(
            pt(landmarks.right_shoulder), pt(landmarks.right_elbow), pt(landmarks.right_wrist)
        )
        elbow_angle = (left_elbow_angle + right_elbow_angle) / 2.0

        # 2. Phase state machine
        rep_just_completed = False
        half_rep           = False

        if self._phase == "up":
            self._min_elbow_this_rep = 180.0          # reset for the new rep
            if elbow_angle < self.elbow_mid_angle:
                self._phase = "descending"

        elif self._phase == "descending":
            self._min_elbow_this_rep = min(self._min_elbow_this_rep, elbow_angle)
            if elbow_angle <= self.elbow_bottom_angle:
                self._phase = "bottom"
            elif elbow_angle >= self.elbow_up_angle:
                # Came back up without reaching depth → half-rep
                self._phase = "up"
                self._rep_count += 1
                rep_just_completed = True
                half_rep = self._min_elbow_this_rep > self.elbow_bottom_angle

        elif self._phase == "bottom":
            self._min_elbow_this_rep = min(self._min_elbow_this_rep, elbow_angle)
            if elbow_angle > self.elbow_mid_angle:
                self._phase = "ascending"

        elif self._phase == "ascending":
            if elbow_angle >= self.elbow_up_angle:
                self._phase = "up"
                self._rep_count += 1
                rep_just_completed = True
                half_rep = self._min_elbow_this_rep > self.elbow_bottom_angle

        # 3. Hip alignment  (best from side profile)
        #    Pick the side whose shoulder–ankle line is longer (more visible).
        left_dev  = signed_body_deviation(landmarks.left_hip,  landmarks.left_shoulder,  landmarks.left_ankle)
        right_dev = signed_body_deviation(landmarks.right_hip, landmarks.right_shoulder, landmarks.right_ankle)
        # Choose the side whose shoulder–ankle line has more length
        left_len  = abs(landmarks.left_shoulder.y  - landmarks.left_ankle.y)
        right_len = abs(landmarks.right_shoulder.y - landmarks.right_ankle.y)
        hip_deviation = left_dev if left_len >= right_len else right_dev

        sagging_hips = hip_deviation  >  self.sag_threshold
        piking_hips  = hip_deviation  < -self.pike_threshold

        # 4. Elbow flare  (meaningful from front/angled view)
        elbow_width    = abs(landmarks.left_elbow.x   - landmarks.right_elbow.x)
        shoulder_width = abs(landmarks.left_shoulder.x - landmarks.right_shoulder.x)
        elbow_flare_ratio = elbow_width / (shoulder_width + 1e-6)
        # Suppress if person is nearly side-on (shoulder_width too small)
        elbow_flare = (shoulder_width > 0.05) and (elbow_flare_ratio > self.flare_ratio)

        # 5. Feedback text
        issues = []
        if sagging_hips:  issues.append("Engage core – hips sagging!")
        if piking_hips:   issues.append("Lower your hips!")
        if elbow_flare:   issues.append("Tuck elbows to 45°!")
        if half_rep and rep_just_completed:
            issues.append("Go deeper next rep!")

        if not issues:
            if rep_just_completed:
                feedback = f"Rep {self._rep_count} done – great work!"
            elif self._phase == "bottom":
                feedback = "At depth – push back up!"
            elif self._phase in ("descending", "ascending"):
                feedback = "Good movement – stay rigid"
            else:
                feedback = "Hold plank – start lowering"
        else:
            feedback = "  |  ".join(issues)

        has_issue = sagging_hips or piking_hips or elbow_flare

        return PushUpResult(
            # BaseResult
            rep_count          = self._rep_count,
            rep_just_completed = rep_just_completed,
            has_issue          = has_issue,
            feedback           = feedback,
            # Push-up specific
            phase              = self._phase,
            elbow_angle        = elbow_angle,
            hip_deviation      = hip_deviation,
            elbow_flare_ratio  = elbow_flare_ratio,
            sagging_hips       = sagging_hips,
            piking_hips        = piking_hips,
            elbow_flare        = elbow_flare,
            half_rep           = half_rep and rep_just_completed,
        )

    def draw_hud(self, frame, result: Optional[PushUpResult]) -> None:
        draw_pushup_hud(frame, result)

    def get_audio_cue(self, result: PushUpResult) -> Optional[tuple[str, bool]]:
        """
        Three-tier audio coaching (same pattern as squats):
          TIER 1 – Rep completion  (urgent, clears cooldowns)
          TIER 2 – Form corrections (urgent, 2 s cooldown each)
          TIER 3 – Phase coaching   (non-urgent, 6 s cooldown, suppressed 3 s after form error)
        """
        now = time.time()

        # ── TIER 1: Rep completion ─────────────────────────────────────────────
        if result.rep_just_completed:
            self._cue_times.clear()
            self._cue_times["rep"] = now
            if result.half_rep:
                return ("Good effort, but try to go deeper next time", True)
            return (f"Rep {result.rep_count} complete. Well done!", True)

        # ── TIER 2: Form corrections ───────────────────────────────────────────
        FORM_COOLDOWN = 2.0

        if result.sagging_hips:
            if now - self._cue_times.get("sag", 0.0) >= FORM_COOLDOWN:
                self._cue_times["sag"]       = now
                self._cue_times["last_form"] = now
                return ("Engage your core, your hips are sagging", True)

        if result.piking_hips:
            if now - self._cue_times.get("pike", 0.0) >= FORM_COOLDOWN:
                self._cue_times["pike"]      = now
                self._cue_times["last_form"] = now
                return ("Lower your hips, you are piking", True)

        if result.elbow_flare:
            if now - self._cue_times.get("flare", 0.0) >= FORM_COOLDOWN:
                self._cue_times["flare"]     = now
                self._cue_times["last_form"] = now
                return ("Tuck your elbows in at 45 degrees", True)

        # ── TIER 3: Phase coaching ─────────────────────────────────────────────
        PHASE_COOLDOWN = 6.0
        FORM_SUPPRESS  = 3.0

        if now - self._cue_times.get("last_form", 0.0) < FORM_SUPPRESS:
            return None

        phase_key = f"phase_{result.phase}"
        if now - self._cue_times.get(phase_key, 0.0) >= PHASE_COOLDOWN:
            cues = {
                "up":         "Start position: body in a straight line, core tight",
                "descending": "Lower slowly, keep your body rigid",
                "bottom":     "Chest near the floor, elbows at 90 degrees",
                "ascending":  "Push through your palms, chest and hips rise together",
            }
            cue = cues.get(result.phase)
            if cue:
                self._cue_times[phase_key] = now
                return (cue, False)

        return None
