import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  BookOpen,
  CheckCircle2,
  MessageSquare,
  Video,
  Users,
  BarChart2,
  PenTool,
  Smartphone,
  Star,
  Zap,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { LoginPanel } from "@/components/auth/login-panel";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getDemoUsers } from "@/lib/api";
import { demoUsersFallback } from "@/lib/mock-data";
import type { DemoUser } from "@/lib/types";

const features = [
  { icon: Video,        label: "Live HD Video",      desc: "Crystal-clear streaming with zero lag for up to 60 students." },
  { icon: MessageSquare,label: "Real-time Chat",     desc: "Class-wide and private messaging to keep every student engaged." },
  { icon: PenTool,      label: "Digital Whiteboard", desc: "Draw, annotate, and collaborate on a shared canvas in real time." },
  { icon: BarChart2,    label: "Polls & Quizzes",    desc: "Instant feedback — run a poll or quiz with results in seconds." },
  { icon: Users,        label: "Breakout Rooms",     desc: "Split students into small groups for focused group work." },
  { icon: BookOpen,     label: "Course Materials",   desc: "Upload notes, PDFs, and assignments in one organized library." },
];

const stats = [
  { value: "500+",  label: "Active students"   },
  { value: "50+",   label: "Verified teachers" },
  { value: "2,000+",label: "Classes delivered" },
  { value: "100%",  label: "Mobile-friendly"   },
];

const testimonials = [
  {
    name: "Grace Njeri",
    role: "Mathematics Teacher, Nairobi",
    quote: "ElimuPawa has transformed how I teach. I can share my screen, quiz students, and track progress — all in one place.",
    avatar: "GN",
    color: "from-cyan-500 to-blue-500",
  },
  {
    name: "Brian Otieno",
    role: "Form 4 Student, Kisumu",
    quote: "Joining class is so easy — just tap a link on my phone. The chat and polls make lessons actually fun.",
    avatar: "BO",
    color: "from-emerald-500 to-teal-500",
  },
];

const trustItems = [
  { icon: Smartphone, label: "Works on any phone or laptop" },
  { icon: Globe,      label: "Built for African classrooms" },
  { icon: ShieldCheck,label: "Secure & private sessions"   },
  { icon: Zap,        label: "No downloads required"       },
];

export function LandingPage() {
  const [users, setUsers] = useState<DemoUser[]>(demoUsersFallback);
  const signInRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDemoUsers().then(setUsers).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden lg:flex-row">

      {/* ══════════════════════════════════════════
          LEFT — full marketing panel
      ══════════════════════════════════════════ */}
      <div
        className="relative flex flex-col overflow-hidden lg:w-[58%] lg:overflow-y-auto"
        style={{ background: "linear-gradient(160deg, #060d1f 0%, #0b1a35 50%, #0d1e3a 100%)" }}
      >
        {/* Decorative glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -left-32 -top-20 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
          <div className="absolute -bottom-32 right-0 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[100px]" />
          <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/6 blur-[90px]" />
        </div>

        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(6,182,212,1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,1) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
          aria-hidden
        />

        <div className="relative flex flex-col px-7 py-8 lg:min-h-screen lg:px-14 lg:py-12">

          {/* ── Navbar ── */}
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-3">
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

            <div className="flex items-center gap-4">
              {/* Mobile sign-in scroll button */}
              <button
                onClick={() => signInRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20 lg:hidden"
              >
                Sign in
              </button>
              <div className="hidden lg:block"><ThemeToggle /></div>
            </div>
          </nav>

          {/* ── Hero ── */}
          <div className="mt-14 space-y-6 lg:mt-16">
            <span
              className="inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300"
              style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)" }}
            >
              <Zap className="h-3 w-3" aria-hidden />
              Virtual classroom platform
            </span>

            <h1 className="text-[clamp(2.4rem,5vw,3.6rem)] font-black leading-[1.04] tracking-tight text-white">
              The classroom
              <br />
              <span
                style={{ background: "linear-gradient(90deg, #06b6d4 0%, #34d399 60%, #a78bfa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                your students deserve.
              </span>
            </h1>

            <p className="max-w-[480px] text-[15px] leading-relaxed text-slate-400">
              Live video, real-time chat, quizzes, polls, a digital whiteboard, and M-Pesa payments
              — everything teachers and students need, in one focused screen built for Africa.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              {trustItems.map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-2 rounded-full border border-white/8 bg-white/5 px-3.5 py-1.5 text-[12px] font-medium text-slate-400">
                  <Icon className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ value, label }) => (
              <div
                key={label}
                className="rounded-2xl px-5 py-4"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <p className="text-[clamp(1.4rem,2.5vw,2rem)] font-black text-white">{value}</p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          {/* ── Features ── */}
          <div className="mt-14">
            <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600">Everything in one place</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {features.map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="group flex gap-4 rounded-2xl p-4 transition-colors"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-cyan-400 transition group-hover:scale-105"
                    style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.18)" }}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[13px] font-bold text-white">{label}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Testimonials ── */}
          <div className="mt-14 space-y-3">
            <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600">What our users say</p>
            {testimonials.map(({ name, role, quote, avatar, color }) => (
              <div
                key={name}
                className="rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="mb-3 flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                  ))}
                </div>
                <p className="text-[13px] leading-relaxed text-slate-300">"{quote}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold text-white ${color}`}>
                    {avatar}
                  </span>
                  <div>
                    <p className="text-[12px] font-semibold text-white">{name}</p>
                    <p className="text-[11px] text-slate-500">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Footer ── */}
          <p className="mt-14 pb-2 text-[11px] text-slate-700">
            © {new Date().getFullYear()} ElimuPawa · Built for learners everywhere
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          RIGHT — sign-in panel (sticky on desktop)
      ══════════════════════════════════════════ */}
      <div
        ref={signInRef}
        className="relative flex flex-1 flex-col overflow-hidden lg:sticky lg:top-0 lg:h-screen"
      >
        {/* Background */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-[#f0f4ff] dark:bg-[#080e1c]" />
          <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-cyan-400/15 blur-[100px] dark:bg-cyan-500/10" />
          <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-indigo-400/15 blur-[90px] dark:bg-indigo-500/10" />
          <div
            className="absolute inset-0 opacity-[0.05] dark:opacity-[0.07]"
            style={{
              backgroundImage: "radial-gradient(circle, rgb(79 70 229) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#f0f4ff] to-transparent dark:from-[#080e1c]" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#f0f4ff] to-transparent dark:from-[#080e1c]" />
        </div>

        {/* Top bar */}
        <div
          className="relative flex items-center justify-between px-6 py-4 sm:px-10"
          style={{ background: "rgba(240,244,255,0.7)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(99,102,241,0.1)" }}
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            New here?{" "}
            <Link href="/register" className="font-semibold text-indigo-600 transition hover:underline dark:text-indigo-400">
              Create a free account
            </Link>
          </p>
          <div className="hidden lg:block"><ThemeToggle /></div>
          <div className="lg:hidden"><ThemeToggle /></div>
        </div>

        {/* Sign-in area */}
        <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-[360px] space-y-5">
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-400">Sign in</p>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Welcome back 👋</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Pick a demo account or enter your own credentials.
              </p>
            </div>

            <div
              className="overflow-hidden rounded-3xl"
              style={{
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.95)",
                boxShadow: "0 8px 48px rgba(79,70,229,0.12), 0 2px 8px rgba(0,0,0,0.06)",
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
