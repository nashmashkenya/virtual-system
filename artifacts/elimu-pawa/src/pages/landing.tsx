import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  MessageCircle,
  Mic2,
  MonitorPlay,
  Sparkles,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { LoginPanel } from "@/components/auth/login-panel";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getDemoUsers } from "@/lib/api";
import { demoUsersFallback } from "@/lib/mock-data";
import type { DemoUser } from "@/lib/types";

const features = [
  {
    icon: MonitorPlay,
    title: "Live Video",
    description: "Crystal-clear HD streaming with zero setup. Your lesson, front and center.",
    color: "from-blue-500 to-blue-600",
    glow: "rgba(59,130,246,0.25)",
  },
  {
    icon: MessageCircle,
    title: "Real-time Chat",
    description: "Questions, reactions, and discussion—right alongside the video.",
    color: "from-violet-500 to-violet-600",
    glow: "rgba(139,92,246,0.25)",
  },
  {
    icon: BookOpen,
    title: "Class Materials",
    description: "Share files, links, and resources in one organized spot.",
    color: "from-indigo-500 to-indigo-600",
    glow: "rgba(99,102,241,0.25)",
  },
  {
    icon: Mic2,
    title: "Polls & Quizzes",
    description: "Keep students engaged with live polls and instant feedback.",
    color: "from-sky-500 to-sky-600",
    glow: "rgba(14,165,233,0.25)",
  },
  {
    icon: LayoutDashboard,
    title: "Whiteboard",
    description: "Draw, annotate, and explain ideas visually in real time.",
    color: "from-purple-500 to-purple-600",
    glow: "rgba(168,85,247,0.25)",
  },
  {
    icon: Users,
    title: "Breakout Rooms",
    description: "Split students into small groups for collaborative work.",
    color: "from-blue-600 to-indigo-600",
    glow: "rgba(37,99,235,0.25)",
  },
];

const stats = [
  { value: "10k+", label: "Active students" },
  { value: "500+", label: "Teachers onboard" },
  { value: "99.9%", label: "Uptime" },
  { value: "< 2s", label: "Load time" },
];

const steps = [
  { step: "01", title: "Create your account", description: "Sign up in seconds — no credit card needed to get started." },
  { step: "02", title: "Open your room", description: "Teachers launch a room; students join with one click." },
  { step: "03", title: "Teach & learn", description: "Video, chat, polls, whiteboard — all in one focused screen." },
];

export function LandingPage() {
  const [users, setUsers] = useState<DemoUser[]>(demoUsersFallback);

  useEffect(() => {
    getDemoUsers().then(setUsers).catch(() => {});
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden antialiased">
      {/* Background layers */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[var(--background)]" aria-hidden />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_120%_80%_at_60%_-20%,rgba(37,99,235,0.13),transparent_60%)]" aria-hidden />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_100%_10%,rgba(124,58,237,0.11),transparent_55%)]" aria-hidden />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_40%_30%_at_0%_90%,rgba(79,70,229,0.09),transparent_55%)]" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.035] dark:opacity-[0.025]"
        style={{ backgroundImage: "linear-gradient(rgba(99,102,241,1) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,1) 1px,transparent 1px)", backgroundSize: "64px 64px" }}
        aria-hidden
      />

      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 w-full border-b border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-[color-mix(in_srgb,var(--background)_88%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Logo />
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="#sign-in"
              className="hidden rounded-xl px-4 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(37,99,235,0.35)] transition hover:brightness-110 active:scale-95"
            >
              Get started
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ── Hero ── */}
        <section className="relative pb-16 pt-16 sm:pt-20 lg:pt-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_420px] lg:items-center lg:gap-20 xl:grid-cols-[1fr_460px]">

            {/* Left — copy */}
            <div className="relative space-y-8">
              <div className="pointer-events-none absolute -left-32 -top-16 h-80 w-80 rounded-full bg-[var(--primary)]/15 blur-3xl" aria-hidden />

              <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_7%,transparent)] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--primary)] backdrop-blur-sm dark:border-blue-400/20 dark:text-blue-300">
                <Sparkles className="h-3 w-3" aria-hidden />
                Virtual classroom for Africa
              </div>

              <div className="space-y-4">
                <h1 className="text-[clamp(2.4rem,6.5vw,4rem)] font-extrabold leading-[1.05] tracking-tight">
                  <span className="bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] bg-clip-text text-transparent">
                    Teach smarter.
                  </span>
                  <br />
                  <span className="text-[var(--text)]">Learn faster.</span>
                </h1>
                <p className="max-w-lg text-lg leading-relaxed text-[var(--subtext)]">
                  ElimuPawa puts live video, chat, polls, whiteboard, and class materials in one calm screen — no juggling apps, no wasted time.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_30px_rgba(37,99,235,0.4)] transition hover:brightness-110 hover:shadow-[0_12px_40px_rgba(37,99,235,0.5)] active:scale-95"
                >
                  Start for free
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="#sign-in"
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-6 py-3.5 text-sm font-semibold text-[var(--text)] shadow-sm transition hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] hover:shadow-md active:scale-95"
                >
                  Try the demo
                  <ChevronRight className="h-4 w-4 text-[var(--subtext)]" aria-hidden />
                </Link>
              </div>

              <ul className="flex flex-wrap gap-x-6 gap-y-2">
                {["No credit card required", "Free to join", "Works on any device"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5 text-sm text-[var(--subtext)]">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)]" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right — login card */}
            <div id="sign-in" className="relative scroll-mt-20 lg:sticky lg:top-20">
              <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-[var(--primary)]/12 to-[var(--accent)]/8 blur-2xl" aria-hidden />
              <LoginPanel users={users} embedded />
              <div className="mt-5 flex flex-col items-center gap-2 text-center text-sm text-[var(--subtext)] sm:flex-row sm:justify-center sm:gap-4">
                <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-[var(--primary)] transition hover:underline">
                  Full sign-in page <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
                <span className="hidden text-[var(--border)] sm:inline" aria-hidden>·</span>
                <Link href="/forgot-password" className="transition hover:text-[var(--text)]">Forgot password?</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="my-4 overflow-hidden rounded-3xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_80%,transparent)] shadow-[var(--shadow-card)] backdrop-blur-sm dark:bg-slate-900/60">
          <ul className="grid grid-cols-2 divide-x divide-y divide-[var(--border)] sm:grid-cols-4 sm:divide-y-0">
            {stats.map((s) => (
              <li key={s.label} className="flex flex-col items-center gap-1 px-6 py-7">
                <span className="text-3xl font-extrabold tracking-tight text-[var(--text)]">{s.value}</span>
                <span className="text-center text-xs font-medium uppercase tracking-wider text-[var(--subtext)]">{s.label}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Features ── */}
        <section className="py-20 sm:py-24">
          <div className="mb-14 space-y-3 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)] dark:text-blue-300">Everything in one place</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-4xl">Built for the classroom</h2>
            <p className="mx-auto max-w-xl text-base text-[var(--subtext)] sm:text-lg">
              Every tool a teacher needs, every view a student expects — no tabs, no downloads, no confusion.
            </p>
          </div>

          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.title}>
                  <div
                    className="group relative h-full overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(15,23,42,0.1)] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
                  >
                    <div
                      className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                      style={{ background: f.glow }}
                      aria-hidden
                    />
                    <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${f.color} text-white shadow-lg`}>
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <h3 className="mt-5 text-base font-bold text-[var(--text)]">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--subtext)]">{f.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── How it works ── */}
        <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[color-mix(in_srgb,var(--primary)_5%,var(--card))] to-[var(--card)] px-8 py-14 shadow-[var(--shadow-card)] dark:from-blue-950/30 dark:to-slate-900/80 sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[var(--secondary)]/10 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[var(--accent)]/8 blur-3xl" aria-hidden />

          <div className="relative mb-12 space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)] dark:text-blue-300">Simple by design</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-4xl">Up and running in minutes</h2>
          </div>

          <ol className="relative grid gap-8 sm:grid-cols-3">
            <div className="pointer-events-none absolute left-0 right-0 top-7 hidden border-t-2 border-dashed border-[color-mix(in_srgb,var(--primary)_20%,var(--border))] sm:block" aria-hidden />
            {steps.map((s) => (
              <li key={s.step} className="relative flex flex-col items-center gap-4 text-center">
                <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[color-mix(in_srgb,var(--primary)_25%,var(--border))] bg-[var(--card)] text-xl font-extrabold text-[var(--primary)] shadow-md dark:border-blue-400/20">
                  {s.step}
                </span>
                <div>
                  <h3 className="text-base font-bold text-[var(--text)]">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--subtext)]">{s.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── CTA ── */}
        <section className="relative my-20 overflow-hidden rounded-3xl px-8 py-16 sm:my-24 sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)]" aria-hidden />
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(255,255,255,0.12),transparent_70%)]" aria-hidden />
          <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-[0.07]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)", backgroundSize: "40px 40px" }} aria-hidden />

          <div className="relative flex flex-col items-center gap-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white/90 backdrop-blur-sm">
              <Zap className="h-3 w-3" aria-hidden />
              Free to get started
            </span>
            <h2 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              Ready to transform your classroom?
            </h2>
            <p className="max-w-lg text-base text-white/80 sm:text-lg">
              Join thousands of teachers and students already using ElimuPawa to make online learning feel real.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-[var(--primary)] shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)] hover:brightness-105 active:scale-95"
              >
                Create free account
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="#sign-in"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 active:scale-95"
              >
                <GraduationCap className="h-4 w-4" aria-hidden />
                Try the demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_60%,transparent)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-[var(--subtext)] sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo />
          </div>
          <p>© {new Date().getFullYear()} ElimuPawa. Built for learners everywhere.</p>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/login" className="transition hover:text-[var(--text)]">Sign in</Link>
            <Link href="/register" className="transition hover:text-[var(--text)]">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
