# ElimuPawa — Railway Deployment Guide

## Project Overview

ElimuPawa is a virtual classroom SaaS for Kenyan schools. It is a **pnpm monorepo** with:
- A **React + Vite frontend** (`artifacts/elimu-pawa/`)
- An **Express 5 API server** (`artifacts/api-server/`)
- A **PostgreSQL database** managed by Drizzle ORM (`lib/db/`)

In production the Express server serves **both the API and the compiled frontend static files** from a single process on a single URL.

**GitHub repository:** `https://github.com/nashmashkenya/virtual-system`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 24 |
| Package manager | pnpm 10 |
| Language | TypeScript 5.9 |
| Frontend | React 18, Vite, TailwindCSS v4 |
| Backend | Express 5 |
| ORM | Drizzle ORM |
| Database | PostgreSQL 16 |
| Auth (teachers) | Clerk |
| Auth (students) | Custom cookie-based (`student_token`) |
| Auth (admin) | Custom cookie-based (`admin_token`) |

---

## Deployment Architecture

**Single Railway service** — one process handles everything:

```
Browser → Railway URL → Express server
                         ├── /api/*        → Express routes (REST API)
                         ├── /clerk/*      → Clerk proxy middleware
                         └── /*            → Serves React SPA static files
```

The frontend makes all API calls to relative paths (`/api/...`) so no CORS configuration is needed.

---

## Step-by-Step Deployment Instructions

### 1. Create a New Railway Project

- Go to **railway.app**
- Click **"New Project"** → **"Deploy from GitHub repo"**
- Connect your GitHub account
- Select repository: **`nashmashkenya/virtual-system`**
- Railway will detect `railway.toml` automatically — do not change build or start commands

### 2. Add a PostgreSQL Database

- Inside the project, click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
- Railway will automatically inject `DATABASE_URL` into the service environment
- No further database configuration is needed at this step

### 3. Set Environment Variables

Go to your service → **"Variables"** and add the following:

```
# Automatically provided by Railway — do NOT set manually
PORT                        (Railway injects this)
DATABASE_URL                (Railway injects this from the Postgres plugin)

# Node environment
NODE_ENV=production

# Clerk — get these from your Clerk dashboard at clerk.com
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...

# Session security — generate any random string of 32+ characters
SESSION_SECRET=replace_with_random_32_char_string

# Admin panel credentials — choose your own values
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_strong_admin_password
```

> **VITE_CLERK_PUBLISHABLE_KEY** must be set at build time because Vite embeds it into the
> compiled frontend bundle. Set it to the same value as `CLERK_PUBLISHABLE_KEY`.

### 4. Apply the Database Schema

After the first successful deploy, open a **Railway shell** (or use the "Run" tab) and run:

```bash
pnpm --filter @workspace/db run push
```

This creates all required tables using `drizzle-kit push`. The tables are:

| Table | Purpose |
|-------|---------|
| `students` | Student accounts (adm_no, name, class_level, parent_phone) |
| `student_sessions` | Httponly cookie tokens for student auth |
| `teacher_classes` | Subjects/classes created by teachers (via Clerk teacher_id) |
| `lessons` | Scheduled lessons linked to a class |
| `lesson_students` | Join table — which students are approved for which lesson |
| `admin_class_levels` | Admin-managed list of class levels (e.g. Form 1, Form 2) |
| `admin_subjects` | Admin-managed list of subjects |
| `admin_terms` | School term calendar |
| `admin_sessions` | Admin cookie auth sessions |
| `school_settings` | School name and logo |

### 5. Verify the Deployment

Once deployed, check these endpoints to confirm everything is working:

| Endpoint | Expected response |
|----------|------------------|
| `GET /api/healthz` | `{"status":"ok"}` |
| `GET /api/public/stats` | JSON with student/teacher counts |
| `GET /api/public/school` | JSON with school name and logo |
| `GET /` | Returns the React app HTML |

---

## Build & Start Commands (already in railway.toml)

```toml
[build]
builder = "nixpacks"
buildCommand = "pnpm install --frozen-lockfile && pnpm --filter @workspace/elimu-pawa run build && pnpm --filter @workspace/api-server run build"

[deploy]
startCommand = "NODE_ENV=production pnpm --filter @workspace/api-server run start"
healthcheckPath = "/api/healthz"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

The build does three things in order:
1. Installs all workspace dependencies
2. Builds the React frontend → outputs to `artifacts/elimu-pawa/dist/public/`
3. Bundles the Express API with esbuild → outputs to `artifacts/api-server/dist/index.mjs`

The Express server is configured to serve the frontend's `dist/public/` folder as static
files and falls back to `index.html` for all non-API routes (SPA routing).

---

## Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes (auto) | Port for Express to listen on — Railway injects this |
| `DATABASE_URL` | Yes (auto) | PostgreSQL connection string — Railway injects this |
| `NODE_ENV` | Yes | Must be `production` |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key (server-side) |
| `CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key (server-side middleware) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Same as above — embedded into frontend at build time |
| `SESSION_SECRET` | Yes | Secret for signing cookies — any 32+ char random string |
| `ADMIN_USERNAME` | Yes | Username for the admin panel at `/admin` |
| `ADMIN_PASSWORD` | Yes | Password for the admin panel |

---

## Monorepo Structure (relevant paths)

```
/
├── railway.toml                          ← Railway config (build + start)
├── pnpm-workspace.yaml                   ← Workspace definition
├── package.json                          ← Root scripts
├── artifacts/
│   ├── elimu-pawa/                       ← React + Vite frontend
│   │   ├── src/
│   │   │   ├── lib/api.ts                ← All API calls (uses /api/* relative paths)
│   │   │   ├── lib/types.ts              ← Shared TypeScript types
│   │   │   └── lib/mock-data.ts          ← Fallback data when API is down
│   │   └── dist/public/                  ← Built frontend (served by Express in prod)
│   └── api-server/                       ← Express 5 API
│       ├── src/
│       │   ├── app.ts                    ← Express app + static file serving
│       │   ├── index.ts                  ← Server entry (reads PORT from env)
│       │   └── routes/                   ← API route handlers
│       └── dist/index.mjs                ← Compiled API bundle (esbuild output)
└── lib/
    └── db/                               ← Drizzle ORM schema + client
        └── src/schema/index.ts           ← All table definitions
```

---

## Common Issues & Fixes

**Build fails with "Cannot find module"**
→ Make sure `pnpm install --frozen-lockfile` runs successfully. Check that `pnpm-lock.yaml` is committed to the repo.

**Frontend loads but API calls return 404**
→ Check that `NODE_ENV=production` is set. The static file serving only activates in production mode.

**Clerk auth errors on login**
→ Ensure `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, and `VITE_CLERK_PUBLISHABLE_KEY` are all set. The `VITE_` prefixed one is required at build time — if it was missing during the build, you must trigger a redeploy after adding it.

**Database errors on startup**
→ Run `pnpm --filter @workspace/db run push` to apply the schema. Check that `DATABASE_URL` is correctly set and the Postgres instance is accessible.

**Student login fails**
→ Students sign in with their admission number (adm_no) and the first digit of their parent's phone number. If no students exist, use the admin panel (`/admin`) to check or seed data.

**Admin panel inaccessible**
→ Confirm `ADMIN_USERNAME` and `ADMIN_PASSWORD` are set. The admin login is at `/admin/login`.
