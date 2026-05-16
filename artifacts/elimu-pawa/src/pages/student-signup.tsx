import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { studentRegister } from "@/lib/student-auth";

const API = import.meta.env.VITE_API_BASE_URL ?? "";

export function StudentSignUpPage() {
  const [, navigate] = useLocation();
  const [classLevels, setClassLevels] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API}/api/public/class-levels`)
      .then((r) => r.ok ? r.json() as Promise<{ class_levels: { id: number; name: string }[] }> : null)
      .then((d) => { if (d) setClassLevels(d.class_levels.map((c) => c.name)); })
      .catch(() => {});
  }, []);

  const [form, setForm] = useState({
    first_name: "", last_name: "", class_level: "", adm_no: "", parent_phone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError("");
  }

  function goToStep2(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim()) return setError("First name is required.");
    if (!form.last_name.trim()) return setError("Last name is required.");
    if (!form.class_level) return setError("Please select your class.");
    setError("");
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.adm_no.trim()) return setError("ADM No is required.");
    if (!form.parent_phone.trim()) return setError("Parent phone number is required.");
    if (!/^\d/.test(form.parent_phone.trim())) return setError("Parent phone must start with a digit (e.g. 0712345678).");
    setLoading(true);
    const result = await studentRegister(form);
    setLoading(false);
    if (!result.ok) setError(result.message);
    else navigate("/student/dashboard");
  }

  const inputCls =
    "w-full rounded-2xl border-0 px-5 py-4 text-base text-slate-800 placeholder-slate-400 outline-none transition focus:ring-2 focus:ring-emerald-400/40 sm:py-3.5 sm:text-sm";
  const inputStyle = {
    background: "rgba(255,255,255,0.75)",
    backdropFilter: "blur(12px)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  };

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{
        background:
          "linear-gradient(160deg, #daf0ff 0%, #e8e0ff 30%, #fce8f5 58%, #d9f5ec 82%, #fdf8e8 100%)",
      }}
    >
      {/* Blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -right-32 -top-16 h-96 w-96 rounded-full bg-violet-300/25 blur-[90px]" />
        <div className="absolute -bottom-10 -left-10 h-80 w-80 rounded-full bg-sky-300/25 blur-[80px]" />
        <div className="absolute bottom-1/3 right-1/4 h-64 w-64 rounded-full bg-emerald-300/20 blur-[70px]" />
      </div>

      {/* ── Header bar ── */}
      <div className="relative flex items-center justify-between px-5 pt-12 pb-2 sm:pt-6">
        <button
          onClick={() => (step === 2 ? setStep(1) : history.back())}
          className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition active:scale-95"
          style={{
            background: "rgba(255,255,255,0.55)",
            border: "1px solid rgba(255,255,255,0.75)",
            backdropFilter: "blur(16px)",
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          {step === 2 ? "Back" : "Home"}
        </button>
        <span className="text-sm font-bold text-slate-400">Step {step} of 2</span>
      </div>

      {/* Progress bar — full width, no side margin */}
      <div className="relative mt-4 h-1.5 w-full overflow-hidden bg-white/40">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: step === 1 ? "50%" : "100%",
            background: "linear-gradient(90deg, #10b981, #0ea5e9)",
          }}
        />
      </div>

      {/* ── Full-screen content ── */}
      <div className="relative flex flex-1 flex-col px-5 pb-10 sm:mx-auto sm:w-full sm:max-w-[460px] sm:justify-center">

        {/* Hero */}
        <div className="mb-7 mt-6 text-center sm:mb-6">
          <div className="mb-5 flex justify-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-3xl text-4xl shadow-xl sm:h-16 sm:w-16 sm:rounded-2xl sm:text-3xl"
              style={{
                background: step === 1
                  ? "linear-gradient(135deg, #8b5cf6, #ec4899)"
                  : "linear-gradient(135deg, #10b981, #0ea5e9)",
                boxShadow: step === 1
                  ? "0 12px 32px rgba(139,92,246,0.35)"
                  : "0 12px 32px rgba(16,185,129,0.35)",
              }}
            >
              {step === 1 ? "👋" : "🔐"}
            </div>
          </div>
          <h1 className="text-[2rem] font-black tracking-tight text-slate-900 sm:text-2xl">
            {step === 1 ? "Create Account" : "Your Credentials"}
          </h1>
          <p className="mt-1.5 text-base text-slate-500 sm:text-sm">
            {step === 1 ? "Tell us about yourself" : "Almost done — just a bit more"}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={goToStep2} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2.5 block text-[15px] font-bold text-slate-700">First Name</label>
                <input
                  type="text" value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                  placeholder="e.g. Brian" autoComplete="given-name"
                  className={inputCls} style={inputStyle}
                />
              </div>
              <div>
                <label className="mb-2.5 block text-[15px] font-bold text-slate-700">Last Name</label>
                <input
                  type="text" value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                  placeholder="e.g. Otieno" autoComplete="family-name"
                  className={inputCls} style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label className="mb-2.5 block text-[15px] font-bold text-slate-700">Class / Form</label>
              <select
                value={form.class_level}
                onChange={(e) => set("class_level", e.target.value)}
                className={inputCls + " cursor-pointer"} style={inputStyle}
              >
                <option value="">Select your class…</option>
                {classLevels.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5 text-[14px] text-red-600"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}>
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button type="submit"
              className="mt-2 w-full rounded-2xl py-4 text-[16px] font-black text-white shadow-lg transition active:scale-[.98] sm:py-3.5 sm:text-base"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)", boxShadow: "0 10px 28px rgba(139,92,246,0.35)" }}>
              Continue →
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2.5 block text-[15px] font-bold text-slate-700">ADM Number</label>
              <input
                type="text" value={form.adm_no}
                onChange={(e) => set("adm_no", e.target.value)}
                placeholder="e.g. NBI/001/2024" autoComplete="off"
                className={inputCls} style={inputStyle}
              />
            </div>

            <div>
              <label className="mb-2.5 block text-[15px] font-bold text-slate-700">Parent / Guardian Phone</label>
              <input
                type="tel" value={form.parent_phone}
                onChange={(e) => set("parent_phone", e.target.value)}
                placeholder="e.g. 0712345678" autoComplete="tel"
                className={inputCls} style={inputStyle}
              />
              <div
                className="mt-2.5 flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[13px] text-slate-600"
                style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}
              >
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Your password will be the <strong className="mx-1 text-emerald-700">first 7 digits</strong> of this number
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5 text-[14px] text-red-600"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}>
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="mt-2 w-full rounded-2xl py-4 text-[16px] font-black text-white shadow-lg transition active:scale-[.98] disabled:opacity-60 sm:py-3.5 sm:text-base"
              style={{ background: "linear-gradient(135deg, #10b981, #0ea5e9)", boxShadow: "0 10px 28px rgba(16,185,129,0.38)" }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account…
                </span>
              ) : "Create Account"}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-[15px] text-slate-500 sm:mt-6 sm:text-sm">
          Already have an account?{" "}
          <Link href="/student/sign-in" className="font-black text-emerald-600 transition hover:text-emerald-700">
            Sign in
          </Link>
        </p>

        <p className="mt-5 text-center text-xs text-slate-400">
          ElimuPawa · Secure · Built for Kenyan schools
        </p>
      </div>
    </div>
  );
}
