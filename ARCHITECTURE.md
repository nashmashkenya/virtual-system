# Architecture Overview

**ElimuPawa** is a modern, full-stack TypeScript monorepo with a clear separation of concerns between frontend, backend, and shared libraries.

---

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                    (React + Vite SPA)                        │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Railway (Single Node.js Process)                │
├─────────────────────────────────────────────────────────────┤
│  Express 5 Server                                            │
│  ├── /api/*           → REST API Routes                      │
│  ├── /clerk/*         → Clerk OAuth Proxy                    │
│  └── /*               → React SPA Static Files (SPA routing)  │
└─────────────────────────┬────────────────────────────────────┘
                          │ SQL
                          ▼
┌─────────────────────────────────────────────────────────────┐
│        PostgreSQL 16+  (Railway Postgres Add-on)             │
│  ├── students          ├── lessons                           │
│  ├── teacher_classes   ├── admin_*                           │
│  └── school_settings   └── ...                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Monorepo Organization

### Workspaces (via `pnpm-workspace.yaml`)

#### **artifacts/elimu-pawa** (Frontend)
- **Technology**: React 19 + Vite + TailwindCSS v4
- **Purpose**: Student/teacher web UI
- **Build Output**: Static files → `dist/public/`
- **Runs**: In Vite dev server (dev) or served by Express (prod)
- **Key Files**:
  - `src/lib/api.ts` — All `/api/*` calls (relative paths, no CORS needed)
  - `src/lib/types.ts` — Shared TypeScript types
  - `vite.config.ts` — Vite build configuration

#### **artifacts/api-server** (Backend)
- **Technology**: Express 5 + TypeScript
- **Purpose**: REST API + static file serving (production)
- **Build Output**: `dist/index.mjs` (esbuild bundle)
- **Runs**: Single Node.js process on Railway
- **Key Files**:
  - `src/app.ts` — Express app setup + static middleware
  - `src/index.ts` — Server entry (reads `PORT` env var)
  - `src/routes/` — API route handlers

#### **artifacts/api-zod** (Shared Schemas)
- **Technology**: Zod validation library
- **Purpose**: Request/response validation schemas
- **Used By**: Both frontend (client-side) and backend (server-side)

#### **lib/db** (Database)
- **Technology**: Drizzle ORM
- **Purpose**: Database schema + migrations
- **Key Files**:
  - `src/schema/index.ts` — All table definitions
  - `drizzle.config.ts` — Drizzle CLI config
- **Commands**:
  - `pnpm --filter @workspace/db run push` — Apply schema changes

#### **lib/integrations** (External Services)
- Integrations with third-party services (Clerk, payment providers, etc.)

#### **scripts** (Utilities)
- Helper scripts for development & deployment

---

## 🔄 Data Flow

### Development Mode

```
Browser (localhost:5173)
    │
    ├─ Frontend: Vite dev server (hot reload)
    │  └─ Requests → http://localhost:3000/api/* (via proxy)
    │
    └─ Backend: Express on localhost:3000
       └─ Routes → PostgreSQL
```

### Production Mode

```
Browser (railway.app/your-domain)
    │
    └─ Express 5 on Railway
       ├─ API routes (/api/*)
       │  └─ PostgreSQL queries
       │
       └─ Static files (/* except /api/*)
          └─ React SPA (client-side routing)
```

---

## 🔐 Authentication Flows

### Student Authentication

```
1. Student visits /login
2. Enters: admission_no + parent_phone_digit
3. Backend validates in DB (students table)
4. Backend creates HttpOnly cookie (student_token)
5. Frontend stores token (sent automatically in requests)
6. Access granted to student routes
```

### Teacher Authentication

```
1. Teacher visits /login or sign-up
2. Redirected to Clerk OAuth
3. Clerk returns JWT (verified by Express middleware)
4. No cookie needed (JWT in Authorization header)
5. Access granted to teacher routes
```

### Admin Authentication

```
1. Admin visits /admin/login
2. Enters: admin_username + admin_password
3. Backend validates against env vars
4. Backend creates HttpOnly cookie (admin_token)
5. Access granted to admin panel (/admin/*)
```

---

## 📡 API Architecture

### Route Organization

```
/api
├── /healthz                  # Health checks
├── /public/*                 # Unauthenticated public endpoints
│   ├── /stats               # School stats (student/teacher counts)
│   └── /school              # School info (name, logo)
├── /students/*              # Student-only routes
│   ├── POST /register       # Create student account
│   ├── POST /login          # Student sign-in
│   ├── GET /me              # Current student profile
│   └── GET /:id/lessons     # Student's lessons
├── /teachers/*              # Teacher-only routes (Clerk auth)
│   ├── GET /me              # Current teacher profile
│   ├── POST /classes        # Create class
│   └── GET /classes         # List teacher's classes
├── /lessons/*               # Lesson management
│   ├── POST /               # Create lesson
│   ├── GET /:id             # Get lesson details
│   └── PUT /:id/status      # Update lesson status
├── /admin/*                 # Admin-only routes
│   ├── POST /login          # Admin sign-in
│   ├── GET /users           # List all users
│   ├── PUT /users/:id       # Update user
│   └── PUT /school          # Update school settings
└── /clerk/*                 # Clerk webhook/proxy (internal)
```

### Request/Response Pattern

```typescript
// All API calls use relative paths (no CORS needed)
// Frontend: src/lib/api.ts
const response = await fetch('/api/students/me');
const data = await response.json();

// Validation: artifacts/api-zod/src/schemas.ts
export const StudentSchema = z.object({
  id: z.string().uuid(),
  admissionNo: z.string(),
  name: z.string(),
  classLevel: z.string(),
  parentPhone: z.string(),
  createdAt: z.date(),
});

// Backend: artifacts/api-server/src/routes/students.ts
app.get('/students/me', requireStudentAuth, (req, res) => {
  const student = req.student; // Set by middleware
  res.json(student);
});
```

---

## 💾 Database Design

### Core Tables

#### `students`
```sql
id         UUID PRIMARY KEY
admission_no  STRING UNIQUE
name       STRING
class_level STRING (FK: admin_class_levels.id)
parent_phone STRING
created_at TIMESTAMP
```

#### `student_sessions`
```sql
id         UUID PRIMARY KEY
student_id UUID (FK: students.id)
token      STRING (signed JWT/random)
expires_at TIMESTAMP
```

#### `teacher_classes`
```sql
id         UUID PRIMARY KEY
teacher_id STRING (Clerk user ID)
subject    STRING (FK: admin_subjects.id)
name       STRING
created_at TIMESTAMP
```

#### `lessons`
```sql
id         UUID PRIMARY KEY
class_id   UUID (FK: teacher_classes.id)
status     ENUM (scheduled, live, completed)
starts_at  TIMESTAMP
ends_at    TIMESTAMP
created_at TIMESTAMP
```

#### `lesson_students` (Join Table)
```sql
id         UUID PRIMARY KEY
lesson_id  UUID (FK: lessons.id)
student_id UUID (FK: students.id)
approved   BOOLEAN (teacher approval for entry)
```

#### `admin_*` (Master Data)
```sql
admin_class_levels → id, name (Form 1, Form 2, ...)
admin_subjects     → id, name (Math, English, ...)
admin_terms        → id, name, start_date, end_date
admin_sessions     → id, admin_id, token, expires_at
school_settings    → id, name, logo_url, contact_email
```

---

## 🔨 Build Pipeline

### Development Build

```bash
pnpm run dev
```

1. **Frontend**: Vite starts dev server on `localhost:5173`
   - Hot module replacement (HMR)
   - TypeScript compilation on-the-fly

2. **Backend**: Express starts on `localhost:3000`
   - Watches for changes (via nodemon or similar)
   - Recompiles TypeScript on save

### Production Build

```bash
pnpm run build
```

**Step 1**: Install dependencies
```bash
pnpm install --frozen-lockfile
```

**Step 2**: Build frontend
```bash
pnpm --filter @workspace/elimu-pawa run build
→ Outputs: artifacts/elimu-pawa/dist/public/
```

**Step 3**: Build backend (with esbuild)
```bash
pnpm --filter @workspace/api-server run build
→ Outputs: artifacts/api-server/dist/index.mjs
```

**Step 4**: Start server
```bash
NODE_ENV=production pnpm --filter @workspace/api-server run start
→ Express listens on PORT (Railway injects)
→ Serves static files + API routes from single URL
```

---

## 🚀 Deployment Flow (Railway)

```
1. GitHub Push (main branch)
   ↓
2. Railway webhook triggered
   ↓
3. Clone repo + Install dependencies
   ↓
4. Build frontend + backend (see above)
   ↓
5. Start Express server (reads PORT + DATABASE_URL from Railway)
   ↓
6. Express health check (/api/healthz)
   ↓
7. Railway routes traffic → Express (one URL, one process)
   ↓
8. Frontend requests /api/* → Express routes
   ↓
9. Frontend requests /* (non-API) → React SPA (index.html)
```

---

## 🔄 CI/CD (When Added)

Recommended GitHub Actions workflow:

```yaml
name: CI/CD

on: [push, pull_request]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm run typecheck
  
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build

  deploy:
    runs-on: ubuntu-latest
    needs: [typecheck, build]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: git push origin main  # Railway auto-deploys
```

---

## 📊 Performance Considerations

### Frontend Optimization
- **Code Splitting**: Vite automatically chunks routes
- **Tree Shaking**: Unused code removed in production
- **Asset Hashing**: Cache-busted file names
- **Lazy Loading**: React.lazy() for route-based splitting

### Backend Optimization
- **Express Middleware**: Minimal, ordered by frequency
- **Database**: Indexes on frequently queried columns (admission_no, teacher_id)
- **Caching**: Can be added with Redis (future enhancement)
- **Logging**: Structured JSON logs via Pino

### Database Optimization
- **Connection Pooling**: Drizzle handles via Pool
- **Query Optimization**: Use indexes, avoid N+1 queries
- **Migrations**: Drizzle push is idempotent (safe to retry)

---

## 🔒 Security Architecture

### Frontend Security
- **XSS Prevention**: React escapes content by default
- **CSRF Protection**: SameSite=Strict cookies
- **Secrets**: Never store in React code (use `/api/` proxying)

### Backend Security
- **Authentication Middleware**: Protects routes
- **Authorization**: Role-based (student/teacher/admin)
- **Input Validation**: Zod schemas validate all requests
- **SQL Injection**: Drizzle ORM prevents via parameterized queries
- **CORS**: Configured to origin (same-domain in production)

### Data Security
- **HTTPS Only**: Enforced in production
- **Passwords**: Stored securely (Clerk handles teacher auth)
- **Session Tokens**: HttpOnly cookies, short expiration
- **Encryption**: TLS in transit, at-rest via database

---

## 📈 Scalability Path

### Phase 1 (Current)
- Single Railway process
- PostgreSQL on Railway
- CDN: Optional (Vercel, Cloudflare)

### Phase 2 (Medium Scale)
- Multiple Railway replicas (horizontal scaling)
- Redis cache layer
- Database read replicas
- WebSocket server (for real-time features)

### Phase 3 (Enterprise)
- Kubernetes (GKE, EKS)
- Microservices (separate API, auth, notifications services)
- Message queue (RabbitMQ, Kafka)
- Data warehouse (for analytics)

---

## 🛠️ Technology Rationale

| Component | Choice | Why |
|-----------|--------|-----|
| **Monorepo** | pnpm workspaces | Fast, strict, ideal for TypeScript projects |
| **Frontend** | React + Vite | Modern, performant, easy to extend |
| **Backend** | Express 5 | Lightweight, Node.js ecosystem, proven |
| **Language** | TypeScript | Type safety, better DX, fewer runtime bugs |
| **Database** | PostgreSQL | Reliable, feature-rich, managed on Railway |
| **ORM** | Drizzle | Type-safe, lightweight, modern alternative to Sequelize |
| **Auth** | Clerk + Custom | Clerk for teachers (OAuth), custom for students (simple) |
| **Deploy** | Railway | Simplest Git→Production workflow, integrated PostgreSQL |

---

## 📚 Further Reading

- [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) — Deployment instructions
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) — Pre-deployment checklist
- [README.md](./README.md) — Quick start guide
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Express 5 Guide](https://expressjs.com/)
- [Vite Guide](https://vitejs.dev/)
