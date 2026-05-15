import { Moon, Sun } from "lucide-react";
import { useAppStore } from "@/lib/store";

export function ThemeToggle() {
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 text-[var(--subtext)] transition hover:bg-[var(--background-soft)] hover:text-[var(--text)]"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
