import { useLocation } from "wouter";
import {
  Bell,
  BookOpen,
  CreditCard,
  GraduationCap,
  House,
  Layers3,
  Settings,
} from "lucide-react";
import { Link } from "wouter";
import { LogoutButton } from "@/components/auth/logout-button";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { DemoUser } from "@/lib/types";

const navItems = {
  student: [
    { href: "/student/home", label: "Home", icon: House },
    { href: "/student", label: "Classroom", icon: Layers3 },
    { href: "/payments", label: "Payments", icon: CreditCard },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
  teacher: [
    { href: "/teacher", label: "Dashboard", icon: House },
    { href: "/teacher", label: "Courses", icon: GraduationCap },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
  admin: [
    { href: "/teacher", label: "Dashboard", icon: House },
    { href: "/teacher", label: "Courses", icon: GraduationCap },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
} satisfies Record<DemoUser["role"], { href: string; label: string; icon: typeof House }[]>;

function isNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/student" || href === "/teacher") return false;
  return pathname.startsWith(href);
}

export function DashboardShell({
  title,
  subtitle,
  role,
  currentUser,
  layoutVariant = "default",
  children,
}: {
  title: string;
  subtitle: string;
  role: string;
  currentUser: DemoUser;
  layoutVariant?: "default" | "meeting";
  children: React.ReactNode;
}) {
  const [pathname] = useLocation();
  const items = navItems[currentUser.role] ?? navItems.student;
  const showTeacherGuide = currentUser.role === "teacher" || currentUser.role === "admin";
  const initials = currentUser.full_name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (layoutVariant === "meeting") {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--text)] transition-colors duration-200">
        <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_88%,transparent)] shadow-sm backdrop-blur-md dark:bg-[color-mix(in_srgb,#202124_92%,transparent)]">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-4">
              <Logo />
              <div className="hidden min-w-0 md:block">
                <p className="truncate text-sm font-semibold text-[var(--text)]">{title}</p>
                <p className="truncate text-xs text-[var(--subtext)]">{subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
              {showTeacherGuide ? (
                <Link
                  href="/docs/teacher-guide"
                  className="surface-muted inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--background-soft)]"
                >
                  <BookOpen className="h-4 w-4 text-[var(--primary)]" aria-hidden />
                  <span className="hidden sm:inline">Teacher guide</span>
                </Link>
              ) : null}
              <div className="flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--background-soft)] px-3 py-2 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white shadow-sm">
                  {initials}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-semibold text-[var(--text)]">{currentUser.full_name}</p>
                  <p className="text-xs capitalize text-[var(--subtext)]">{role}</p>
                </div>
                <LogoutButton />
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-transparent">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="surface-card sticky top-4 hidden h-[calc(100vh-2rem)] w-[280px] shrink-0 flex-col justify-between p-5 lg:flex">
          <div className="space-y-8">
            <Logo />
            <nav className="space-y-2">
              {items.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition duration-200 ${
                      active
                        ? "bg-[var(--primary)] text-white shadow-lg shadow-blue-500/20"
                        : "text-[var(--subtext)] hover:bg-[var(--background-soft)] hover:text-[var(--text)]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="surface-muted space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">ElimuPawa AI Assist</p>
                <p className="text-xs text-[var(--subtext)]">Realtime class moderation active</p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                Live
              </span>
            </div>
            <ThemeToggle />
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-28 lg:pb-0">
          <header className="surface-card sticky top-4 z-30 mb-6 flex flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-1 inline-flex rounded-full bg-[var(--background-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
                {role}
              </div>
              <h1 className="truncate text-xl font-bold tracking-tight text-[var(--text)] sm:text-2xl lg:text-3xl">{title}</h1>
              <p className="mt-0.5 hidden text-sm text-[var(--subtext)] sm:block sm:text-base">{subtitle}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
              {showTeacherGuide ? (
                <Link
                  href="/docs/teacher-guide"
                  className="surface-muted inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--background-soft)]"
                >
                  <BookOpen className="h-4 w-4 text-[var(--primary)]" aria-hidden />
                  <span className="hidden sm:inline">Teacher guide</span>
                </Link>
              ) : null}
              <button
                type="button"
                className="surface-muted flex h-10 w-10 items-center justify-center rounded-2xl transition hover:-translate-y-0.5 sm:h-12 sm:w-12"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <div className="surface-muted flex items-center gap-2 rounded-2xl px-2.5 py-2 sm:gap-3 sm:px-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--secondary)] to-[var(--accent)] text-xs font-bold text-white sm:h-10 sm:w-10 sm:rounded-2xl sm:text-sm">
                  {initials}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-semibold text-[var(--text)]">{currentUser.full_name}</p>
                  <p className="text-xs capitalize text-[var(--subtext)]">{currentUser.role}</p>
                </div>
                <LogoutButton />
              </div>
            </div>
          </header>
          {children}
        </div>
      </div>

      <nav className="surface-card fixed inset-x-2 bottom-3 z-40 flex items-center justify-between gap-1 px-2 py-2 sm:inset-x-4 sm:bottom-4 lg:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[10px] font-medium transition sm:px-2 sm:text-[11px] ${
                active ? "bg-[var(--primary)] text-white" : "text-[var(--subtext)]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
