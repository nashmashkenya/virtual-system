import { useUser } from "@clerk/react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { LiveClassroom } from "@/components/classroom/live-classroom";
import { getStudentDashboard } from "@/lib/api";
import { studentDashboardFallback } from "@/lib/mock-data";
import type { StudentDashboardData } from "@/lib/types";

export function StudentPage() {
  const { user, isLoaded } = useUser();
  const [, navigate] = useLocation();
  const [dashboard, setDashboard] = useState<StudentDashboardData>(studentDashboardFallback);
  const [dashLoading, setDashLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      navigate("/");
      return;
    }
    getStudentDashboard()
      .then(setDashboard)
      .catch(() => {})
      .finally(() => setDashLoading(false));
  }, [isLoaded, user, navigate]);

  if (!isLoaded || dashLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <LiveClassroom
      dashboard={dashboard}
      currentUsername={user?.username ?? user?.id ?? "student"}
      currentUserFullName={user?.fullName ?? "Student"}
    />
  );
}
