from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


# ── Auth ──────────────────────────────────────────────────
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Profile ───────────────────────────────────────────────
class ProfileIn(BaseModel):
    age: Optional[int] = None
    mood: Optional[str] = None
    sleepHours: Optional[float] = None
    stressLevel: int = Field(default=5, ge=1, le=10)
    support: Optional[str] = None
    goals: Optional[str] = None


# ── Scenario identification ───────────────────────────────
class ScenarioRequest(BaseModel):
    profile: ProfileIn
    model: Optional[str] = None


class ScenarioCandidate(BaseModel):
    id: str
    label: str
    relevance: int
    reason: str


class ScenarioResponse(BaseModel):
    primary: ScenarioCandidate
    candidates: List[ScenarioCandidate]


# ── Questions ─────────────────────────────────────────────
class QuestionsRequest(BaseModel):
    profile: ProfileIn
    scenario: str
    model: Optional[str] = None


class QuestionOption(BaseModel):
    id: str
    text: str
    strategy: str


class Question(BaseModel):
    id: int
    narrative: str
    difficulty: int
    options: List[QuestionOption]


class QuestionsResponse(BaseModel):
    questions: List[Question]


# ── Game catalog ──────────────────────────────────────────
class GameConfig(BaseModel):
    id: str
    title: str
    description: str
    mechanic: str
    scenario: str


# ── Score / mental status ─────────────────────────────────
class ScoreRequest(BaseModel):
    profile: ProfileIn
    scenario: str
    game_id: str
    score: int
    max_level: int
    chopped: int
    missed: int
    model: Optional[str] = None


class ScoreResponse(BaseModel):
    mental_status: str
    summary: str
    tip: str
    score: int
    max_level: int


class ErrorResponse(BaseModel):
    error: str
    code: str
