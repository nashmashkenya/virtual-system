"use client";

import Link from "next/link";
import { useState } from "react";
import { requestPasswordReset } from "@/lib/api";

export function ForgotPasswordPanel() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email) {
      setError("Enter your email to request a reset link.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setResetUrl("");

    try {
      const result = await requestPasswordReset({ email });
      setMessage(result.message);
      setResetUrl(result.reset_url ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="surface-card mx-auto w-full max-w-2xl p-6 sm:p-8">
      <h1 className="text-3xl font-bold tracking-tight">Reset your password</h1>
      <p className="mt-3 text-sm leading-7 text-[var(--subtext)]">
        Request a secure reset link for your ElimuPawa Classroom account.
      </p>

      <div className="mt-6 space-y-4">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          placeholder="Email address"
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none transition focus:border-blue-400"
        />

        {message ? <p className="text-sm text-emerald-600 dark:text-emerald-300">{message}</p> : null}
        {error ? <p className="text-sm text-rose-500">{error}</p> : null}

        {resetUrl ? (
          <div className="rounded-2xl bg-blue-50/80 px-4 py-3 text-sm text-blue-900 dark:bg-blue-500/12 dark:text-blue-100">
            Development reset link:
            {" "}
            <Link href={resetUrl.replace("http://localhost:3000", "")} className="font-semibold underline">
              Open reset page
            </Link>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-2xl bg-[var(--primary)] px-5 py-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Preparing reset..." : "Send reset link"}
        </button>

        <Link href="/login" className="block text-center text-sm font-semibold text-[var(--primary)]">
          Back to login
        </Link>
      </div>
    </div>
  );
}
