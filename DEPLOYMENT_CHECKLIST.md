# 🚀 Production Deployment Checklist

**Use this checklist before deploying to production on Railway.**

---

## ✅ Pre-Deployment (Do Once)

### Repository Setup
- [ ] All code committed and pushed to `main` branch
- [ ] `.env.railway.example` is present and documented
- [ ] `railway.toml` exists with correct build/start commands
- [ ] `.gitignore` excludes `.env.local`, `dist/`, `node_modules/`, `.env`
- [ ] `pnpm-lock.yaml` is committed (not `.pnpm-lock.yaml.bak`)
- [ ] No secrets in code or committed `.env` files

### Code Quality
- [ ] Run `pnpm run typecheck` — all TypeScript errors resolved
- [ ] Run `pnpm run build` locally — build succeeds
- [ ] No `console.log()` or debugging code in production builds
- [ ] Review API routes for security issues (auth, input validation)
- [ ] Check database schema (migrations won't break existing data)

### Documentation
- [ ] `README.md` updated with current tech stack
- [ ] `RAILWAY_DEPLOY.md` reviewed and accurate
- [ ] `ARCHITECTURE.md` reflects current system
- [ ] Post-deployment verification steps documented

---

## 🔧 Railway Setup (Do This Week)

### 1. Create Railway Project
- [ ] Go to **railway.app**
- [ ] Click **"New Project"** → **"Deploy from GitHub repo"**
- [ ] Authenticate GitHub account
- [ ] Select repo: **`nashmashkenya/virtual-system`**
- [ ] Railway auto-detects `railway.toml`

### 2. Add PostgreSQL Database
- [ ] Inside Railway project: **"+ New"** → **"Database"** → **"Add PostgreSQL"**
- [ ] Railway generates `DATABASE_URL` automatically
- [ ] Keep default settings (PostgreSQL 16+)

### 3. Configure Environment Variables
Go to Railway → Your Service → **"Variables"** tab:

```
✅ Auto-provided by Railway (do NOT set):
  - PORT
  - DATABASE_URL

✅ Required — Set these:
  NODE_ENV=production
  CLERK_SECRET_KEY=sk_live_...          (from clerk.com)
  CLERK_PUBLISHABLE_KEY=pk_live_...     (from clerk.com)
  VITE_CLERK_PUBLISHABLE_KEY=pk_live_... (same as CLERK_PUBLISHABLE_KEY)
  SESSION_SECRET=<random-32-char-string>
  ADMIN_USERNAME=admin
  ADMIN_PASSWORD=<strong-random-password>
```

**How to generate SESSION_SECRET:**
```bash
# macOS/Linux
openssl rand -hex 32

# Windows
# Use an online generator: https://randomkeygen.com/
```

### 4. First Deployment
- [ ] Commit all environment variable setup
- [ ] Push to main branch: `git push origin main`
- [ ] Watch Railway build (shows in Logs tab)
- [ ] Verify build completes without errors
- [ ] Note the Railway URL (e.g., `https://virtual-system.railway.app`)

---

## 🗄️ Database Setup (After First Deploy)

### Run Migrations
After first successful deploy:

1. Open Railway shell:
   - Go to your service → **"Logs"** tab
   - Click **"⚙️"** → **"Run"** (or use command palette)

2. Run the database migration command:
   ```bash
   pnpm --filter @workspace/db run push
   ```

3. Wait for completion (should show table creation logs)

4. Verify tables created:
   ```bash
   pnpm --filter @workspace/db run introspect
   # Should list: students, lessons, teacher_classes, etc.
   ```

---

## ✔️ Deployment Verification

### Health Checks
After deploy, verify these endpoints return 200 OK:

```bash
# Replace YOUR_DOMAIN with Railway URL
curl https://YOUR_DOMAIN/api/healthz
# Expected: {"status":"ok"}

curl https://YOUR_DOMAIN/api/public/stats
# Expected: {"studentCount":0,"teacherCount":0}

curl https://YOUR_DOMAIN/api/public/school
# Expected: {"name":"Your School","logo":null}

curl https://YOUR_DOMAIN/
# Expected: HTML (React SPA index.html)
```

### Frontend Verification
- [ ] Open https://YOUR_DOMAIN in browser
- [ ] Page loads (no 404 or blank screen)
- [ ] Console has no critical errors (check DevTools)
- [ ] Try logging in as student (if seed data exists)
- [ ] Try accessing teacher portal (should redirect to Clerk)

### API Verification
- [ ] Student login works: `curl -X POST https://YOUR_DOMAIN/api/students/login`
- [ ] Protected routes return 401 without auth
- [ ] Admin login works: `curl -X POST https://YOUR_DOMAIN/api/admin/login`

---

## 🔐 Security Checklist

### Secrets & Configuration
- [ ] `SESSION_SECRET` is random (32+ chars, not predictable)
- [ ] `ADMIN_PASSWORD` is strong (12+ chars, mixed case, numbers, symbols)
- [ ] No secrets logged (check `NODE_ENV=production`)
- [ ] Clerk keys are `sk_live_*` and `pk_live_*` (production, not test)
- [ ] `DATABASE_URL` not exposed in logs

### HTTPS & Transport
- [ ] Railway auto-provides HTTPS (green lock in browser)
- [ ] All API calls go over HTTPS (no mixed-content warnings)
- [ ] Cookies have `Secure` flag (HttpOnly + SameSite)

### Authentication
- [ ] Student/admin sessions expire properly (test after 30 days)
- [ ] Clerk OAuth redirects to correct domain
- [ ] Protected routes return 401 for unauthorized requests
- [ ] CSRF protection enabled (SameSite=Strict cookies)

### Data Protection
- [ ] Database has backups enabled (Railway → Postgres → Backups)
- [ ] Database credentials not in code
- [ ] Admin panel password not default/weak

---

## 📊 Monitoring Setup (Recommended)

### Logging
- [ ] CloudWatch logs accessible (Railway provides)
- [ ] JSON structured logs (via Pino) for debugging
- [ ] Error tracking enabled (Sentry when configured)

### Alerts
- [ ] Set up notification channel (Railway → Alerts → Email/Slack)
- [ ] Alert on deployment failures
- [ ] Alert on health check failures

### Metrics (Future)
- [ ] CPU/Memory usage monitored
- [ ] Database query performance tracked
- [ ] API response times logged

---

## 📝 Post-Deployment Documentation

### Update These Files
- [ ] Document production domain in team wiki/README
- [ ] Add admin login credentials to secure storage (1Password, etc.)
- [ ] Document how to scale if needed
- [ ] Document rollback procedure (revert to previous Railway deploy)

### Create Runbook
Document answers to:
- [ ] How to check if service is healthy?
- [ ] How to view logs?
- [ ] How to restart the service?
- [ ] How to scale database?
- [ ] How to update environment variables?
- [ ] How to rollback a deployment?

---

## 🚨 Incident Response

### If Deployment Fails
1. Check build logs: Railway → Logs tab
2. Common issues:
   - `Cannot find module` → `pnpm-lock.yaml` outdated
   - `DATABASE_URL not set` → Check Railway Variables
   - Port conflicts → Check other services on PORT
3. Fix code locally, commit, push (Railway auto-redeploys)

### If Service Goes Down
1. Check health endpoint: `curl https://YOUR_DOMAIN/api/healthz`
2. Check logs: Railway dashboard → Logs tab
3. Common causes:
   - Database connection lost → Check DATABASE_URL
   - Out of memory → Scale up instance
   - Code crash → Check error logs
4. Restart service: Railway → Service → Menu → "Restart"

### Rollback Procedure
1. Go to Railway → Deployments tab
2. Find the previous successful deployment
3. Click the deployment → "Rollback"
4. Wait for re-deployment (2-5 minutes)

---

## ✨ Post-Launch Improvements

### Week 1
- [ ] Monitor error rates and performance
- [ ] Collect user feedback from first users
- [ ] Fix any critical bugs discovered

### Week 2-4
- [ ] Add GitHub Actions CI/CD (auto-test on push)
- [ ] Add E2E tests (Playwright)
- [ ] Set up error tracking (Sentry)

### Month 2+
- [ ] Add Redis for caching
- [ ] Implement WebSocket for real-time features
- [ ] Set up database backups & PITR recovery

---

## 📋 Sign-Off

**Production Deployment Sign-Off**

- [ ] All checklist items completed
- [ ] Code reviewed and tested locally
- [ ] Database migrated successfully
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Team notified

**Deployed by**: ________________________  
**Date**: ________________________  
**Production Domain**: ________________________  
**Notes**: 

```
[Add any notes about the deployment here]
```

---

## 🆘 Need Help?

- **Build errors**: See [RAILWAY_DEPLOY.md#common-issues--fixes](./RAILWAY_DEPLOY.md#common-issues--fixes)
- **Architecture questions**: See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Local dev setup**: See [README.md#quick-start](./README.md#quick-start)
- **Database schema**: See [RAILWAY_DEPLOY.md#apply-the-database-schema](./RAILWAY_DEPLOY.md#apply-the-database-schema)

**Always test changes locally before deploying to production!**

