import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StudentHomeDashboard } from "@/components/student/student-home-dashboard";
import { getCurrentDemoUser } from "@/lib/api";
import type { DemoUser } from "@/lib/types";

export function StudentHomePage() {
  const [, navigate] = useLocation();
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = await getCurrentDemoUser();
      if (!user) {
        navigate("/");
        return;
      }
      if (user.role === "teacher" || user.role === "admin") {
        navigate("/teacher");
        return;
      }
      setCurrentUser(user);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [navigate]);

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <DashboardShell
      title="Your learning hub"
      subtitle="See your upcoming sessions, track progress, and manage your account."
      role="Student"
      currentUser={currentUser}
    >
      <StudentHomeDashboard fullName={currentUser.full_name} />
    </DashboardShell>
  );
}
