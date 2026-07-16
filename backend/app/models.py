from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "mg_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    assessments: Mapped[list["Assessment"]] = relationship(back_populates="user")
    game_progress: Mapped[list["UserGameProgress"]] = relationship(back_populates="user")
    game_sessions: Mapped[list["GameSession"]] = relationship(back_populates="user")


# ─────────────────────────────────────────────────────────────
# Catalog / lookup tables (rarely change, referenced by FK so
# their descriptive text is never duplicated elsewhere - 3NF).
# ─────────────────────────────────────────────────────────────
class ScenarioCategory(Base):
    """e.g. 'stress', 'anxiety' - the six mental-scenario categories."""

    __tablename__ = "mg_scenario_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    label: Mapped[str] = mapped_column(String(60))

    items: Mapped[list["AssessmentItem"]] = relationship(back_populates="category")
    scenario_games: Mapped[list["ScenarioGame"]] = relationship(back_populates="category")


class AssessmentItem(Base):
    """One Likert-scale intake question, belonging to one category."""

    __tablename__ = "mg_assessment_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)  # e.g. "stress_1"
    category_id: Mapped[int] = mapped_column(ForeignKey("mg_scenario_categories.id"))
    text: Mapped[str] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    category: Mapped["ScenarioCategory"] = relationship(back_populates="items")


class Game(Base):
    """A playable mini-game mechanic, independent of any scenario."""

    __tablename__ = "mg_games"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(60), unique=True, index=True)  # e.g. "chopping_vegetables"
    mechanic: Mapped[str] = mapped_column(String(40))  # e.g. "click-timing"
    base_title: Mapped[str] = mapped_column(String(120))
    base_description: Mapped[str] = mapped_column(Text)

    scenario_games: Mapped[list["ScenarioGame"]] = relationship(back_populates="game")


class ScenarioGame(Base):
    """Join table: which games are offered for which scenario, with
    scenario-specific flavor text. This is what makes 'multiple games per
    scenario, pick whichever you like' possible - a scenario can have many
    rows here (one per available game), and a game can appear under many
    scenarios."""

    __tablename__ = "mg_scenario_games"
    __table_args__ = (UniqueConstraint("category_id", "game_id", name="uq_scenario_game"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("mg_scenario_categories.id"))
    game_id: Mapped[int] = mapped_column(ForeignKey("mg_games.id"))
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text)

    category: Mapped["ScenarioCategory"] = relationship(back_populates="scenario_games")
    game: Mapped["Game"] = relationship(back_populates="scenario_games")
    progress_rows: Mapped[list["UserGameProgress"]] = relationship(back_populates="scenario_game")
    sessions: Mapped[list["GameSession"]] = relationship(back_populates="scenario_game")


# ─────────────────────────────────────────────────────────────
# Fact tables - one row per real event (a submitted assessment,
# one answer, one computed score, one played session).
# ─────────────────────────────────────────────────────────────
class Assessment(Base):
    """One submission of the intake form. The individual Likert answers
    live in AssessmentAnswer (1NF - no repeating groups in one column);
    the per-category results live in ScenarioScore."""

    __tablename__ = "mg_assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("mg_users.id"))
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    family_profile: Mapped[str | None] = mapped_column(String(60), nullable=True)
    education: Mapped[str | None] = mapped_column(String(60), nullable=True)
    work_status: Mapped[str | None] = mapped_column(String(60), nullable=True)
    children: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Open-ended "how have you been feeling" text - the primary triage signal.
    mood: Mapped[str | None] = mapped_column(Text, nullable=True)
    sleep_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    stress_level: Mapped[int] = mapped_column(Integer, default=5)
    support: Mapped[str | None] = mapped_column(Text, nullable=True)
    goals: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="assessments")
    answers: Mapped[list["AssessmentAnswer"]] = relationship(back_populates="assessment")
    scenario_scores: Mapped[list["ScenarioScore"]] = relationship(back_populates="assessment")


class AssessmentAnswer(Base):
    """One Likert answer (0-3) to one item, within one assessment."""

    __tablename__ = "mg_assessment_answers"
    __table_args__ = (UniqueConstraint("assessment_id", "item_id", name="uq_assessment_item"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assessment_id: Mapped[int] = mapped_column(ForeignKey("mg_assessments.id"))
    item_id: Mapped[int] = mapped_column(ForeignKey("mg_assessment_items.id"))
    value: Mapped[int] = mapped_column(Integer)

    assessment: Mapped["Assessment"] = relationship(back_populates="answers")
    item: Mapped["AssessmentItem"] = relationship()


class ScenarioScore(Base):
    """The computed relevance score (0-100) for one category, from one
    assessment - the historical record of "why we identified this
    scenario", so it doesn't need to be recomputed later."""

    __tablename__ = "mg_scenario_scores"
    __table_args__ = (UniqueConstraint("assessment_id", "category_id", name="uq_assessment_category"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assessment_id: Mapped[int] = mapped_column(ForeignKey("mg_assessments.id"))
    category_id: Mapped[int] = mapped_column(ForeignKey("mg_scenario_categories.id"))
    relevance: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(Text)

    assessment: Mapped["Assessment"] = relationship(back_populates="scenario_scores")
    category: Mapped["ScenarioCategory"] = relationship()


class UserGameProgress(Base):
    """Tracks how far one user has progressed in one scenario+game
    combination - this is what lets a returning player skip straight to a
    harder starting level instead of always beginning at level 1."""

    __tablename__ = "mg_user_game_progress"
    __table_args__ = (UniqueConstraint("user_id", "scenario_game_id", name="uq_user_scenario_game"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("mg_users.id"))
    scenario_game_id: Mapped[int] = mapped_column(ForeignKey("mg_scenario_games.id"))
    current_level: Mapped[int] = mapped_column(Integer, default=1)
    best_score: Mapped[int] = mapped_column(Integer, default=0)
    times_played: Mapped[int] = mapped_column(Integer, default=0)
    last_played_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="game_progress")
    scenario_game: Mapped["ScenarioGame"] = relationship(back_populates="progress_rows")


class GameSession(Base):
    """One played-through game (win or lose), start to finish. Kept even
    across restarts, so full play history is preserved."""

    __tablename__ = "mg_game_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("mg_users.id"))
    scenario_game_id: Mapped[int] = mapped_column(ForeignKey("mg_scenario_games.id"))
    starting_level: Mapped[int] = mapped_column(Integer, default=1)
    ending_level: Mapped[int] = mapped_column(Integer, default=1)
    was_restart: Mapped[bool] = mapped_column(default=False)
    score: Mapped[int] = mapped_column(Integer)
    chopped: Mapped[int] = mapped_column(Integer, default=0)
    missed: Mapped[int] = mapped_column(Integer, default=0)
    mental_status: Mapped[str] = mapped_column(String(60))
    summary: Mapped[str] = mapped_column(Text)
    tip: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="game_sessions")
    scenario_game: Mapped["ScenarioGame"] = relationship(back_populates="sessions")
