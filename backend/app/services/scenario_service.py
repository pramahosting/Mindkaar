from sqlalchemy.orm import Session

from app.models.models import Scenario


def list_scenarios(db: Session) -> list[Scenario]:
    return db.query(Scenario).all()


def get_scenario(db: Session, scenario_id: str) -> Scenario | None:
    return db.query(Scenario).filter(Scenario.id == scenario_id).first()


def scenario_to_dict(scenario: Scenario) -> dict:
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
