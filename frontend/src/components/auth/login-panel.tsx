"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AtSign,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  LockKeyhole,
  Presentation,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";
import { loginDemoUser } from "@/lib/api";
import type { DemoUser } from "@/lib/types";

function roleIcon(role: DemoUser["role"]) {
  if (role === "teacher") {
    return Presentation;
  }
  if (role === "student") {
    return GraduationCap;
  }
  return Shield;
}

const glassShell =
  "relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_24px_80px_rgba(0,0,0,0.5)]";

export function LoginPanel({
  users,
  embedded = false,
}: {
  users: DemoUser[];
  embedded?: boolean;
}) {
  const router = useRouter();
  const [activeUser, setActiveUser] = useState(users[0]?.username ?? "");
  const [username, setUsername] = useState(users[0]?.username ?? "");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const active = useMemo(() => users.find((u) => u.username === activeUser), [users, activeUser]);

  const handleContinue = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Enter your username and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await loginDemoUser({
        username: username.trim(),
        password,
      });

      router.push(result.user.role === "teacher" ? "/teacher" : "/student");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to start the demo session right now.");
    } finally {
      setLoading(false);
    }
  };

  const formSection = (
    <div className="space-y-5">
      <div className="space-y-2.5">
        {users.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background-soft)] px-4 py-8 text-center text-sm text-[var(--subtext)]">
            No demo accounts available. Try again later or create an account.
          </p>
        ) : (
          users.map((user) => {
            const selected = activeUser === user.username;
            const Icon = roleIcon(user.role);

            return (
              <button
                key={user.username}
                type="button"
                onClick={() => {
                  setActiveUser(user.username);
                  setUsername(user.username);
                  setPassword("password123");
                }}
                className={`group flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition duration-200 ${
                  selected
                    ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_35%,transparent),0_12px_40px_rgba(37,99,235,0.15)] dark:bg-blue-500/15 dark:shadow-[0_0_0_1px_rgba(96,165,250,0.35),0_12px_40px_rgba(37,99,235,0.2)]"
                    : "border-[var(--border)] bg-[var(--card)] hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] hover:bg-[var(--background-soft)]"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                    selected
                      ? "bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white shadow-md"
                      : "bg-[var(--subtext)]/20 text-[var(--subtext)] group-hover:bg-[var(--primary)]/10 group-hover:text-[var(--primary)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-semibold text-[var(--text)]">{user.full_name}</span>
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--background-soft)] text-[var(--primary)] dark:bg-white/10 dark:text-blue-200"
                      title={user.role}
                      aria-label={`${user.role} account`}
                    >
                      <Icon className="h-3 w-3" />
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-[var(--subtext)]">{user.email}</span>
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--subtext)]">
          Username
          <span className="relative block">
            <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--subtext)]" />
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              placeholder="grace.teacher"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 py-2.5 text-sm font-medium normal-case tracking-normal text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
            />
          </span>
        </label>
        <label className="space-y-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--subtext)]">
          Password
          <span className="relative block">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--subtext)]" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] pl-9 pr-16 py-2.5 text-sm font-medium normal-case tracking-normal text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[var(--primary)] hover:bg-[var(--background-soft)]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </span>
        </label>
      </div>

      {error ? (
        <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-center text-sm font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleContinue}
        disabled={loading || users.length === 0}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-blue-900/40"
      >
        {loading
          ? "Signing in…"
          : (active?.username === username || active?.email === username) && active?.role === "teacher"
            ? "Open teacher room"
            : (active?.username === username || active?.email === username) && active?.role === "admin"
              ? "Continue"
              : "Sign in"}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-[var(--border)] pt-5 text-xs font-medium">
        <Link
          href="/register"
          className="text-[var(--primary)] transition hover:underline"
        >
          Create account
        </Link>
        <span className="hidden text-[var(--subtext)] sm:inline">·</span>
        <Link
          href="/forgot-password"
          className="text-[var(--subtext)] transition hover:text-[var(--text)]"
        >
          Forgot password?
        </Link>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className={`${glassShell} p-6 sm:p-8`}>
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[var(--primary)]/20 blur-3xl dark:bg-blue-500/30"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-[var(--accent)]/15 blur-3xl dark:bg-violet-500/20"
          aria-hidden
        />
        <div className="relative">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full bg-[var(--background-soft)] px-3 py-1 text-xs font-medium text-[var(--primary)] dark:bg-white/10 dark:text-blue-200">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Sign in
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-3xl">
                Your class is one step away
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--subtext)]">
                Tap a name to try the demo, or type your own username and password.
              </p>
            </div>
          </div>
          {formSection}
        </div>
      </div>
    );
  }

  return (
    <div className={`${glassShell} mx-auto w-full max-w-5xl p-6 sm:p-10`}>
      <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
        <div className="relative space-y-6 lg:pr-4">
          <div
            className="pointer-events-none absolute -left-8 top-0 h-32 w-32 rounded-full bg-[var(--primary)]/15 blur-2xl dark:bg-blue-500/25"
            aria-hidden
          />
          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full bg-[var(--background-soft)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)] dark:bg-white/10">
              ElimuPawa Classroom
            </p>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
              Teaching space,
              <span className="mt-1 block bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] bg-clip-text text-transparent">
                without the clutter.
              </span>
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[var(--subtext)] sm:text-base">
              Enter as a teacher or student with one click. Your session is stored in a secure app cookie for
              role-aware dashboards.
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--background-soft)]/80 p-4 dark:bg-white/[0.04]">
            <div className="flex gap-3 text-sm text-[var(--text)]">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
              <span className="leading-relaxed text-[var(--subtext)]">
                Pick a demo card to auto-fill credentials, or enter your own username and password.
              </span>
            </div>
            <div className="flex gap-3 text-sm text-[var(--text)]">
              <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
              <span className="leading-relaxed text-[var(--subtext)]">
                Registered users follow the same JWT session flow after email sign-up.
              </span>
            </div>
          </div>
        </div>

        <div className="relative">
          <div
            className="pointer-events-none absolute -bottom-8 -right-8 h-36 w-36 rounded-full bg-[var(--accent)]/20 blur-3xl dark:bg-violet-500/25"
            aria-hidden
          />
          <div className="relative rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_96%,transparent)] p-5 shadow-inner dark:border-white/5 dark:bg-slate-900/50 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">Sign in</p>
            <h2 className="mt-2 text-xl font-bold text-[var(--text)]">Choose a role</h2>
            <p className="mt-1 text-sm text-[var(--subtext)]">Select who you’re joining as.</p>
            <div className="mt-6">{formSection}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

