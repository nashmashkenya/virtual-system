import { X } from "lucide-react";
import { useAppStore } from "@/lib/store";

export function ToastStack() {
  const notifications = useAppStore((state) => state.notifications);
  const dismissNotification = useAppStore((state) => state.dismissNotification);

  if (!notifications.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" aria-live="polite">
      {notifications.map((toast) => (
        <div
          key={toast.id}
          className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-lg"
        >
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--text)]">{toast.title}</p>
            {toast.message ? (
              <p className="mt-0.5 text-xs text-[var(--subtext)]">{toast.message}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => dismissNotification(toast.id)}
            className="shrink-0 rounded-lg p-0.5 text-[var(--subtext)] hover:bg-[var(--background-soft)] hover:text-[var(--text)]"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
