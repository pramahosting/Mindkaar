"""
Prompt construction and JSON Schemas for Groq's Structured Outputs.

Kept separate from network/route code so prompts can be reviewed and
tuned independently.
"""

from app.assessment import SCENARIO_CATEGORIES
from app.schemas import ProfileIn

BASE_SYSTEM_PROMPT = (
    "You are a thoughtful, licensed-therapist-informed scenario designer for "
    '"Mind Gym", a self-reflection and coping-skills app. You are not '
    "diagnosing anyone - you are identifying a common, everyday emotional "
    "pattern (like stress, anxiety, conflict, or unrest) so the app can offer "
    "relevant reflective questions and a short coping exercise. You always "
    "respond with ONLY a single valid JSON object matching the requested "
    "shape exactly - no markdown, no code fences, no commentary."
)


def _profile_lines(profile: ProfileIn) -> str:
    return "\n".join(
        [
            f"- Age: {profile.age if profile.age is not None else 'Not provided'}",
            f"- Current mood: {profile.mood or 'Not provided'}",
            f"- Average sleep hours: {profile.sleepHours if profile.sleepHours is not None else 'Not provided'}",
            f"- Self-rated stress level (1-10): {profile.stressLevel}",
            f"- Support system: {profile.support or 'Not provided'}",
            f"- Goals right now: {profile.goals or 'Not provided'}",
        ]
    )


# ---------------------------------------------------------------------------
# Step 0: triage - which 2-3 categories to ask about in depth
# ---------------------------------------------------------------------------
def build_triage_prompt(profile: ProfileIn) -> str:
    category_lines = "\n".join(f'- {c["code"]}: {c["label"]}' for c in SCENARIO_CATEGORIES)
    valid_codes = ", ".join(f'"{c["code"]}"' for c in SCENARIO_CATEGORIES)

    return "\n".join(
        [
            "A person shared the following open-ended context about how they've been feeling:",
            "",
            _profile_lines(profile),
            "",
            "From the categories below, choose the 2 or 3 that are MOST relevant to what "
            "this person described, so the app can ask deeper follow-up questions about "
            "just those - not all of them.",
            "",
            category_lines,
            "",
            f"Only use these exact category codes: {valid_codes}. Order them from most to "
            "least relevant. If the context is too sparse or generic to tell, pick the two "
            "most broadly-applicable categories rather than guessing at something specific.",
            "",
            "Respond with ONLY this JSON shape:",
            '{"categories":["code1","code2"]}',
        ]
    )


TRIAGE_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "categories": {
            "type": "array",
            "items": {"type": "string"},
        }
    },
    "required": ["categories"],
    "additionalProperties": False,
}


# ---------------------------------------------------------------------------
# Step 1 (ranked questions) for the identified scenario
# ---------------------------------------------------------------------------
def build_questions_prompt(profile: ProfileIn, scenario: str) -> str:
    return "\n".join(
        [
            f'Generate exactly 6 distinct reflective scenario-questions related to "{scenario}", '
            "tailored to this person's profile.",
            "",
            "Profile:",
            _profile_lines(profile),
            "",
            "For EACH of the 6 questions, include:",
            "- id: a sequential integer from 1 to 6",
            '- narrative: a 2-3 sentence, second-person ("you...") description of a specific, '
            "realistic situation related to this scenario",
            "- difficulty: an integer from 1 (simple/gentle) to 6 (complex/challenging) - "
            "vary these across the 6 questions so they can be ordered from simplest to most complex",
            "- options: exactly 3 possible responses, each with:",
            '  - id: "A", "B", or "C"',
            "  - text: one concrete, specific action the person could take",
            '  - strategy: a short 1-2 word coping-style label (e.g. "Reflective", '
            '"Connective", "Avoidant", "Proactive")',
            "",
            "Respond with ONLY this JSON shape:",
            '{"questions":[{"id":1,"narrative":"...","difficulty":1,"options":'
            '[{"id":"A","text":"...","strategy":"..."},{"id":"B","text":"...","strategy":"..."},'
            '{"id":"C","text":"...","strategy":"..."}]}, ... 6 items total]}',
        ]
    )


QUESTIONS_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "narrative": {"type": "string"},
                    "difficulty": {"type": "integer"},
                    "options": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "text": {"type": "string"},
                                "strategy": {"type": "string"},
                            },
                            "required": ["id", "text", "strategy"],
                            "additionalProperties": False,
                        },
                    },
                },
                "required": ["id", "narrative", "difficulty", "options"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["questions"],
    "additionalProperties": False,
}


# ---------------------------------------------------------------------------
# Step 3: map the game score back to a mental-status assessment
# ---------------------------------------------------------------------------
def build_status_prompt(
    profile: ProfileIn, scenario: str, score: int, max_level: int, chopped: int, missed: int
) -> str:
    return "\n".join(
        [
            f'This person just played a "{scenario}" themed coping-skills mini-game.',
            "",
            "Profile:",
            _profile_lines(profile),
            "",
            "Game result:",
            f"- Final score: {score}",
            f"- Highest level/difficulty reached: {max_level}",
            f"- Items successfully handled: {chopped}",
            f"- Items missed/failed: {missed}",
            "",
            "Based on BOTH the profile and the game performance, provide a short, "
            "supportive (never alarming or clinical-diagnostic) mental-status read and one "
            "practical coping tip. Performance reflects focus/resilience under pressure, "
            "not a clinical measure.",
            "",
            "Include exactly one item with:",
            '- status: a short 2-4 word label (e.g. "Managing Well", "Mildly Overwhelmed", '
            '"Needs Support", "Building Resilience")',
            "- summary: 2-3 encouraging, plain-language sentences connecting the profile and performance",
            "- tip: one concrete, actionable coping tip for this specific scenario",
            "",
            "Respond with ONLY this JSON shape:",
            '{"assessment":[{"status":"...","summary":"...","tip":"..."}]}',
        ]
    )


STATUS_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "assessment": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "status": {"type": "string"},
                    "summary": {"type": "string"},
                    "tip": {"type": "string"},
                },
                "required": ["status", "summary", "tip"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["assessment"],
    "additionalProperties": False,
}