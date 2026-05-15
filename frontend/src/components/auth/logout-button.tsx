"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { logoutDemoUser } from "@/lib/api";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await logoutDemoUser();

    router.push("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-full p-2 text-[var(--subtext)] transition hover:bg-black/5 hover:text-[var(--text)] dark:hover:bg-white/10"
      aria-label="Logout"
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}
