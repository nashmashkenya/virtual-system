import { useState } from "react";
import { useClerk } from "@clerk/react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const { signOut } = useClerk();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut({ redirectUrl: "/" });
    } finally {
      setLoading(false);
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
