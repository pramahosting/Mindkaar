from datetime import datetime

from sqlalchemy.orm import Session

from app.config import settings
from app.models.models import (
    SimulationSession, ConversationMessage, UserResponse, EmotionState, EvaluationResult, Scenario
)
from app.services import llm_service, emotion_service, evaluation_service, scenario_service


def start_session(db: Session, scenario: Scenario) -> SimulationSession:
    character = scenario.character

    session = SimulationSession(
        scenario_id=scenario.id,
        status="in_progress",
        mode=settings.llm_provider,
        current_question=scenario.opening_line,
        question_index=0,
    )
    db.add(session)
    db.flush()

    opening_msg = ConversationMessage(
        session_id=session.id,
        sender="ai",
        message=scenario.opening_line,
        emotion=character.initial_emotion.get("primary"),
    )
    db.add(opening_msg)

    emotion = character.initial_emotion
    emotion_row = EmotionState(
        session_id=session.id,
        message_index=0,
        primary_emotion=emotion.get("primary", "neutral"),
        intensity=emotion.get("intensity", 0.5),
        anger=emotion.get("anger", 0.5),
        frustration=emotion.get("frustration", 0.5),
        trust=emotion.get("trust", 0.5),
        calmness=emotion.get("calmness", 0.5),
    )
    db.add(emotion_row)

    db.commit()
    db.refresh(session)
    return session


def _latest_emotion_dict(session: SimulationSession) -> dict:
    if not session.emotion_states:
        return {"primary_emotion": "neutral", "intensity": 0.5, "anger": 0.5,
                "frustration": 0.5, "trust": 0.5, "calmness": 0.5}
    e = session.emotion_states[-1]
    return {
        "primary_emotion": e.primary_emotion, "intensity": e.intensity,
        "anger": e.anger, "frustration": e.frustration,
        "trust": e.trust, "calmness": e.calmness,
    }


async def process_turn(db: Session, session: SimulationSession, user_text: str):
    scenario = session.scenario
    character = scenario.character

    history = [
        {"sender": m.sender, "message": m.message}
        for m in session.messages
    ]
    current_emotion = _latest_emotion_dict(session)

    analysis, mode_used = await llm_service.analyze_and_respond(
        scenario=scenario_service.scenario_to_dict(scenario),
        character=scenario_service.character_to_dict(character),
        history=history,
        current_emotion=current_emotion,
        current_question=session.current_question or scenario.opening_line,
        user_response=user_text,
        question_index=session.question_index,
        total_questions=scenario.total_questions,
    )

    # persist user message + response record
    db.add(ConversationMessage(session_id=session.id, sender="user", message=user_text))

    user_response_row = UserResponse(
        session_id=session.id,
        question=session.current_question or scenario.opening_line,
        response=user_text,
        is_relevant=analysis.is_relevant,
        empathy_score=analysis.empathy_score,
        communication_score=analysis.communication_score,
        active_listening_score=analysis.active_listening_score,
        deescalation_score=analysis.deescalation_score,
    )
    db.add(user_response_row)

    # update emotion engine
    new_emotion = emotion_service.next_emotion_state(current_emotion, analysis.character_emotion or {})
    db.flush()  # ensure message ordering / count is current for message_index
    emotion_row = EmotionState(
        session_id=session.id,
        message_index=len(session.messages),
        primary_emotion=new_emotion["primary_emotion"],
        intensity=new_emotion["intensity"],
        anger=new_emotion["anger"],
        frustration=new_emotion["frustration"],
        trust=new_emotion["trust"],
        calmness=new_emotion["calmness"],
    )
    db.add(emotion_row)

    # ai turn
    db.add(ConversationMessage(
        session_id=session.id, sender="ai", message=analysis.character_response,
        emotion=new_emotion["primary_emotion"],
    ))

    should_continue = analysis.should_continue and (session.question_index + 1) < scenario.total_questions

    if should_continue:
        session.question_index += 1
        session.current_question = analysis.next_question or scenario.opening_line
    else:
        session.status = "completed"
        session.completed_at = datetime.utcnow()
        session.current_question = None

    session.mode = mode_used
    db.commit()
    db.refresh(session)

    return analysis, new_emotion, should_continue, mode_used


def complete_session(db: Session, session: SimulationSession):
    if session.evaluation:
        return session.evaluation

    scores = evaluation_service.build_evaluation(session.responses, session.emotion_states)
    evaluation = EvaluationResult(session_id=session.id, **scores)
    db.add(evaluation)
    session.status = "completed"
    if not session.completed_at:
        session.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(evaluation)
    return evaluation
