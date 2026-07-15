"""
Prompt construction and JSON Schemas for Groq's Structured Outputs.

Kept separate from the API/network code so the prompts can be reviewed,
tuned, or unit-tested on their own.
"""

from app.schemas import Profile

BASE_SYSTEM_PROMPT = (
    'You are a thoughtful scenario designer for "Quiet Hours", a self-reflection '
    "app that helps people practice healthy coping strategies for everyday "
    "emotional moments. You always respond with ONLY a single valid JSON object "
    "matching the requested shape exactly — no markdown, no code fences, no "
    "commentary before or after the JSON."
)


def _profile_lines(profile: Profile) -> str:
    return "\n".join(
        [
            f"- Name: {profile.name or 'Not provided'}",
            f"- Age: {profile.age if profile.age is not None else 'Not provided'}",
            f"- Current mood: {profile.mood or 'Not provided'}",
            f"- Average sleep hours: {profile.sleepHours if profile.sleepHours is not None else 'Not provided'}",
            f"- Stress level (1-10): {profile.stressLevel}",
            f"- Support system: {profile.support or 'Not provided'}",
            f"- Goals right now: {profile.goals or 'Not provided'}",
        ]
    )


# ---------------------------------------------------------------------------
# Phase 1: topics
# ---------------------------------------------------------------------------
def build_topics_prompt(profile: Profile) -> str:
    return "\n".join(
        [
            "Based on this person's baseline, choose exactly 8 broad, everyday "
            "life topics that would be most useful for them to reflect on.",
            'Topics should be short, general categories (1-2 words) like "Sleep", '
            '"Family", "Work", "Social Media", "Money", "Health", "Relationships", '
            '"Self-Esteem" — pick and personalize the mix to fit the profile '
            "below, don't just reuse this exact example list.",
            "",
            "Profile:",
            _profile_lines(profile),
            "",
            "For each topic, include:",
            "- id: a sequential integer from 1 to 8",
            "- topic: a short 1-2 word category name",
            "- description: one short sentence on why this topic matters for this person specifically",
            "",
            "Respond with ONLY this JSON shape:",
            '{"topics":[{"id":1,"topic":"Sleep","description":"..."}, ... 8 items total]}',
        ]
    )


TOPICS_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "topics": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "topic": {"type": "string"},
                    "description": {"type": "string"},
                },
                "required": ["id", "topic", "description"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["topics"],
    "additionalProperties": False,
}


# ---------------------------------------------------------------------------
# Phase 2: the 10 questions for a chosen topic
# ---------------------------------------------------------------------------
def build_questions_prompt(profile: Profile, topic: str) -> str:
    return "\n".join(
        [
            f'Generate exactly 10 distinct reflective scenario-questions about the topic "{topic}", '
            "tailored to this person's baseline.",
            "",
            "Profile:",
            _profile_lines(profile),
            "",
            "For EACH of the 10 questions, include:",
            "- id: a sequential integer from 1 to 10",
            '- narrative: a 2-4 sentence, second-person ("you...") description of a specific '
            "situation related to this topic that this person might realistically face",
            "- difficulty: an integer from 1 (gentle) to 6 (very challenging), reflecting emotional difficulty",
            "- options: exactly 3 possible responses the person could choose, each with:",
            '  - id: "A", "B", or "C"',
            "  - text: one concrete, specific action the person could take in that moment",
            '  - strategy: a short 1-2 word label for the coping style (e.g. "Reflective", '
            '"Connective", "Avoidant", "Proactive", "Distracting")',
            "",
            "Respond with ONLY this JSON shape:",
            '{"questions":[{"id":1,"narrative":"...","difficulty":1,"options":'
            '[{"id":"A","text":"...","strategy":"..."},{"id":"B","text":"...","strategy":"..."},'
            '{"id":"C","text":"...","strategy":"..."}]}, ... 10 items total]}',
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
