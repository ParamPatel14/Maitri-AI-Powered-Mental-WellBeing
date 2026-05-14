"""
exercises/__init__.py — Exercise Registry
─────────────────────────────────────────
This is the ONLY file that needs to be edited when adding a new exercise.

Steps to add a new exercise
────────────────────────────
1. Create  exercises/<name>/analyser.py
   - Define  YourResult(BaseResult)
   - Define  YourAnalytics(BaseAnalyser)  implementing evaluate(), draw_hud(),
             get_audio_cue()

2. Create  exercises/<name>/hud.py  (optional — can live inside analyser.py)

3. Add ONE entry to EXERCISE_REGISTRY below:
       "Your Exercise Name": YourAnalytics,

That's it.  main.py and core/ require no changes.
"""

from exercises.squats.analyser import SquatAnalytics

# ── Registry ───────────────────────────────────────────────────────────────────
# Maps human-readable exercise name  →  BaseAnalyser subclass (not instance).
# The launcher uses this dict to populate the exercise-picker dialog.
EXERCISE_REGISTRY: dict[str, type] = {
    "Squats": SquatAnalytics,
    # "Push-ups":  PushUpAnalytics,   ← example future entry
    # "Lunges":    LungeAnalytics,
    # "Deadlifts": DeadliftAnalytics,
}
