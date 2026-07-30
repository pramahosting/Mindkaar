from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth_utils import get_current_user
from app.database import get_db
from app.models import User
from app.sim_models import SimScenario, SimSession
from app import sim_schemas as schemas
from app import sim_scenario_service as scenario_service
from app import sim_simulation_service as simulation_service

router = APIRouter(prefix="/api/simulation", tags=["simulation"])


@router.get("/scenarios", response_model=list[schemas.SimScenarioOut])
def get_scenarios(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return scenario_service.list_scenarios(db, user_id=user.id)


@router.post("/personalize", response_model=schemas.SimScenarioOut)
def personalize_scenario(payload: schemas.PersonalizeSimRequest, db: Session = Depends(get_db),
                          user: User = Depends(get_current_user)):
    try:
        scenario = scenario_service.upsert_personal_scenario(
            db, user_id=user.id, category=payload.category,
            category_label=payload.category_label, questions=payload.questions,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return scenario


@router.get("/scenarios/{scenario_id}", response_model=schemas.SimScenarioOut)
def get_scenario(scenario_id: str, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    scenario = scenario_service.get_scenario(db, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario


def _emotion_out(session: SimSession) -> schemas.SimEmotionOut:
    if not session.emotion_states:
        return schemas.SimEmotionOut(primary_emotion="neutral", intensity=0.5, anger=0.5,
                                      frustration=0.5, trust=0.5, calmness=0.5)
    e = session.emotion_states[-1]
    return schemas.SimEmotionOut(primary_emotion=e.primary_emotion, intensity=e.intensity,
                                  anger=e.anger, frustration=e.frustration,
                                  trust=e.trust, calmness=e.calmness)


@router.post("/start", response_model=schemas.StartSimResponse)
def start_simulation(payload: schemas.StartSimRequest, db: Session = Depends(get_db),
                      user: User = Depends(get_current_user)):
    scenario = db.query(SimScenario).filter(SimScenario.id == payload.scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    session = simulation_service.start_session(db, scenario, user_id=user.id)

    return schemas.StartSimResponse(
        session_id=session.id,
        scenario=scenario,
        mode=session.mode,
        opening_line=scenario.opening_line,
        first_question=scenario.opening_line,
        emotion=_emotion_out(session),
        question_index=session.question_index,
        total_questions=scenario.total_questions,
    )


def _get_session_or_404(db: Session, session_id: str, user: User) -> SimSession:
    session = (
        db.query(SimSession)
        .filter(SimSession.id == session_id, SimSession.user_id == user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Simulation session not found")
    return session


@router.get("/{session_id}", response_model=schemas.SimSessionStateResponse)
def get_session(session_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = _get_session_or_404(db, session_id, user)
    return schemas.SimSessionStateResponse(
        session_id=session.id,
        scenario=session.scenario,
        status=session.status,
        mode=session.mode,
        current_question=session.current_question,
        question_index=session.question_index,
        total_questions=session.scenario.total_questions,
        emotion=_emotion_out(session),
        transcript=session.messages,
    )


@router.post("/{session_id}/respond", response_model=schemas.SimRespondResponse)
async def respond(session_id: str, payload: schemas.SimRespondRequest, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    session = _get_session_or_404(db, session_id, user)

    if session.status == "completed":
        raise HTTPException(status_code=400, detail="This simulation has already ended.")

    if not payload.user_response or not payload.user_response.strip():
        raise HTTPException(status_code=400, detail="Response cannot be empty.")

    analysis, new_emotion, should_continue, mode_used = await simulation_service.process_turn(
        db, session, payload.user_response.strip()
    )

    return schemas.SimRespondResponse(
        is_relevant=analysis.is_relevant,
        relevance_reason=analysis.relevance_reason,
        detected_user_emotion=analysis.detected_user_emotion,
        empathy_score=analysis.empathy_score,
        communication_score=analysis.communication_score,
        active_listening_score=analysis.active_listening_score,
        deescalation_score=analysis.deescalation_score,
        character_response=analysis.character_response,
        next_question=session.current_question if should_continue else None,
        emotion=schemas.SimEmotionOut(**new_emotion),
        should_continue=should_continue,
        question_index=session.question_index,
        total_questions=session.scenario.total_questions,
        mode=mode_used,
    )


@router.post("/{session_id}/complete")
def complete_simulation(session_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = _get_session_or_404(db, session_id, user)
    evaluation = simulation_service.complete_session(db, session)
    return {"status": "completed", "session_id": session.id, "overall_score": evaluation.overall_score}


@router.get("/{session_id}/results", response_model=schemas.SimResultsResponse)
def get_results(session_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = _get_session_or_404(db, session_id, user)

    if not session.evaluation:
        simulation_service.complete_session(db, session)
        db.refresh(session)

    emotion_journey = [
        schemas.SimEmotionHistoryPoint(
            message_index=e.message_index,
            primary_emotion=e.primary_emotion,
            intensity=e.intensity,
            anger=e.anger,
            frustration=e.frustration,
            trust=e.trust,
            calmness=e.calmness,
        )
        for e in session.emotion_states
    ]

    return schemas.SimResultsResponse(
        session_id=session.id,
        scenario_title=session.scenario.title,
        status=session.status,
        mode=session.mode,
        transcript=session.messages,
        emotion_journey=emotion_journey,
        evaluation=session.evaluation,
    )
