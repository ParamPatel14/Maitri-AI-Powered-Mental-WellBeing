"""
core/base_analyser.py
─────────────────────
Abstract base classes that every Maitri exercise analyser must implement.

Adding a new exercise
─────────────────────
1. Create  exercises/<name>/analyser.py
2. Define  YourResult(BaseResult)  — add any exercise-specific fields
3. Define  YourAnalytics(BaseAnalyser)  — implement the three abstract methods
4. Register the class in  exercises/__init__.py

The main loop (main.py) only ever calls the three abstract methods, so it
never needs to know anything about a specific exercise.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

import numpy as np


# ── Minimum result contract ────────────────────────────────────────────────────
@dataclass
class BaseResult:
    """
    Fields that every exercise result must expose.

    main.py reads only these four fields directly; everything else is
    exercise-specific and handled inside the analyser's own draw_hud()
    and get_audio_cue() methods.

    Fields
    ------
    rep_count          : Total completed reps in this session.
    rep_just_completed : True for exactly one frame when a rep finishes.
    has_issue          : True when a form problem is currently detected.
                         Drives the border colour and audio priority.
    feedback           : Single human-readable status line for the HUD bar.
    """
    rep_count:          int
    rep_just_completed: bool
    has_issue:          bool
    feedback:           str


# ── Analyser contract ──────────────────────────────────────────────────────────
class BaseAnalyser(ABC):
    """
    Abstract base class for all Maitri exercise analysers.

    Subclasses must set the class attribute *name* and implement the
    three abstract methods below.
    """

    #: Human-readable exercise name shown in the launcher and HUD title.
    name: str = "Unknown Exercise"

    @abstractmethod
    def evaluate(self, landmarks) -> Optional[BaseResult]:
        """
        Process one frame of landmarks and return a result.

        Parameters
        ----------
        landmarks : PoseLandmarks | None
            Output of core.pose_engine.extract_landmarks().
            Must handle None gracefully (no person in frame).

        Returns
        -------
        BaseResult subclass instance, or None if landmarks is None.
        """
        ...

    @abstractmethod
    def draw_hud(self, frame: np.ndarray, result: Optional[BaseResult]) -> None:
        """
        Render the exercise-specific heads-up display onto *frame* in-place.

        Called once per frame, after draw_skeleton() and before
        draw_source_label().  Must handle result=None gracefully.
        """
        ...

    @abstractmethod
    def get_audio_cue(self, result: BaseResult) -> Optional[tuple[str, bool]]:
        """
        Return the highest-priority coaching cue to speak this frame.

        Returns
        -------
        (cue_text, is_urgent) : tuple[str, bool]
            cue_text  — the sentence to speak
            is_urgent — True  → call audio.say_urgent()  (form correction,
                                 displaces any waiting low-priority cue)
                        False → call audio.say()          (phase coaching,
                                 dropped if TTS is busy)
        None
            Nothing to say this frame.

        Implementation guidance
        -----------------------
        - Form corrections should return is_urgent=True with a short
          per-error cooldown (e.g. 2 s) so they fire reliably.
        - Phase coaching should return is_urgent=False with a longer
          cooldown (e.g. 5–6 s) and should be suppressed for several
          seconds after any form error so corrections take priority.
        """
        ...

