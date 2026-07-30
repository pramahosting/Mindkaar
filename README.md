# Mind Gym

A personalized mental-wellness mini-game platform: registration/login, a
profile intake, Groq-powered scenario + question generation, an interactive
scenario reveal with reflection questions, a progressive difficulty
mini-game, a final score → mental-status readout, and a separate **Run
Simulation** mode where you have a real spoken conversation with an AI
character whose emotional state reacts to you in real time.

## Quick start (Windows)

Double-click `app.cmd` at the project root. It will:
1. Check for Node.js and Python
2. Create `backend/.env` from the template (first run only)
3. Set up a Python venv and install backend dependencies
4. Install frontend dependencies
5. Launch both servers and open your browser to the frontend

**Before your first real session**, edit `backend/.env` and set `GROQ_API_KEY`
(get one free at https://console.groq.com/keys). Without it, registration,
login, and the game itself all work — but scenario identification, question
generation, the final mental-status read, and the Run Simulation feature's
character responses all fall back to a fixed deterministic result instead
of Groq.

## Manual setup (Mac/Linux/Windows)

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate       # venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env           # then edit .env and add your GROQ_API_KEY
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173.

## Architecture

```
frontend/   React (Vite, plain JS) + CSS - styled with the same
            navy/teal/Inter-Space-Grotesk palette as TalentIQ, on a
            fresh single-column layout (not TalentIQ's admin-sidebar layout).
backend/    FastAPI + SQLite (swap DATABASE_URL for your own Neon Postgres
            whenever you're ready - see backend/.env.example) + Groq.
```

### The flow, end to end

1. **Register / Login** - JWT-based auth, bcrypt-hashed passwords, SQLite by default.
   On login, a returning user who's already completed the assessment is sent
   straight to game selection for their most recent scenario - not asked to
   redo the intake form.
2. **Assessment** - a 24-question, 6-domain intake (4 items each for Stress,
   Anxiety, Conflict, Unrest, Burnout, Loneliness), styled after the general
   structure of established brief screeners (PSS-10, GAD-7, UCLA-3, Maslach
   Burnout Inventory themes - paraphrased, not copied). Answered on the
   familiar 4-point PHQ/GAD frequency scale.
3. **Scenario identification is deterministic** - each domain gets a 0-100%
   score computed directly from that domain's 4 answers (`app/assessment.py`),
   grounded in the person's own highest-scoring answer. No LLM call, so it
   can't fail from a Groq outage and gives the same result every time.
4. **Scenario reveal + reflection questions** - before picking a game, the
   person sees their identified scenario alongside a comparison of how it
   scored against the other candidate scenarios, then works through a short
   set of Groq-generated reflection questions (simplest first) with
   multiple-choice options, at their own pace.
5. **Game selection** - every scenario offers multiple games (currently both
   "Chopping Vegetables" and "Calm Breathing", each scenario-flavored); the
   person picks whichever they prefer. Each game tracks its own progress
   per user - playing one doesn't affect the other's level.
6. **Continue or restart** - a returning player sees "Continue at Level N"
   (their highest unlocked level) or "Restart from Level 1". Restarting
   lets you replay from the start; it never erases previously unlocked
   progress - your best level/score only ever goes up.
7. **The game** - centered game panel, progressive difficulty, 3 lives,
   plays until you fail.
8. **Score -> mental status** - sent to Groq (with a deterministic fallback)
   for a short, supportive status label + summary + coping tip. Every
   played session is stored, along with updated per-game progress.

### Run Simulation (voice roleplay)

A second, independent training mode reachable from the "Run Simulation" link
in the top nav once logged in - it doesn't require completing the intake
assessment first:

1. **Pick a scenario** - four built-in roleplay scenarios (Angry Customer,
   Workplace Conflict, Anxious Student, Sad Friend), each with its own AI
   character and starting emotional state.
2. **Have a real spoken conversation** - the character's opening line is
   read aloud (browser SpeechSynthesis); you reply with your microphone
   (browser Web Speech API transcribes it, and you can review/edit before
   submitting, or just type instead).
3. **Live analysis** - each response is analyzed by Groq (empathy,
   relevance, communication, active listening, de-escalation) and the
   character's anger/frustration/trust/calmness update and animate an SVG
   avatar accordingly; off-topic responses get flagged instead of silently
   accepted.
4. **Demo mode fallback** - if `GROQ_API_KEY` isn't set, or a Groq call
   fails or returns invalid JSON, that turn automatically falls back to a
   deterministic rule-based analysis, so the simulation always keeps
   working.
5. **Results** - after the configured number of exchanges you get overall +
   category scores, strengths/weaknesses, AI feedback, an emotion-journey
   chart, and the full transcript.

Simulation data lives in its own `sim_*`-prefixed tables (see below),
namespaced separately from the assessment/game tables above, and every
session is tied to the logged-in `mg_users` row - one person's sessions are
never visible to another.

### Data architecture (3NF)

```
mg_users
mg_scenario_categories   - catalog: stress/anxiety/conflict/unrest/burnout/loneliness
mg_assessment_items      - catalog: the 24 Likert questions, FK -> category
mg_games                 - catalog: the mini-game mechanics (chopping_vegetables, calm_breathing)
mg_scenario_games        - join table: which games are offered for which scenario + flavor text
mg_assessments           - one row per submitted intake form
mg_assessment_answers    - one row per Likert answer (1NF: no repeating groups/JSON blobs)
mg_scenario_scores       - one row per category per assessment (the computed relevance/reason)
mg_user_game_progress    - one row per (user, scenario_game): current_level, best_score, times_played
mg_game_sessions         - one row per played game (win or lose), full history preserved

sim_characters           - catalog: the roleplay AI characters (Alex, Jordan, Sam, Riley)
sim_scenarios            - catalog: the 4 roleplay scenarios, FK -> character
sim_sessions             - one row per simulation run, FK -> user (mg_users), scenario
sim_messages             - full conversation transcript (ai/user turns), FK -> session
sim_user_responses       - one row per user turn with its per-turn scores, FK -> session
sim_emotion_states       - one row per emotion snapshot over the conversation, FK -> session
sim_evaluation_results   - one row per completed session's final evaluation, FK -> session
```

Catalog tables are seeded idempotently on every startup from `app/assessment.py`
(the source of truth in code) - safe to re-run, matched by unique `code`.

No descriptive text is duplicated across tables: e.g. a scenario's label
lives only in `mg_scenario_categories`, referenced everywhere else by
`category_id`; an item's text lives only in `mg_assessment_items`. Fact
tables (`mg_assessment_answers`, `mg_scenario_scores`, `mg_game_sessions`)
store only IDs and the actual measured values, never denormalized copies
of catalog data - the standard shape for 3NF (no transitive dependencies).

### Extending to more games

Add a new game to `GAMES` and its per-scenario flavor text to
`SCENARIO_GAME_FLAVOR` in `backend/app/assessment.py`, add a matching
React component, and register its `mechanic` string in the
`GAME_COMPONENTS` map in `frontend/src/pages/Session.jsx`. It'll
automatically appear as a selectable option for whichever scenarios you
add it to, with its own independent per-user progress tracking.

### Moving to your own Neon Postgres

Set `DATABASE_URL` in `backend/.env` to your Neon connection string, e.g.:
```
DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST/dbname?sslmode=require
```
and add `psycopg2-binary` to `backend/requirements.txt`. No code changes
needed elsewhere — `backend/app/database.py` reads `DATABASE_URL` directly.

### Note on security

This build intentionally does **not** reuse the Neon credentials found
hardcoded in the TalentIQ package you provided — that's a live, shared
production database. Point `DATABASE_URL` at your own instance when you're
ready to move off SQLite.

## Deploying to Northflank (single Dockerfile)

The root `Dockerfile` builds the React frontend and the FastAPI backend into
one image - the backend serves the built frontend directly, so the whole
app runs behind a single port. This matches Northflank's one-container-
per-service model.

1. In Northflank, create a new service from this repo/zip, build type
   **Dockerfile**, Dockerfile path `Dockerfile` (repo root).
2. Set these environment variables in Northflank's dashboard (never commit
   real secrets into the image):
   - `GROQ_API_KEY` - your Groq key
   - `SECRET_KEY` - a long random string
   - `DATABASE_URL` - **use your Neon Postgres connection string here, not
     the SQLite default.** Northflank containers don't have persistent
     local disk across redeploys, so a SQLite file would be wiped every
     time you deploy. See `backend/.env.example` for the connection
     string format (or use the separate `PG_HOST`/`PG_USER`/`PG_PASSWORD`/
     etc. fields instead if your password has special characters).
   - `ALLOWED_ORIGINS` - can be left as-is; same-origin requests in this
     deployment shape don't trigger CORS anyway.
3. Northflank injects `PORT` automatically; the container's `CMD` already
   reads `$PORT` (defaulting to 8000 for local `docker run` testing), so
   no extra configuration is needed there - just make sure Northflank's
   port mapping points at whatever `$PORT` it assigns.
4. Health check path: `/health`.

### Testing the image locally before deploying

```bash
docker build -t mindgym .
docker run -p 8000:8000 \
  -e GROQ_API_KEY=your-key \
  -e SECRET_KEY=some-long-random-string \
  -e DATABASE_URL=postgresql+psycopg2://user:pass@host/db?sslmode=require \
  mindgym
```
Then open http://localhost:8000 - both the frontend and API are served
from that one address.
