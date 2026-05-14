"""
core/audio.py
─────────────
Non-blocking text-to-speech feedback using pyttsx3.

AudioFeedback runs pyttsx3 in a dedicated daemon thread so the main
video processing loop is never blocked waiting for speech to finish.
Only one utterance is ever queued at a time — if the engine is still
speaking the previous cue, the new request is silently dropped.
"""

import pyttsx3
import queue
import threading


class AudioFeedback:
    """Thread-safe, non-blocking TTS wrapper."""

    def __init__(self):
        self._queue  = queue.Queue()
        self._thread = threading.Thread(target=self._worker, daemon=True)
        self._thread.start()

    # ── Internal ──────────────────────────────────────────────────────────────
    def _worker(self) -> None:
        """Runs in its own thread.  pyttsx3 must be init'd here, not in main."""
        import pythoncom
        pythoncom.CoInitialize()  # Required for SAPI5 COM object in a background thread
        engine = pyttsx3.init()
        while True:
            text = self._queue.get()
            if text is None:      # shutdown sentinel
                break
            engine.say(text)
            engine.runAndWait()
            self._queue.task_done()

    # ── Public API ────────────────────────────────────────────────────────────
    def say(self, text: str) -> None:
        """
        Speak *text* as soon as the engine is idle.
        If the engine is currently speaking, this call is a no-op.
        Use for low-priority phase coaching cues.
        """
        if self._queue.empty():
            self._queue.put(text)

    def say_urgent(self, text: str) -> None:
        """
        Speak *text* as soon as possible, preempting any cue that is
        waiting in the queue but has not yet started speaking.

        This lets a form correction displace a pending phase coaching cue
        so the user hears the correction on the very next available slot.

        Note: Cannot interrupt a cue that is already being spoken by the
        TTS engine — that would require a more complex interrupt mechanism.
        """
        # Drain any item sitting in the queue but not yet spoken
        try:
            while True:
                self._queue.get_nowait()
                self._queue.task_done()
        except Exception:
            pass
        self._queue.put(text)

    def stop(self) -> None:
        """Signal the worker thread to exit.  Call once when the app closes."""
        self._queue.put(None)
        self._thread.join()
