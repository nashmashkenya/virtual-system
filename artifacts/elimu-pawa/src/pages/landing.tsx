import { useEffect, useState } from "react";
import { Link } from "wouter";
import { BookOpen, CheckCircle2, MessageSquare, Video } from "lucide-react";
import { LoginPanel } from "@/components/auth/login-panel";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getDemoUsers } from "@/lib/api";
import { demoUsersFallback } from "@/lib/mock-data";
import type { DemoUser } from "@/lib/types";

const benefits = [
  { icon: Video,         label: "Live HD video lessons"   },
  { icon: MessageSquare, label: "Real-time class chat"    },
  { icon: BookOpen,      label: "Materials & quizzes"     },
];

const perks = ["Free to join", "No downloads", "Works on any device"];

export function LandingPage() {
  const [users, setUsers] = useState<DemoUser[]>(demoUsersFallback);

  useEffect(() => {
    getDemoUsers().then(setUsers).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen flex-col overflow-hidden lg:flex-row">

      {/* ══ LEFT — brand panel ══ */}
      <div
        className="relative flex flex-col overflow-hidden px-6 py-6 lg:w-[45%] lg:justify-between lg:px-14 lg:py-14"
        style={{
          background: "linear-gradient(135deg, #0a0f1e 0%, #0d1f3c 40%, #0e2240 70%, #0c1a35 100%)",
        }}
      >
        {/* Decorative glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-cyan-500/20 blur-[90px]" />
          <div className="absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-emerald-500/15 blur-[80px]" />
          <div className="absolute right-1/4 top-1/2 h-48 w-48 rounded-full bg-blue-400/10 blur-[60px]" />
        </div>

        {/* Mesh grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(6,182,212,1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,1) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
          aria-hidden
        />

        {/* Diagonal accent stripe */}
        <div
          className="pointer-events-none absolute -right-10 top-0 h-full w-32 opacity-10"
          style={{
            background: "linear-gradient(180deg, transparent 0%, rgba(6,182,212,0.6) 50%, transparent 100%)",
            transform: "skewX(-8deg)",
          }}
          aria-hidden
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-lg"
            style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" aria-hidden>
              <path d="M12 3L2 8l10 5 10-5-10-5z" fill="currentColor" opacity=".95" />
              <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M2 16l10 5 10-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeOpacity=".45" />
            </svg>
          </div>
          <span className="text-[18px] font-bold tracking-tight text-white">
            Elimu<span className="text-cyan-400">Pawa</span>
          </span>
        </div>

        {/* Hero copy — desktop only */}
        <div className="relative my-10 hidden space-y-8 lg:my-0 lg:flex lg:flex-1 lg:flex-col lg:justify-center">
          {/* Badge */}
          <span
            className="inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300"
            style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.22)" }}
          >
            Virtual classroom platform
          </span>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-[clamp(2.2rem,3.5vw,3.2rem)] font-black leading-[1.06] tracking-tight text-white">
              Your classroom,
            </h1>
            <h1
              className="text-[clamp(2.2rem,3.5vw,3.2rem)] font-black leading-[1.06] tracking-tight"
              style={{ background: "linear-gradient(90deg, #06b6d4, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              online.
            </h1>
          </div>

          <p className="max-w-[340px] text-[15px] leading-relaxed text-slate-400">
            Everything teachers and students need — live video, chat, materials, and assessments — in one focused screen.
          </p>

          {/* Feature pills */}
          <ul className="space-y-3">
            {benefits.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3.5">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-cyan-400"
                  style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.18)" }}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-sm font-medium text-slate-300">{label}</span>
              </li>
            ))}
          </ul>

          {/* Trust strip */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
            {perks.map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/80" aria-hidden />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative hidden text-[11px] text-slate-700 lg:block">
          © {new Date().getFullYear()} ElimuPawa · Built for learners everywhere
        </p>
      </div>

      {/* ══ RIGHT — form panel ══ */}
      <div className="relative flex flex-1 flex-col overflow-hidden">

        {/* Mesh gradient background */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {/* Base warm off-white */}
          <div className="absolute inset-0 bg-[#f0f4ff] dark:bg-[#0b1120]" />

          {/* Colour blobs */}
          <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-cyan-400/15 blur-[90px] dark:bg-cyan-500/12" />
          <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-indigo-400/15 blur-[80px] dark:bg-indigo-500/12" />
          <div className="absolute left-1/2 top-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-blue-300/10 blur-[70px] dark:bg-blue-400/10" />

          {/* Dot pattern */}
          <div
            className="absolute inset-0 opacity-[0.06] dark:opacity-[0.08]"
            style={{
              backgroundImage: "radial-gradient(circle, rgb(79 70 229) 1px, transparent 1px)",
              backgroundSize: "26px 26px",
            }}
          />

          {/* Edge fades */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#f0f4ff] to-transparent dark:from-[#0b1120]" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#f0f4ff] to-transparent dark:from-[#0b1120]" />
        </div>

        {/* Top nav */}
        <div
          className="relative flex items-center justify-between px-6 py-4 sm:px-10"
          style={{
            background: "rgba(240,244,255,0.7)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(99,102,241,0.1)",
          }}
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            New here?{" "}
            <Link href="/register" className="font-semibold text-indigo-600 transition hover:underline dark:text-indigo-400">
              Create a free account
            </Link>
          </p>
          <ThemeToggle />
        </div>

        {/* Form area */}
        <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-[360px] space-y-5">

            {/* Heading */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-400">Sign in</p>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Welcome back 👋</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Pick a demo account or enter your own credentials below.
              </p>
            </div>

            {/* Login card with glass effect */}
            <div
              className="overflow-hidden rounded-3xl"
              style={{
                background: "rgba(255,255,255,0.82)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.9)",
                boxShadow: "0 8px 40px rgba(79,70,229,0.10), 0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <div className="p-1">
                <LoginPanel users={users} embedded />
              </div>
            </div>

            <p className="text-center text-xs text-slate-400">
              Trouble signing in?{" "}
              <Link href="/forgot-password" className="font-semibold text-indigo-600 transition hover:underline dark:text-indigo-400">
                Reset your password
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
