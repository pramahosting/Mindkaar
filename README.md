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
2. **Profile** - age, mood, sleep, stress level, support system, goals.
3. **Scenario identification** - the profile is sent to Groq, which scores
   six mental-scenario categories (Stress, Anxiety, Conflict, Unrest,
   Burnout, Loneliness) by relevance; the highest becomes the active scenario.
4. **Ranked questions** - Groq generates reflective questions for that
   scenario; the backend sorts them by difficulty ascending (simplest first).
5. **Game selection** - each scenario maps to a mini-game
   (`backend/app/game_logic.py`); today that's "Chopping Vegetables" for
   every scenario, themed slightly differently per scenario. Add more
   entries to `GAME_CATALOG` to give other scenarios their own game.
6. **The game** - centered game panel, progressive difficulty (spawn rate,
   item lifespan, and decoy frequency all increase every 6 successful
   chops), 3 lives, plays until you fail.
7. **Score → mental status** - final score/level/accuracy go back to Groq
   (with a deterministic fallback if Groq is unavailable) for a short,
   supportive status label + summary + coping tip.

### Extending to more games

`GAME_CATALOG` in `backend/app/game_logic.py` maps a scenario id to a
`GameConfig` (id/title/description/mechanic). The frontend currently only
implements the `chopping_vegetables` mechanic
(`frontend/src/components/ChoppingGame.jsx`). To add a second game (e.g. a
breathing-paced game for anxiety), add a new component, and branch on
`gameConfig.mechanic` in `frontend/src/pages/Game.jsx`.

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
