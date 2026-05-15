
import { CircleCheckBig, CreditCard, ShieldCheck, Smartphone } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { PaymentSummaryData } from "@/lib/types";

export function PaymentOverview({
  summary,
  currentUsername,
}: {
  summary: PaymentSummaryData;
  currentUsername: string;
}) {
  const hasPaid = useAppStore((state) => state.paidUsernames.includes(currentUsername));

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="surface-card p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Course checkout</h2>
            <p className="mt-1 text-sm text-[var(--subtext)]">
              Show the course name, price, and phone input in a focused payment sheet.
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--background-soft)] p-3 text-[var(--primary)]">
            <Smartphone className="h-5 w-5" />
          </div>
        </div>

        <div className="surface-muted space-y-4 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--subtext)]">Course name</span>
            <span className="text-sm font-semibold text-[var(--text)]">{summary.course_name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--subtext)]">Plan</span>
            <span className="text-sm font-semibold text-[var(--text)]">{summary.plan}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--subtext)]">Price</span>
            <span className="text-2xl font-bold text-[var(--text)]">{summary.price}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { title: "M-Pesa first", icon: Smartphone },
            { title: "Instant unlock", icon: CircleCheckBig },
            { title: "Secure checkout", icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="surface-muted p-4">
                <Icon className="h-5 w-5 text-[var(--primary)]" />
                <p className="mt-3 text-sm font-semibold text-[var(--text)]">{item.title}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-6">
        <div className="surface-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Payment states</h2>
              <p className="mt-1 text-sm text-[var(--subtext)]">
                Helpful screens prevent confusion and reduce failed joins.
              </p>
            </div>
            <CreditCard className="h-5 w-5 text-[var(--accent)]" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-dashed border-amber-300 bg-amber-50/80 p-5 dark:border-amber-500/25 dark:bg-amber-500/10">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-200">Before payment</p>
              <p className="mt-2 text-sm leading-7 text-amber-900 dark:text-amber-100">
                Students see a payment lock screen with a bold CTA, pricing summary, and the M-Pesa phone field.
              </p>
            </div>
            <div className="rounded-[24px] border border-dashed border-emerald-300 bg-emerald-50/80 p-5 dark:border-emerald-500/25 dark:bg-emerald-500/10">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">After payment</p>
              <p className="mt-2 text-sm leading-7 text-emerald-900 dark:text-emerald-100">
                A success animation confirms payment, unlocks attendance, and opens the live classroom instantly.
              </p>
            </div>
          </div>
        </div>

        <div className="surface-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Current product state</h2>
              <p className="mt-1 text-sm text-[var(--subtext)]">
                This screen now reads its summary from the API layer and mirrors the student payment state.
              </p>
            </div>
            <span
              suppressHydrationWarning
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                hasPaid
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-300"
              }`}
            >
              {hasPaid ? "Paid and unlocked" : summary.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
