import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Radio,
  Settings,
  Sparkles,
} from "lucide-react";

function firstName(fullName: string) {
  const t = fullName.trim();
  if (!t) return "there";
  return t.split(/\s+/)[0] ?? "there";
}

export function StudentHomeDashboard({ fullName }: { fullName: string }) {
  const name = firstName(fullName);

  return (
    <div className="relative pb-24 lg:pb-8">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.65] dark:opacity-40"
        aria-hidden
      >
        <div className="absolute left-[10%] top-0 h-72 w-72 rounded-full bg-[var(--primary)]/20 blur-[100px]" />
        <div className="absolute bottom-0 right-[5%] h-80 w-80 rounded-full bg-[var(--accent)]/15 blur-[110px]" />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-start">
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_96%,transparent)] shadow-[var(--shadow-card)] dark:bg-[color-mix(in_srgb,var(--card)_88%,transparent)]">
            <div
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-[var(--primary)]/25 to-[var(--accent)]/20 blur-2xl"
              aria-hidden
            />
            <div className="relative px-6 py-8 sm:px-10 sm:py-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--background-soft)_90%,transparent)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Learning hub
              </div>
              <h2 className="text-balance text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl lg:text-[2rem] lg:leading-tight">
                Welcome back,{" "}
                <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">
                  {name}
                </span>
              </h2>
              <p className="mt-3 max-w-xl text-pretty text-sm leading-relaxed text-[var(--subtext)] sm:text-base">
                You are outside the live room. When your instructor goes live, open the classroom to join video,
                chat, polls, and quizzes in one focused space.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/student"
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 hover:shadow-blue-600/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] dark:shadow-blue-900/40"
                >
                  <GraduationCap className="h-5 w-5 shrink-0" aria-hidden />
                  Open classroom
                  <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5" aria-hidden />
                </Link>
                <Link
                  href="/settings"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_85%,transparent)] px-5 py-3.5 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--primary)]/40 hover:bg-[var(--background-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                >
                  <Settings className="h-4 w-4 shrink-0 text-[var(--subtext)]" aria-hidden />
                  Account &amp; preferences
                </Link>
              </div>
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/student"
              className="group surface-card flex flex-col gap-3 rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-[var(--primary)]/35 hover:shadow-lg"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/12 text-[var(--primary)]">
                <BookOpen className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Live session</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--subtext)]">Join your class space</p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]">
                Go
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>

            <Link
              href="/settings"
              className="group surface-card flex flex-col gap-3 rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-[var(--secondary)]/35 hover:shadow-lg"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--secondary)]/12 text-[var(--secondary)]">
                <Settings className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Settings</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--subtext)]">Profile &amp; security</p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-[var(--secondary)]">
                Open
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="surface-card rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--card-muted)] text-[var(--subtext)]">
                <Radio className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Classroom status</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--subtext)]">
                  You are not in a live session. Your instructor controls when the room is open.
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--background-soft)] px-3 py-2.5 dark:bg-white/[0.06]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-400/40 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-slate-400" />
              </span>
              <span className="text-xs font-medium text-[var(--subtext)]">Standing by — ready when you are</span>
            </div>
          </div>

          <div className="surface-muted rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--subtext)]">Tip</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">
              Use a stable connection and close heavy background tabs before joining video for the smoothest experience.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
