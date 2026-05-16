import { useUser } from "@clerk/react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { TeacherDashboard } from "@/components/teacher/teacher-dashboard";
import { getTeacherDashboard, getTeacherSessions } from "@/lib/api";
import { teacherDashboardFallback } from "@/lib/mock-data";
import type { DemoUser, TeacherDashboardData, TeacherSession } from "@/lib/types";

export function TeacherPage() {
  const { user, isLoaded } = useUser();
  const [, navigate] = useLocation();
  const [dashboard, setDashboard] = useState<TeacherDashboardData>(teacherDashboardFallback);
  const [sessions, setSessions] = useState<TeacherSession[]>([]);
  const [dashLoading, setDashLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      navigate("/");
      return;
    }
    Promise.all([getTeacherDashboard(), getTeacherSessions()])
      .then(([dashData, sessData]) => {
        setDashboard(dashData);
        setSessions(sessData);
      })
      .catch(() => {})
      .finally(() => setDashLoading(false));
  }, [isLoaded, user, navigate]);

  if (!isLoaded || dashLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  const currentUser: DemoUser = {
    username: user?.username ?? user?.id ?? "teacher",
    full_name: user?.fullName ?? "Teacher",
    email: user?.emailAddresses?.[0]?.emailAddress ?? "",
    role: "teacher",
    organizations: [],
  };

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
        organizations={[]}
      />
    </DashboardShell>
  );
}
