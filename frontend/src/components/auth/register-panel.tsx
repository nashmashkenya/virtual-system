"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, GraduationCap, UserPlus } from "lucide-react";
import { registerUser } from "@/lib/api";

/** Digits only; password rule uses the first 7. */
function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function RegisterPanel() {
  const router = useRouter();
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
        router.push(result.user.role === "teacher" ? "/teacher" : "/student");
        router.refresh();
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

      router.push(result.user.role === "teacher" ? "/teacher" : "/student");
      router.refresh();
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
          <div className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-[var(--primary)] dark:bg-blue-500/12 dark:text-blue-100">
            ElimuPawa Classroom onboarding
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isTeacher ? "Teacher sign up" : "Create your classroom account"}
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--subtext)]">
              {isTeacher
                ? "Add your name, school email, and a password—you can fill in more in your profile later."
                : "Students register with admission number and class. Login username is the admission number; password is the first 7 digits of the phone number."}
            </p>
          </div>
          {!isTeacher ? (
            <div className="surface-muted space-y-3 p-4">
              <div className="flex items-center gap-3 text-sm text-[var(--text)]">
                <UserPlus className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                You sign in with your admission number and the phone-based password—no email needed.
              </div>
              <div className="flex items-center gap-3 text-sm text-[var(--text)]">
                <GraduationCap className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                Teachers can still use email to register.
              </div>
            </div>
          ) : null}
          <Link href="/login" className="text-sm font-semibold text-[var(--primary)]">
            Already have an account? Sign in
          </Link>
        </div>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            {(["student", "teacher"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setRole(option);
                  setError("");
                }}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold capitalize transition ${
                  role === option
                    ? "border-blue-300 bg-blue-50 text-[var(--primary)] dark:border-blue-500/30 dark:bg-blue-500/12"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--subtext)]"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          {isTeacher ? (
            <>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--subtext)]">Your name</span>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="e.g. Mary Wanjiku"
                  autoComplete="name"
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--subtext)]">Email</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@school.org"
                  type="email"
                  autoComplete="email"
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--subtext)]">
                  Password (at least 8 characters)
                </span>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
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
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="First name"
                    autoComplete="given-name"
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--subtext)]">Last name</span>
                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Last name"
                    autoComplete="family-name"
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--subtext)]">
                  School admission number (this is your login username)
                </span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
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
                    onChange={(event) => setSchoolClass(event.target.value)}
                    placeholder="e.g. 4A, 4B"
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--subtext)]">Phone number</span>
                <input
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
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
        </div>
      </div>
    </div>
  );
}
