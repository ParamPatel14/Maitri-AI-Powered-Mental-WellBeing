"""
backend/rehab.py
────────────────
Gemini-powered exercise recommendation engine.

Calls the Gemini API with the user's problem description and returns
a structured list of recommended exercises with reasons.

Audio routing flag (backend/pipeline.py: AUDIO_BACKEND) is independent
of this module — rehab is a separate REST call, not part of the WS stream.
"""

import json
import os
import re
from typing import Any

from dotenv import load_dotenv


# ── Prompt template ────────────────────────────────────────────────────────────
_PROMPT = """\
You are a physiotherapy and rehabilitation AI assistant.
A user has described this physical problem or injury:

"{problem}"

Based on this, provide 2–4 recommended exercises that would help with \
recovery, rehabilitation, or pain relief.

Respond ONLY with valid JSON (no markdown fences, no preamble, no extra text):
{{
  "recommendations": [
    {{
      "exercise": "Exercise Name",
      "reason": "1–2 sentences explaining why this specific exercise helps with the stated problem."
    }}
  ]
}}

Use common, recognisable exercise names such as:
Squats, Push-ups, Lunges, Deadlifts, Planks, Hip Bridges, Glute Bridges,
Calf Raises, Wall Sits, Step-ups, Shoulder Press, Bicep Curls, Side Planks,
Bird Dogs, Dead Bugs, Romanian Deadlifts, Leg Press, Lat Pulldowns.

Be specific to the user's stated problem. Keep each reason to 1–2 sentences.
"""


# ── Public API ─────────────────────────────────────────────────────────────────
def get_recommendations(problem: str) -> list[dict[str, Any]]:
    """
    Call Gemini and return a list of {exercise, reason} dicts.

    Raises
    ------
    ValueError  : GEMINI_API_KEY not configured.
    json.JSONDecodeError : Gemini returned non-parseable text.
    Exception   : Any other API error (network, quota, etc.).
    """
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY is not set. "
            "Add it to your .env file: GEMINI_API_KEY=your-key-here"
        )

    # Lazy import — keeps startup fast when the key is missing
    import google.generativeai as genai  # type: ignore
  

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")

    response = model.generate_content(_PROMPT.format(problem=problem))
    text = response.text.strip()

    # Strip markdown code fences if Gemini wraps the JSON in ```json ... ```
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s*```\s*$",       "", text, flags=re.MULTILINE)
    text = text.strip()

    data = json.loads(text)
    return data.get("recommendations", [])
