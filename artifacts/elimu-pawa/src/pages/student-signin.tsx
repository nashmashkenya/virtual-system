import { useState } from "react";
import { Link, useLocation } from "wouter";
import { studentLogin } from "@/lib/student-auth";

export function StudentSignInPage() {
  const [, navigate] = useLocation();
  const [adm_no, setAdmNo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!adm_no.trim()) return setError("ADM No is required.");
    if (!password) return setError("Password is required.");

    setLoading(true);
    const result = await studentLogin(adm_no.trim(), password);
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
    } else {
      navigate("/student/dashboard");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <Link
        href="/"
        className="absolute left-5 top-5 flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700/60 hover:text-white"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
        </svg>
        Home
      </Link>

      <div className="w-full max-w-[440px]">
        <div className="mb-4 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399" }}>
            📚 Student account
          </span>
        </div>

        <div className="rounded-2xl border border-slate-700/50 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mb-3 flex justify-center">
              <img src="/logo.svg" alt="ElimuPawa" className="h-12 w-12" />
            </div>
            <h1 className="text-xl font-bold text-white">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-400">Sign in to your student account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">ADM No</label>
              <input
                type="text"
                value={adm_no}
                onChange={(e) => { setAdmNo(e.target.value); setError(""); }}
                placeholder="e.g. NBI/001/2024"
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="First digit of parent's phone"
                maxLength={1}
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
              />
              <p className="mt-1.5 text-xs text-slate-500">Your password is the <strong className="text-slate-400">first digit</strong> of your parent's phone number</p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-400">
            No account yet?{" "}
            <Link href="/student/sign-up" className="font-semibold text-emerald-400 hover:text-emerald-300">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
