import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_id() -> str:
    return str(uuid.uuid4())


class Character(Base):
    __tablename__ = "characters"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    personality = Column(Text, nullable=False)
    avatar = Column(String, default="default")
    initial_emotion = Column(JSON, nullable=False)  # dict: primary, intensity, anger, frustration, trust, calmness

    scenarios = relationship("Scenario", back_populates="character")


class Scenario(Base):
    __tablename__ = "scenarios"

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
    character_id = Column(String, ForeignKey("characters.id"), nullable=False)

    character = relationship("Character", back_populates="scenarios")


class SimulationSession(Base):
    __tablename__ = "simulation_sessions"

    id = Column(String, primary_key=True, default=gen_id)
    scenario_id = Column(String, ForeignKey("scenarios.id"), nullable=False)
    status = Column(String, default="in_progress")  # in_progress | completed
    mode = Column(String, default="demo")  # ollama | demo
    current_question = Column(Text, nullable=True)
    question_index = Column(Integer, default=0)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    messages = relationship("ConversationMessage", back_populates="session", order_by="ConversationMessage.timestamp")
    responses = relationship("UserResponse", back_populates="session")
    emotion_states = relationship("EmotionState", back_populates="session", order_by="EmotionState.id")
    evaluation = relationship("EvaluationResult", back_populates="session", uselist=False)
    scenario = relationship("Scenario")


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("simulation_sessions.id"), nullable=False)
    sender = Column(String, nullable=False)  # "ai" | "user"
    message = Column(Text, nullable=False)
    emotion = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("SimulationSession", back_populates="messages")


class UserResponse(Base):
    __tablename__ = "user_responses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("simulation_sessions.id"), nullable=False)
    question = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    is_relevant = Column(Boolean, default=True)
    empathy_score = Column(Integer, default=0)
    communication_score = Column(Integer, default=0)
    active_listening_score = Column(Integer, default=0)
    deescalation_score = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("SimulationSession", back_populates="responses")


class EmotionState(Base):
    __tablename__ = "emotion_states"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("simulation_sessions.id"), nullable=False)
    message_index = Column(Integer, default=0)
    primary_emotion = Column(String, nullable=False)
    intensity = Column(Float, default=0.5)
    anger = Column(Float, default=0.5)
    frustration = Column(Float, default=0.5)
    trust = Column(Float, default=0.5)
    calmness = Column(Float, default=0.5)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("SimulationSession", back_populates="emotion_states")


class EvaluationResult(Base):
    __tablename__ = "evaluation_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("simulation_sessions.id"), unique=True, nullable=False)
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

    session = relationship("SimulationSession", back_populates="evaluation")
