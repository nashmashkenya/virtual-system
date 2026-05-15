import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { TeacherDashboard } from "@/components/teacher/teacher-dashboard";
import { getCurrentDemoUser, getTeacherDashboard, getTeacherSessions } from "@/lib/api";
import { teacherDashboardFallback } from "@/lib/mock-data";
import type { DemoUser, TeacherDashboardData, TeacherSession } from "@/lib/types";

export function TeacherPage() {
  const [, navigate] = useLocation();
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [dashboard, setDashboard] = useState<TeacherDashboardData>(teacherDashboardFallback);
  const [sessions, setSessions] = useState<TeacherSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = await getCurrentDemoUser();
      if (!user) {
        navigate("/");
        return;
      }
      if (user.role === "student") {
        navigate("/student");
        return;
      }
      setCurrentUser(user);
      const [dashData, sessData] = await Promise.all([
        getTeacherDashboard(),
        getTeacherSessions(),
      ]);
      setDashboard(dashData);
      setSessions(sessData);
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
      title="Teacher meeting room"
      subtitle="Run the class with the live room in focus."
      role="Teacher room"
      currentUser={currentUser}
      layoutVariant="meeting"
    >
      <TeacherDashboard
        dashboard={dashboard}
        sessions={sessions}
        currentUsername={currentUser.username}
        organizations={currentUser.organizations ?? []}
      />
    </DashboardShell>
  );
}
