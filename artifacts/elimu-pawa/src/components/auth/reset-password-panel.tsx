import { Link, useLocation } from "wouter";
import { useState } from "react";
import { confirmPasswordReset } from "@/lib/api";

export function ResetPasswordPanel({ uid, token }: { uid?: string; token?: string }) {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!uid || !token) {
      setError("This reset link is incomplete.");
      return;
    }

    if (!password || password !== confirmPassword) {
      setError("Passwords must match.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await confirmPasswordReset({ uid, token, new_password: password });
      setMessage(result.message);
      window.setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="surface-card mx-auto w-full max-w-2xl p-6 sm:p-8">
      <h1 className="text-3xl font-bold tracking-tight">Choose a new password</h1>
      <p className="mt-3 text-sm leading-7 text-[var(--subtext)]">
        Enter a strong new password to restore access to your ElimuPawa Classroom account.
      </p>

      <div className="mt-6 space-y-4">
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="New password"
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none transition focus:border-blue-400"
        />
        <input
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          type="password"
          placeholder="Confirm new password"
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none transition focus:border-blue-400"
        />

        {message ? <p className="text-sm text-emerald-600 dark:text-emerald-300">{message}</p> : null}
        {error ? <p className="text-sm text-rose-500">{error}</p> : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-2xl bg-[var(--primary)] px-5 py-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Updating password..." : "Update password"}
        </button>

        <Link href="/login" className="block text-center text-sm font-semibold text-[var(--primary)]">
          Back to login
        </Link>
      </div>
    </div>
  );
}
