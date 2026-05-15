"""
exercises/planks/analyser.py
─────────────────────────────
Plank hold rule engine: position detection, hold timing, and form checks.

Unlike rep-based exercises, planks are a STATIC HOLD.
  • rep_count          → number of completed holds this session
  • rep_just_completed → True on the frame a hold ends
  • hold_seconds       → elapsed seconds of the current (or last) hold

Camera recommendation
─────────────────────
Place the camera at floor level, ~1 m to the side (side-profile view).
Hip sag/pike and head-drop detection are most reliable from the side.

Phase state machine
───────────────────
  "resting"  → body not horizontal (user setting up or resting between holds)
  "in_plank" → body roughly horizontal, hold timer running

  resting  → in_plank : body horizontal for ≥ entry_grace (2 s)
  in_plank → resting  : body no longer horizontal
                        if held ≥ min_hold_seconds (5 s) → +1 hold, cue played

Form errors checked (JSON-safe — all bools are Python bool, all floats are Python float)
──────────────────────────────────────────────────────────────────────────────────────────
1. Sagging hips    – hip below shoulder–ankle line
2. Piking hips     – hip above shoulder–ankle line
3. Shoulder sinking– shoulder Y significantly lower than hip Y (side view)
4. Head dropping   – ear Y significantly lower than shoulder Y
"""

import time
from dataclasses import dataclass
from typing import Optional

from core.base_analyser     import BaseAnalyser, BaseResult
from core.geometry          import signed_body_deviation
from exercises.planks.hud   import draw_plank_hud


# ── Result ─────────────────────────────────────────────────────────────────────
@dataclass
class PlankResult(BaseResult):
    """
    Extends BaseResult for plank holds.

    Inherited BaseResult fields
    ───────────────────────────
    rep_count          : completed hold count
    rep_just_completed : True on the frame a hold ends
    has_issue          : any active form error
    feedback           : status line for HUD feedback bar

    Plank-specific fields (all JSON-safe Python types)
    ───────────────────────────────────────────────────
    phase              : "in_plank" | "resting"
    hold_seconds       : elapsed seconds of current hold (0.0 when resting)
    best_hold_seconds  : longest completed hold this session
    hip_deviation      : signed distance from shoulder–ankle line
    sagging_hips       : hip below line by > threshold
    piking_hips        : hip above line by > threshold
    shoulder_sinking   : shoulder dropped below hip level
    head_dropping      : ear dropped below shoulder level
    """
    phase:             str
    hold_seconds:      float
    best_hold_seconds: float
    hip_deviation:     float
    sagging_hips:      bool
    piking_hips:       bool
    shoulder_sinking:  bool
    head_dropping:     bool


# ── Analyser ───────────────────────────────────────────────────────────────────
class PlankAnalytics(BaseAnalyser):
    """
    Stateful rule engine for plank holds.

    Tunable thresholds (constructor kwargs)
    ───────────────────────────────────────
    in_plank_y_threshold : max abs(shoulder.y − ankle.y) to count as horizontal  (0.18)
    entry_grace          : seconds body must be horizontal before hold starts     (2.0)
    min_hold_seconds     : minimum hold duration to count as a completed hold     (5.0)
    sag_threshold        : hip deviation above which sagging is flagged           (0.05)
    pike_threshold       : hip deviation below which piking is flagged            (0.05)
    shoulder_sink_thresh : shoulder.y − hip.y above which sinking is flagged      (0.08)
    head_drop_thresh     : ear.y − shoulder.y above which head drop is flagged    (0.06)
    """

    name = "Planks"

    def __init__(
        self,
        in_plank_y_threshold: float = 0.18,
        entry_grace:          float = 2.0,
        min_hold_seconds:     float = 5.0,
        sag_threshold:        float = 0.05,
        pike_threshold:       float = 0.05,
        shoulder_sink_thresh: float = 0.08,
        head_drop_thresh:     float = 0.06,
    ):
        self.in_plank_y_threshold = in_plank_y_threshold
        self.entry_grace          = entry_grace
        self.min_hold_seconds     = min_hold_seconds
        self.sag_threshold        = sag_threshold
        self.pike_threshold       = pike_threshold
        self.shoulder_sink_thresh = shoulder_sink_thresh
        self.head_drop_thresh     = head_drop_thresh

        self._phase:             str            = "resting"
        self._rep_count:         int            = 0
        self._hold_start_time:   Optional[float] = None
        self._entry_start_time:  Optional[float] = None
        self._best_hold:         float          = 0.0
        self._last_hold_dur:     float          = 0.0

        # Per-cue last-spoken timestamps
        self._cue_times: dict[str, float] = {}

    # ── BaseAnalyser implementation ────────────────────────────────────────────
    def evaluate(self, landmarks) -> Optional[PlankResult]:
        if landmarks is None:
            return None

        now = float(time.time())

        # ── 1. Is body roughly horizontal? (primary plank detection) ──────────
        #    Average both sides so a slight camera tilt doesn't matter.
        shoulder_y = float((landmarks.left_shoulder.y + landmarks.right_shoulder.y) / 2.0)
        ankle_y    = float((landmarks.left_ankle.y    + landmarks.right_ankle.y)    / 2.0)
        hip_y      = float((landmarks.left_hip.y      + landmarks.right_hip.y)      / 2.0)
        ear_y      = float((landmarks.left_ear.y      + landmarks.right_ear.y)      / 2.0)

        body_horizontal: bool = bool(abs(shoulder_y - ankle_y) < self.in_plank_y_threshold)

        # ── 2. Phase state machine ────────────────────────────────────────────
        rep_just_completed = False

        if self._phase == "resting":
            if body_horizontal:
                if self._entry_start_time is None:
                    self._entry_start_time = now
                elif bool((now - self._entry_start_time) >= self.entry_grace):
                    self._phase = "in_plank"
                    self._hold_start_time = now
            else:
                self._entry_start_time = None

        elif self._phase == "in_plank":
            if not body_horizontal:
                hold_dur = float(now - self._hold_start_time) if self._hold_start_time else 0.0
                self._last_hold_dur   = hold_dur
                self._best_hold       = float(max(self._best_hold, hold_dur))
                if bool(hold_dur >= self.min_hold_seconds):
                    self._rep_count       += 1
                    rep_just_completed     = True
                self._phase           = "resting"
                self._hold_start_time  = None
                self._entry_start_time = None

        # ── 3. Hold timer ─────────────────────────────────────────────────────
        if self._phase == "in_plank" and self._hold_start_time is not None:
            hold_seconds = float(now - self._hold_start_time)
        else:
            hold_seconds = 0.0

        # ── 4. Hip alignment (side-profile view) ──────────────────────────────
        left_dev  = signed_body_deviation(
            landmarks.left_hip,  landmarks.left_shoulder,  landmarks.left_ankle
        )
        right_dev = signed_body_deviation(
            landmarks.right_hip, landmarks.right_shoulder, landmarks.right_ankle
        )
        # Pick the side whose shoulder–ankle line is longer (more side-on)
        left_len  = abs(landmarks.left_shoulder.y  - landmarks.left_ankle.y)
        right_len = abs(landmarks.right_shoulder.y - landmarks.right_ankle.y)
        hip_deviation = float(left_dev if left_len >= right_len else right_dev)

        sagging_hips = bool(hip_deviation >  self.sag_threshold)
        piking_hips  = bool(hip_deviation < -self.pike_threshold)

        # ── 5. Shoulder sinking ───────────────────────────────────────────────
        # When the chest drops, the shoulder Y grows larger than the hip Y
        # (lower on screen in normalised coords).
        shoulder_sinking = bool((shoulder_y - hip_y) > self.shoulder_sink_thresh)

        # ── 6. Head dropping ──────────────────────────────────────────────────
        # Neutral plank: ear roughly level with shoulder.
        # Head drop: ear Y grows significantly larger than shoulder Y.
        head_dropping = bool((ear_y - shoulder_y) > self.head_drop_thresh)

        # ── 7. Feedback text ──────────────────────────────────────────────────
        issues = []
        if sagging_hips:    issues.append("Engage core – hips dropping!")
        if piking_hips:     issues.append("Lower your hips!")
        if shoulder_sinking: issues.append("Push into floor, shoulders sinking!")
        if head_dropping:   issues.append("Keep head neutral!")

        if not issues:
            if self._phase == "in_plank":
                feedback = f"Hold strong – {int(hold_seconds)}s"
            else:
                feedback = "Get into plank position" if self._rep_count == 0 \
                           else "Rest – get back into position when ready"
        else:
            feedback = "  |  ".join(issues)

        has_issue = bool(sagging_hips or piking_hips or shoulder_sinking or head_dropping)

        return PlankResult(
            # BaseResult
            rep_count          = int(self._rep_count),
            rep_just_completed = bool(rep_just_completed),
            has_issue          = has_issue,
            feedback           = str(feedback),
            # Plank-specific  (all explicitly Python float / bool)
            phase              = str(self._phase),
            hold_seconds       = hold_seconds,
            best_hold_seconds  = float(self._best_hold),
            hip_deviation      = hip_deviation,
            sagging_hips       = sagging_hips,
            piking_hips        = piking_hips,
            shoulder_sinking   = shoulder_sinking,
            head_dropping      = head_dropping,
        )

    def draw_hud(self, frame, result: Optional[PlankResult]) -> None:
        draw_plank_hud(frame, result)

    def get_audio_cue(self, result: PlankResult) -> Optional[tuple[str, bool]]:
        """
        Three-tier audio coaching adapted for static holds:
          TIER 1 – Hold ended (plays once when the user breaks position)
          TIER 2 – Form corrections (urgent, 3 s cooldown each)
          TIER 3 – Periodic encouragement (non-urgent, 10 s cooldown)
        """
        now = float(time.time())

        # ── TIER 1: Hold ended ────────────────────────────────────────────────
        if result.rep_just_completed:
            self._cue_times.clear()
            self._cue_times["hold_end"] = now
            secs = int(self._last_hold_dur)
            return (f"Hold complete — {secs} seconds. Great work!", True)

        # ── TIER 2: Form corrections ──────────────────────────────────────────
        FORM_COOLDOWN = 3.0

        if result.sagging_hips:
            if bool((now - self._cue_times.get("sag", 0.0)) >= FORM_COOLDOWN):
                self._cue_times["sag"]       = now
                self._cue_times["last_form"] = now
                return ("Engage your core, your hips are dropping", True)

        if result.piking_hips:
            if bool((now - self._cue_times.get("pike", 0.0)) >= FORM_COOLDOWN):
                self._cue_times["pike"]      = now
                self._cue_times["last_form"] = now
                return ("Lower your hips, keep a straight line", True)

        if result.shoulder_sinking:
            if bool((now - self._cue_times.get("sink", 0.0)) >= FORM_COOLDOWN):
                self._cue_times["sink"]      = now
                self._cue_times["last_form"] = now
                return ("Push into the floor, don't let your chest sink", True)

        if result.head_dropping:
            if bool((now - self._cue_times.get("head", 0.0)) >= FORM_COOLDOWN):
                self._cue_times["head"]      = now
                self._cue_times["last_form"] = now
                return ("Keep your head neutral, look at the floor ahead", True)

        # ── TIER 3: Periodic encouragement ───────────────────────────────────
        # Only given when in plank and not after a recent form error
        ENCOURAGE_COOLDOWN = 10.0
        FORM_SUPPRESS      = 4.0

        if result.phase != "in_plank":
            return None

        if bool((now - self._cue_times.get("last_form", 0.0)) < FORM_SUPPRESS):
            return None

        if bool((now - self._cue_times.get("encourage", 0.0)) >= ENCOURAGE_COOLDOWN):
            secs = int(result.hold_seconds)
            if secs < 10:
                cue = "Breathe steadily and hold your position"
            elif secs < 30:
                cue = "Great work, keep that core tight"
            elif secs < 60:
                cue = "You're doing great, keep pushing"
            else:
                cue = "Incredible hold, you are doing amazing"
            self._cue_times["encourage"] = now
            return (cue, False)

        return None
