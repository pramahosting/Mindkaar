"""
Emotion engine.

Takes the LLM's (or demo fallback's) proposed character_emotion delta and
turns it into a full, clamped EmotionOut-compatible dict, keeping anger /
frustration / trust / calmness consistent with each other even if the LLM
only returned a partial character_emotion object.
"""


def clamp(v: float) -> float:
    return max(0.0, min(1.0, v))


def next_emotion_state(current: dict, llm_character_emotion: dict) -> dict:
    anger = llm_character_emotion.get("anger", current.get("anger", 0.5))
    frustration = llm_character_emotion.get("frustration", current.get("frustration", 0.5))
    trust = llm_character_emotion.get("trust", current.get("trust", 0.5))
    calmness = llm_character_emotion.get("calmness", current.get("calmness", 0.5))

    anger = clamp(anger)
    frustration = clamp(frustration)
    trust = clamp(trust)
    calmness = clamp(calmness)

    primary = llm_character_emotion.get("primary")
    if not primary:
        scores = {"anger": anger, "frustration": frustration, "calm": calmness}
        primary = max(scores, key=scores.get)

    intensity = llm_character_emotion.get("intensity")
    if intensity is None:
        intensity = max(anger, frustration, 1 - calmness)
    intensity = clamp(intensity)

    return {
        "primary_emotion": primary,
        "intensity": intensity,
        "anger": anger,
        "frustration": frustration,
        "trust": trust,
        "calmness": calmness,
    }
