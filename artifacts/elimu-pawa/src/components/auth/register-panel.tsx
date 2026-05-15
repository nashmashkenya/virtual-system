import { Link, useLocation } from "wouter";
import { useMemo, useState } from "react";
import { ArrowRight, GraduationCap, UserPlus } from "lucide-react";
import { registerUser } from "@/lib/api";

function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

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

  const studentPasswordHint = useMemo(() => {
    const d = phoneDigits(phoneNumber);
    if (d.length >= 7) {
      return `Your login password will be: ${d.slice(0, 7)} (first 7 digits of your phone number).`;
    }
    return "Your password will be the first 7 digits of your phone number (at least 7 digits required).";
  }, [phoneNumber]);

  const handleSubmit = async () => {
    if (role === "teacher") {
      const trimmedName = firstName.trim();
      const trimmedEmail = email.trim();
      if (!trimmedName || !trimmedEmail || !password) {
        setError("Enter your name, email, and password.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const result = await registerUser({
          first_name: trimmedName,
          last_name: "",
          username: trimmedEmail.toLowerCase(),
          email: trimmedEmail.toLowerCase(),
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
      setError("Enter first name, last name, admission number, and class (e.g. 4A).");
      return;
    }
    if (phoneDigits(phoneNumber).length < 7) {
      setError("Phone number must include at least 7 digits. Your password uses the first 7 digits.");
      return;
    }

    setLoading(true);
    setError("");

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
    <div className="surface-card mx-auto w-full max-w-4xl p-6 sm:p-8">
      <div className={`grid gap-8 ${isTeacher ? "max-w-lg mx-auto lg:max-w-xl" : "lg:grid-cols-[0.9fr_1.1fr]"}`}>
        <div className={`space-y-5 ${isTeacher ? "text-center lg:text-left" : ""}`}>
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                <UserPlus className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">Create account</h1>
            </div>
            <p className="text-sm leading-relaxed text-[var(--subtext)]">
              Join ElimuPawa Classroom as a student or teacher. Live sessions, quizzes, and realtime chat — all in one
              space.
            </p>
          </div>

          <div className="flex gap-2">
            {(["student", "teacher"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold capitalize transition ${
                  role === r
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-lg"
                    : "border-[var(--border)] text-[var(--subtext)] hover:border-[var(--primary)]/40 hover:bg-[var(--background-soft)] hover:text-[var(--text)]"
                }`}
              >
                {r === "teacher" ? <GraduationCap className="h-4 w-4" /> : null}
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {isTeacher ? (
            <>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--subtext)]">First name / Display name</span>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="given-name"
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--subtext)]">Email (this is your login username)</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.com"
                  type="email"
                  autoComplete="email"
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--subtext)]">Password (at least 8 characters)</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a password"
                  type="password"
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                />
              </label>
            </>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--subtext)]">First name</span>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    autoComplete="given-name"
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--subtext)]">Last name</span>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    autoComplete="family-name"
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--subtext)]">School admission number (this is your login username)</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. 4521/2024"
                  autoComplete="username"
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--subtext)]">School class</span>
                  <input
                    value={schoolClass}
                    onChange={(e) => setSchoolClass(e.target.value)}
                    placeholder="e.g. 4A, 4B"
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--subtext)]">Phone number</span>
                <input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 0712 345 678"
                  autoComplete="tel"
                  inputMode="numeric"
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                />
                <p className="mt-2 text-xs text-[var(--subtext)]">{studentPasswordHint}</p>
              </label>
            </>
          )}

          {error ? <p className="text-sm text-rose-500">{error}</p> : null}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Creating account..." : isTeacher ? "Start teaching" : "Create account"}
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="text-sm text-[var(--subtext)]">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[var(--primary)] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
