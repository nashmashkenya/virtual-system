import { useUser } from "@clerk/react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { TeacherDashboard } from "@/components/teacher/teacher-dashboard";
import { getTeacherDashboard, getTeacherSessions } from "@/lib/api";
import { teacherDashboardFallback } from "@/lib/mock-data";
import type { DemoUser, TeacherDashboardData, TeacherSession } from "@/lib/types";

export type FromLessonContext = {
  lesson_id: number;
  title: string;
  subject: string;
  class_level: string;
  teacher_name: string;
  starts_at: string;
  duration_minutes: number;
};

export function TeacherPage() {
  const { user, isLoaded } = useUser();
  const [, navigate] = useLocation();
  const [dashboard, setDashboard] = useState<TeacherDashboardData>(teacherDashboardFallback);
  const [sessions, setSessions] = useState<TeacherSession[]>([]);
  const [dashLoading, setDashLoading] = useState(true);
  const [fromLesson, setFromLesson] = useState<FromLessonContext | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      navigate("/");
      return;
    }
    Promise.all([getTeacherDashboard(), getTeacherSessions()])
      .then(([dashData, sessData]) => {
        const params = new URLSearchParams(window.location.search);
        const lessonId = params.get("lesson_id");
        const lessonTitle = params.get("title");
        const lessonSubject = params.get("subject");
        const lessonClassLevel = params.get("class_level");
        const lessonTeacherName = params.get("teacher_name");
        const lessonStartsAt = params.get("starts_at");
        const lessonDuration = params.get("duration_minutes");
        if (lessonTitle && lessonId) {
          const ctx: FromLessonContext = {
            lesson_id: Number(lessonId),
            title: lessonTitle,
            subject: lessonSubject ?? "",
            class_level: lessonClassLevel ?? "",
            teacher_name: lessonTeacherName ?? "",
            starts_at: lessonStartsAt ?? "",
            duration_minutes: lessonDuration ? Number(lessonDuration) : 60,
          };
          dashData = {
            ...dashData,
            form_defaults: {
              ...dashData.form_defaults,
              title: ctx.title,
              ...(ctx.starts_at ? { starts_at: ctx.starts_at } : {}),
            },
          };
          setFromLesson(ctx);
        }
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
      title={fromLesson ? `${fromLesson.class_level} — ${fromLesson.subject}` : "Teacher meeting room"}
      subtitle={fromLesson ? `Topic: ${fromLesson.title} · Teacher: ${fromLesson.teacher_name}` : "Run the class with the live room in focus."}
      role="Teacher room"
      currentUser={currentUser}
      layoutVariant="meeting"
    >
      <TeacherDashboard
        dashboard={dashboard}
        sessions={sessions}
        currentUsername={currentUser.username}
        organizations={[]}
        fromLesson={fromLesson ?? undefined}
      />
    </DashboardShell>
  );
}
