import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth, useUser } from "@clerk/react";
import {
  getTeacherClasses, createTeacherClass, deleteTeacherClass,
  getTeacherLessons, createLesson, deleteLesson,
  getLessonStudents, updateLessonStudents,
  type TeacherClass, type ScheduledLesson, type StudentProfile,
} from "@/lib/student-auth";

const API = import.meta.env.VITE_API_BASE_URL ?? "";

function formatDT(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    weekday: "short", day: "numeric", month: "short",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function TeacherClassesPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [, navigate] = useLocation();

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [lessons, setLessons] = useState<ScheduledLesson[]>([]);
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);
  const [view, setView] = useState<"classes" | "lessons" | "students">("classes");

  /* Create class form */
  const [classForm, setClassForm] = useState({ subject: "", class_level: "", description: "" });
  const [classFormOpen, setClassFormOpen] = useState(false);
  const [classErr, setClassErr] = useState("");

  /* Schedule lesson form */
  const [lessonForm, setLessonForm] = useState({ title: "", scheduled_at: "", duration_minutes: "60" });
  const [lessonFormOpen, setLessonFormOpen] = useState(false);
  const [lessonErr, setLessonErr] = useState("");

  /* Student access modal */
  const [managingLesson, setManagingLesson] = useState<ScheduledLesson | null>(null);
  const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
  const [approvedIds, setApprovedIds] = useState<number[]>([]);
  const [savingStudents, setSavingStudents] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [adminSubjects, setAdminSubjects] = useState<string[]>([]);
  const [adminClassLevels, setAdminClassLevels] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/public/subjects`).then((r) => r.ok ? r.json() as Promise<{ subjects: { id: number; name: string }[] }> : null).catch(() => null),
      fetch(`${API}/api/public/class-levels`).then((r) => r.ok ? r.json() as Promise<{ class_levels: { id: number; name: string }[] }> : null).catch(() => null),
    ]).then(([subj, levels]) => {
      if (subj) setAdminSubjects(subj.subjects.map((s) => s.name));
      if (levels) setAdminClassLevels(levels.class_levels.map((c) => c.name));
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { navigate("/teacher/sign-in"); return; }
    loadClasses();
  }, [isLoaded, isSignedIn]);

  async function loadClasses() {
    setLoading(true);
    setClasses(await getTeacherClasses());
    setLoading(false);
  }

  async function loadLessons(cls: TeacherClass) {
    setSelectedClass(cls);
    setLessons(await getTeacherLessons(cls.id));
    setView("lessons");
  }

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    if (!classForm.subject.trim()) return setClassErr("Subject is required.");
    if (!classForm.class_level.trim()) return setClassErr("Class level is required.");
    setSaving(true);
    const teacherName = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Teacher";
    const res = await createTeacherClass({ ...classForm, teacher_name: teacherName });
    setSaving(false);
    if (!res.ok) return setClassErr(res.message);
    setClassFormOpen(false);
    setClassForm({ subject: "", class_level: "", description: "" });
    setClassErr("");
    loadClasses();
  }

  async function handleCreateLesson(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClass) return;
    if (!lessonForm.title.trim()) return setLessonErr("Lesson title is required.");
    if (!lessonForm.scheduled_at) return setLessonErr("Date and time are required.");
    setSaving(true);
    const res = await createLesson({
      class_id: selectedClass.id,
      title: lessonForm.title.trim(),
      scheduled_at: lessonForm.scheduled_at,
      duration_minutes: Number(lessonForm.duration_minutes) || 60,
    });
    setSaving(false);
    if (!res.ok) return setLessonErr(res.message);
    setLessonFormOpen(false);
    setLessonForm({ title: "", scheduled_at: "", duration_minutes: "60" });
    setLessonErr("");
    setLessons(await getTeacherLessons(selectedClass.id));
  }

  async function handleDeleteClass(id: number) {
    if (!confirm("Delete this class and all its lessons?")) return;
    await deleteTeacherClass(id);
    loadClasses();
  }

  async function handleDeleteLesson(id: number) {
    if (!confirm("Delete this lesson?")) return;
    await deleteLesson(id);
    if (selectedClass) setLessons(await getTeacherLessons(selectedClass.id));
  }

  async function openStudentManager(lesson: ScheduledLesson) {
    setManagingLesson(lesson);
    const data = await getLessonStudents(lesson.id);
    setAllStudents(data.all_students);
    setApprovedIds(data.approved_ids);
    setView("students");
  }

  async function saveStudentAccess() {
    if (!managingLesson) return;
    setSavingStudents(true);
    await updateLessonStudents(managingLesson.id, approvedIds);
    setSavingStudents(false);
    alert("Student access saved!");
  }

  function toggleStudent(id: number) {
    setApprovedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="ElimuPawa" className="h-7 w-7 sm:h-8 sm:w-8" />
            <span className="font-bold text-white">ElimuPawa</span>
            <span className="rounded-lg bg-violet-600/20 px-2 py-0.5 text-xs font-medium text-violet-400">Teacher</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="/teacher" className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white sm:text-sm">
              Live Room
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Breadcrumb */}
        <nav className="mb-5 flex items-center gap-2 text-sm sm:mb-6">
          <button onClick={() => { setView("classes"); setSelectedClass(null); }} className="text-violet-400 hover:text-violet-300">
            My Classes
          </button>
          {selectedClass && (
            <>
              <span className="text-slate-600">/</span>
              <button
                onClick={() => setView("lessons")}
                className={view === "lessons" ? "font-medium text-white" : "text-violet-400 hover:text-violet-300"}
              >
                {selectedClass.subject} ({selectedClass.class_level})
              </button>
            </>
          )}
          {view === "students" && managingLesson && (
            <>
              <span className="text-slate-600">/</span>
              <span className="font-medium text-white">Manage Students — {managingLesson.title}</span>
            </>
          )}
        </nav>

        {/* ── CLASSES VIEW ── */}
        {view === "classes" && (
          <div className="space-y-5 sm:space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-white sm:text-2xl">My Classes</h1>
                <p className="mt-0.5 text-xs text-slate-400 sm:mt-1 sm:text-sm">Create subjects and schedule lessons for your students</p>
              </div>
              <button
                onClick={() => setClassFormOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New Class
              </button>
            </div>

            {/* Create class form */}
            {classFormOpen && (
              <div className="rounded-2xl border border-violet-500/30 bg-violet-900/10 p-6">
                <h3 className="mb-4 font-semibold text-white">Create a New Class</h3>
                <form onSubmit={handleCreateClass} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Subject</label>
                      <select
                        value={classForm.subject}
                        onChange={(e) => { setClassForm((f) => ({ ...f, subject: e.target.value })); setClassErr(""); }}
                        className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40"
                      >
                        <option value="">Select subject…</option>
                        {adminSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Class Level</label>
                      <select
                        value={classForm.class_level}
                        onChange={(e) => { setClassForm((f) => ({ ...f, class_level: e.target.value })); setClassErr(""); }}
                        className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40"
                      >
                        <option value="">Select level…</option>
                        {adminClassLevels.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">Description (optional)</label>
                    <input
                      type="text"
                      value={classForm.description}
                      onChange={(e) => setClassForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Brief description of the class"
                      className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40"
                    />
                  </div>
                  {classErr && <p className="text-sm text-red-400">{classErr}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60">
                      {saving ? "Creating…" : "Create Class"}
                    </button>
                    <button type="button" onClick={() => { setClassFormOpen(false); setClassErr(""); }} className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {classes.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
                <div className="mb-2 text-4xl">🎓</div>
                <p className="text-slate-400">No classes yet. Create your first class above.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {classes.map((cls) => (
                  <div key={cls.id} className="group rounded-2xl border border-slate-700/50 bg-slate-900 p-5 transition hover:border-violet-500/40">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 cursor-pointer" onClick={() => loadLessons(cls)}>
                        <span className="inline-block rounded-lg bg-violet-600/15 px-2 py-0.5 text-xs font-medium text-violet-400">{cls.class_level}</span>
                        <h3 className="mt-2 font-semibold text-white">{cls.subject}</h3>
                        {cls.description && <p className="mt-1 text-sm text-slate-400">{cls.description}</p>}
                      </div>
                      <button onClick={() => handleDeleteClass(cls.id)} className="ml-2 rounded-lg p-1.5 text-slate-600 opacity-0 transition hover:bg-red-900/30 hover:text-red-400 group-hover:opacity-100">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                    <button onClick={() => loadLessons(cls)} className="mt-4 flex items-center gap-1 text-sm font-medium text-violet-400 hover:text-violet-300">
                      View Lessons <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── LESSONS VIEW ── */}
        {view === "lessons" && selectedClass && (
          <div className="space-y-5 sm:space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-white sm:text-2xl">{selectedClass.subject}</h1>
                <p className="mt-0.5 text-xs text-slate-400 sm:mt-1 sm:text-sm">{selectedClass.class_level}{selectedClass.description ? ` · ${selectedClass.description}` : ""}</p>
              </div>
              <button
                onClick={() => setLessonFormOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Schedule Lesson
              </button>
            </div>

            {/* Schedule lesson form */}
            {lessonFormOpen && (
              <div className="rounded-2xl border border-violet-500/30 bg-violet-900/10 p-6">
                <h3 className="mb-4 font-semibold text-white">Schedule a Lesson</h3>
                <form onSubmit={handleCreateLesson} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">Lesson Title</label>
                    <input
                      type="text"
                      value={lessonForm.title}
                      onChange={(e) => { setLessonForm((f) => ({ ...f, title: e.target.value })); setLessonErr(""); }}
                      placeholder="e.g. Introduction to Fractions"
                      className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Date & Time</label>
                      <input
                        type="datetime-local"
                        value={lessonForm.scheduled_at}
                        onChange={(e) => { setLessonForm((f) => ({ ...f, scheduled_at: e.target.value })); setLessonErr(""); }}
                        className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-violet-500 [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Duration (minutes)</label>
                      <input
                        type="number"
                        min="15"
                        max="480"
                        value={lessonForm.duration_minutes}
                        onChange={(e) => setLessonForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                        className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                  {lessonErr && <p className="text-sm text-red-400">{lessonErr}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60">
                      {saving ? "Scheduling…" : "Schedule Lesson"}
                    </button>
                    <button type="button" onClick={() => { setLessonFormOpen(false); setLessonErr(""); }} className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {lessons.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
                <div className="mb-2 text-4xl">📋</div>
                <p className="text-slate-400">No lessons scheduled yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lessons.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()).map((lesson) => (
                  <div key={lesson.id} className="group rounded-2xl border border-slate-700/50 bg-slate-900 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-white">{lesson.title}</p>
                        <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">{formatDT(lesson.scheduled_at)} · {lesson.duration_minutes} min</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openStudentManager(lesson)}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600/15 px-3 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-600/30 active:scale-95"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          Students
                        </button>
                        <button onClick={() => handleDeleteLesson(lesson.id)} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-900/30 hover:text-red-400 active:scale-95 sm:opacity-0 sm:group-hover:opacity-100">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STUDENT ACCESS VIEW ── */}
        {view === "students" && managingLesson && (
          <div className="space-y-5 sm:space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-white sm:text-2xl">Manage Students</h1>
                <p className="mt-0.5 text-xs text-slate-400 sm:mt-1 sm:text-sm">
                  <span className="text-white">{managingLesson.title}</span> · {formatDT(managingLesson.scheduled_at)}
                </p>
              </div>
              <button
                onClick={saveStudentAccess}
                disabled={savingStudents}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 active:scale-95 disabled:opacity-60"
              >
                {savingStudents ? "Saving…" : `Save (${approvedIds.length} approved)`}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-1">
              <div className="flex items-center justify-between px-4 py-3 text-sm text-slate-400 border-b border-slate-800">
                <span>{allStudents.length} registered students</span>
                <div className="flex gap-2">
                  <button onClick={() => setApprovedIds(allStudents.map((s) => s.id))} className="text-emerald-400 hover:text-emerald-300">Select all</button>
                  <span className="text-slate-700">·</span>
                  <button onClick={() => setApprovedIds([])} className="text-slate-400 hover:text-slate-300">Clear all</button>
                </div>
              </div>
              {allStudents.length === 0 ? (
                <div className="py-10 text-center text-slate-500">
                  No students have registered yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {allStudents.map((s) => {
                    const approved = approvedIds.includes(s.id);
                    return (
                      <label key={s.id} className="flex cursor-pointer items-center gap-4 px-4 py-3 transition hover:bg-slate-800/50">
                        <input
                          type="checkbox"
                          checked={approved}
                          onChange={() => toggleStudent(s.id)}
                          className="h-4 w-4 rounded accent-emerald-500"
                        />
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">
                          {s.first_name[0]}{s.last_name[0]}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{s.first_name} {s.last_name}</p>
                          <p className="text-xs text-slate-400">{s.adm_no} · {s.class_level}</p>
                        </div>
                        {approved && (
                          <span className="rounded-full bg-emerald-600/15 px-2 py-0.5 text-xs font-medium text-emerald-400">Approved</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
