import { useEffect, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/react";
import { useLocation, useSearch } from "wouter";

export function OnboardingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [, navigate] = useLocation();
  const search = useSearch();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoSaved = useRef(false);

  // Parse ?role=student or ?role=teacher from the URL
  const params = new URLSearchParams(search);
  const presetRole = params.get("role") as "student" | "teacher" | null;

  useEffect(() => {
    // Only redirect away if there's no preset role — a fresh sign-up may still
    // be initialising its Clerk session, so we wait until user is confirmed absent.
    if (isLoaded && !isSignedIn && !presetRole) {
      navigate("/", { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate, presetRole]);

  // Auto-assign role when coming from a role-specific sign-in/sign-up flow
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    if (!presetRole || autoSaved.current) return;
    autoSaved.current = true;
    void chooseRole(presetRole);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, user, presetRole]);

  async function chooseRole(role: "teacher" | "student") {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/set-role", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          full_name: user?.fullName ?? "",
          username: user?.username ?? user?.id ?? "",
        }),
      });
      if (!res.ok) throw new Error("Failed to save.");
      navigate(role === "teacher" ? "/teacher/classes" : "/student/dashboard", { replace: true });
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
      autoSaved.current = false;
    }
  }

  if (!isLoaded || (presetRole && !error)) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        {presetRole && (
          <p className="text-sm text-slate-400">
            Setting up your {presetRole} account…
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25">
            <svg className="h-9 w-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to ElimuPawa</h1>
          <p className="mt-2 text-sm text-slate-400">
            {user?.firstName ? `Hi ${user.firstName}! ` : ""}How will you use ElimuPawa?
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => void chooseRole("student")}
            disabled={saving}
            className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-slate-800/80 p-5 text-left transition hover:border-emerald-500/40 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-2xl">
              📚
            </div>
            <div>
              <p className="font-semibold text-white">I am a Student</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Join live classes, take quizzes, track your progress
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => void chooseRole("teacher")}
            disabled={saving}
            className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-slate-800/80 p-5 text-left transition hover:border-purple-500/40 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-2xl">
              🎓
            </div>
            <div>
              <p className="font-semibold text-white">I am a Teacher</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Host live classes, set quizzes, manage students
              </p>
            </div>
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-center text-sm text-red-300">
            {error}
          </p>
        ) : null}

        {saving ? (
          <p className="mt-4 text-center text-sm text-slate-400">Setting up your account…</p>
        ) : null}
      </div>
    </div>
  );
}
