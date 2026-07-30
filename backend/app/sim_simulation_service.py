from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.sim_models import (
    SimSession, SimMessage, SimUserResponse, SimEmotionState, SimEvaluationResult, SimScenario
)
from app import sim_llm_service, sim_emotion_service, sim_evaluation_service, sim_scenario_service


def start_session(db: Session, scenario: SimScenario, user_id: Optional[int] = None) -> SimSession:
    character = scenario.character

    session = SimSession(
        scenario_id=scenario.id,
        user_id=user_id,
        status="in_progress",
        mode="demo",
        current_question=scenario.opening_line,
        question_index=0,
    )
    db.add(session)
    db.flush()

    opening_msg = SimMessage(
        session_id=session.id,
        sender="ai",
        message=scenario.opening_line,
        emotion=character.initial_emotion.get("primary"),
    )
    db.add(opening_msg)

    emotion = character.initial_emotion
    emotion_row = SimEmotionState(
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


def _latest_emotion_dict(session: SimSession) -> dict:
    if not session.emotion_states:
        return {"primary_emotion": "neutral", "intensity": 0.5, "anger": 0.5,
                "frustration": 0.5, "trust": 0.5, "calmness": 0.5}
    e = session.emotion_states[-1]
    return {
        "primary_emotion": e.primary_emotion, "intensity": e.intensity,
        "anger": e.anger, "frustration": e.frustration,
        "trust": e.trust, "calmness": e.calmness,
    }


async def process_turn(db: Session, session: SimSession, user_text: str):
    scenario = session.scenario
    character = scenario.character

    history = [
        {"sender": m.sender, "message": m.message}
        for m in session.messages
    ]
    current_emotion = _latest_emotion_dict(session)

    analysis, mode_used = await sim_llm_service.analyze_and_respond(
        scenario=sim_scenario_service.scenario_to_dict(scenario),
        character=sim_scenario_service.character_to_dict(character),
        history=history,
        current_emotion=current_emotion,
        current_question=session.current_question or scenario.opening_line,
        user_response=user_text,
        question_index=session.question_index,
        total_questions=scenario.total_questions,
    )

    db.add(SimMessage(session_id=session.id, sender="user", message=user_text))

    user_response_row = SimUserResponse(
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

    new_emotion = sim_emotion_service.next_emotion_state(current_emotion, analysis.character_emotion or {})
    db.flush()  # ensure message ordering / count is current for message_index
    emotion_row = SimEmotionState(
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

    db.add(SimMessage(
        session_id=session.id, sender="ai", message=analysis.character_response,
        emotion=new_emotion["primary_emotion"],
    ))

    custom_questions = scenario.custom_questions  # set only for personalized scenarios

    if custom_questions:
        # These are the person's own reflection questions - they're meant
        # to all be covered during the conversation, so we walk through
        # them in order regardless of what the LLM/demo fallback would
        # have asked next.
        should_continue = (session.question_index + 1) < len(custom_questions)
    else:
        should_continue = analysis.should_continue and (session.question_index + 1) < scenario.total_questions

    if should_continue:
        session.question_index += 1
        if custom_questions:
            session.current_question = custom_questions[session.question_index]
        else:
            session.current_question = analysis.next_question or scenario.opening_line

        # Persist the next question as its own message too - otherwise the
        # transcript/results only ever show the character's reactive line
        # and silently drop the actual question being asked each turn.
        db.add(SimMessage(
            session_id=session.id, sender="ai", message=session.current_question,
            emotion=new_emotion["primary_emotion"],
        ))
    else:
        session.status = "completed"
        session.completed_at = datetime.utcnow()
        session.current_question = None

    session.mode = mode_used
    db.commit()
    db.refresh(session)

    return analysis, new_emotion, should_continue, mode_used


def complete_session(db: Session, session: SimSession):
    if session.evaluation:
        return session.evaluation

    scores = sim_evaluation_service.build_evaluation(session.responses, session.emotion_states)
    evaluation = SimEvaluationResult(session_id=session.id, **scores)
    db.add(evaluation)
    session.status = "completed"
    if not session.completed_at:
        session.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(evaluation)
    return evaluation
