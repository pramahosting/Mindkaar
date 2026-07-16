# Mind Gym

A personalized mental-wellness mini-game platform: registration/login, a
profile intake, Groq-powered scenario + question generation, a progressive
difficulty mini-game, and a final score → mental-status readout.

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
generation, and the final mental-status read fall back to a fixed
deterministic result instead of Groq.

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
4. **Game selection** - every scenario offers multiple games (currently both
   "Chopping Vegetables" and "Calm Breathing", each scenario-flavored); the
   person picks whichever they prefer. Each game tracks its own progress
   per user - playing one doesn't affect the other's level.
5. **Continue or restart** - a returning player sees "Continue at Level N"
   (their highest unlocked level) or "Restart from Level 1". Restarting
   lets you replay from the start; it never erases previously unlocked
   progress - your best level/score only ever goes up.
6. **The game** - centered game panel, progressive difficulty, 3 lives,
   plays until you fail.
7. **Score -> mental status** - sent to Groq (with a deterministic fallback)
   for a short, supportive status label + summary + coping tip. Every
   played session is stored, along with updated per-game progress.

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
