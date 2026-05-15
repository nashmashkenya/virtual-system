import { RegisterPanel } from "@/components/auth/register-panel";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-hidden lg:flex-row">

      {/* ── Left brand panel ── */}
      <div
        className="relative flex flex-col overflow-hidden px-6 py-6 lg:w-[42%] lg:justify-between lg:px-14 lg:py-14"
        style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0d1f3c 40%, #0e2240 70%, #0c1a35 100%)" }}
      >
        {/* Glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-cyan-500/20 blur-[90px]" />
          <div className="absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-emerald-500/15 blur-[80px]" />
        </div>
        {/* Grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "linear-gradient(rgba(6,182,212,1) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,1) 1px,transparent 1px)",
            backgroundSize: "52px 52px",
          }}
          aria-hidden
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-lg" style={{ background: "linear-gradient(135deg,#06b6d4,#3b82f6)" }}>
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

        {/* Copy — desktop only */}
        <div className="relative my-10 hidden space-y-6 lg:my-0 lg:flex lg:flex-1 lg:flex-col lg:justify-center">
          <div className="space-y-3">
            <span
              className="inline-flex w-fit items-center rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300"
              style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.22)" }}
            >
              Join your classroom
            </span>
            <h1 className="text-[clamp(2rem,3vw,2.8rem)] font-black leading-tight text-white">
              Ready to start<br />
              <span style={{ background: "linear-gradient(90deg,#06b6d4,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                learning?
              </span>
            </h1>
            <p className="max-w-xs text-[15px] leading-relaxed text-slate-400">
              It only takes a minute. Use your admission number and phone number — no complicated passwords to remember.
            </p>
          </div>

          <ul className="space-y-3 text-sm text-slate-300">
            {["Takes under 1 minute", "No email needed for students", "Password is auto-set from your phone number"].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-400 text-[10px] font-bold">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative hidden text-[11px] text-slate-700 lg:block">
          © {new Date().getFullYear()} ElimuPawa · Built for learners everywhere
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Background */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-[#f0f4ff] dark:bg-[#0b1120]" />
          <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-cyan-400/15 blur-[90px] dark:bg-cyan-500/12" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-indigo-400/15 blur-[80px] dark:bg-indigo-500/12" />
          <div
            className="absolute inset-0 opacity-[0.05] dark:opacity-[0.07]"
            style={{ backgroundImage: "radial-gradient(circle, rgb(79 70 229) 1px, transparent 1px)", backgroundSize: "26px 26px" }}
          />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#f0f4ff] to-transparent dark:from-[#0b1120]" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#f0f4ff] to-transparent dark:from-[#0b1120]" />
        </div>

        {/* Nav */}
        <div
          className="relative flex items-center justify-between px-6 py-4 sm:px-10"
          style={{ background: "rgba(240,244,255,0.75)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(99,102,241,0.1)" }}
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Sign in</Link>
          </p>
          <ThemeToggle />
        </div>

        {/* Form */}
        <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-8 sm:px-10">
          <RegisterPanel />
        </div>
      </div>
    </div>
  );
}
