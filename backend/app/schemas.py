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


# ── Profile / assessment intake ───────────────────────────
class ProfileIn(BaseModel):
    age: Optional[int] = None
    familyProfile: Optional[str] = None
    education: Optional[str] = None
    workStatus: Optional[str] = None
    children: Optional[str] = None
    # Open-ended "how have you been feeling" text - the primary triage signal.
    mood: Optional[str] = None
    sleepHours: Optional[float] = None
    stressLevel: int = Field(default=5, ge=1, le=10)
    support: Optional[str] = None
    goals: Optional[str] = None
    # Maps assessment item code -> answer value (0-3). See app/assessment.py.
    assessment: dict[str, int] = Field(default_factory=dict)


class TriageResponse(BaseModel):
    recommended: List[str]
    categories: List[dict]  # [{code, label}] for all six, for reference/manual override in the UI


class AssessmentItemOut(BaseModel):
    code: str
    category: str
    text: str


class AssessmentResponse(BaseModel):
    items: List[AssessmentItemOut]
    scale: List[dict]


# ── Scenario identification (persisted result of a submission) ──
class ScenarioCandidate(BaseModel):
    id: str
    label: str
    relevance: int
    reason: str


class ScenarioResponse(BaseModel):
    assessment_id: int
    primary: ScenarioCandidate
    candidates: List[ScenarioCandidate]


# ── Returning-user status (drives "skip straight to game" on login) ──
class MeStatusResponse(BaseModel):
    has_assessment: bool
    latest_assessment_id: Optional[int] = None
    latest_scenario: Optional[ScenarioCandidate] = None


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


# ── Scenario-specific game catalog (multiple games per scenario) ──
class ScenarioGameOut(BaseModel):
    scenario_game_id: int
    game_code: str
    title: str
    description: str
    mechanic: str
    current_level: int
    best_score: int
    times_played: int


class ScenarioGamesResponse(BaseModel):
    scenario: str
    games: List[ScenarioGameOut]


# ── Score / mental status ─────────────────────────────────
class ScoreRequest(BaseModel):
    profile: ProfileIn
    scenario_game_id: int
    starting_level: int
    was_restart: bool = False
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
    starting_level: int
    ending_level: int
    new_current_level: int


class ErrorResponse(BaseModel):
    error: str
    code: str
