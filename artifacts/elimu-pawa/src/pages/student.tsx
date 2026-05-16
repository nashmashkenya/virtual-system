import { useEffect, useState } from "react";
import { useLocation } from "wouter";
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
        navigate("/");
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
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <LiveClassroom
      dashboard={dashboard}
      currentUsername={currentUser.username}
      currentUserFullName={currentUser.full_name}
    />
  );
}
