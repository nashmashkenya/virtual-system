import { TeacherDashboard } from "@/components/teacher/teacher-dashboard";
import { getCurrentDemoUser, getTeacherDashboard, getTeacherSessions } from "@/lib/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getAccessToken, requireDemoUser } from "@/lib/demo-session";

export default async function TeacherDashboardPage() {
  const token = await getAccessToken();
  const currentUser = await requireDemoUser("teacher");
  const me = await getCurrentDemoUser(token ?? undefined);
  const dashboard = await getTeacherDashboard(token ?? undefined);
  const sessions = await getTeacherSessions(token ?? undefined);

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
        accessToken={token ?? undefined}
        organizations={me?.organizations ?? []}
      />
    </DashboardShell>
  );
}
