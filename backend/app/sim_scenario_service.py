from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.sim_models import SimScenario

# Maps an assessment scenario category (from app/assessment.py) to whichever
# of the 4 shared simulation scenarios is the closest thematic fit - used
# to borrow that scenario's character/context/objective when building a
# personalized one (mirrors frontend/src/lib/scenarioMapping.js).
CATEGORY_TO_SCENARIO_SLUG = {
    "anxiety": "anxious_student",
    "conflict": "workplace_conflict",
    "loneliness": "sad_friend",
    "burnout": "sad_friend",
    "stress": "angry_customer",
    "unrest": "angry_customer",
}

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
    where that's enforced during the actual conversation."""
    questions = [q.strip() for q in questions if q and q.strip()]
    if not questions:
        raise ValueError("At least one reflection question is required.")

    base_slug = CATEGORY_TO_SCENARIO_SLUG.get(category, "angry_customer")
    base_scenario = (
        db.query(SimScenario)
        .filter(SimScenario.slug == base_slug, SimScenario.user_id.is_(None))
        .first()
    )
    if not base_scenario:
        base_scenario = db.query(SimScenario).filter(SimScenario.user_id.is_(None)).first()
    if not base_scenario:
        raise ValueError("No base scenario catalog found to personalize from.")

    slug = f"personal_{user_id}_{category}"
    title = CATEGORY_TITLES.get(category, "Your Personalized Conversation")

    scenario = db.query(SimScenario).filter(SimScenario.slug == slug).first()
    if not scenario:
        scenario = SimScenario(slug=slug, user_id=user_id, character_id=base_scenario.character_id)
        db.add(scenario)

    scenario.title = title
    scenario.description = (
        f"A conversation built from your own reflection questions about {category_label.lower()}, "
        "with a character that reacts to how you actually respond."
    )
    scenario.context = base_scenario.context
    scenario.objective = base_scenario.objective
    scenario.difficulty = base_scenario.difficulty
    scenario.opening_line = questions[0]
    scenario.total_questions = len(questions)
    scenario.evaluation_criteria = base_scenario.evaluation_criteria
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
