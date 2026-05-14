"""
main.py — Maitri Workout Analyser — Entry Point
─────────────────────────────────────────────────
Thin orchestrator.  Contains NO exercise-specific logic.

Processing pipeline (per frame)
────────────────────────────────
1. extract_landmarks  → PoseLandmarks | None
2. draw_skeleton      → renders MediaPipe joints onto frame
3. analyser.evaluate  → BaseResult subclass
4. analyser.draw_hud  → exercise-specific overlay
5. draw_source_label  → small source tag (bottom-right)
6. analyser.get_audio_cue → coaching cue string → audio.say()

Adding a new exercise
─────────────────────
Only edit  exercises/__init__.py.  This file never changes.
"""

import cv2
import argparse
import sys

from core.pose_engine import extract_landmarks, draw_skeleton
from core.audio       import AudioFeedback
from core.hud         import draw_source_label, resize_to_window
from exercises        import EXERCISE_REGISTRY
from ui.launcher      import pick_exercise, pick_source

from dotenv import load_dotenv


# ── Capture helpers ────────────────────────────────────────────────────────────
def _open_capture(source: int | str):
    """Open an OpenCV VideoCapture; configure webcam defaults if source == 0."""
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"Error: Could not open video source '{source}'")
        sys.exit(1)

    if source == 0:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH,  640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS,          30)

    return cap


def _frame_delay(cap, source) -> int:
    """Return the waitKey delay in ms appropriate for this source."""
    if source == 0:
        return 1                                    # webcam: as fast as possible
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    return max(1, int(1000 / fps))                  # video: match file FPS


# ── Main loop ──────────────────────────────────────────────────────────────────
def main():
    load_dotenv()
    parser = argparse.ArgumentParser(description="Maitri – AI Workout Analyser")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--video",  type=str,       default=None,
                       help="Path to a video file to analyse (skips source dialog).")
    group.add_argument("--webcam", action="store_true",
                       help="Force webcam mode (skips source dialog).")
    parser.add_argument("--exercise", type=str, default=None,
                        help=f"Exercise name to skip picker. Options: {list(EXERCISE_REGISTRY)}")
    args = parser.parse_args()

    # ── 1. Choose exercise ────────────────────────────────────────────────────
    if args.exercise:
        if args.exercise not in EXERCISE_REGISTRY:
            print(f"Unknown exercise '{args.exercise}'. "
                  f"Available: {list(EXERCISE_REGISTRY)}")
            sys.exit(1)
        analyser = EXERCISE_REGISTRY[args.exercise]()
    else:
        analyser = pick_exercise(EXERCISE_REGISTRY)
        if analyser is None:
            print("No exercise selected. Exiting.")
            return

    # ── 2. Choose source ──────────────────────────────────────────────────────
    if args.video:
        source    = args.video
        src_label = source.replace("\\", "/").split("/")[-1]
    elif args.webcam:
        source, src_label = 0, "Webcam"
    else:
        source, src_label = pick_source(title=analyser.name)
        if source is None:
            print("No source selected. Exiting.")
            return

    # ── 3. Open capture ───────────────────────────────────────────────────────
    cap       = _open_capture(source)
    delay_ms  = _frame_delay(cap, source)
    is_webcam = (source == 0)

    if not is_webcam:
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps   = cap.get(cv2.CAP_PROP_FPS) or 30.0
        print(f"Video: {src_label}  |  {total} frames @ {fps:.1f} fps")

    # ── 4. Session init ───────────────────────────────────────────────────────
    audio = AudioFeedback()
    print(f"Starting Maitri [{analyser.name}] | Source: {src_label} | Press 'q' to quit.")

    # ── 5. Processing loop ────────────────────────────────────────────────────
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            if not is_webcam:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)   # loop video file
                continue
            print("Failed to grab frame. Exiting.")
            break

        # Pose
        landmarks, raw_results = extract_landmarks(frame)
        draw_skeleton(frame, raw_results)

        # Analysis + HUD
        result = analyser.evaluate(landmarks)
        analyser.draw_hud(frame, result)
        draw_source_label(frame, src_label)

        # Audio coaching
        if result is not None:
            cue_result = analyser.get_audio_cue(result)
            if cue_result is not None:
                cue_text, is_urgent = cue_result
                if is_urgent:
                    audio.say_urgent(cue_text)   # form correction — preempts waiting cues
                else:
                    audio.say(cue_text)          # phase coaching — dropped if TTS busy

        # Display — letterbox into a fixed 960×540 window
        cv2.imshow(f"Maitri – {analyser.name}", resize_to_window(frame))
        if cv2.waitKey(delay_ms) & 0xFF == ord('q'):
            break

    # ── 6. Cleanup ────────────────────────────────────────────────────────────
    cap.release()
    cv2.destroyAllWindows()
    audio.stop()


if __name__ == "__main__":
    main()
