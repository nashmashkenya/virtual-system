# ElimuPawa — Virtual Classroom SaaS

**A modern, production-ready virtual classroom platform for Kenyan schools.**

🚀 **Live Demo**: https://virtual-system.vercel.app  
📖 **Documentation**: See [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) for deployment instructions  
🏗️ **Architecture**: See [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 🎯 Features

- **Student Portal**: Live classrooms, chat, polls, quizzes, payment integration
- **Teacher Dashboard**: Class management, attendance tracking, session control
- **Admin Panel**: User/content management, school settings
- **Real-time Communication**: WebSocket-based chat and notifications
- **Mobile-first**: Responsive design optimized for all devices
- **Dark Mode**: Full dark/light theme support
- **Authentication**: Clerk (teachers), custom cookie-based (students/admin)
- **Role-based Access Control**: Strict permission enforcement

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Runtime** | Node.js | 24.x |
| **Package Manager** | pnpm | 10.x |
| **Language** | TypeScript | 5.9+ |
| **Frontend** | React 19 + Vite | Latest |
| **Backend** | Express 5 | Latest |
| **Database** | PostgreSQL | 16+ |
| **ORM** | Drizzle ORM | 0.45+ |
| **Styling** | Tailwind CSS v4 | Latest |
| **Auth** | Clerk + Custom | - |
| **Deploy** | Railway | - |

---

## 📦 Monorepo Structure

```
virtual-system/
├── artifacts/
│   ├── elimu-pawa/              # React + Vite frontend
│   │   ├── src/
│   │   │   ├── lib/api.ts       # API client (all /api/* routes)
│   │   │   ├── lib/types.ts     # Shared TypeScript types
│   │   │   └── ...
│   │   └── vite.config.ts
│   ├── api-server/              # Express 5 backend
│   │   ├── src/
│   │   │   ├── app.ts           # Express app + static serving
│   │   │   ├── index.ts         # Server entry point
│   │   │   └── routes/          # API routes
│   │   └── build.mjs            # esbuild configuration
│   └── api-zod/                 # Shared Zod schemas
├── lib/
│   ├── db/                      # Drizzle ORM + schema
│   │   └── src/schema/index.ts  # Database tables
│   └── integrations/            # External service integrations
├── scripts/                     # Utility scripts
├── pnpm-workspace.yaml          # Workspace config
├── railway.toml                 # Railway deployment config
├── RAILWAY_DEPLOY.md            # Deployment guide
└── ARCHITECTURE.md              # Technical architecture

```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 24+** (check with `node --version`)
- **pnpm 10+** (install with `npm install -g pnpm`)
- **PostgreSQL 16+** (or use Docker)

### Local Development

```bash
# 1. Install dependencies
pnpm install --frozen-lockfile

# 2. Set up environment variables
cp .env.railway.example .env.local

# 3. Start PostgreSQL (Docker)
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16-alpine

# 4. Run database migrations
pnpm --filter @workspace/db run push

# 5. Start development servers
pnpm run dev

# Frontend: http://localhost:5173
# Backend:  http://localhost:5000
```

### Build for Production

```bash
# Build frontend + backend
pnpm run build

# Preview production build locally
pnpm run start
```

---

## 📋 Environment Variables

Create `.env.local` for development. For production, see [.env.railway.example](./.env.railway.example):

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/elimupawa

# Clerk Authentication (optional for local dev)
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Session Security (generate random 32+ char string)
SESSION_SECRET=your_random_secret_here

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure_password_here

# Node environment
NODE_ENV=development
```

---

## 🔐 Authentication

### For Teachers
- Powered by **Clerk** (OAuth/email-based)
- Sign up at teacher portal → authenticate with Clerk

### For Students
- **Custom cookie-based auth** (`student_token`)
- Sign in with admission number + parent phone number digit
- Admin can manage student accounts at `/admin`

### For Admins
- **Custom cookie-based auth** (`admin_token`)
- Access admin panel at `/admin/login`

---

## 📊 Database Schema

| Table | Purpose |
|-------|---------|
| `students` | Student accounts (admission_no, name, class_level) |
| `student_sessions` | HttpOnly cookie tokens for persistent auth |
| `teacher_classes` | Classes created by teachers (linked to Clerk teacher_id) |
| `lessons` | Scheduled lessons within a class |
| `lesson_students` | Join table (which students are in which lessons) |
| `admin_class_levels` | Master list of class levels (Form 1, Form 2, etc.) |
| `admin_subjects` | Master list of subjects |
| `admin_terms` | School calendar/terms |
| `admin_sessions` | Admin authentication sessions |
| `school_settings` | School name, logo, branding |

---

## 🧪 Testing

```bash
# Run all type checks
pnpm run typecheck

# Run tests (when added)
pnpm run test

# Run E2E tests (when added)
pnpm run test:e2e
```

---

## 🚢 Deployment

### Quick Deploy to Railway

1. **Create Railway Project**
   ```bash
   # Push this repo to GitHub
   git push origin main
   
   # Go to railway.app → New Project → Deploy from GitHub
   # Select: nashmashkenya/virtual-system
   ```

2. **Add PostgreSQL Database**
   - In Railway project: `+ New` → `Database` → `Add PostgreSQL`
   - Railway auto-injects `DATABASE_URL`

3. **Set Environment Variables**
   - See [.env.railway.example](./.env.railway.example)
   - Add all required variables in Railway dashboard

4. **Deploy & Verify**
   ```bash
   # After first deploy, run in Railway shell:
   pnpm --filter @workspace/db run push
   
   # Check health endpoints:
   curl https://your-railway-domain.railway.app/api/healthz
   ```

**For detailed instructions**, see:
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) — Step-by-step pre-deployment checklist
- [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) — Complete Railway deployment guide

---

## 🏥 Health Checks

| Endpoint | Purpose |
|----------|---------|
| `GET /api/healthz` | Simple health check (returns `{"status":"ok"}`) |
| `GET /api/public/stats` | Public stats (student/teacher counts) |
| `GET /api/public/school` | Public school info (name, logo) |
| `GET /` | React app (SPA routing) |

---

## 📚 API Routes

All routes relative to `/api`:

### Public Routes
- `GET /healthz` — Health check
- `GET /public/stats` — School stats
- `GET /public/school` — School info

### Student Routes
- `POST /students/register` — Sign up
- `POST /students/login` — Sign in
- `GET /students/me` — Current student profile
- `GET /students/:id/lessons` — Student's enrolled lessons

### Teacher Routes
- `GET /teachers/me` — Current teacher profile (requires Clerk auth)
- `POST /teachers/classes` — Create a class
- `GET /teachers/classes` — List teacher's classes

### Admin Routes
- `POST /admin/login` — Admin sign in
- `GET /admin/users` — List all users
- `PUT /admin/school` — Update school settings

---

## 🛡️ Security

- **HTTPS Only**: Enable in production
- **CORS**: Configured to origin
- **CSRF Protection**: Cookie-based auth with SameSite=Strict
- **XSS Protection**: React's built-in escaping + CSP headers
- **SQL Injection**: Protected via Drizzle ORM
- **Supply Chain Security**: `pnpm-workspace.yaml` enforces 1-day minimum release age

---

## 📞 Support & Issues

- **Report Bugs**: GitHub Issues
- **Documentation**: 
  - [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) — Pre-deployment checklist
  - [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) — Deployment guide
  - [ARCHITECTURE.md](./ARCHITECTURE.md) — Technical details
- **Deployment Help**: See [Troubleshooting](./RAILWAY_DEPLOY.md#common-issues--fixes)

---

## 📄 License

MIT

---

## 👥 Contributors

- **nashmashkenya** — Project Lead

---

**Ready to deploy?** Follow the steps:
1. Review [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) ✅
2. Connect to Railway via [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) 🚀
3. Start building with [ARCHITECTURE.md](./ARCHITECTURE.md) 🏗️
