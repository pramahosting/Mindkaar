"""
Seed data (source of truth in code, persisted to DB catalog tables on
startup) for scenario categories, assessment items, games, and which
games are offered for which scenario. Also holds the deterministic
scenario-scoring logic.

Wording is original/paraphrased, inspired by the general structure of
well-established brief screeners (PSS-10, GAD-7, UCLA-3, Maslach Burnout
Inventory themes) - not copied from any copyrighted instrument. This is a
self-reflection tool, not a diagnostic instrument.
"""

from typing import Dict, List

MAX_ITEM_VALUE = 3
RESPONSE_SCALE = [
    {"value": 0, "label": "Not at all"},
    {"value": 1, "label": "Several days"},
    {"value": 2, "label": "More than half the days"},
    {"value": 3, "label": "Nearly every day"},
]

SCENARIO_CATEGORIES = [
    {"code": "stress", "label": "Stress"},
    {"code": "anxiety", "label": "Anxiety"},
    {"code": "conflict", "label": "Conflict"},
    {"code": "unrest", "label": "Unrest"},
    {"code": "burnout", "label": "Burnout"},
    {"code": "loneliness", "label": "Loneliness"},
]

# 4 items per category.
ASSESSMENT_ITEMS = [
    {"code": "stress_1", "category": "stress", "text": "Felt unable to control the important things in your life", "sort_order": 1},
    {"code": "stress_2", "category": "stress", "text": "Felt like demands were piling up faster than you could handle them", "sort_order": 2},
    {"code": "stress_3", "category": "stress", "text": "Felt nervous or 'stressed' over small, everyday things", "sort_order": 3},
    {"code": "stress_4", "category": "stress", "text": "Found it hard to relax even when you had a free moment", "sort_order": 4},

    {"code": "anxiety_1", "category": "anxiety", "text": "Felt nervous, anxious, or on edge", "sort_order": 1},
    {"code": "anxiety_2", "category": "anxiety", "text": "Had trouble stopping or controlling worrying thoughts", "sort_order": 2},
    {"code": "anxiety_3", "category": "anxiety", "text": "Felt restless, making it hard to sit still", "sort_order": 3},
    {"code": "anxiety_4", "category": "anxiety", "text": "Felt afraid something bad was about to happen, without a clear reason", "sort_order": 4},

    {"code": "conflict_1", "category": "conflict", "text": "Had tense arguments or disagreements with someone close to you", "sort_order": 1},
    {"code": "conflict_2", "category": "conflict", "text": "Felt misunderstood or unheard by people around you", "sort_order": 2},
    {"code": "conflict_3", "category": "conflict", "text": "Avoided a conversation because you expected it to turn into a fight", "sort_order": 3},
    {"code": "conflict_4", "category": "conflict", "text": "Replayed an argument in your head after it was over", "sort_order": 4},

    {"code": "unrest_1", "category": "unrest", "text": "Felt an unsettled, restless energy you couldn't quite place", "sort_order": 1},
    {"code": "unrest_2", "category": "unrest", "text": "Found your attention jumping between things without settling anywhere", "sort_order": 2},
    {"code": "unrest_3", "category": "unrest", "text": "Felt like things around you were unpredictable or in flux", "sort_order": 3},
    {"code": "unrest_4", "category": "unrest", "text": "Had trouble sitting with stillness or quiet", "sort_order": 4},

    {"code": "burnout_1", "category": "burnout", "text": "Felt emotionally drained by the end of most days", "sort_order": 1},
    {"code": "burnout_2", "category": "burnout", "text": "Felt detached or numb about responsibilities you used to care about", "sort_order": 2},
    {"code": "burnout_3", "category": "burnout", "text": "Dreaded starting tasks you normally wouldn't mind doing", "sort_order": 3},
    {"code": "burnout_4", "category": "burnout", "text": "Felt like your effort wasn't leading anywhere worthwhile", "sort_order": 4},

    {"code": "loneliness_1", "category": "loneliness", "text": "Felt like you lacked companionship", "sort_order": 1},
    {"code": "loneliness_2", "category": "loneliness", "text": "Felt left out, even around other people", "sort_order": 2},
    {"code": "loneliness_3", "category": "loneliness", "text": "Felt isolated from people you'd normally feel close to", "sort_order": 3},
    {"code": "loneliness_4", "category": "loneliness", "text": "Wished you had someone to turn to but didn't reach out", "sort_order": 4},
]

# The four mini-games actually implemented in the frontend.
GAMES = [
    {
        "code": "chopping_vegetables",
        "mechanic": "click-timing",
        "base_title": "Chopping Vegetables",
        "base_description": "Chop vegetables sliding across the board before they disappear - speed and decoys increase every level.",
    },
    {
        "code": "calm_breathing",
        "mechanic": "breath-pacing",
        "base_title": "Calm Breathing",
        "base_description": "Tap right as each guided breath cycle turns - the timing window tightens and the pace quickens every level.",
    },
    {
        "code": "memory_sequence",
        "mechanic": "sequence-memory",
        "base_title": "Memory Sequence",
        "base_description": "Watch a sequence of tiles light up, then repeat it back - the sequence grows longer and faster every level.",
    },
    {
        "code": "sort_your_thoughts",
        "mechanic": "thought-sorting",
        "base_title": "Sort Your Thoughts",
        "base_description": "A thought appears - decide quickly whether to let it go or act on it, before the window closes.",
    },
]

# Every scenario offers BOTH implemented games, each with scenario-specific
# flavor text, so a person can choose whichever fits them for that scenario.
SCENARIO_GAME_FLAVOR = {
    ("stress", "chopping_vegetables"): (
        "Chopping Vegetables",
        "A calming-under-pressure kitchen game, themed around handling stress one small task at a time.",
    ),
    ("stress", "calm_breathing"): (
        "Calm Breathing",
        "A steady breathing pacer to counter the racing feeling stress brings on.",
    ),
    ("anxiety", "chopping_vegetables"): (
        "Chopping Vegetables (Steady Hands)",
        "Channel anxious energy into precise, controlled chops instead of rushing.",
    ),
    ("anxiety", "calm_breathing"): (
        "Calm Breathing",
        "Slows a racing mind down to one breath at a time - built for anxious moments.",
    ),
    ("conflict", "chopping_vegetables"): (
        "Chopping Vegetables (Channel the Tension)",
        "Channel post-argument tension into controlled, deliberate chops.",
    ),
    ("conflict", "calm_breathing"): (
        "Calm Breathing",
        "A cooldown breathing pacer for after a tense exchange.",
    ),
    ("unrest", "chopping_vegetables"): (
        "Chopping Vegetables (Find Your Rhythm)",
        "Find a steady rhythm chopping through the board to settle a restless mind.",
    ),
    ("unrest", "calm_breathing"): (
        "Calm Breathing",
        "Grounds an unsettled, restless energy into one steady rhythm.",
    ),
    ("burnout", "chopping_vegetables"): (
        "Chopping Vegetables (Small Wins)",
        "Focus on small, manageable wins one vegetable at a time.",
    ),
    ("burnout", "calm_breathing"): (
        "Calm Breathing",
        "A gentle reset for an emotionally drained day.",
    ),
    ("loneliness", "chopping_vegetables"): (
        "Chopping Vegetables (Mindful Moment)",
        "A simple, grounding, hands-on activity to spend time with yourself.",
    ),
    ("loneliness", "calm_breathing"): (
        "Calm Breathing",
        "A quiet, grounding moment of company with your own breath.",
    ),

    ("stress", "memory_sequence"): (
        "Memory Sequence",
        "Rebuild focus by holding a growing sequence in mind - a clear counter to a stress-scattered brain.",
    ),
    ("stress", "sort_your_thoughts"): (
        "Sort Your Thoughts",
        "Quickly triage racing thoughts into 'let go' or 'act on' before the next one piles up.",
    ),
    ("anxiety", "memory_sequence"): (
        "Memory Sequence (Steady Focus)",
        "Anchors a jumpy mind by giving it one clear, repeatable pattern to hold onto.",
    ),
    ("anxiety", "sort_your_thoughts"): (
        "Sort Your Thoughts",
        "Practice quickly telling apart a worry worth acting on from one worth releasing.",
    ),
    ("conflict", "memory_sequence"): (
        "Memory Sequence (Cool Down)",
        "A neutral, absorbing pattern to reset focus after a tense exchange.",
    ),
    ("conflict", "sort_your_thoughts"): (
        "Sort Your Thoughts",
        "Sort post-argument thoughts into what's worth raising later and what's worth dropping.",
    ),
    ("unrest", "memory_sequence"): (
        "Memory Sequence (Find Focus)",
        "Gives a restless mind one clear thing to track instead of everything at once.",
    ),
    ("unrest", "sort_your_thoughts"): (
        "Sort Your Thoughts",
        "Turns scattered, unsettled thoughts into a simple two-pile sort.",
    ),
    ("burnout", "memory_sequence"): (
        "Memory Sequence (Small Focus)",
        "A short, achievable pattern to rebuild a sense of capability, one round at a time.",
    ),
    ("burnout", "sort_your_thoughts"): (
        "Sort Your Thoughts",
        "Separates what's actually worth your remaining energy from what isn't, right now.",
    ),
    ("loneliness", "memory_sequence"): (
        "Memory Sequence",
        "A simple, absorbing focus exercise to spend a quiet moment with.",
    ),
    ("loneliness", "sort_your_thoughts"): (
        "Sort Your Thoughts",
        "A gentle sort through the thoughts that come up in quiet moments alone.",
    ),
}


MIN_CATEGORIES = 2
MAX_CATEGORIES = 3

# Deterministic keyword triage - no LLM call, so it can't fail from an
# outage and is fully reproducible. Purposefully simple: this only picks
# which domains to ASK ABOUT in more depth, it never scores anything by
# itself - the actual scoring still comes entirely from the person's own
# Likert answers in score_scenarios() below.
CATEGORY_KEYWORDS = {
    "stress": ["stress", "overwhelm", "pressure", "deadline", "busy", "juggling", "too much", "swamped"],
    "anxiety": ["anxious", "anxiety", "worry", "worried", "nervous", "panic", "on edge", "dread", "fear"],
    "conflict": ["conflict", "argue", "argument", "fight", "tension", "disagree", "misunderstood", "yelling"],
    "unrest": ["restless", "unsettled", "uneasy", "unstable", "chaotic", "can't focus", "distracted", "scattered"],
    "burnout": ["burnout", "burnt out", "burned out", "exhausted", "drained", "numb", "detached", "no motivation", "pointless"],
    "loneliness": ["lonely", "alone", "isolated", "no one", "no-one", "left out", "disconnected", "no friends"],
}


def triage_categories(text_signals: List[str]) -> List[str]:
    """Scans the person's open-ended context text for keyword matches per
    category and returns the top MIN-MAX categories worth asking about in
    depth. Falls back to stress+anxiety (the two most common patterns) if
    nothing matches, so there's always something to assess."""
    combined = " ".join(t for t in text_signals if t).lower()

    scores = []
    for cat in SCENARIO_CATEGORIES:
        code = cat["code"]
        hits = sum(1 for kw in CATEGORY_KEYWORDS[code] if kw in combined)
        if hits > 0:
            scores.append((code, hits))

    scores.sort(key=lambda s: s[1], reverse=True)
    picked = [code for code, _ in scores[:MAX_CATEGORIES]]

    if len(picked) < MIN_CATEGORIES:
        for fallback in ["stress", "anxiety", "burnout"]:
            if fallback not in picked:
                picked.append(fallback)
            if len(picked) >= MIN_CATEGORIES:
                break

    return picked[:MAX_CATEGORIES]


def score_scenarios(answers: Dict[str, int]) -> List[dict]:
    """Deterministically scores each scenario category 0-100 from the
    person's answers to that category's 4 items - no LLM call, so this
    can't fail from an outage and gives the same result every time.
    Returns plain dicts (not ORM/pydantic objects) so this stays reusable
    from both the router and any future batch/offline scoring."""
    items_by_category: Dict[str, List[dict]] = {}
    for item in ASSESSMENT_ITEMS:
        items_by_category.setdefault(item["category"], []).append(item)

    results = []
    for cat in SCENARIO_CATEGORIES:
        category = cat["code"]
        items = items_by_category[category]

        # Only score this category if the person was actually asked about
        # it (at least one of its items is present in their answers) -
        # a category they weren't asked about gets no score, rather than
        # a misleading 0% implying "no signal".
        if not any(item["code"] in answers for item in items):
            continue

        values = [max(0, min(MAX_ITEM_VALUE, int(answers.get(item["code"], 0)))) for item in items]
        max_possible = MAX_ITEM_VALUE * len(items)
        relevance = round((sum(values) / max_possible) * 100) if max_possible else 0

        top_index = values.index(max(values)) if values else 0
        top_item = items[top_index]
        top_value = values[top_index] if values else 0

        if top_value >= 2:
            reason = f"You indicated this happens often: \"{top_item['text']}.\""
        elif top_value == 1:
            reason = f"You noted this comes up sometimes: \"{top_item['text']}.\""
        else:
            reason = "Your answers didn't show strong signals in this area right now."

        results.append({"category": category, "label": cat["label"], "relevance": relevance, "reason": reason})

    results.sort(key=lambda r: r["relevance"], reverse=True)
    return results
