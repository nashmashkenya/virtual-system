import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BookOpen, MessageCircle, Sparkles, Video } from "lucide-react";
import { LoginPanel } from "@/components/auth/login-panel";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getDemoUsers } from "@/lib/api";
import { demoUsersFallback } from "@/lib/mock-data";
import type { DemoUser } from "@/lib/types";

const highlights = [
  { title: "Live video", description: "See the lesson in one window — no extra apps to learn.", icon: Video },
  { title: "Chat & questions", description: "Talk to your class without leaving the page.", icon: MessageCircle },
  { title: "Class materials", description: "Teachers share links and files; students find them in one spot.", icon: BookOpen },
];

export function LandingPage() {
  const [users, setUsers] = useState<DemoUser[]>(demoUsersFallback);

  useEffect(() => {
    getDemoUsers().then(setUsers).catch(() => {});
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden antialiased">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[var(--background)]" aria-hidden />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(37,99,235,0.18),transparent_55%)] dark:bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(59,130,246,0.22),transparent_55%)]" aria-hidden />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_50%_40%_at_100%_0%,rgba(124,58,237,0.14),transparent_50%)]" aria-hidden />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_45%_35%_at_0%_100%,rgba(79,70,229,0.1),transparent_50%)]" aria-hidden />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[length:72px_72px] [mask-image:linear-gradient(to_bottom,black_0%,black_40%,transparent_100%)]" aria-hidden />

      <main className="relative mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pb-28 sm:pt-10 lg:px-8">
        <header className="mb-12 flex flex-col gap-6 sm:mb-16 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <nav className="flex flex-wrap items-center gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--border)_80%,transparent)] bg-[color-mix(in_srgb,var(--card)_75%,transparent)] p-1.5 shadow-[0_8px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/50 sm:gap-2.5 sm:rounded-full sm:pl-2">
            <ThemeToggle />
            <Link href="#sign-in" className="inline-flex items-center justify-center rounded-xl border border-transparent px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--background-soft)] sm:rounded-full sm:py-2">
              Sign in
            </Link>
            <Link href="/register" className="inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-[var(--primary)] via-[color-mix(in_srgb,var(--primary)_85%,var(--secondary))] to-[var(--secondary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(37,99,235,0.35)] transition hover:brightness-105 sm:rounded-full sm:py-2">
              Create account
              <ArrowRight className="h-4 w-4 opacity-90" aria-hidden />
            </Link>
          </nav>
        </header>

        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_min(100%,440px)] lg:items-start lg:gap-16">
          <div className="relative space-y-10">
            <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-[var(--primary)]/20 blur-3xl dark:bg-blue-500/25" aria-hidden />
            <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-[var(--accent)]/15 blur-3xl dark:bg-violet-500/20" aria-hidden />

            <div className="relative space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--primary)_25%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)] shadow-sm backdrop-blur-sm dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                For teachers &amp; students
              </p>
              <h1 className="text-balance font-bold tracking-tight">
                <span className="block bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] bg-clip-text text-[clamp(2rem,6vw,3.5rem)] leading-[1.08] text-transparent drop-shadow-sm">
                  ElimuPawa Classroom
                </span>
                <span className="mt-4 block text-2xl font-semibold leading-snug text-[var(--text)] sm:mt-5 sm:text-3xl lg:text-[2.2rem] lg:leading-tight">
                  One place for your online class
                </span>
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-[var(--subtext)] sm:text-lg">
                Video, chat, and class tools in one calm screen—no maze of menus. Start teaching or learning in minutes.
              </p>
            </div>

            <ul className="relative grid gap-4 sm:grid-cols-3">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title}>
                    <div className="group relative h-full overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--border)_90%,transparent)] bg-gradient-to-b from-[var(--card)] to-[color-mix(in_srgb,var(--card-muted)_50%,var(--card))] p-5 shadow-[0_4px_24px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] hover:shadow-[0_16px_48px_rgba(37,99,235,0.12)] dark:from-white/[0.07] dark:to-slate-900/80">
                      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[var(--primary)]/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" aria-hidden />
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white shadow-lg shadow-blue-500/25 ring-4 ring-[color-mix(in_srgb,var(--primary)_12%,transparent)]">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <p className="mt-4 text-sm font-bold text-[var(--text)]">{item.title}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-[var(--subtext)] sm:text-[13px]">{item.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="relative overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--primary)_20%,var(--border))] bg-gradient-to-br from-[color-mix(in_srgb,var(--primary)_6%,var(--card))] to-[var(--card)] p-6 shadow-[0_8px_40px_rgba(37,99,235,0.08)] dark:from-blue-950/40 dark:to-slate-900/90 sm:p-7">
              <div className="pointer-events-none absolute -right-12 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-[var(--accent)]/10 blur-2xl" aria-hidden />
              <p className="relative text-sm leading-relaxed text-[var(--subtext)] sm:text-[15px]">
                <span className="font-semibold text-[var(--text)]">Teachers:</span> open your room and invite the class.{" "}
                <span className="font-semibold text-[var(--text)]">Students:</span> sign in with the account your school gave you, or the demo below to try it out.
              </p>
            </div>
          </div>

          <div id="sign-in" className="relative scroll-mt-28 lg:sticky lg:top-10">
            <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-b from-[var(--primary)]/15 to-[var(--accent)]/10 opacity-60 blur-2xl dark:opacity-40" aria-hidden />
            <LoginPanel users={users} embedded />
            <div className="mt-6 flex flex-col items-center gap-2 text-center text-sm text-[var(--subtext)] sm:flex-row sm:justify-center sm:gap-4">
              <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-[var(--primary)] transition hover:gap-1.5 hover:underline">
                Full sign-in page
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <span className="hidden text-[var(--border)] sm:inline" aria-hidden>·</span>
              <Link href="/forgot-password" className="transition hover:text-[var(--text)]">Forgot password?</Link>
            </div>
          </div>
        </div>

        <section className="relative mt-20 overflow-hidden rounded-3xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] p-8 shadow-[0_20px_60px_rgba(15,23,42,0.07)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/60 sm:mt-24 sm:p-10 lg:mt-28">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[var(--secondary)]/10 blur-3xl dark:bg-indigo-500/20" aria-hidden />
          <div className="relative max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)] dark:text-blue-300">Philosophy</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">Simple by design</h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--subtext)] sm:text-lg">
              The live lesson stays front and center. Chat, polls, and quizzes stay in easy reach—so you can focus on teaching and learning, not on figuring out the software.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
