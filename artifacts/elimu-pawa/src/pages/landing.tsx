import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { LoginPanel } from "@/components/auth/login-panel";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getDemoUsers } from "@/lib/api";
import { demoUsersFallback } from "@/lib/mock-data";
import type { DemoUser } from "@/lib/types";

const perks = [
  "No downloads needed",
  "Works on any device",
  "Free to get started",
];

export function LandingPage() {
  const [users, setUsers] = useState<DemoUser[]>(demoUsersFallback);

  useEffect(() => {
    getDemoUsers().then(setUsers).catch(() => {});
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden antialiased">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[var(--background)]" aria-hidden />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_100%_70%_at_50%_-10%,rgba(37,99,235,0.12),transparent_60%)]" aria-hidden />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_50%_40%_at_100%_0%,rgba(124,58,237,0.09),transparent_55%)]" aria-hidden />

      {/* Nav */}
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)] transition hover:brightness-110 active:scale-95"
          >
            Create account
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-6 sm:px-6">
        <div className="w-full max-w-md space-y-6">

          {/* Headline */}
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-4xl">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">
                ElimuPawa
              </span>
            </h1>
            <p className="text-base text-[var(--subtext)]">
              Your online classroom — video, chat, and lessons all in one place.
            </p>
          </div>

          {/* Login card */}
          <LoginPanel users={users} embedded />

          {/* Sign-in link */}
          <p className="text-center text-sm text-[var(--subtext)]">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[var(--primary)] transition hover:underline">
              Sign in here
            </Link>
          </p>

          {/* Perks */}
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {perks.map((p) => (
              <li key={p} className="flex items-center gap-1.5 text-xs text-[var(--subtext)]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--success)]" aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
