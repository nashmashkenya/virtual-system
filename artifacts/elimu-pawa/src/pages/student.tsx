import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { LiveClassroom } from "@/components/classroom/live-classroom";
import { getStudentDashboard, getCurrentDemoUser } from "@/lib/api";
import { studentDashboardFallback } from "@/lib/mock-data";
import type { DemoUser, StudentDashboardData } from "@/lib/types";

export function StudentPage() {
  const [, navigate] = useLocation();
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [dashboard, setDashboard] = useState<StudentDashboardData>(studentDashboardFallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = await getCurrentDemoUser();
      if (!user) {
        navigate("/login");
        return;
      }
      if (user.role === "teacher" || user.role === "admin") {
        navigate("/teacher");
        return;
      }
      setCurrentUser(user);
      const data = await getStudentDashboard();
      setDashboard(data);
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
      title="Student classroom"
      subtitle="A focused mobile-first learning space with live video, chat, polls, and quizzes."
      role="Student dashboard"
      currentUser={currentUser}
      layoutVariant="meeting"
    >
      <LiveClassroom
        dashboard={dashboard}
        currentUsername={currentUser.username}
      />
    </DashboardShell>
  );
}
