import Link from "next/link";
import { ForgotPasswordPanel } from "@/components/auth/forgot-password-panel";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto min-h-screen max-w-[1400px] px-4 py-4 sm:px-6 lg:px-8">
      <section className="mb-8 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--background-soft)]"
          >
            Back to login
          </Link>
        </div>
      </section>
      <ForgotPasswordPanel />
    </main>
  );
}
