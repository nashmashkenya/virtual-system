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

  const inputCls = "w-full rounded-2xl border border-white/60 bg-white/60 px-4 py-4 text-base text-slate-800 placeholder-slate-400 shadow-sm outline-none backdrop-blur-sm transition focus:border-emerald-400 focus:bg-white/80 focus:ring-2 focus:ring-emerald-400/25";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden"
      style={{ background: "linear-gradient(145deg, #e8f4fd 0%, #ede8ff 30%, #fce8f5 58%, #e4f8f0 82%, #fdf8e8 100%)" }}>

      {/* Ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -right-32 -top-16 h-96 w-96 rounded-full bg-violet-400/20 blur-[100px]" />
        <div className="absolute -bottom-10 -left-10 h-80 w-80 rounded-full bg-sky-400/20 blur-[90px]" />
        <div className="absolute bottom-1/3 right-1/4 h-64 w-64 rounded-full bg-emerald-400/15 blur-[80px]" />
      </div>

      {/* Back */}
      <div className="relative px-5 pt-5">
        <button onClick={() => step === 2 ? setStep(1) : history.back()}
          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white/50 active:scale-95"
          style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.7)", backdropFilter: "blur(12px)" }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          {step === 2 ? "Back" : "Home"}
        </button>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-8">
        <div className="w-full max-w-[460px]">

          {/* Badge + step */}
          <div className="mb-5 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-emerald-700"
              style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(16,185,129,0.3)", backdropFilter: "blur(12px)" }}>
              📚 Student Account
            </span>
            <span className="text-xs font-semibold text-slate-400">Step {step} of 2</span>
          </div>

          {/* Progress bar */}
          <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-white/40" style={{ border: "1px solid rgba(255,255,255,0.6)" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: step === 1 ? "50%" : "100%", background: "linear-gradient(90deg, #10b981, #0ea5e9)" }} />
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

            <div className="mb-6 text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
                  style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)", boxShadow: "0 8px 24px rgba(139,92,246,0.3)" }}>
                  <span className="text-2xl">{step === 1 ? "👋" : "🔐"}</span>
                </div>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                {step === 1 ? "Create Account" : "Your Credentials"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {step === 1 ? "Tell us a bit about yourself" : "Almost done — just a few more details"}
              </p>
            </div>

            {step === 1 ? (
              <form onSubmit={goToStep2} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">First Name</label>
                    <input type="text" value={form.first_name} onChange={(e) => set("first_name", e.target.value)}
                      placeholder="e.g. Brian" autoComplete="given-name" className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Last Name</label>
                    <input type="text" value={form.last_name} onChange={(e) => set("last_name", e.target.value)}
                      placeholder="e.g. Otieno" autoComplete="family-name" className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Class / Form</label>
                  <select value={form.class_level} onChange={(e) => set("class_level", e.target.value)}
                    className={inputCls + " cursor-pointer"}>
                    <option value="">Select your class…</option>
                    {classLevels.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm text-red-600"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <svg className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                    {error}
                  </div>
                )}

                <button type="submit"
                  className="w-full rounded-2xl py-4 text-base font-bold text-white shadow-lg transition active:scale-[.98]"
                  style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)", boxShadow: "0 8px 24px rgba(139,92,246,0.3)" }}>
                  Continue →
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">ADM Number</label>
                  <input type="text" value={form.adm_no} onChange={(e) => set("adm_no", e.target.value)}
                    placeholder="e.g. NBI/001/2024" autoComplete="off" className={inputCls} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Parent / Guardian Phone</label>
                  <input type="tel" value={form.parent_phone} onChange={(e) => set("parent_phone", e.target.value)}
                    placeholder="e.g. 0712345678" autoComplete="tel" className={inputCls} />
                  <div className="mt-2 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs text-slate-600"
                    style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                    <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Your password will be the <strong className="mx-0.5 text-emerald-700">first 7 digits</strong> of this number
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm text-red-600"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <svg className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full rounded-2xl py-4 text-base font-bold text-white shadow-lg transition active:scale-[.98] disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #10b981, #0ea5e9)", boxShadow: "0 8px 24px rgba(16,185,129,0.35)" }}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Creating account…
                    </span>
                  ) : "Create Account"}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                Already have an account?{" "}
                <Link href="/student/sign-in" className="font-bold text-emerald-600 transition hover:text-emerald-700">Sign in</Link>
              </p>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-slate-400">
            ElimuPawa · Secure · Built for Kenyan schools
          </p>
        </div>
      </div>
    </div>
  );
}
