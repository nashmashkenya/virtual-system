# ElimuPawa Classroom

A virtual classroom SaaS for teachers and students — live video, chat, polls, quizzes, whiteboard, and payments in one focused screen.

## Run & Operate

- `pnpm --filter @workspace/elimu-pawa run dev` — run the frontend (Vite + React)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: Vite + React, wouter (routing), zustand (state), lucide-react, TailwindCSS v4
- API: Express 5
- Auth: cookie-based session via `credentials: "include"`; all API calls fall back to mock data when backend is unavailable

## Where things live

- `artifacts/elimu-pawa/` — Vite + React frontend artifact
- `artifacts/elimu-pawa/src/lib/api.ts` — full API layer with mock fallbacks
- `artifacts/elimu-pawa/src/lib/types.ts` — all shared TypeScript types
- `artifacts/elimu-pawa/src/lib/mock-data.ts` — fallback mock data for every endpoint
- `artifacts/elimu-pawa/src/lib/store.ts` — zustand store (theme, notifications, paid usernames)
- `artifacts/elimu-pawa/src/index.css` — ElimuPawa design tokens (CSS custom properties)
- `artifacts/elimu-pawa/src/components/classroom/` — LiveClassroom, WhiteboardStage
- `artifacts/elimu-pawa/src/components/teacher/` — TeacherDashboard (large, fully interactive)
- `artifacts/elimu-pawa/src/components/payments/` — PaymentOverview

## Architecture decisions

- Migrated from Next.js/Django to Vite + React + Express in the Replit pnpm workspace
- `next/link` → wouter `<Link>`, `useRouter().push` → `useLocation()[1]`, `process.env.NEXT_PUBLIC_*` → `import.meta.env.VITE_*`
- Server components converted to `useEffect + fetch` client components; all `"use client"` directives removed
- Cookie-based auth; no JWT token passed as props — `credentials: "include"` on every fetch
- `fetchWithFallback()` in api.ts returns mock data silently when backend is down so the UI always renders

## Product

- **Landing** `/` — hero with inline sign-in card and demo user cards
- **Login** `/login` — demo user quick-select or username/password form
- **Register** `/register` — account creation with email verification hint
- **Student classroom** `/student` — live video, chat, polls, quizzes, raise-hand
- **Student home** `/student/home` — upcoming sessions, progress tracker
- **Teacher room** `/teacher` — full classroom controls: video, breakouts, whiteboard, roster, programs, YouTube integration
- **Settings** `/settings` — dark mode toggle, profile summary
- **Payments** `/payments` — M-Pesa payment overview

## Gotchas

- CSS `@import url(...)` must precede `@import "tailwindcss"` in `index.css` (PostCSS ordering rule)
- `submitStudentPollVote` / `submitStudentQuizAnswer` / `submitStudentJoinRequest` do NOT include `poll_id` / `quiz_id` / `room_code` in the request body — the backend infers them from the session cookie
- `getStudentDashboard()` and `getTeacherDashboard()` take no token argument in the Vite version (cookie auth)
