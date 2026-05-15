import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginPanel } from "@/components/auth/login-panel";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getCurrentDemoUser, getDemoUsers } from "@/lib/api";
import { getAccessToken } from "@/lib/demo-session";

export default async function LoginPage() {
  const existingToken = await getAccessToken();

  if (existingToken) {
    const currentUser = await getCurrentDemoUser(existingToken);
    if (currentUser) {
      redirect(currentUser.role === "teacher" ? "/teacher" : "/student");
    }
  }

  const users = await getDemoUsers();

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -left-[18%] top-[-8%] h-[400px] w-[400px] rounded-full bg-[var(--primary)]/[0.11] blur-[96px] dark:bg-blue-500/18" />
        <div className="absolute -right-[12%] bottom-[10%] h-[360px] w-[360px] rounded-full bg-[var(--accent)]/[0.09] blur-[96px] dark:bg-violet-500/12" />
      </div>
      <main className="mx-auto min-h-screen max-w-[1400px] px-4 py-4 sm:px-6 lg:px-8">
        <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/"
              className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--background-soft)]"
            >
              Back to home
            </Link>
          </div>
        </section>
        <LoginPanel users={users} />
      </main>
    </div>
  );
}
