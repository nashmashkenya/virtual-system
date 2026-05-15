"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useAppStore } from "@/lib/store";

export function ThemeToggle() {
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="surface-muted flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-[var(--text)] transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      aria-label="Toggle dark mode"
    >
      <span
        suppressHydrationWarning
        className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
          theme === "dark"
            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
            : "bg-white text-slate-700"
        }`}
      >
        {theme === "dark" ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
      </span>
      <span suppressHydrationWarning className="hidden sm:block">
        {theme === "dark" ? "Dark mode" : "Light mode"}
      </span>
    </button>
  );
}
