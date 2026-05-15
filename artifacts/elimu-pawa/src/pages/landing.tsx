import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  MessageSquare,
  Video,
} from "lucide-react";
import { LoginPanel } from "@/components/auth/login-panel";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getDemoUsers } from "@/lib/api";
import { demoUsersFallback } from "@/lib/mock-data";
import type { DemoUser } from "@/lib/types";

const benefits = [
  { icon: Video,        label: "Live video lessons"       },
  { icon: MessageSquare, label: "Real-time class chat"   },
  { icon: BookOpen,     label: "Materials & quizzes"      },
];

export function LandingPage() {
  const [users, setUsers] = useState<DemoUser[]>(demoUsersFallback);

  useEffect(() => {
    getDemoUsers().then(setUsers).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen flex-col overflow-hidden lg:flex-row">

      {/* ── Left brand panel ── */}
      <div className="relative flex flex-col overflow-hidden bg-[#0f172a] px-6 py-6 lg:w-[46%] lg:justify-between lg:px-14 lg:py-14">

        {/* Layered background glow */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[100px]" />
          <div className="absolute -bottom-24 -right-24 h-[400px] w-[400px] rounded-full bg-violet-600/20 blur-[90px]" />
          <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[80px]" />
        </div>

        {/* Subtle grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden
        />

        {/* Logo — always visible */}
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" aria-hidden>
              <path d="M12 3L2 8l10 5 10-5-10-5z" fill="currentColor" opacity=".9" />
              <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M2 16l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeOpacity=".5" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Elimu<span className="text-blue-400">Pawa</span>
          </span>
        </div>

        {/* Hero copy — hidden on small screens to keep form visible */}
        <div className="relative my-8 hidden space-y-7 lg:my-0 lg:flex lg:flex-1 lg:flex-col lg:justify-center">
          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-blue-300">
              Virtual classroom platform
            </p>
            <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.08] tracking-tight text-white">
              Your classroom,{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                online.
              </span>
            </h1>
            <p className="max-w-sm text-base leading-relaxed text-slate-400">
              Everything teachers and students need — live video, chat, materials, and assessments — in one simple screen.
            </p>
          </div>

          <ul className="space-y-3">
            {benefits.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-blue-400 ring-1 ring-white/10">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-sm font-medium text-slate-300">{label}</span>
              </li>
            ))}
          </ul>

          <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
            {["Free to join", "No downloads", "Works on any device"].map((t) => (
              <li key={t} className="flex items-center gap-1.5 text-xs text-slate-500">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/80" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer — desktop only */}
        <p className="relative hidden text-[11px] text-slate-600 lg:block">
          © {new Date().getFullYear()} ElimuPawa. Built for learners everywhere.
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="relative flex flex-1 flex-col bg-[var(--background)]">

        {/* Nav strip */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 sm:px-10">
          <p className="text-sm text-[var(--subtext)]">
            New here?{" "}
            <Link href="/register" className="font-semibold text-[var(--primary)] transition hover:underline">
              Create an account
            </Link>
          </p>
          <ThemeToggle />
        </div>

        {/* Centred login card */}
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-sm space-y-5">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">Welcome back</h2>
              <p className="text-sm text-[var(--subtext)]">
                Select a demo account or sign in with your credentials.
              </p>
            </div>

            <LoginPanel users={users} embedded />

            <p className="text-center text-xs text-[var(--subtext)]">
              Forgot your details?{" "}
              <Link href="/forgot-password" className="text-[var(--primary)] transition hover:underline">
                Reset password
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
