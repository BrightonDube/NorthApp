# North AI Coaching Backend

Python (FastAPI) backend for the North AI Coaching app. Hosted on Railway.

## Stack

- **FastAPI** — async web framework
- **Groq** — LLM provider for chat, reasoning, STT, and TTS
- **Voyage AI** — embeddings provider for pgvector memory retrieval
- **Supabase** — PostgreSQL + pgvector + Auth
- **APScheduler** — background tasks (inactivity checks, reminders, calendar sync)
- **OneSignal** — push notifications
- **Tavily** — web search for resource curator

## Setup

### 1. Install dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in all values in .env
```

### 3. Run database migration

Apply the migration in Supabase SQL editor or via CLI:

```bash
# Via Supabase CLI
supabase db push

# Or manually run:
# supabase/migrations/20260220000000_add_memories_goals_xp.sql
```

If you already have existing memories from non-Voyage providers, backfill embeddings:

```bash
python scripts/backfill_memory_embeddings.py
```

### 4. Run locally

```bash
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 5. Run tests

```bash
pytest tests/
```

## Deployment (Railway)

1. Push `backend/` to your Railway project (or connect the monorepo)
2. Set all environment variables in Railway dashboard
3. Railway auto-deploys on push using `railway.toml`

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1/chat/stream` | SSE streaming chat (Groq multimodal + RAG) |
| `POST` | `/v1/chat/voice` | Whisper STT — audio → text |
| `POST` | `/v1/chat/voice/response` | Groq TTS — text → MP3 |
| `GET` | `/v1/goals` | List goals with subtasks |
| `POST` | `/v1/goals` | Create goal |
| `PATCH` | `/v1/goals/{id}` | Update goal/progress |
| `POST` | `/v1/goals/{id}/subtasks` | Add subtask |
| `PATCH` | `/v1/subtasks/{id}` | Update subtask status |
| `GET` | `/v1/memories` | List extracted memories |
| `DELETE` | `/v1/memories/{id}` | Delete a memory |
| `GET` | `/v1/settings` | Get user settings (firmness level) |
| `PATCH` | `/v1/settings` | Update firmness level (0-10) |
| `POST` | `/v1/agent/plan` | AI goal decomposition |
| `POST` | `/v1/agent/panic` | Crisis support mode (SSE) |
| `POST` | `/v1/agent/curate` | Resource finder (Tavily) |
| `GET` | `/v1/integrations/calendar/auth` | Google Calendar OAuth URL |
| `GET` | `/v1/integrations/calendar/events` | Today's calendar events |
| `GET` | `/health` | Health check |

## Architecture

```
chatStore.ts (React Native)
    │
    ▼ Bearer JWT (Supabase token)
FastAPI (Railway)
    ├── JWT validated via SUPABASE_JWT_SECRET
    ├── Groq models — streaming chat + reasoning
    ├── Voyage embeddings → pgvector RAG
    ├── Memory extraction (background task)
    └── APScheduler
        ├── Hourly: inactivity re-engagement
        ├── Daily 9AM: goal reminders
        └── Daily 7AM: calendar sync
```

## Background Scheduler Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| `inactivity_check` | Every hour | Re-engage users inactive >24h via OneSignal |
| `morning_reminders` | Daily 9AM UTC | Personalized goal reminder notifications |
| `calendar_sync` | Daily 7AM UTC | Fetch & cache Google Calendar events as user context |
