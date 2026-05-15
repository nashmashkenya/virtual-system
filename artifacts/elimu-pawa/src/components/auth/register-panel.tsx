import { Link, useLocation } from "wouter";
import { useMemo, useState } from "react";
import { ArrowRight, GraduationCap, Presentation } from "lucide-react";
import { registerUser } from "@/lib/api";

function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

const inputCls =
  "w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3.5 text-[15px] text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/30";

export function RegisterPanel() {
  const [, navigate] = useLocation();
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schoolClass, setSchoolClass] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const digits = phoneDigits(phoneNumber);
  const autoPassword = digits.slice(0, 7);
  const passwordReady = digits.length >= 7;

  const passwordHint = useMemo(() => {
    if (passwordReady) return `Your password will be: ${autoPassword}`;
    return `Enter your phone number — your password is the first 7 digits.`;
  }, [phoneNumber]);

  const handleSubmit = async () => {
    setError("");
    if (role === "teacher") {
      if (!firstName.trim() || !password) {
        setError("Please fill in all fields.");
        return;
      }
      if (!/^\d{4}$/.test(password)) {
        setError("PIN must be exactly 4 digits.");
        return;
      }
      setLoading(true);
      try {
        const slug = firstName.trim().toLowerCase().replace(/\s+/g, ".");
        const result = await registerUser({
          first_name: firstName.trim(),
          last_name: "",
          username: slug,
          email: `${slug}@elimupawa.local`,
          password,
          role: "teacher",
        });
        navigate(result.user.role === "teacher" ? "/teacher" : "/student");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to create account.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !username.trim() || !schoolClass.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (!passwordReady) {
      setError("Enter at least 7 digits of your phone number.");
      return;
    }
    setLoading(true);
    try {
      const result = await registerUser({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: username.trim(),
        role: "student",
        school_class: schoolClass.trim(),
        phone_number: phoneNumber.trim(),
      });
      navigate(result.user.role === "teacher" ? "/teacher" : "/student");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account.");
    } finally {
      setLoading(false);
    }
  };

  const isTeacher = role === "teacher";

  return (
    <div className="w-full max-w-md space-y-6">

      {/* Heading */}
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-400">Create account</p>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          {isTeacher ? "Join as a teacher" : "Join your class 🎒"}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isTeacher
            ? "Set up your teacher account to start hosting classes."
            : "Use your school admission number and phone number to sign up."}
        </p>
      </div>

      {/* Role toggle */}
      <div
        className="flex gap-1 rounded-2xl p-1"
        style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(99,102,241,0.15)", backdropFilter: "blur(8px)" }}
      >
        {([
          { key: "student", label: "I'm a Student", icon: GraduationCap },
          { key: "teacher", label: "I'm a Teacher", icon: Presentation },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setRole(key); setError(""); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
              role === key
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {/* Form fields */}
      <div
        className="space-y-4 rounded-3xl p-6"
        style={{
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 8px 40px rgba(79,70,229,0.10), 0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        {isTeacher ? (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Your name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Grace Njeri" autoComplete="given-name" className={inputCls} />
              <p className="mt-1.5 text-xs text-slate-400">Your login username will be set from your name.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">4-digit PIN</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="e.g. 1234"
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoComplete="new-password"
                className={inputCls}
              />
              <p className="mt-1.5 text-xs text-slate-400">Choose any 4 numbers you'll remember.</p>
            </div>
          </>
        ) : (
          <>
            {/* Name row */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">First name</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Aisha" autoComplete="given-name" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Last name</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Noor" autoComplete="family-name" className={inputCls} />
              </div>
            </div>

            {/* Admission number */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Admission number</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. 4521/2024" autoComplete="username" className={inputCls} />
              <p className="mt-1.5 text-xs text-slate-400">This is your login username.</p>
            </div>

            {/* Class */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Your class</label>
              <input value={schoolClass} onChange={(e) => setSchoolClass(e.target.value)} placeholder="e.g. Form 4A" className={inputCls} />
            </div>

            {/* Phone — generates password */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Phone number</label>
              <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="e.g. 0712 345 678" inputMode="numeric" autoComplete="tel" className={inputCls} />

              {/* Password preview */}
              <div
                className={`mt-3 flex items-start gap-2.5 rounded-xl p-3 text-xs transition-all ${
                  passwordReady
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                }`}
              >
                <span className="mt-0.5 text-base leading-none">{passwordReady ? "🔐" : "💡"}</span>
                <span className="leading-relaxed">
                  {passwordReady
                    ? <>Your login password will be <strong className="font-bold tracking-widest">{autoPassword}</strong> — remember it!</>
                    : "Your password is automatically set from the first 7 digits of your phone number."}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-bold text-white shadow-lg transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}
        >
          {loading ? "Creating your account…" : isTeacher ? "Start teaching →" : "Join the class →"}
        </button>
      </div>

      {/* Footer link */}
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-indigo-600 transition hover:underline dark:text-indigo-400">
          Sign in here
        </Link>
      </p>
    </div>
  );
}
