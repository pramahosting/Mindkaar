"""
Pydantic models for requests and responses.

These mirror the exact JSON shapes the Quiet Hours frontend already expects,
so swapping the frontend's direct-to-Groq calls for calls to this API is a
drop-in change.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Shared: the user's baseline profile
# ---------------------------------------------------------------------------
class Profile(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    age: Optional[int] = None
    mood: Optional[str] = None
    sleepHours: Optional[float] = None
    stressLevel: int = Field(default=5, ge=1, le=10)
    support: Optional[str] = None
    goals: Optional[str] = None


# ---------------------------------------------------------------------------
# Phase 1: topics
# ---------------------------------------------------------------------------
class TopicsRequest(BaseModel):
    profile: Profile
    model: Optional[str] = None  # falls back to settings.default_model if omitted


class Topic(BaseModel):
    id: int
    topic: str
    description: str


class TopicsResponse(BaseModel):
    topics: List[Topic]


# ---------------------------------------------------------------------------
# Phase 2: the 10 questions for a chosen topic
# ---------------------------------------------------------------------------
class QuestionsRequest(BaseModel):
    profile: Profile
    topic: str
    model: Optional[str] = None


class Option(BaseModel):
    id: str
    text: str
    strategy: str


class Question(BaseModel):
    id: int
    narrative: str
    difficulty: int
    options: List[Option]


class QuestionsResponse(BaseModel):
    questions: List[Question]


# ---------------------------------------------------------------------------
# Error responses
# ---------------------------------------------------------------------------
class ErrorResponse(BaseModel):
    error: str
    code: str
