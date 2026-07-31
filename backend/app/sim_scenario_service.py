from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.sim_models import SimScenario, SimCharacter
from app.sim_seed import REFLECTION_GUIDE_SLUG

CATEGORY_TITLES = {
    "stress": "Handling the Pressure",
    "anxiety": "Steadying an Anxious Moment",
    "conflict": "Working Through the Conflict",
    "unrest": "Finding Your Footing",
    "burnout": "Recovering Your Energy",
    "loneliness": "Reaching Out and Reconnecting",
}


def list_scenarios(db: Session, user_id: int | None = None) -> list[SimScenario]:
    """Returns the shared/seeded scenarios plus this user's own
    personalized one(s), if any - never another user's personal scenario."""
    if user_id is None:
        return db.query(SimScenario).filter(SimScenario.user_id.is_(None)).all()
    return (
        db.query(SimScenario)
        .filter(or_(SimScenario.user_id.is_(None), SimScenario.user_id == user_id))
        .all()
    )


def get_scenario(db: Session, scenario_id: str) -> SimScenario | None:
    return db.query(SimScenario).filter(SimScenario.id == scenario_id).first()


def upsert_personal_scenario(
    db: Session, user_id: int, category: str, category_label: str, questions: list[str]
) -> SimScenario:
    """Creates (or updates, if the person retakes the assessment for the
    same category) a scenario personal to this user, whose question
    sequence is exactly their own reflection questions rather than
    anything LLM-improvised - see sim_simulation_service.process_turn for
    where that's enforced during the actual conversation.

    Uses the dedicated reflection-guide character (Morgan) rather than
    borrowing one of the 4 combative/distressed characters - those are
    built around the user de-escalating *them*, which makes no sense for
    a conversation whose actual content is introspective questions about
    the user's own experience."""
    questions = [q.strip() for q in questions if q and q.strip()]
    if not questions:
        raise ValueError("At least one reflection question is required.")

    guide = db.query(SimCharacter).filter(SimCharacter.slug == REFLECTION_GUIDE_SLUG).first()
    if not guide:
        raise ValueError("Reflection guide character is not set up yet - try again in a moment.")

    slug = f"personal_{user_id}_{category}"
    title = CATEGORY_TITLES.get(category, "Your Personalized Conversation")
    label_lower = category_label.lower()

    scenario = db.query(SimScenario).filter(SimScenario.slug == slug).first()
    if not scenario:
        scenario = SimScenario(slug=slug, user_id=user_id, character_id=guide.id)
        db.add(scenario)
    else:
        scenario.character_id = guide.id  # in case this scenario predates the guide character

    scenario.title = title
    scenario.description = (
        f"A conversation built from your own reflection questions about {label_lower}, "
        "with a guide who reacts to how you actually respond."
    )
    scenario.context = (
        f"This is a reflective conversation about the {label_lower} you described in your "
        "assessment. Morgan will ask you the questions you're about to explore, one at a "
        "time, and respond to what you actually say - there's no script to perform, just "
        "your own honest answers."
    )
    scenario.objective = (
        "Answer as honestly and specifically as you can. There's no right or wrong response "
        "here - the goal is simply to notice your own patterns as you talk them through out loud."
    )
    scenario.difficulty = "medium"
    scenario.opening_line = questions[0]
    scenario.total_questions = len(questions)
    scenario.evaluation_criteria = ["openness", "relevance", "communication", "active_listening"]
    scenario.custom_questions = questions

    db.commit()
    db.refresh(scenario)
    return scenario


def scenario_to_dict(scenario: SimScenario) -> dict:
    return {
        "id": scenario.id,
        "title": scenario.title,
        "description": scenario.description,
        "context": scenario.context,
        "objective": scenario.objective,
        "evaluation_criteria": scenario.evaluation_criteria,
    }


def character_to_dict(character) -> dict:
    return {
        "id": character.id,
        "name": character.name,
        "role": character.role,
        "personality": character.personality,
        "initial_emotion": character.initial_emotion,
    }
