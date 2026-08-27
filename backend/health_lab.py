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


# ── Baseline Interpretation ────────────────────────────────────────────────────

BASELINE_INTERPRETATION_PROMPT = """\
You are a friendly wellness analyst. A user has a personal baseline computed \
from their own data. Help them understand what it means in plain language.

User profile:
{profile}

Their personal baseline metrics:
{baseline}

Today's values:
{today_values}

Provide a warm, easy-to-understand interpretation that:
1. Explains what their baseline means (what's "normal" for them)
2. Highlights any notable deviations today (if any)
3. Points out trends they should be aware of
4. Gives 1-2 practical suggestions based on the data
5. Uses zero medical jargon — speak like a caring friend

Keep it under 300 words.

Respond ONLY with valid JSON (no markdown fences, no preamble):
{{
  "title": "Your Baseline Summary",
  "body": "The interpretation text here"
}}
"""


# ── Cognitive Analysis ─────────────────────────────────────────────────────────

COGNITIVE_ANALYSIS_PROMPT = """\
You are a friendly wellness advisor. A user has completed cognitive performance \
tests. Help them understand their results in simple, encouraging language.

User profile:
{profile}

Cognitive test results:
{results}

Recent check-in data (mood, sleep, stress):
{checkins}

Provide a warm interpretation that:
1. Explains what each test measures in simple terms
2. Interprets their scores relative to their own baseline (if available)
3. Notes any interesting patterns (e.g., "Your reaction time was faster on days you slept well")
4. Gives 1-2 practical tips for improving cognitive performance
5. Uses zero medical jargon

Respond ONLY with valid JSON (no markdown fences, no preamble):
{{
  "title": "Your Cognitive Snapshot",
  "body": "The interpretation text here"
}}
"""


# ── Pattern Discovery ("What Makes Me Feel Good?") ─────────────────────────────

PATTERN_DISCOVERY_PROMPT = """\
You are a friendly wellness pattern analyst. A user wants to understand what \
makes them feel good. You have their complete data: daily check-ins, habits, \
lifestyle factors, and wearable data.

Your job is to find correlations between WHAT they do and HOW they feel.

User profile:
{profile}

All check-in data:
{checkins}

Habit tracking data:
{habits}

Lifestyle data (caffeine, water, screen time, etc.):
{lifestyles}

Wearable data (sleep hours, steps, heart rate):
{wearables}

Analyze the data carefully. Look for patterns like:
- "On days when you sleep more than X hours, your energy tends to be higher"
- "Your mood is usually better on days you do [habit]"
- "You tend to feel more stressed after X days of poor sleep"
- "Your energy seems higher on days you walk more than X steps"
- "Caffeine intake of X+ cups is associated with lower sleep quality"

For each pattern found:
1. State the pattern clearly in simple language
2. Reference the specific data (e.g., "your energy averaged 4.1 vs 3.2")
3. Use tentative language: "Your data suggests...", "We noticed...", "This appears to be associated with..."
4. NEVER state causation — only correlation
5. If data is insufficient, say "We don't have enough information yet"

IMPORTANT: These are NOT medical facts. Present them as observations from the \
user's own data. Use language like "Your data suggests..." not "Studies show..."

Return 3-6 patterns, ranked by strength of correlation.

Respond ONLY with valid JSON (no markdown fences, no preamble):
{{
  "patterns": [
    {{
      "title": "Short friendly title",
      "observation": "What the data shows, with specific numbers",
      "strength": "strong",
      "type": "positive"
    }}
  ],
  "summary": "A warm 2-3 sentence summary of what we found"
}}

type must be: "positive", "neutral", or "something_to_watch"
strength must be: "strong", "moderate", or "weak"
"""


# ── Experiment Plan (AI creates structured plan from hypothesis) ────────────────

EXPERIMENT_PLAN_PROMPT = """\
You are a friendly wellness experiment designer. A user wants to run a personal \
experiment to test whether a specific habit affects their well-being.

User profile:
{profile}

Their recent data (for context):
{checkins}

Their experiment idea: {hypothesis}

Create a structured experiment plan that:
1. Restates the hypothesis clearly
2. Defines specific, measurable goals
3. Sets a realistic duration (7 or 14 days)
4. Lists what we will track each day
5. Gives clear instructions for what the user should do
6. Explains what "success" would look like

Keep the language warm, simple, and encouraging. No medical jargon.

Respond ONLY with valid JSON (no markdown fences, no preamble):
{{
  "title": "Friendly experiment name",
  "hypothesis": "Clear statement of what we're testing",
  "goal": "What we're trying to find out",
  "duration": 14,
  "dailyInstructions": "What the user should do each day",
  "trackingMetrics": ["sleep_quality", "energy", "mood", "stress"],
  "successCriteria": "What would indicate the habit is working",
  "notes": "Any additional tips or context"
}}
"""


# ── Experiment Analysis v2 (with before/during comparison) ─────────────────────

EXPERIMENT_ANALYSIS_V2_PROMPT = """\
You are a personal wellness experiment analyst. A user has completed a \
personal experiment. Your job is to compare their data BEFORE and DURING \
the experiment, and explain what happened — being careful not to claim \
causation when you can only show correlation.

Experiment details:
{experiment}

Data BEFORE the experiment (baseline period):
{before_checkins}

Data DURING the experiment:
{during_checkins}

Habit tracking data during the experiment:
{during_habits}

IMPORTANT RULES:
1. Calculate actual averages from the data — don't make up numbers
2. Compare BEFORE vs DURING for each metric
3. Use phrases like:
   - "Your data suggests..."
   - "We noticed that..."
   - "This is associated with..."
   - "We cannot say for certain that X caused Y"
   - "Other factors may have also played a role"
4. NEVER claim the habit definitely caused an improvement
5. Always acknowledge limitations (small sample size, other changes, etc.)
6. Be honest if the results are mixed or inconclusive

Return the analysis in this JSON format:

{{
  "title": "Experiment Complete: [habit name]",
  "summary": "2-3 sentence overview of what happened",
  "beforeMetrics": {{
    "averageMood": 3.2,
    "averageEnergy": 3.5,
    "averageSleepQuality": 3.0,
    "averageStress": 3.8,
    "dataPoints": 10
  }},
  "duringMetrics": {{
    "averageMood": 4.1,
    "averageEnergy": 4.3,
    "averageSleepQuality": 3.8,
    "averageStress": 2.9,
    "dataPoints": 12,
    "habitCompletionRate": 0.85
  }},
  "changes": [
    {{
      "metric": "Mood",
      "before": 3.2,
      "during": 4.1,
      "change": "+0.9",
      "direction": "improved"
    }}
  ],
  "interpretation": "Detailed interpretation using cautious language about causation",
  "caveats": "Limitations and alternative explanations",
  "recommendation": "Should they continue this habit? Be nuanced."
}}

direction must be: "improved", "declined", or "no_clear_change"
"""


# ── Public API ─────────────────────────────────────────────────────────────────

def analyze(task: str, data: dict[str, Any]) -> dict[str, Any]:
    """
    Route to the appropriate Gemini prompt based on task type.

    Parameters
    ----------
    task : str
        One of: weekly_report, pattern_finder, experiment_analysis, what_if,
        baseline_interpretation, cognitive_analysis, pattern_discovery,
        experiment_plan, experiment_analysis_v2
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
    elif task == "baseline_interpretation":
        prompt = BASELINE_INTERPRETATION_PROMPT.format(
            profile=json.dumps(data.get("profile", {}), indent=2),
            baseline=json.dumps(data.get("baseline", {}), indent=2),
            today_values=json.dumps(data.get("today_values", {}), indent=2),
        )
    elif task == "cognitive_analysis":
        prompt = COGNITIVE_ANALYSIS_PROMPT.format(
            profile=json.dumps(data.get("profile", {}), indent=2),
            results=json.dumps(data.get("results", []), indent=2),
            checkins=json.dumps(data.get("checkins", []), indent=2),
        )
    elif task == "pattern_discovery":
        prompt = PATTERN_DISCOVERY_PROMPT.format(
            profile=json.dumps(data.get("profile", {}), indent=2),
            checkins=json.dumps(data.get("checkins", []), indent=2),
            habits=json.dumps(data.get("habit_logs", []), indent=2),
            lifestyles=json.dumps(data.get("lifestyles", []), indent=2),
            wearables=json.dumps(data.get("wearables", []), indent=2),
        )
    elif task == "experiment_plan":
        prompt = EXPERIMENT_PLAN_PROMPT.format(
            profile=json.dumps(data.get("profile", {}), indent=2),
            checkins=json.dumps(data.get("checkins", []), indent=2),
            hypothesis=data.get("hypothesis", ""),
        )
    elif task == "experiment_analysis_v2":
        prompt = EXPERIMENT_ANALYSIS_V2_PROMPT.format(
            experiment=json.dumps(data.get("experiment", {}), indent=2),
            before_checkins=json.dumps(data.get("before_checkins", []), indent=2),
            during_checkins=json.dumps(data.get("during_checkins", []), indent=2),
            during_habits=json.dumps(data.get("during_habits", []), indent=2),
        )
    else:
        raise ValueError(f"Unknown analysis task: {task}")

    response = model.generate_content(prompt)
    text = _clean_json(response.text.strip())
    return json.loads(text)
