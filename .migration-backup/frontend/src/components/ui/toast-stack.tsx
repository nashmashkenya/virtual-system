"use client";

import { useEffect } from "react";
import { BellRing, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useAppStore, type ToastTone } from "@/lib/store";

const toneStyles: Record<ToastTone, string> = {
  success:
    "border-emerald-200/70 bg-emerald-50/95 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/12 dark:text-emerald-100",
  warning:
    "border-amber-200/70 bg-amber-50/95 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/12 dark:text-amber-100",
  info: "border-blue-200/70 bg-blue-50/95 text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/12 dark:text-blue-100",
};

const toneIcons: Record<ToastTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: TriangleAlert,
  info: Info,
};

export function ToastStack() {
  const notifications = useAppStore((state) => state.notifications);
  const dismissNotification = useAppStore((state) => state.dismissNotification);
  const visibleNotifications = notifications.slice(0, 3);

  useEffect(() => {
    if (!visibleNotifications.length) {
      return;
    }

    const timers = visibleNotifications.map((toast) =>
      window.setTimeout(() => dismissNotification(toast.id), 5000),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dismissNotification, visibleNotifications]);

  if (!visibleNotifications.length) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col gap-3 md:inset-x-auto md:right-6 md:bottom-6 md:w-[360px]">
      {visibleNotifications.map((toast) => {
        const Icon = toneIcons[toast.tone];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto slide-up rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur ${toneStyles[toast.tone]}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-white/70 p-2 text-current dark:bg-slate-900/40">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <BellRing className="h-3.5 w-3.5 opacity-70" />
                  <p className="text-sm font-semibold">{toast.title}</p>
                </div>
                <p className="mt-1 text-sm opacity-85">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismissNotification(toast.id)}
                className="rounded-full p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
