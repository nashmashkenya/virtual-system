import { getStudentDashboard } from "@/lib/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { LiveClassroom } from "@/components/classroom/live-classroom";
import { getAccessToken, requireDemoUser } from "@/lib/demo-session";

export default async function StudentDashboardPage() {
  const token = await getAccessToken();
  const currentUser = await requireDemoUser("student");
  const dashboard = await getStudentDashboard(token ?? undefined);

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
        accessToken={token ?? undefined}
      />
    </DashboardShell>
  );
}
