import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StudentHomeDashboard } from "@/components/student/student-home-dashboard";
import { getAccessToken, requireDemoUser } from "@/lib/demo-session";

export default async function StudentHomePage() {
  await getAccessToken();
  const currentUser = await requireDemoUser("student");

  return (
    <DashboardShell
      title="Home"
      subtitle="Your learning hub — resume class or manage account shortcuts below."
      role="Student"
      currentUser={currentUser}
      layoutVariant="meeting"
    >
      <StudentHomeDashboard fullName={currentUser.full_name} />
    </DashboardShell>
  );
}
