"""
Models for the "Run Simulation" feature: a voice-driven roleplay with an AI
character whose emotional state reacts to the user's responses in real time.

Deliberately namespaced with a `sim_` table prefix (and `Sim*` class names)
so nothing here collides with MindGym's existing scenario/assessment/game
tables, even though both features use the word "scenario" for different
things.
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_id() -> str:
    return str(uuid.uuid4())


class SimCharacter(Base):
    __tablename__ = "sim_characters"

    id = Column(String, primary_key=True, default=gen_id)
    slug = Column(String, nullable=True)  # stable lookup key, e.g. "reflection_guide"
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    personality = Column(Text, nullable=False)
    avatar = Column(String, default="default")
    initial_emotion = Column(JSON, nullable=False)  # dict: primary, intensity, anger, frustration, trust, calmness

    scenarios = relationship("SimScenario", back_populates="character")


class SimScenario(Base):
    __tablename__ = "sim_scenarios"

    id = Column(String, primary_key=True, default=gen_id)
    slug = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    context = Column(Text, nullable=False)
    objective = Column(Text, nullable=False)
    difficulty = Column(String, default="medium")
    opening_line = Column(Text, nullable=False)
    total_questions = Column(Integer, default=5)
    evaluation_criteria = Column(JSON, nullable=False)  # list[str]
    character_id = Column(String, ForeignKey("sim_characters.id"), nullable=False)

    # NULL for the 4 shared/seeded scenarios. Set to a mg_users.id for a
    # scenario generated for one specific person from their own reflection
    # questions (see sim_scenario_service.upsert_personal_scenario).
    user_id = Column(Integer, ForeignKey("mg_users.id"), nullable=True)

    # When set, the roleplay asks exactly these questions in this order
    # (see sim_simulation_service.process_turn) instead of letting the LLM
    # invent follow-up questions - this is what lets a personalized
    # scenario walk through the person's own reflection questions during
    # the conversation itself.
    custom_questions = Column(JSON, nullable=True)  # list[str] | None

    character = relationship("SimCharacter", back_populates="scenarios")

    @property
    def is_personal(self) -> bool:
        return self.user_id is not None


class SimSession(Base):
    __tablename__ = "sim_sessions"

    id = Column(String, primary_key=True, default=gen_id)
    scenario_id = Column(String, ForeignKey("sim_scenarios.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("mg_users.id"), nullable=True)
    status = Column(String, default="in_progress")  # in_progress | completed
    mode = Column(String, default="demo")  # groq | demo
    current_question = Column(Text, nullable=True)
    question_index = Column(Integer, default=0)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    messages = relationship("SimMessage", back_populates="session", order_by="SimMessage.timestamp")
    responses = relationship("SimUserResponse", back_populates="session")
    emotion_states = relationship("SimEmotionState", back_populates="session", order_by="SimEmotionState.id")
    evaluation = relationship("SimEvaluationResult", back_populates="session", uselist=False)
    scenario = relationship("SimScenario")


class SimMessage(Base):
    __tablename__ = "sim_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("sim_sessions.id"), nullable=False)
    sender = Column(String, nullable=False)  # "ai" | "user"
    message = Column(Text, nullable=False)
    emotion = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("SimSession", back_populates="messages")


class SimUserResponse(Base):
    __tablename__ = "sim_user_responses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("sim_sessions.id"), nullable=False)
    question = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    is_relevant = Column(Boolean, default=True)
    empathy_score = Column(Integer, default=0)
    communication_score = Column(Integer, default=0)
    active_listening_score = Column(Integer, default=0)
    deescalation_score = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("SimSession", back_populates="responses")


class SimEmotionState(Base):
    __tablename__ = "sim_emotion_states"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("sim_sessions.id"), nullable=False)
    message_index = Column(Integer, default=0)
    primary_emotion = Column(String, nullable=False)
    intensity = Column(Float, default=0.5)
    anger = Column(Float, default=0.5)
    frustration = Column(Float, default=0.5)
    trust = Column(Float, default=0.5)
    calmness = Column(Float, default=0.5)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("SimSession", back_populates="emotion_states")


class SimEvaluationResult(Base):
    __tablename__ = "sim_evaluation_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("sim_sessions.id"), unique=True, nullable=False)
    empathy_score = Column(Integer, default=0)
    communication_score = Column(Integer, default=0)
    active_listening_score = Column(Integer, default=0)
    emotional_awareness_score = Column(Integer, default=0)
    conflict_resolution_score = Column(Integer, default=0)
    overall_score = Column(Integer, default=0)
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    feedback = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("SimSession", back_populates="evaluation")
