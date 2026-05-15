import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterPanel } from "@/components/auth/register-panel";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getCurrentDemoUser } from "@/lib/api";
import { getAccessToken } from "@/lib/demo-session";

export default async function RegisterPage() {
  const existingToken = await getAccessToken();

  if (existingToken) {
    const currentUser = await getCurrentDemoUser(existingToken);
    if (currentUser) {
      redirect(currentUser.role === "teacher" ? "/teacher" : "/student");
    }
  }

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
      <RegisterPanel />
    </main>
  );
}
