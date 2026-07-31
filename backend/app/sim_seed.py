"""
Seeds the database with simulation characters + scenarios if they don't
already exist. Run automatically on startup (see main.py) so a fresh DB
always has the 4 demo roleplay scenarios available.
"""
from app.sim_models import SimCharacter, SimScenario

# Used for every personalized ("Built for you") scenario, regardless of
# category - a warm, curious listener asking the person's own reflection
# questions is a completely different role from the 4 combative/distressed
# characters below (angry customer, upset coworker, etc.), so it gets its
# own dedicated persona rather than borrowing one of theirs. See
# ensure_reflection_guide_character() below for how this gets added to an
# already-seeded database.
REFLECTION_GUIDE_SLUG = "reflection_guide"
REFLECTION_GUIDE = dict(
    slug=REFLECTION_GUIDE_SLUG,
    name="Morgan",
    role="Reflective Guide",
    personality=(
        "Morgan is a warm, curious, non-judgmental listener helping someone think "
        "through their own reflection questions out loud. Morgan never lectures or "
        "rushes to fix things - they ask each question genuinely, listen closely to "
        "the answer, and respond with brief, specific reflections that show they "
        "were really listening before moving to the next question. Morgan grows "
        "warmer and more engaged when the person answers honestly and specifically, "
        "and gently, gently encourages more detail (without any pressure) when an "
        "answer is very short or seems to be avoiding the question."
    ),
    avatar="guide",
    initial_emotion={"primary": "calm", "intensity": 0.35, "anger": 0.03,
                      "frustration": 0.08, "trust": 0.55, "calmness": 0.75},
)

CHARACTERS = [
    dict(
        slug="alex_customer",
        name="Alex",
        role="Customer",
        personality=(
            "Alex is a frustrated customer who has been waiting two weeks for an "
            "online order. Alex is not abusive, but is impatient, feels ignored, "
            "and wants acknowledgement and a concrete resolution. Alex softens "
            "noticeably when the other person shows genuine empathy and gets "
            "angrier when dismissed or given generic corporate non-answers."
        ),
        avatar="customer",
        initial_emotion={"primary": "anger", "intensity": 0.9, "anger": 0.9,
                          "frustration": 0.85, "trust": 0.1, "calmness": 0.1},
    ),
    dict(
        slug="jordan_coworker",
        name="Jordan",
        role="Coworker",
        personality=(
            "Jordan feels their work on a shared project was taken credit for by "
            "the user in a team meeting. Jordan is hurt and defensive rather than "
            "loud, and responds to honest acknowledgement much better than to "
            "being told they are 'overreacting'."
        ),
        avatar="coworker",
        initial_emotion={"primary": "frustration", "intensity": 0.7, "anger": 0.5,
                          "frustration": 0.75, "trust": 0.3, "calmness": 0.3},
    ),
    dict(
        slug="sam_student",
        name="Sam",
        role="Student",
        personality=(
            "Sam is an anxious student panicking about an upcoming exam and "
            "convinced they will fail. Sam speaks quickly, catastrophizes, and "
            "needs to feel heard and reassured with concrete, realistic steps "
            "rather than empty reassurance like 'don't worry about it'."
        ),
        avatar="student",
        initial_emotion={"primary": "anxiety", "intensity": 0.8, "anger": 0.1,
                          "frustration": 0.4, "trust": 0.2, "calmness": 0.15},
    ),
    dict(
        slug="riley_friend",
        name="Riley",
        role="Friend",
        personality=(
            "Riley just went through a breakup and is sad and withdrawn. Riley "
            "doesn't want to be immediately told to 'move on' or given unsolicited "
            "advice; Riley opens up more when the user simply listens and validates "
            "how hard this is, and closes off when dismissed or rushed."
        ),
        avatar="friend",
        initial_emotion={"primary": "sadness", "intensity": 0.75, "anger": 0.1,
                          "frustration": 0.2, "trust": 0.3, "calmness": 0.25},
    ),
]

SCENARIOS = [
    dict(
        slug="angry_customer",
        title="Angry Customer",
        description="A customer's order is two weeks late and they are furious. Can you de-escalate and help?",
        context="You are a customer service representative. The customer has been waiting for their order for two weeks with no update.",
        objective="Understand the customer's frustration, demonstrate empathy, listen actively, de-escalate, and offer a reasonable solution.",
        difficulty="medium",
        opening_line="I have been waiting for my order for two weeks! This is completely unacceptable. Why has nobody helped me?",
        total_questions=5,
        evaluation_criteria=["empathy", "relevance", "communication", "active_listening", "deescalation"],
        character_slug="alex_customer",
    ),
    dict(
        slug="workplace_conflict",
        title="Workplace Conflict",
        description="A coworker feels you took credit for their work in a meeting. Can you repair the relationship?",
        context="You are talking to a coworker directly after a team meeting where they feel slighted.",
        objective="Acknowledge the coworker's feelings honestly, take appropriate responsibility, and rebuild trust.",
        difficulty="medium",
        opening_line="Hey... can we talk? In the meeting today it really felt like you took credit for the work I did on the report.",
        total_questions=5,
        evaluation_criteria=["empathy", "relevance", "communication", "active_listening", "deescalation"],
        character_slug="jordan_coworker",
    ),
    dict(
        slug="anxious_student",
        title="Anxious Student",
        description="A student is panicking about an upcoming exam. Can you help calm them down?",
        context="You are a mentor or tutor. The student comes to you visibly anxious the night before a big exam.",
        objective="Validate the student's anxiety, listen actively, and help them find a concrete, realistic next step.",
        difficulty="easy",
        opening_line="I can't do this. I've studied for weeks and I still feel like I know nothing. I'm going to fail tomorrow.",
        total_questions=4,
        evaluation_criteria=["empathy", "relevance", "communication", "active_listening"],
        character_slug="sam_student",
    ),
    dict(
        slug="sad_friend",
        title="Sad Friend",
        description="A close friend just went through a breakup and is struggling. Can you support them well?",
        context="Your friend reaches out to you the day after a breakup, clearly upset.",
        objective="Listen without rushing to fix things, validate their feelings, and offer support at their pace.",
        difficulty="easy",
        opening_line="Hey... sorry, I just... it's been a really rough day. We broke up last night.",
        total_questions=4,
        evaluation_criteria=["empathy", "relevance", "communication", "active_listening"],
        character_slug="riley_friend",
    ),
]


def seed_sim_if_empty(db) -> None:
    if db.query(SimCharacter).count() > 0:
        return

    char_by_slug = {}
    for c in CHARACTERS:
        char = SimCharacter(**c)
        db.add(char)
        db.flush()  # get generated id
        char_by_slug[c["slug"]] = char.id

    for s in SCENARIOS:
        data = {k: v for k, v in s.items() if k != "character_slug"}
        scenario = SimScenario(character_id=char_by_slug[s["character_slug"]], **data)
        db.add(scenario)

    db.commit()


def ensure_reflection_guide_character(db) -> None:
    """Adds Morgan (the personalized-scenario character) even to a database
    that was already seeded before this character existed - seed_sim_if_empty
    above only runs once against an empty database, so a separate,
    always-runs-on-startup check is needed for anything added later."""
    exists = db.query(SimCharacter).filter(SimCharacter.slug == REFLECTION_GUIDE_SLUG).first()
    if exists:
        return
    db.add(SimCharacter(**REFLECTION_GUIDE))
    db.commit()
