"""
Idempotent catalog seeding.

Runs on every startup. Upserts scenario categories, assessment items,
games, and scenario-game offerings from the seed data in app/assessment.py
into the DB catalog tables. Safe to run repeatedly - existing rows are
matched by their unique `code`/(category,game) and updated in place
rather than duplicated.
"""

import logging

from sqlalchemy.orm import Session

from app.assessment import ASSESSMENT_ITEMS, GAMES, SCENARIO_CATEGORIES, SCENARIO_GAME_FLAVOR
from app.models import AssessmentItem, Game, ScenarioCategory, ScenarioGame

logger = logging.getLogger("mindgym.seed")


def seed_catalog(db: Session) -> None:
    category_by_code: dict[str, ScenarioCategory] = {}
    for cat in SCENARIO_CATEGORIES:
        row = db.query(ScenarioCategory).filter_by(code=cat["code"]).first()
        if row is None:
            row = ScenarioCategory(code=cat["code"], label=cat["label"])
            db.add(row)
            db.flush()
        else:
            row.label = cat["label"]
        category_by_code[cat["code"]] = row

    for item in ASSESSMENT_ITEMS:
        row = db.query(AssessmentItem).filter_by(code=item["code"]).first()
        category = category_by_code[item["category"]]
        if row is None:
            row = AssessmentItem(
                code=item["code"], category_id=category.id, text=item["text"], sort_order=item["sort_order"]
            )
            db.add(row)
        else:
            row.category_id = category.id
            row.text = item["text"]
            row.sort_order = item["sort_order"]

    game_by_code: dict[str, Game] = {}
    for g in GAMES:
        row = db.query(Game).filter_by(code=g["code"]).first()
        if row is None:
            row = Game(code=g["code"], mechanic=g["mechanic"], base_title=g["base_title"], base_description=g["base_description"])
            db.add(row)
            db.flush()
        else:
            row.mechanic = g["mechanic"]
            row.base_title = g["base_title"]
            row.base_description = g["base_description"]
        game_by_code[g["code"]] = row

    for (category_code, game_code), (title, description) in SCENARIO_GAME_FLAVOR.items():
        category = category_by_code[category_code]
        game = game_by_code[game_code]
        row = db.query(ScenarioGame).filter_by(category_id=category.id, game_id=game.id).first()
        if row is None:
            row = ScenarioGame(category_id=category.id, game_id=game.id, title=title, description=description)
            db.add(row)
        else:
            row.title = title
            row.description = description

    db.commit()
    logger.info("Catalog seeded: %d categories, %d items, %d games, %d scenario-game offerings",
                len(SCENARIO_CATEGORIES), len(ASSESSMENT_ITEMS), len(GAMES), len(SCENARIO_GAME_FLAVOR))
