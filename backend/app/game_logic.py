"""
Deterministic fallback mental-status mapping, used only if Groq is
unreachable or GROQ_API_KEY isn't set - keeps the app usable end-to-end
without an LLM dependency. The scenario -> game catalog itself now lives
in the DB (ScenarioGame table, seeded from app/assessment.py) rather than
here, since it needs to support multiple selectable games per scenario
and per-user progress tracking.
"""


def fallback_status(score: int, max_level: int, chopped: int, missed: int) -> dict:
    total = chopped + missed
    accuracy = (chopped / total) if total else 0

    if max_level >= 4 and accuracy >= 0.75:
        status = "Managing Well"
        summary = (
            "You stayed sharp and accurate even as the pace picked up - a strong sign "
            "of composure under pressure."
        )
    elif max_level >= 2 and accuracy >= 0.5:
        status = "Building Resilience"
        summary = (
            "You held steady through the early rounds and adapted as things sped up. "
            "With a little more practice you'll push through the harder levels too."
        )
    elif accuracy >= 0.3:
        status = "Mildly Overwhelmed"
        summary = (
            "Things got harder to keep up with as the pace increased - completely normal, "
            "and a good sign to build in short breaks when pressure rises."
        )
    else:
        status = "Needs Support"
        summary = (
            "It looks like the pace overwhelmed things quickly today. That's valuable "
            "information, not a failure - it may help to talk this through with someone "
            "you trust or a professional."
        )

    return {
        "status": status,
        "summary": summary,
        "tip": "Try box breathing (4 counts in, 4 hold, 4 out, 4 hold) before your next round.",
    }
