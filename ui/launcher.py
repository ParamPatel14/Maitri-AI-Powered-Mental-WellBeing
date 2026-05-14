"""
ui/launcher.py
──────────────
Tkinter-based startup dialogs for source and exercise selection.

Note on future frontend migration
──────────────────────────────────
These dialogs are the ONLY GUI/UI code in the project.  When Maitri moves
to a proper web or native frontend, this file is the only thing that needs
replacing.  main.py calls pick_exercise() and pick_source() and is otherwise
completely UI-agnostic.
"""

import tkinter as tk
from tkinter import filedialog
from typing import Optional

from core.base_analyser import BaseAnalyser


# ── Shared dialog helpers ──────────────────────────────────────────────────────
_BG      = "#1a1a2e"
_BTN_BG  = "#16213e"
_BTN_HOV = "#0f3460"

def _centre(root: tk.Tk, w: int, h: int) -> None:
    """Position *root* in the centre of the screen."""
    root.update_idletasks()
    x = (root.winfo_screenwidth()  - w) // 2
    y = (root.winfo_screenheight() - h) // 2
    root.geometry(f"{w}x{h}+{x}+{y}")


def _title_label(root: tk.Tk, text: str) -> None:
    tk.Label(root, text=text, font=("Segoe UI", 16, "bold"),
             fg="#e0e0ff", bg=_BG).pack(pady=(24, 4))


def _subtitle_label(root: tk.Tk, text: str) -> None:
    tk.Label(root, text=text, font=("Segoe UI", 10),
             fg="#8888aa", bg=_BG).pack(pady=(0, 20))


# ── Exercise picker ────────────────────────────────────────────────────────────
def pick_exercise(registry: dict[str, type]) -> Optional[BaseAnalyser]:
    """
    Show a dialog listing all exercises in *registry* as buttons.

    Returns
    -------
    An instantiated BaseAnalyser subclass, or None if the user closed
    the window without selecting.
    """
    chosen: dict = {"cls": None}

    root = tk.Tk()
    root.title("Maitri – Select Exercise")
    root.resizable(False, False)
    root.configure(bg=_BG)

    cols   = min(len(registry), 3)
    width  = max(360, cols * 160)
    height = 220 + (len(registry) // (cols + 1)) * 70
    _centre(root, width, height)

    _title_label(root,    "Maitri  ·  Workout Analyser")
    _subtitle_label(root, "Select an exercise to begin")

    btn_frame = tk.Frame(root, bg=_BG)
    btn_frame.pack()

    _BTN_STYLE = dict(font=("Segoe UI", 11, "bold"),
                      width=13, height=2, relief="flat", cursor="hand2")

    # Colour palette cycles through these for each registered exercise
    _COLOURS = ["#00e5ff", "#a259ff", "#00ff99", "#ff9100", "#ff4081"]

    for i, (name, cls) in enumerate(registry.items()):
        fg = _COLOURS[i % len(_COLOURS)]

        def _make_cmd(c=cls):
            def _cmd():
                chosen["cls"] = c
                root.destroy()
            return _cmd

        tk.Button(
            btn_frame, text=name,
            bg=_BTN_BG, fg=fg,
            activebackground=_BTN_HOV, activeforeground=fg,
            command=_make_cmd(), **_BTN_STYLE,
        ).grid(row=i // cols, column=i % cols, padx=10, pady=6)

    root.protocol("WM_DELETE_WINDOW", root.destroy)
    root.mainloop()

    return chosen["cls"]() if chosen["cls"] is not None else None


# ── Source picker ──────────────────────────────────────────────────────────────
def pick_source(title: str = "Maitri") -> tuple[int | str | None, str]:
    """
    Show a dialog letting the user choose between webcam and a video file.

    Parameters
    ----------
    title : str
        Used in the dialog heading, e.g. the selected exercise name.

    Returns
    -------
    (source, label)
        source : 0  for webcam, path str for video file, None if cancelled.
        label  : short human-readable name for the source (shown in HUD).
    """
    chosen: dict = {"source": None}

    root = tk.Tk()
    root.title(f"Maitri – {title}")
    root.resizable(False, False)
    root.configure(bg=_BG)
    _centre(root, 420, 220)

    _title_label(root,    f"Maitri  ·  {title}")
    _subtitle_label(root, "Choose your video source")

    btn_frame = tk.Frame(root, bg=_BG)
    btn_frame.pack()

    _BTN_STYLE = dict(font=("Segoe UI", 11, "bold"),
                      width=14, height=2, relief="flat", cursor="hand2")

    def use_webcam():
        chosen["source"] = 0
        root.destroy()

    def use_file():
        path = filedialog.askopenfilename(
            title="Select workout video",
            filetypes=[
                ("Video files", "*.mp4 *.avi *.mov *.mkv *.wmv *.webm"),
                ("All files",   "*.*"),
            ],
        )
        if path:
            chosen["source"] = path
            root.destroy()
        # If user cancels the file dialog, leave the source picker open

    tk.Button(btn_frame, text="\U0001f4f7  Webcam",
              bg=_BTN_BG, fg="#00e5ff",
              activebackground=_BTN_HOV, activeforeground="#00e5ff",
              command=use_webcam, **_BTN_STYLE).grid(row=0, column=0, padx=12)

    tk.Button(btn_frame, text="\U0001f3ac  Video File",
              bg=_BTN_BG, fg="#a259ff",
              activebackground=_BTN_HOV, activeforeground="#a259ff",
              command=use_file, **_BTN_STYLE).grid(row=0, column=1, padx=12)

    root.protocol("WM_DELETE_WINDOW", root.destroy)
    root.mainloop()

    src = chosen["source"]
    if src is None:
        return None, ""
    label = "Webcam" if src == 0 else src.replace("\\", "/").split("/")[-1]
    return src, label
