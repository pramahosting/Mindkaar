"""
Maps identified mental scenarios to a mini-game, and provides a
deterministic fallback mental-status mapping so the app still works
end-to-end even if Groq is unreachable or GROQ_API_KEY isn't set yet.
"""

from app.schemas import GameConfig

GAME_CATALOG: dict[str, GameConfig] = {
    "stress": GameConfig(
        id="chopping_vegetables",
        title="Chopping Vegetables",
        description=(
            "A calming-under-pressure kitchen game. Chop the vegetables as they "
            "slide across the board before time runs out - speed and variety "
            "increase each level, just like real-world stress."
        ),
        mechanic="click-timing",
        scenario="stress",
    ),
    "anxiety": GameConfig(
        id="calm_breathing",
        title="Calm Breathing",
        description=(
            "A guided breathing-pace game. Tap right as each breath cycle turns - the "
            "window gets tighter and the pace quickens each level, mirroring how anxiety "
            "speeds everything up."
        ),
        mechanic="breath-pacing",
        scenario="anxiety",
    ),
    "conflict": GameConfig(
        id="chopping_vegetables",
        title="Chopping Vegetables (Channel the Tension)",
        description="Channel frustration into precise, controlled chops instead of rushed ones.",
        mechanic="click-timing",
        scenario="conflict",
    ),
    "unrest": GameConfig(
        id="chopping_vegetables",
        title="Chopping Vegetables (Find Your Rhythm)",
        description="Find a steady rhythm chopping through the board to settle a restless mind.",
        mechanic="click-timing",
        scenario="unrest",
    ),
    "burnout": GameConfig(
        id="chopping_vegetables",
        title="Chopping Vegetables (Small Wins)",
        description="Focus on small, manageable wins one vegetable at a time.",
        mechanic="click-timing",
        scenario="burnout",
    ),
    "loneliness": GameConfig(
        id="chopping_vegetables",
        title="Chopping Vegetables (Mindful Moment)",
        description="A simple, grounding mindful-moment activity.",
        mechanic="click-timing",
        scenario="loneliness",
    ),
}

DEFAULT_GAME = GAME_CATALOG["stress"]


def get_game_for_scenario(scenario: str) -> GameConfig:
    return GAME_CATALOG.get(scenario.lower().strip(), DEFAULT_GAME)


def fallback_status(score: int, max_level: int, chopped: int, missed: int) -> dict:
    """Deterministic status mapping used only if the Groq call fails -
    keeps the app usable without an API key while developing."""
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
