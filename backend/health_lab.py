"""
backend/health_lab.py
─────────────────────
Gemini-powered analysis engine for the Health Lab module.

Handles:
  - Weekly wellness reports
  - Pattern / correlation finding
  - Personal experiment analysis
  - What-if scenario predictions

All functions accept structured user data and return parsed JSON.
Same pattern as backend/rehab.py.
"""

import json
import os
import re
from typing import Any

from dotenv import load_dotenv


def _get_model():
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY is not set. "
            "Add it to your .env file: GEMINI_API_KEY=your-key-here"
        )
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    return genai.GenerativeModel("gemini-2.5-flash")


def _clean_json(text: str) -> str:
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s*```\s*$", "", text, flags=re.MULTILINE)
    return text.strip()


# ── Weekly Report ───────────────────────────────────────────────────────────────

WEEKLY_REPORT_PROMPT = """\
You are a friendly wellness companion. A user has shared their daily check-in data \
and habit tracking for the past week. Write a warm, encouraging weekly summary.

User profile:
{profile}

Check-in data (last 7 days):
{checkins}

Habit tracking data:
{habits}

Write a summary that:
1. Highlights their overall mood and energy trends
2. Notes which habits they were consistent with
3. Points out any patterns (e.g., "You seemed to feel better on days you walked")
4. Offers one gentle suggestion for next week
5. Ends on a positive, encouraging note

Keep the tone warm, conversational, and simple. No medical jargon.

Respond ONLY with valid JSON (no markdown fences, no preamble):
{{
  "title": "Your Week at a Glance",
  "body": "The full report text here (2-4 paragraphs, friendly tone)"
}}
"""


# ── Pattern Finder ──────────────────────────────────────────────────────────────

PATTERN_FINDER_PROMPT = """\
You are a wellness pattern analyst. A user has shared their daily check-ins \
and habit tracking data. Find meaningful correlations between their habits \
and how they feel.

User profile:
{profile}

Check-in data:
{checkins}

Habit tracking data:
{habits}

For each notable pattern you find, provide:
- A short, friendly title
- A clear explanation of the pattern
- Whether it's a positive pattern, neutral observation, or something to watch out for

Focus on correlations where mood/energy differs by 0.5+ points between days \
with and without a habit.

Respond ONLY with valid JSON (no markdown fences, no preamble):
{{
  "patterns": [
    {{
      "title": "Short pattern title",
      "body": "Clear explanation of what you noticed",
      "type": "positive"
    }}
  ]
}}

type must be one of: "positive", "pattern", "warning"
Return 2-5 patterns. Be specific and reference actual data points.
"""


# ── Experiment Analysis ─────────────────────────────────────────────────────────

EXPERIMENT_ANALYSIS_PROMPT = """\
You are a personal wellness experiment analyst. A user ran a personal experiment \
to test whether a specific habit affects their well-being. Analyze the results.

Experiment details:
{experiment}

Daily check-in data during the experiment period:
{checkins}

Habit tracking data during the experiment period:
{habits}

Compare:
- Mood on days they did the habit vs days they didn't
- Energy on days they did the habit vs days they didn't
- Sleep quality patterns

Calculate:
- habitCompletionRate: percentage of days they did the habit (0.0 to 1.0)
- moodWithHabit: average mood on days habit was done (1-5 scale)
- moodWithoutHabit: average mood on days habit was not done (1-5 scale)

Then provide:
- A clear, friendly summary of what the data shows
- A recommendation: does this habit seem to help, hurt, or make no difference?

Respond ONLY with valid JSON (no markdown fences, no preamble):
{{
  "summary": "Friendly 2-3 sentence summary of what the data shows",
  "habitCompletionRate": 0.75,
  "moodWithHabit": 4.2,
  "moodWithoutHabit": 3.1,
  "recommendation": "Clear recommendation in 1-2 sentences"
}}
"""


# ── What-If Scenarios ──────────────────────────────────────────────────────────

WHAT_IF_PROMPT = """\
You are a friendly wellness advisor. A user is asking "what if" about a \
potential lifestyle change. Based on their actual data and general wellness \
knowledge, give them a thoughtful, personalized prediction.

User profile:
{profile}

Their recent check-in data:
{checkins}

Their question: {question}

Provide a prediction that:
1. References their actual data points when relevant
2. Gives a realistic timeline for expected changes
3. Is encouraging but honest
4. Uses simple, warm language (no medical jargon)
5. Is 2-4 paragraphs long

Respond ONLY with valid JSON (no markdown fences, no preamble):
{{
  "answer": "Your full prediction text here"
}}
"""


# ── Public API ─────────────────────────────────────────────────────────────────

def analyze(task: str, data: dict[str, Any]) -> dict[str, Any]:
    """
    Route to the appropriate Gemini prompt based on task type.

    Parameters
    ----------
    task : str
        One of: weekly_report, pattern_finder, experiment_analysis, what_if
    data : dict
        User data including profile, checkins, habit_logs, etc.

    Returns
    -------
    dict : Parsed JSON result from Gemini.
    """
    model = _get_model()

    if task == "weekly_report":
        prompt = WEEKLY_REPORT_PROMPT.format(
            profile=json.dumps(data.get("profile", {}), indent=2),
            checkins=json.dumps(data.get("checkins", []), indent=2),
            habits=json.dumps(data.get("habit_logs", []), indent=2),
        )
    elif task == "pattern_finder":
        prompt = PATTERN_FINDER_PROMPT.format(
            profile=json.dumps(data.get("profile", {}), indent=2),
            checkins=json.dumps(data.get("checkins", []), indent=2),
            habits=json.dumps(data.get("habit_logs", []), indent=2),
        )
    elif task == "experiment_analysis":
        prompt = EXPERIMENT_ANALYSIS_PROMPT.format(
            experiment=json.dumps(data.get("experiment", {}), indent=2),
            checkins=json.dumps(data.get("checkins", []), indent=2),
            habits=json.dumps(data.get("habit_logs", []), indent=2),
        )
    elif task == "what_if":
        prompt = WHAT_IF_PROMPT.format(
            profile=json.dumps(data.get("profile", {}), indent=2),
            checkins=json.dumps(data.get("checkins", []), indent=2),
            question=data.get("question", ""),
        )
    else:
        raise ValueError(f"Unknown analysis task: {task}")

    response = model.generate_content(prompt)
    text = _clean_json(response.text.strip())
    return json.loads(text)
