"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  GraduationCap,
  House,
  Layers3,
  Settings,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { DemoUser } from "@/lib/types";

const navItems = {
  student: [
    { href: "/student", label: "Dashboard", icon: House },
    { href: "/student", label: "Classes", icon: Layers3 },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
  teacher: [
    { href: "/teacher", label: "Dashboard", icon: House },
    { href: "/teacher", label: "Courses", icon: GraduationCap },
    { href: "/teacher", label: "Classes", icon: Layers3 },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
  admin: [
    { href: "/teacher", label: "Dashboard", icon: House },
    { href: "/teacher", label: "Courses", icon: GraduationCap },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
} satisfies Record<DemoUser["role"], { href: string; label: string; icon: typeof House }[]>;

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
  const pathname = usePathname();
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
                <a
                  href="/docs/teacher-guide.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="surface-muted inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--background-soft)]"
                >
                  <BookOpen className="h-4 w-4 text-[var(--primary)]" aria-hidden />
                  <span className="hidden sm:inline">Teacher guide</span>
                </a>
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
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="surface-card sticky top-4 hidden h-[calc(100vh-2rem)] w-[280px] shrink-0 flex-col justify-between p-5 lg:flex">
          <div className="space-y-8">
            <Logo />
            <nav className="space-y-2">
              {items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href || (item.href !== "/student" && pathname.startsWith(item.href));

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

        <div className="min-w-0 flex-1">
          <header className="surface-card sticky top-4 z-30 mb-6 flex flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex rounded-full bg-[var(--background-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
                {role}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">{title}</h1>
              <p className="mt-1 text-sm text-[var(--subtext)] sm:text-base">{subtitle}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
              {showTeacherGuide ? (
                <a
                  href="/docs/teacher-guide.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="surface-muted inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--background-soft)]"
                >
                  <BookOpen className="h-4 w-4 text-[var(--primary)]" aria-hidden />
                  <span className="hidden sm:inline">Teacher guide</span>
                </a>
              ) : null}
              <button
                type="button"
                className="surface-muted flex h-12 w-12 items-center justify-center rounded-2xl transition hover:-translate-y-0.5"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
              </button>
              <div className="surface-muted flex items-center gap-3 rounded-2xl px-3 py-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--secondary)] to-[var(--accent)] text-sm font-bold text-white">
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

      <nav className="surface-card fixed inset-x-4 bottom-4 z-40 flex items-center justify-between px-3 py-2 lg:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || (item.href !== "/student" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${
                active ? "bg-[var(--primary)] text-white" : "text-[var(--subtext)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
