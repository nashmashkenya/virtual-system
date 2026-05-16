import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getStudentDashboard, studentLogout } from "@/lib/student-auth";
import type { StudentProfile, ApprovedLesson } from "@/lib/student-auth";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isUpcoming(iso: string) {
  return new Date(iso) > new Date();
}

function isLive(iso: string, duration: number) {
  const start = new Date(iso);
  const end = new Date(start.getTime() + duration * 60 * 1000);
  const now = new Date();
  return now >= start && now <= end;
}

export function StudentDashboardPage() {
  const [, navigate] = useLocation();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [lessons, setLessons] = useState<ApprovedLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStudentDashboard().then((data) => {
      if (!data) {
        navigate("/student/sign-in");
        return;
      }
      setStudent(data.student);
      setLessons(data.lessons);
      setLoading(false);
    });
  }, [navigate]);

  async function handleLogout() {
    await studentLogout();
    navigate("/");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!student) return null;

  const upcomingLessons = lessons.filter((l) => isUpcoming(l.scheduled_at) || isLive(l.scheduled_at, l.duration_minutes));
  const pastLessons = lessons.filter((l) => !isUpcoming(l.scheduled_at) && !isLive(l.scheduled_at, l.duration_minutes));

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="ElimuPawa" className="h-8 w-8" />
            <span className="font-bold text-white">ElimuPawa</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-400 sm:block">
              {student.first_name} {student.last_name}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-8">
        {/* Profile card */}
        <section className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900/20 to-slate-900 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white">
                {student.first_name[0]}{student.last_name[0]}
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{student.first_name} {student.last_name}</h1>
                <p className="text-sm text-slate-400">{student.class_level}</p>
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="rounded-xl bg-slate-800 px-4 py-2 text-center">
                <p className="text-xs text-slate-400">ADM No</p>
                <p className="font-semibold text-emerald-400">{student.adm_no}</p>
              </div>
              <div className="rounded-xl bg-slate-800 px-4 py-2 text-center">
                <p className="text-xs text-slate-400">Approved lessons</p>
                <p className="font-semibold text-white">{lessons.length}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Upcoming & Live lessons */}
        <section>
          <h2 className="mb-4 text-lg font-bold text-white">
            Upcoming Classes
            {upcomingLessons.length > 0 && (
              <span className="ml-2 rounded-full bg-emerald-600/20 px-2 py-0.5 text-xs text-emerald-400">
                {upcomingLessons.length}
              </span>
            )}
          </h2>

          {upcomingLessons.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
              <div className="mb-2 text-3xl">📅</div>
              <p className="text-slate-400">No upcoming classes yet.</p>
              <p className="mt-1 text-sm text-slate-500">Your teacher will add you to classes soon.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {upcomingLessons.map((lesson) => {
                const live = isLive(lesson.scheduled_at, lesson.duration_minutes);
                return (
                  <div
                    key={lesson.lesson_id}
                    className={`rounded-2xl border p-5 transition ${live ? "border-emerald-500/40 bg-emerald-900/10" : "border-slate-700/50 bg-slate-900"}`}
                  >
                    {live && (
                      <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                        Live now
                      </span>
                    )}
                    <h3 className="font-semibold text-white">{lesson.lesson_title}</h3>
                    <p className="mt-1 text-sm text-emerald-400 font-medium">{lesson.subject} — {lesson.class_level}</p>
                    <p className="mt-0.5 text-sm text-slate-400">Teacher: {lesson.teacher_name || "Your teacher"}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDateTime(lesson.scheduled_at)}
                      <span className="ml-1">• {lesson.duration_minutes} min</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Past lessons */}
        {pastLessons.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-bold text-white">Past Classes</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {pastLessons.map((lesson) => (
                <div key={lesson.lesson_id} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 opacity-70">
                  <h3 className="font-semibold text-slate-300">{lesson.lesson_title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{lesson.subject} — {lesson.class_level}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDateTime(lesson.scheduled_at)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
