import { useState } from "react";
import { Link, useLocation } from "wouter";
import { studentLogin } from "@/lib/student-auth";

export function StudentSignInPage() {
  const [, navigate] = useLocation();
  const [adm_no, setAdmNo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!adm_no.trim()) return setError("ADM No is required.");
    if (!password) return setError("Password is required.");
    setLoading(true);
    const result = await studentLogin(adm_no.trim(), password);
    setLoading(false);
    if (!result.ok) setError(result.message);
    else navigate("/student/dashboard");
  }

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{
        background:
          "linear-gradient(160deg, #daf0ff 0%, #e8e0ff 30%, #fce8f5 58%, #d9f5ec 82%, #fdf8e8 100%)",
      }}
    >
      {/* Ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 -top-20 h-96 w-96 rounded-full bg-sky-300/30 blur-[90px]" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-violet-300/25 blur-[80px]" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-300/25 blur-[80px]" />
      </div>

      {/* ── Header bar ── */}
      <div className="relative flex items-center justify-between px-5 pt-12 pb-4 sm:pt-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition active:scale-95"
          style={{
            background: "rgba(30,30,60,0.55)",
            border: "1px solid rgba(255,255,255,0.18)",
            backdropFilter: "blur(16px)",
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          Back
        </Link>
        <span
          className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold text-emerald-700"
          style={{
            background: "rgba(255,255,255,0.55)",
            border: "1px solid rgba(16,185,129,0.3)",
            backdropFilter: "blur(16px)",
          }}
        >
          📚 Student
        </span>
      </div>

      {/* ── Full-screen content ── */}
      <div className="relative flex flex-1 flex-col px-5 pb-10 sm:mx-auto sm:w-full sm:max-w-[440px] sm:justify-center">

        {/* Hero */}
        <div className="mb-8 mt-4 text-center sm:mb-7">
          <div className="mb-5 flex justify-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-3xl text-4xl shadow-xl sm:h-16 sm:w-16 sm:rounded-2xl sm:text-3xl"
              style={{
                background: "linear-gradient(135deg, #0ea5e9, #10b981)",
                boxShadow: "0 12px 32px rgba(16,185,129,0.35)",
              }}
            >
              📚
            </div>
          </div>
          <h1 className="text-[2rem] font-black tracking-tight text-slate-900 sm:text-2xl">
            Welcome back
          </h1>
          <p className="mt-1.5 text-base text-slate-500 sm:text-sm">
            Sign in to your student account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2.5 block text-[15px] font-bold text-slate-700">
              ADM Number
            </label>
            <input
              type="text"
              value={adm_no}
              onChange={(e) => { setAdmNo(e.target.value); setError(""); }}
              placeholder="e.g. NBI/001/2024"
              autoComplete="username"
              className="w-full rounded-2xl border-0 px-5 py-4 text-base text-slate-800 placeholder-slate-400 shadow-sm outline-none transition focus:ring-2 focus:ring-emerald-400/40 sm:py-3.5 sm:text-sm"
              style={{
                background: "rgba(255,255,255,0.75)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
            />
          </div>

          <div>
            <label className="mb-2.5 block text-[15px] font-bold text-slate-700">
              Password
            </label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="First 7 digits of parent's phone"
                maxLength={7}
                autoComplete="current-password"
                className="w-full rounded-2xl border-0 px-5 py-4 pr-14 text-base text-slate-800 placeholder-slate-400 shadow-sm outline-none transition focus:ring-2 focus:ring-emerald-400/40 sm:py-3.5 sm:text-sm"
                style={{
                  background: "rgba(255,255,255,0.75)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPwd((p) => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 transition hover:text-slate-600"
              >
                {showPwd ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-2.5 px-1 text-[13px] text-slate-500">
              Your password is the <strong className="text-slate-600">first 7 digits</strong> of your parent's phone number
            </p>
          </div>

          {error && (
            <div
              className="flex items-start gap-3 rounded-2xl px-4 py-3.5 text-[14px] text-red-600"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}
            >
              <svg className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-2xl py-4 text-[16px] font-black text-white shadow-lg transition active:scale-[.98] disabled:opacity-60 sm:py-3.5 sm:text-base"
            style={{
              background: "linear-gradient(135deg, #10b981, #0ea5e9)",
              boxShadow: "0 10px 28px rgba(16,185,129,0.38)",
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in…
              </span>
            ) : "Sign In"}
          </button>
        </form>

        <p className="mt-8 text-center text-[15px] text-slate-500 sm:mt-6 sm:text-sm">
          No account yet?{" "}
          <Link href="/student/sign-up" className="font-black text-emerald-600 transition hover:text-emerald-700">
            Create one
          </Link>
        </p>

        <p className="mt-6 text-center text-xs text-slate-400">
          ElimuPawa · Secure · Built for Kenyan schools
        </p>
      </div>
    </div>
  );
}
