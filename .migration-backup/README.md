# ElimuPawa Classroom

ElimuPawa Classroom is a virtual classroom SaaS scaffold with:

- `frontend/`: Next.js 16 + Tailwind CSS + Zustand
- `backend/`: Django + DRF + Channels
- `docker-compose.yml`: PostgreSQL, Redis, frontend, and backend services

## Product surfaces

- Marketing landing page
- Demo login and role-aware session flow
- Self-service registration and password reset flow
- Student classroom with live stream, payment gate, chat, polls, and quiz UI
- Teacher command center with session creation, session CRUD management, attendance, and raise-hand management
- Payment and settings screens
- Dark mode and mobile-first responsive shell

## Run locally

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Optional env:

```bash
cp .env.example .env.local
```

### Backend

```bash
cd backend
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo_data
python manage.py runserver
```

By default, local backend development now uses SQLite in `backend/db.sqlite3`. If `POSTGRES_HOST` is set, Django switches to PostgreSQL automatically.

The frontend reads the Django API from `NEXT_PUBLIC_EDUSTREAM_API_BASE_URL` and falls back to built-in demo data if the API is unavailable.

### Demo accounts

- Student: `aisha.student` / `password123`
- Student: `brian.student` / `password123`
- Teacher: `grace.teacher` / `password123`

After starting the frontend, open `/login` to choose an account and start a role-aware demo session.

You can also open `/register` to create a new account, `/forgot-password` to request a reset, and `/reset-password` through the generated local reset link.

The frontend now stores backend-issued JWT access and refresh tokens in HttpOnly cookies and proxies sensitive browser actions through Next.js route handlers. Django enforces role-based permissions server-side for student and teacher APIs, and refreshes can rotate without exposing tokens to browser JavaScript.

In local development with `DEBUG=True`, password reset requests return a preview reset URL so the flow can be tested without an email provider.

### Full stack with Docker

```bash
docker compose up
```

## Operations runbook

### Monitoring endpoints

- Basic health: `GET /health/`
- Detailed health: `GET /health/detailed/`
- Ops metrics (protected): `GET /api/ops/metrics/` with `X-Ops-Key: <OPS_METRICS_KEY>`

### Failure alert routing

- CI and perf workflows send failure notifications to `CI_ALERT_WEBHOOK_URL` (GitHub secret) when configured.
- Suggested destination: Slack/Teams incoming webhook channel for on-call visibility.

### Incident quick actions

- Redis degraded/down:
  - Confirm `REDIS_URL` is reachable from backend runtime.
  - Verify cache and channel layer connectivity in `/health/detailed/`.
  - If outage is prolonged, reduce realtime fanout load and restart backend workers after Redis recovery.
- Database latency spike:
  - Check `/health/detailed/` database latency and infrastructure DB metrics.
  - Scale DB or reduce heavy background/admin queries.
  - Temporarily lower non-critical write pressure (e.g., load tests).
- Chat throttle saturation:
  - Review `chat_slow_mode` and active throttle rates.
  - For classes under heavy traffic, communicate slow mode expectations to students.
  - Adjust thresholds carefully; avoid removing throttles entirely.
- Metrics endpoint unauthorized/disabled:
  - Verify `OPS_METRICS_KEY` is set in backend environment.
  - Ensure clients send `X-Ops-Key` header (or query key when explicitly allowed).

### Performance gate defaults

- Perf soak workflow runs daily and on demand.
- Default thresholds:
  - Dashboard success rate: `>= 99%`
  - Chat success rate: `>= 85%` (accounts for intentional throttling)
