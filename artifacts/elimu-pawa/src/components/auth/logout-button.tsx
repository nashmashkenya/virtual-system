import { useState } from "react";
import { useLocation } from "wouter";
import { LogOut } from "lucide-react";
import { logoutDemoUser } from "@/lib/api";

export function LogoutButton() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutDemoUser();
    } finally {
      setLoading(false);
      navigate("/login");
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="rounded-xl border border-[var(--border)] bg-transparent p-2 text-[var(--subtext)] transition hover:bg-[var(--background-soft)] hover:text-[var(--text)] disabled:opacity-60"
      aria-label="Sign out"
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}
