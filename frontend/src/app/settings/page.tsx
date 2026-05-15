import { BellRing, MoonStar, ShieldCheck, Smartphone } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { requireDemoUser } from "@/lib/demo-session";

export default async function SettingsPage() {
  const currentUser = await requireDemoUser();
  const initials = currentUser.full_name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DashboardShell
      title="Workspace settings"
      subtitle="Control dark mode, notifications, mobile preferences, and access protections from one simple surface."
      role="Settings"
      currentUser={currentUser}
    >
      <div className="grid gap-6 xl:grid-cols-3">
        <section className="surface-card p-6 xl:col-span-2">
          <h2 className="text-xl font-bold">Appearance and experience</h2>
          <p className="mt-1 text-sm text-[var(--subtext)]">
            The design system keeps spacing, radius, color, and motion consistent across every classroom screen.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="surface-muted p-5">
              <div className="mb-4 flex items-center gap-3">
                <MoonStar className="h-5 w-5 text-[var(--primary)]" />
                <p className="font-semibold text-[var(--text)]">Dark mode</p>
              </div>
              <p className="text-sm leading-7 text-[var(--subtext)]">
                Switch between light and dark palettes built specifically for a polished SaaS feel.
              </p>
              <div className="mt-4">
                <ThemeToggle />
              </div>
            </div>

            <div className="surface-muted p-5">
              <div className="mb-4 flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-[var(--accent)]" />
                <p className="font-semibold text-[var(--text)]">Mobile layout</p>
              </div>
              <p className="text-sm leading-7 text-[var(--subtext)]">
                Bottom navigation, compact cards, and stacked actions make every workflow work well on phones.
              </p>
            </div>

            <div className="surface-muted p-5">
              <div className="mb-4 flex items-center gap-3">
                <BellRing className="h-5 w-5 text-[var(--warning)]" />
                <p className="font-semibold text-[var(--text)]">Notifications</p>
              </div>
              <p className="text-sm leading-7 text-[var(--subtext)]">
                Toasts alert students when class starts and confirm key classroom actions in real time.
              </p>
            </div>

            <div className="surface-muted p-5">
              <div className="mb-4 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[var(--success)]" />
                <p className="font-semibold text-[var(--text)]">Access controls</p>
              </div>
              <p className="text-sm leading-7 text-[var(--subtext)]">
                Lesson access controls help teachers manage classroom entry without confusing learners.
              </p>
            </div>
          </div>
        </section>

        <aside className="surface-card p-6">
          <h2 className="text-xl font-bold">Profile summary</h2>
          <div className="mt-5 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--secondary)] to-[var(--accent)] text-lg font-bold text-white">
              {initials}
            </div>
            <div>
              <p className="font-semibold text-[var(--text)]">{currentUser.full_name}</p>
              <p className="text-sm capitalize text-[var(--subtext)]">{currentUser.role}, ElimuPawa Demo School</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {[
              "Inter typography and polished radius scale are active.",
              "Soft shadow tokens are applied to cards and sticky shells.",
              "Primary brand color remains #2563EB across key CTAs.",
            ].map((item) => (
              <div key={item} className="rounded-2xl bg-[var(--background-soft)] px-4 py-3 text-sm text-[var(--text)]">
                {item}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
