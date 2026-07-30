from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ---------- Scenario / Character ----------

class CharacterOut(BaseModel):
    id: str
    name: str
    role: str
    personality: str
    avatar: str
    initial_emotion: dict

    class Config:
        from_attributes = True


class ScenarioOut(BaseModel):
    id: str
    slug: str
    title: str
    description: str
    context: str
    objective: str
    difficulty: str
    opening_line: str
    total_questions: int
    evaluation_criteria: list[str]
    character: CharacterOut

    class Config:
        from_attributes = True


# ---------- Emotion ----------

class EmotionOut(BaseModel):
    primary_emotion: str
    intensity: float
    anger: float
    frustration: float
    trust: float
    calmness: float


# ---------- Simulation lifecycle ----------

class StartSimulationRequest(BaseModel):
    scenario_id: str


class StartSimulationResponse(BaseModel):
    session_id: str
    scenario: ScenarioOut
    mode: str
    opening_line: str
    first_question: str
    emotion: EmotionOut
    question_index: int
    total_questions: int


class RespondRequest(BaseModel):
    user_response: str = Field(..., min_length=1)


class RespondResponse(BaseModel):
    is_relevant: bool
    relevance_reason: str
    detected_user_emotion: str
    empathy_score: int
    communication_score: int
    active_listening_score: int
    deescalation_score: int
    character_response: str
    next_question: Optional[str] = None
    emotion: EmotionOut
    should_continue: bool
    question_index: int
    total_questions: int
    mode: str


class TranscriptMessage(BaseModel):
    sender: str
    message: str
    emotion: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class EmotionHistoryPoint(BaseModel):
    message_index: int
    primary_emotion: str
    intensity: float
    anger: float
    frustration: float
    trust: float
    calmness: float


class EvaluationOut(BaseModel):
    empathy_score: int
    communication_score: int
    active_listening_score: int
    emotional_awareness_score: int
    conflict_resolution_score: int
    overall_score: int
    strengths: list[str]
    weaknesses: list[str]
    feedback: str

    class Config:
        from_attributes = True


class SessionResultsResponse(BaseModel):
    session_id: str
    scenario_title: str
    status: str
    mode: str
    transcript: list[TranscriptMessage]
    emotion_journey: list[EmotionHistoryPoint]
    evaluation: Optional[EvaluationOut]


class SessionStateResponse(BaseModel):
    session_id: str
    scenario: ScenarioOut
    status: str
    mode: str
    current_question: Optional[str]
    question_index: int
    total_questions: int
    emotion: EmotionOut
    transcript: list[TranscriptMessage]


# ---------- Internal LLM structured output contract ----------

class LLMAnalysis(BaseModel):
    """Schema the LLM is asked to return as JSON. Validated before use;
    invalid/partial output triggers a fallback (see llm_service)."""
    is_relevant: bool = True
    relevance_reason: str = ""
    detected_user_emotion: str = "neutral"
    empathy_score: int = 5
    communication_score: int = 5
    active_listening_score: int = 5
    deescalation_score: int = 5
    character_emotion: dict = Field(default_factory=dict)  # primary, intensity, trust
    character_response: str = ""
    next_question: str = ""
    should_continue: bool = True
