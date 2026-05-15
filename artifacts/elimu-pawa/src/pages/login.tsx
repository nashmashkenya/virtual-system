import { useEffect, useState } from "react";
import { LoginPanel } from "@/components/auth/login-panel";
import { getDemoUsers } from "@/lib/api";
import { demoUsersFallback } from "@/lib/mock-data";
import type { DemoUser } from "@/lib/types";

export function LoginPage() {
  const [users, setUsers] = useState<DemoUser[]>(demoUsersFallback);

  useEffect(() => {
    getDemoUsers().then(setUsers).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(37,99,235,0.18),transparent_55%)]" aria-hidden />
      <div className="flex min-h-screen items-center justify-center px-4 py-16">
        <LoginPanel users={users} />
      </div>
    </div>
  );
}
