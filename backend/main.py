from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from uuid import uuid4

import sqlite3
import json

from chroma_service import (
    load_scenarios,
    match_scenario
)

from assessment_service import (
    generate_assessment
)

app = FastAPI(title="Mental Gym API")

# --------------------------------
# CORS
# --------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------
# DATABASE
# --------------------------------

conn = sqlite3.connect(
    "mentalgym.db",
    check_same_thread=False
)

cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS sessions(
    session_id TEXT PRIMARY KEY,
    scenario_id TEXT,
    scenario_output TEXT,
    questions TEXT,
    answers TEXT,
    assessment TEXT,
    completed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

conn.commit()

# --------------------------------
# STARTUP
# --------------------------------

@app.on_event("startup")
def startup():
    load_scenarios()

# --------------------------------
# REQUEST MODELS
# --------------------------------

class StartSessionRequest(BaseModel):
    description: str


class AnswerRequest(BaseModel):
    answer: str

# --------------------------------
# ROOT
# --------------------------------

@app.get("/")
def home():
    return {
        "message": "Mental Gym Backend Running"
    }

# --------------------------------
# START SESSION
# --------------------------------

@app.post("/session/start")
def start_session(req: StartSessionRequest):

    session_id = str(uuid4())

    scenario = match_scenario(req.description)

    questions = [
        q.strip()
        for q in scenario["questions"].split(";")
    ]

    cursor.execute(
        """
        INSERT INTO sessions
        (
            session_id,
            scenario_id,
            scenario_output,
            questions,
            answers
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            session_id,
            scenario["scenario_id"],
            scenario["output"],
            json.dumps(questions),
            json.dumps([])
        )
    )

    conn.commit()

    return {
        "session_id": session_id,
        "matched_scenario": scenario["scenario_id"],
        "question_number": 1,
        "total_questions": len(questions),
        "question": questions[0]
    }

# --------------------------------
# ANSWER QUESTION
# --------------------------------

@app.post("/session/{session_id}/answer")
def answer_question(
    session_id: str,
    req: AnswerRequest
):

    cursor.execute(
        """
        SELECT questions, answers
        FROM sessions
        WHERE session_id=?
        """,
        (session_id,)
    )

    row = cursor.fetchone()

    if not row:
        return {
            "error": "Session not found"
        }

    questions = json.loads(row[0])
    answers = json.loads(row[1])

    answers.append(req.answer)

    cursor.execute(
        """
        UPDATE sessions
        SET answers=?
        WHERE session_id=?
        """,
        (
            json.dumps(answers),
            session_id
        )
    )

    conn.commit()

    current_question_index = len(answers)

    if current_question_index < len(questions):

        return {
            "question_number":
                current_question_index + 1,
            "total_questions":
                len(questions),
            "question":
                questions[current_question_index]
        }

    cursor.execute(
        """
        UPDATE sessions
        SET completed=1
        WHERE session_id=?
        """,
        (session_id,)
    )

    conn.commit()

    return {
        "completed": True,
        "message": "All questions completed. Assessment ready.",
        "next_step": f"/assessment/{session_id}"
    }

# --------------------------------
# FINAL ASSESSMENT
# --------------------------------

@app.get("/assessment/{session_id}")
def get_assessment(session_id: str):

    cursor.execute(
        """
        SELECT
            scenario_output,
            answers,
            assessment
        FROM sessions
        WHERE session_id=?
        """,
        (session_id,)
    )

    row = cursor.fetchone()

    if not row:
        return {
            "error": "Session not found"
        }

    scenario_output = row[0]
    answers = json.loads(row[1])

    existing_assessment = row[2]

    if existing_assessment:

        return {
            "session_id": session_id,
            "assessment": existing_assessment
        }

    assessment = generate_assessment(
        scenario_output,
        answers
    )

    cursor.execute(
        """
        UPDATE sessions
        SET assessment=?,
            completed=1
        WHERE session_id=?
        """,
        (
            assessment,
            session_id
        )
    )

    conn.commit()

    return {
        "session_id": session_id,
        "assessment": assessment
    }

# --------------------------------
# SESSION STATUS
# --------------------------------

@app.get("/session/{session_id}")
def get_session_status(session_id: str):

    cursor.execute(
        """
        SELECT
            scenario_id,
            questions,
            answers,
            completed,
            created_at
        FROM sessions
        WHERE session_id=?
        """,
        (session_id,)
    )

    row = cursor.fetchone()

    if not row:
        return {
            "error": "Session not found"
        }

    questions = json.loads(row[1])
    answers = json.loads(row[2])

    return {
        "session_id": session_id,
        "scenario_id": row[0],
        "questions_answered": len(answers),
        "total_questions": len(questions),
        "completed": bool(row[3]),
        "created_at": row[4]
    }

# --------------------------------
# TEST SCENARIO MATCHING
# --------------------------------

@app.get("/scenarios/test")
def test_match():

    result = match_scenario(
        "I feel exhausted after work every day and have no motivation"
    )

    return result

# --------------------------------
# LIST ALL SCENARIOS
# --------------------------------

@app.get("/scenarios")
def list_scenarios():

    from chroma_service import collection

    return collection.get()