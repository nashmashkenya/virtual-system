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

  const inputCls = "w-full rounded-2xl border border-white/60 bg-white/60 px-4 py-4 text-base text-slate-800 placeholder-slate-400 shadow-sm outline-none backdrop-blur-sm transition focus:border-emerald-400 focus:bg-white/80 focus:ring-2 focus:ring-emerald-400/25";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden"
      style={{ background: "linear-gradient(145deg, #e8f4fd 0%, #ede8ff 30%, #fce8f5 58%, #e4f8f0 82%, #fdf8e8 100%)" }}>

      {/* Ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 -top-20 h-96 w-96 rounded-full bg-sky-400/20 blur-[100px]" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-violet-400/20 blur-[90px]" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-[90px]" />
      </div>

      {/* Back button */}
      <div className="relative px-5 pt-5">
        <Link href="/"
          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white/50 active:scale-95"
          style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.7)", backdropFilter: "blur(12px)" }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          Back
        </Link>
      </div>

      {/* Card */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-8">
        <div className="w-full max-w-[420px]">

          {/* Badge */}
          <div className="mb-5 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-emerald-700"
              style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(16,185,129,0.3)", backdropFilter: "blur(12px)" }}>
              📚 Student Account
            </span>
          </div>

          {/* Glass card */}
          <div className="rounded-3xl p-7 sm:p-8"
            style={{
              background: "rgba(255,255,255,0.65)",
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
              border: "1.5px solid rgba(255,255,255,0.85)",
              boxShadow: "0 20px 60px rgba(80,60,180,0.12), 0 2px 0 rgba(255,255,255,1) inset",
            }}>

            {/* Logo + heading */}
            <div className="mb-7 text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
                  style={{ background: "linear-gradient(135deg, #0ea5e9, #10b981)", boxShadow: "0 8px 24px rgba(16,185,129,0.3)" }}>
                  <span className="text-2xl">📚</span>
                </div>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Welcome back</h1>
              <p className="mt-1 text-sm text-slate-500">Sign in to your student account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">ADM Number</label>
                <input
                  type="text"
                  value={adm_no}
                  onChange={(e) => { setAdmNo(e.target.value); setError(""); }}
                  placeholder="e.g. NBI/001/2024"
                  autoComplete="username"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="First 7 digits of parent's phone"
                    maxLength={7}
                    autoComplete="current-password"
                    className={inputCls + " pr-12"}
                  />
                  <button type="button" onClick={() => setShowPwd((p) => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600">
                    {showPwd
                      ? <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      : <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    }
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">Your password is the <strong className="text-slate-600">first 7 digits</strong> of your parent's phone number</p>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm text-red-600"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <svg className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="mt-1 w-full rounded-2xl py-4 text-base font-bold text-white shadow-lg transition active:scale-[.98] disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #10b981, #0ea5e9)", boxShadow: "0 8px 24px rgba(16,185,129,0.35)" }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Signing in…
                  </span>
                ) : "Sign In"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                No account yet?{" "}
                <Link href="/student/sign-up" className="font-bold text-emerald-600 transition hover:text-emerald-700">
                  Create one
                </Link>
              </p>
            </div>
          </div>

          {/* ElimuPawa brand */}
          <p className="mt-5 text-center text-xs text-slate-400">
            ElimuPawa · Secure · Built for Kenyan schools
          </p>
        </div>
      </div>
    </div>
  );
}
