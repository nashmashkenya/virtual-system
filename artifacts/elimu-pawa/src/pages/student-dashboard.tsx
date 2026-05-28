import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { getStudentDashboard, studentLogout } from "@/lib/student-auth";
import type { StudentProfile, ApprovedLesson } from "@/lib/student-auth";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}
function isUpcoming(iso: string) { return new Date(iso) > new Date(); }
function isLive(iso: string, dur: number) {
  const s = new Date(iso), e = new Date(s.getTime() + dur * 60000), n = new Date();
  return n >= s && n <= e;
}

const glassPanel: React.CSSProperties = {
  background: "rgba(255,255,255,0.62)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.8)",
  boxShadow: "0 4px 24px rgba(80,60,180,0.07)",
};

export function StudentDashboardPage() {
  const [, navigate] = useLocation();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [lessons, setLessons] = useState<ApprovedLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    getStudentDashboard().then((data) => {
      if (!data) { navigate("/student/sign-in"); return; }
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
      <div className="flex min-h-screen items-center justify-center"
        style={{ background: "linear-gradient(160deg,#daf0ff 0%,#e8e0ff 30%,#fce8f5 58%,#d9f5ec 82%,#fdf8e8 100%)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/40 border-t-emerald-500" />
          <p className="text-base font-semibold text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }
  if (!student) return null;

  const upcoming = lessons.filter((l) => isUpcoming(l.scheduled_at) || isLive(l.scheduled_at, l.duration_minutes));
  const past = lessons.filter((l) => !isUpcoming(l.scheduled_at) && !isLive(l.scheduled_at, l.duration_minutes));
  const display = activeTab === "upcoming" ? upcoming : past;
  const initials = `${student.first_name[0] ?? ""}${student.last_name[0] ?? ""}`.toUpperCase();

  const liveLesson = lessons.find((l) => isLive(l.scheduled_at, l.duration_minutes));

  const liveBannerPanel: React.CSSProperties = {
    background: "linear-gradient(135deg, rgba(16,185,129,0.92) 0%, rgba(14,165,233,0.95) 100%)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.25)",
    boxShadow: "0 10px 30px rgba(16,185,129,0.25)",
  };

  return (
    <div
      className="min-h-screen pb-28"
      style={{ background: "linear-gradient(160deg,#daf0ff 0%,#e8e0ff 30%,#fce8f5 58%,#d9f5ec 82%,#fdf8e8 100%)" }}
    >
      {/* Blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 -top-20 h-96 w-96 rounded-full bg-sky-300/25 blur-[90px]" />
        <div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-violet-300/20 blur-[80px]" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-emerald-300/20 blur-[80px]" />
      </div>

      {/* ── Sticky top bar — edge to edge ── */}
      <header className="sticky top-0 z-30 px-4 pt-10 pb-3 sm:pt-4" style={{ background: "transparent" }}>
        <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={glassPanel}>
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: "linear-gradient(135deg,#0ea5e9,#8b5cf6)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white">
                <path d="M12 3L2 8l10 5 10-5-10-5z" fill="currentColor" opacity=".95" />
                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-[15px] font-bold text-slate-800">
              Elimu<span style={{ background: "linear-gradient(90deg,#0ea5e9,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Pawa</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[15px] font-semibold text-slate-600 sm:block">{student.first_name}</span>
            <button
              onClick={handleLogout}
              className="rounded-xl px-3.5 py-2 text-[14px] font-bold text-slate-600 transition active:scale-95"
              style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.8)" }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ── Main — full-width, no max-w on mobile ── */}
      <main className="relative space-y-4 px-4 pt-3 sm:mx-auto sm:max-w-2xl">

        {/* Pulsing Live Class Banner */}
        {liveLesson && (
          <div className="overflow-hidden rounded-3xl p-5 text-white transition-all duration-300 hover:shadow-xl" style={liveBannerPanel}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 relative flex h-3 w-3 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full font-bold">
                    Live Now
                  </span>
                  <h2 className="mt-1.5 text-[1.15rem] font-black leading-snug">
                    {liveLesson.lesson_title}
                  </h2>
                  <p className="text-white/90 text-[13px] font-bold mt-0.5">
                    {liveLesson.subject} • {liveLesson.teacher_name}
                  </p>
                </div>
              </div>
              <Link href="/student" className="shrink-0 flex items-center justify-center gap-1.5 rounded-2xl bg-white text-emerald-700 hover:bg-slate-50 transition-all font-black text-[14px] px-5 py-3 shadow-lg active:scale-95">
                <span>Enter Classroom</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        )}

        {/* Profile hero */}
        <div className="overflow-hidden rounded-3xl" style={glassPanel}>
          <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#0ea5e9,#10b981,#8b5cf6,#ec4899)" }} />
          <div className="px-5 py-5">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-2xl opacity-50 blur-lg"
                  style={{ background: "linear-gradient(135deg,#0ea5e9,#10b981)" }} aria-hidden />
                <div
                  className="relative flex h-[72px] w-[72px] items-center justify-center rounded-2xl text-2xl font-black text-white shadow-lg"
                  style={{ background: "linear-gradient(135deg,#0ea5e9,#10b981)", boxShadow: "0 8px 20px rgba(16,185,129,0.35)" }}
                >
                  {initials}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-[1.35rem] font-black text-slate-900">
                  {student.first_name} {student.last_name}
                </h1>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="rounded-full px-2.5 py-0.5 text-[12px] font-bold text-sky-700"
                    style={{ background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.2)" }}>
                    {student.class_level}
                  </span>
                  <span className="rounded-full px-2.5 py-0.5 text-[12px] font-bold text-violet-700"
                    style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                    ADM: {student.adm_no}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              {[
                { label: "Upcoming", value: upcoming.length, color: "#10b981", bg: "rgba(16,185,129,0.09)" },
                { label: "Total",    value: lessons.length,  color: "#0ea5e9", bg: "rgba(14,165,233,0.09)" },
                { label: "Past",     value: past.length,     color: "#8b5cf6", bg: "rgba(139,92,246,0.09)" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl px-2 py-3 text-center"
                  style={{ background: s.bg, border: `1px solid ${s.color}22` }}>
                  <p className="text-[1.5rem] font-black leading-none" style={{ color: s.color }}>{s.value}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 rounded-2xl p-1.5" style={glassPanel}>
          {(["upcoming", "past"] as const).map((t) => (
            <button
              key={t} onClick={() => setActiveTab(t)}
              className="flex-1 rounded-xl py-3.5 text-[15px] font-black capitalize transition active:scale-95"
              style={activeTab === t
                ? { background: "linear-gradient(135deg,#10b981,#0ea5e9)", color: "#fff", boxShadow: "0 4px 14px rgba(16,185,129,0.32)" }
                : { color: "#94a3b8" }}
            >
              {t === "upcoming"
                ? `Upcoming${upcoming.length > 0 ? ` (${upcoming.length})` : ""}`
                : `Past${past.length > 0 ? ` (${past.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* Lesson list */}
        {display.length === 0 ? (
          <div className="rounded-3xl px-6 py-14 text-center" style={glassPanel}>
            <p className="mb-2 text-5xl">{activeTab === "upcoming" ? "📅" : "📖"}</p>
            <p className="text-[16px] font-bold text-slate-600">
              {activeTab === "upcoming" ? "No upcoming classes yet" : "No past classes"}
            </p>
            <p className="mt-1.5 text-[14px] text-slate-400">
              {activeTab === "upcoming"
                ? "Your teacher will add you to classes soon."
                : "Completed classes will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {display.map((lesson) => {
              const live = isLive(lesson.scheduled_at, lesson.duration_minutes);
              return (
                <div
                  key={lesson.lesson_id}
                  className="overflow-hidden rounded-3xl transition hover:shadow-lg active:scale-[.99]"
                  style={{ ...glassPanel, ...(live ? { border: "1.5px solid rgba(16,185,129,0.4)" } : {}) }}
                >
                  {live && (
                    <div className="flex items-center gap-2 px-5 py-2.5"
                      style={{ background: "linear-gradient(90deg,rgba(16,185,129,0.12),rgba(14,165,233,0.08))" }}>
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                      <span className="text-[13px] font-black text-emerald-700">Live now — Tap to join</span>
                    </div>
                  )}
                  <div className="px-5 py-4">
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl"
                        style={{
                          background: live ? "rgba(16,185,129,0.12)" : "rgba(14,165,233,0.08)",
                          border: live ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(14,165,233,0.15)",
                        }}
                      >
                        {live ? "🔴" : activeTab === "past" ? "✅" : "📝"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[16px] font-black text-slate-900 leading-snug">
                          {lesson.lesson_title}
                        </h3>
                        <p className="mt-0.5 text-[14px] font-bold" style={{ color: "#0ea5e9" }}>
                          {lesson.subject}
                        </p>
                        <p className="text-[13px] text-slate-500">{lesson.class_level}</p>
                      </div>
                    </div>
                    <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(lesson.scheduled_at)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {lesson.duration_minutes} min
                      </span>
                      {lesson.teacher_name && (
                        <span className="flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {lesson.teacher_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Bottom nav — edge to edge ── */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-around px-2 pb-6 pt-3 sm:hidden"
        style={{
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 -4px 24px rgba(80,60,180,0.1)",
        }}
      >
        {[
          {
            href: "/student/dashboard", label: "Dashboard", active: true,
            icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
          },
          {
            href: "/student", label: "Classroom", active: false,
            icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>,
          },
          {
            href: "/settings", label: "Settings", active: false,
            icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
          },
        ].map((item) => (
          <Link
            key={item.href} href={item.href}
            className="flex flex-1 flex-col items-center gap-1 py-1 text-[11px] font-black transition active:scale-90"
            style={item.active ? { color: "#10b981" } : { color: "#94a3b8" }}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
