import { useState } from "react";
import { Link, useLocation } from "wouter";
import { studentRegister } from "@/lib/student-auth";

const CLASS_LEVELS = [
  "PP1", "PP2",
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9",
  "Form 1", "Form 2", "Form 3", "Form 4",
];

export function StudentSignUpPage() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    class_level: "",
    adm_no: "",
    parent_phone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim()) return setError("First name is required.");
    if (!form.last_name.trim()) return setError("Last name is required.");
    if (!form.class_level) return setError("Please select your class.");
    if (!form.adm_no.trim()) return setError("ADM No is required.");
    if (!form.parent_phone.trim()) return setError("Parent phone number is required.");
    if (!/^\d/.test(form.parent_phone.trim())) return setError("Parent phone must start with a digit (e.g. 0712345678).");

    setLoading(true);
    const result = await studentRegister(form);
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

      <div className="w-full max-w-[480px]">
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
            <h1 className="text-xl font-bold text-white">Create Student Account</h1>
            <p className="mt-1 text-sm text-slate-400">Fill in your details to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">First Name</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                  placeholder="e.g. Brian"
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Last Name</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                  placeholder="e.g. Otieno"
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Class</label>
              <select
                value={form.class_level}
                onChange={(e) => set("class_level", e.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
              >
                <option value="">Select your class…</option>
                {CLASS_LEVELS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">ADM No</label>
              <input
                type="text"
                value={form.adm_no}
                onChange={(e) => set("adm_no", e.target.value)}
                placeholder="e.g. NBI/001/2024"
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Parent / Guardian Phone Number</label>
              <input
                type="tel"
                value={form.parent_phone}
                onChange={(e) => set("parent_phone", e.target.value)}
                placeholder="e.g. 0712345678"
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
              />
              <p className="mt-1.5 text-xs text-slate-500">Your password will be the <strong className="text-slate-400">first digit</strong> of this number</p>
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
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/student/sign-in" className="font-semibold text-emerald-400 hover:text-emerald-300">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
