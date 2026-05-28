import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth, useUser } from "@clerk/react";
import {
  getTeacherClasses, createTeacherClass, deleteTeacherClass,
  getTeacherLessons, createLesson, deleteLesson,
  getLessonStudents, updateLessonStudents,
  type TeacherClass, type ScheduledLesson, type StudentProfile,
} from "@/lib/student-auth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

const API = import.meta.env.VITE_API_BASE_URL ?? "";

function formatDT(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    weekday: "short", day: "numeric", month: "short",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function GraduationCapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

export function TeacherClassesPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [, navigate] = useLocation();

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [lessons, setLessons] = useState<ScheduledLesson[]>([]);
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingLessons, setLoadingLessons] = useState(false);

  const [classFormOpen, setClassFormOpen] = useState(false);
  const [classForm, setClassForm] = useState({ subject: "", class_level: "", description: "" });
  const [classErr, setClassErr] = useState("");

  const [lessonFormOpen, setLessonFormOpen] = useState(false);
  const [lessonForm, setLessonForm] = useState({ title: "", scheduled_at: "", duration_minutes: "60" });
  const [lessonErr, setLessonErr] = useState("");

  const [studentsSheetOpen, setStudentsSheetOpen] = useState(false);
  const [managingLesson, setManagingLesson] = useState<ScheduledLesson | null>(null);
  const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
  const [approvedIds, setApprovedIds] = useState<number[]>([]);
  const [savingStudents, setSavingStudents] = useState(false);
  const [studentsSaved, setStudentsSaved] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [saving, setSaving] = useState(false);
  const [goingLiveId, setGoingLiveId] = useState<number | null>(null);
  const goLiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [deleteClassConfirm, setDeleteClassConfirm] = useState<number | null>(null);
  const [deleteLessonConfirm, setDeleteLessonConfirm] = useState<number | null>(null);

  const [mobileShowLessons, setMobileShowLessons] = useState(false);

  const [adminSubjects, setAdminSubjects] = useState<string[]>([]);
  const [adminClassLevels, setAdminClassLevels] = useState<string[]>([]);

  useEffect(() => {
    return () => {
      if (goLiveTimerRef.current !== null) clearTimeout(goLiveTimerRef.current);
    };
  }, []);

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
    setLoadingClasses(true);
    const result = await getTeacherClasses();
    setClasses(result);
    setLoadingClasses(false);
    if (result.length > 0 && !selectedClass) {
      // Auto-select the first class for desktop; keep mobile on the class list
      await loadLessonsForClass(result[0]);
    }
  }

  /** Load lessons for a class without showing the mobile lessons panel. Used on initial load. */
  async function loadLessonsForClass(cls: TeacherClass) {
    setSelectedClass(cls);
    setDeleteLessonConfirm(null);
    setDeleteClassConfirm(null);
    setLoadingLessons(true);
    setLessons(await getTeacherLessons(cls.id));
    setLoadingLessons(false);
  }

  /** User explicitly tapped a class — also switch mobile view to lessons panel. */
  async function selectClass(cls: TeacherClass) {
    setMobileShowLessons(true);
    await loadLessonsForClass(cls);
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
    const result = await getTeacherClasses();
    setClasses(result);
    // Use the id from the API response to select exactly the new class
    const createdId = res.class?.id;
    const created = createdId ? result.find((c) => c.id === createdId) : result[result.length - 1];
    if (created) selectClass(created);
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
    await deleteTeacherClass(id);
    setDeleteClassConfirm(null);
    const result = await getTeacherClasses();
    setClasses(result);
    if (selectedClass?.id === id) {
      setSelectedClass(null);
      setLessons([]);
      setMobileShowLessons(false);
      if (result.length > 0) selectClass(result[0]);
    }
  }

  async function handleDeleteLesson(id: number) {
    await deleteLesson(id);
    setDeleteLessonConfirm(null);
    if (selectedClass) setLessons(await getTeacherLessons(selectedClass.id));
  }

  async function openStudentManager(lesson: ScheduledLesson) {
    // Clear stale state before opening so previous lesson's data doesn't flash
    setAllStudents([]);
    setApprovedIds([]);
    setStudentsSaved(false);
    setLoadingStudents(true);
    setManagingLesson(lesson);
    setStudentsSheetOpen(true);
    const data = await getLessonStudents(lesson.id);
    setAllStudents(data.all_students);
    setApprovedIds(data.approved_ids);
    setLoadingStudents(false);
  }

  async function saveStudentAccess() {
    if (!managingLesson) return;
    setSavingStudents(true);
    await updateLessonStudents(managingLesson.id, approvedIds);
    setSavingStudents(false);
    setStudentsSaved(true);
    if (selectedClass) {
      setLessons(await getTeacherLessons(selectedClass.id));
    }
  }

  function toggleStudent(id: number) {
    setApprovedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setStudentsSaved(false);
  }

  function handleGoLive(lesson: ScheduledLesson) {
    setGoingLiveId(lesson.id);
    goLiveTimerRef.current = setTimeout(() => {
      goLiveTimerRef.current = null;
      const params = new URLSearchParams({
        lesson_id: String(lesson.id),
        title: lesson.title,
        starts_at: lesson.scheduled_at,
        duration_minutes: String(lesson.duration_minutes),
        subject: selectedClass?.subject ?? "",
        class_level: selectedClass?.class_level ?? "",
        teacher_name: selectedClass?.teacher_name ?? "",
      });
      navigate(`/teacher?${params.toString()}`);
    }, 300);
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  const sortedLessons = [...lessons].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
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

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Page heading */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">My Classes</h1>
            <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">Create subjects, schedule lessons, and manage student access</p>
          </div>
          <button
            onClick={() => { setClassErr(""); setClassFormOpen(true); }}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 active:scale-95"
          >
            <PlusIcon className="h-4 w-4" />
            New Class
          </button>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-5">
          {/* ── SIDEBAR: Class list ── */}
          <aside className={`w-full shrink-0 sm:w-72 ${mobileShowLessons ? "hidden sm:block" : "block"}`}>
            {loadingClasses ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                    <Skeleton className="mb-2 h-4 w-16 bg-slate-700" />
                    <Skeleton className="h-5 w-32 bg-slate-700" />
                    <Skeleton className="mt-2 h-3 w-24 bg-slate-800" />
                  </div>
                ))}
              </div>
            ) : classes.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-12 text-center">
                <GraduationCapIcon className="mb-3 h-12 w-12 text-slate-600" />
                <p className="mb-1 font-medium text-white">No classes yet</p>
                <p className="mb-4 text-sm text-slate-400">Create your first class to get started</p>
                <button
                  onClick={() => { setClassErr(""); setClassFormOpen(true); }}
                  className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
                >
                  <PlusIcon className="h-4 w-4" />
                  New Class
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {classes.map((cls) => {
                  const isSelected = selectedClass?.id === cls.id;
                  return (
                    <div
                      key={cls.id}
                      className={`group relative rounded-2xl border p-4 transition cursor-pointer ${
                        isSelected
                          ? "border-violet-500/60 bg-violet-600/10"
                          : "border-slate-700/50 bg-slate-900 hover:border-violet-500/30 hover:bg-slate-800/60"
                      }`}
                      onClick={() => {
                        if (deleteClassConfirm !== cls.id) selectClass(cls);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`inline-block rounded-lg px-2 py-0.5 text-xs font-medium ${
                              isSelected ? "bg-violet-500/25 text-violet-300" : "bg-violet-600/15 text-violet-400"
                            }`}>
                              {cls.class_level}
                            </span>
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              isSelected ? "bg-slate-700 text-slate-300" : "bg-slate-800 text-slate-400"
                            }`}>
                              {cls.lesson_count ?? 0} lesson{(cls.lesson_count ?? 0) !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <p className="mt-1.5 font-semibold text-white truncate">{cls.subject}</p>
                          {cls.description && (
                            <p className="mt-0.5 text-xs text-slate-400 truncate">{cls.description}</p>
                          )}
                        </div>
                        {isSelected && (
                          <ChevronRightIcon className="mt-1 h-4 w-4 shrink-0 text-violet-400" />
                        )}
                      </div>

                      {/* Delete confirmation */}
                      {deleteClassConfirm === cls.id ? (
                        <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-900/20 px-3 py-2 text-xs" onClick={(e) => e.stopPropagation()}>
                          <span className="flex-1 text-red-300">Delete class and all lessons?</span>
                          <button
                            onClick={() => handleDeleteClass(cls.id)}
                            className="rounded-lg bg-red-600 px-2.5 py-1 font-semibold text-white hover:bg-red-500"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeleteClassConfirm(null)}
                            className="rounded-lg border border-slate-600 px-2.5 py-1 text-slate-300 hover:bg-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteClassConfirm(cls.id); }}
                          className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-600 opacity-0 transition hover:bg-red-900/30 hover:text-red-400 group-hover:opacity-100"
                          title="Delete class"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </aside>

          {/* ── MAIN PANEL: Lessons ── */}
          <div className={`min-w-0 flex-1 ${mobileShowLessons ? "block" : "hidden sm:block"}`}>
            {/* Mobile back button */}
            <button
              className="mb-4 flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 sm:hidden"
              onClick={() => setMobileShowLessons(false)}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              All Classes
            </button>

            {!selectedClass ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 text-center">
                <CalendarIcon className="mb-3 h-10 w-10 text-slate-600" />
                <p className="text-slate-400">Select a class to view its lessons</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Panel header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white sm:text-xl">{selectedClass.subject}</h2>
                    <p className="text-xs text-slate-400 sm:text-sm">
                      {selectedClass.class_level}
                      {selectedClass.description ? ` · ${selectedClass.description}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => { setLessonErr(""); setLessonFormOpen(true); }}
                    className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 active:scale-95"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Schedule Lesson
                  </button>
                </div>

                {/* Lessons list */}
                {loadingLessons ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                        <Skeleton className="mb-2 h-5 w-48 bg-slate-700" />
                        <Skeleton className="mb-4 h-3 w-36 bg-slate-800" />
                        <div className="flex gap-2">
                          <Skeleton className="h-8 w-24 rounded-xl bg-slate-700" />
                          <Skeleton className="h-8 w-20 rounded-xl bg-slate-700" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : sortedLessons.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-12 text-center">
                    <CalendarIcon className="mb-3 h-10 w-10 text-slate-600" />
                    <p className="mb-1 font-medium text-white">No lessons yet</p>
                    <p className="mb-4 text-sm text-slate-400">Schedule your first lesson for this class</p>
                    <button
                      onClick={() => { setLessonErr(""); setLessonFormOpen(true); }}
                      className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Schedule Lesson
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedLessons.map((lesson) => {
                      const approvedCount = lesson.approved_count ?? 0;
                      const hasStudents = approvedCount > 0;
                      return (
                        <div key={lesson.id} className="rounded-2xl border border-slate-700/50 bg-slate-900 p-4 sm:p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-white">{lesson.title}</p>
                              <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
                                {formatDT(lesson.scheduled_at)} · {lesson.duration_minutes} min
                              </p>
                              {/* Student access badge */}
                              <div className="mt-2">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                                  hasStudents
                                    ? "bg-emerald-500/15 text-emerald-400"
                                    : "bg-amber-500/15 text-amber-400"
                                }`}>
                                  <UsersIcon className="h-3 w-3" />
                                  {hasStudents
                                    ? `${approvedCount} student${approvedCount !== 1 ? "s" : ""} approved`
                                    : "0 students approved"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => openStudentManager(lesson)}
                                className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700 active:scale-95"
                              >
                                <UsersIcon className="h-3.5 w-3.5" />
                                Students
                              </button>
                              <button
                                onClick={() => handleGoLive(lesson)}
                                disabled={goingLiveId === lesson.id}
                                className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-500 active:scale-95 disabled:opacity-70"
                              >
                                {goingLiveId === lesson.id ? (
                                  <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <PlayIcon className="h-3.5 w-3.5" />
                                )}
                                {goingLiveId === lesson.id ? "Going live…" : "Go Live"}
                              </button>
                            </div>
                          </div>

                          {/* Inline delete confirmation */}
                          {deleteLessonConfirm === lesson.id ? (
                            <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-900/20 px-3 py-2 text-xs">
                              <span className="flex-1 text-red-300">Delete this lesson?</span>
                              <button
                                onClick={() => handleDeleteLesson(lesson.id)}
                                className="rounded-lg bg-red-600 px-2.5 py-1 font-semibold text-white hover:bg-red-500"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setDeleteLessonConfirm(null)}
                                className="rounded-lg border border-slate-600 px-2.5 py-1 text-slate-300 hover:bg-slate-700"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="mt-3 flex justify-end">
                              <button
                                onClick={() => setDeleteLessonConfirm(lesson.id)}
                                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-red-900/20 hover:text-red-400"
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── CREATE CLASS MODAL ── */}
      <Dialog open={classFormOpen} onOpenChange={(open) => { setClassFormOpen(open); if (!open) setClassErr(""); }}>
        <DialogContent className="border-slate-700 bg-slate-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Create a New Class</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateClass} className="space-y-4">
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
            <DialogFooter>
              <button
                type="button"
                onClick={() => { setClassFormOpen(false); setClassErr(""); }}
                className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
              >
                {saving ? "Creating…" : "Create Class"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── SCHEDULE LESSON MODAL ── */}
      <Dialog open={lessonFormOpen} onOpenChange={(open) => { setLessonFormOpen(open); if (!open) setLessonErr(""); }}>
        <DialogContent className="border-slate-700 bg-slate-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              Schedule a Lesson
              {selectedClass && (
                <span className="ml-2 text-sm font-normal text-slate-400">— {selectedClass.subject}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLesson} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Lesson Title</label>
              <input
                type="text"
                value={lessonForm.title}
                onChange={(e) => { setLessonForm((f) => ({ ...f, title: e.target.value })); setLessonErr(""); }}
                placeholder="e.g. Introduction to Fractions"
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40"
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
                <label className="mb-1 block text-xs font-medium text-slate-400">Duration (min)</label>
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
            <DialogFooter>
              <button
                type="button"
                onClick={() => { setLessonFormOpen(false); setLessonErr(""); }}
                className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
              >
                {saving ? "Scheduling…" : "Schedule Lesson"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MANAGE STUDENTS SHEET ── */}
      <Sheet open={studentsSheetOpen} onOpenChange={(open) => { setStudentsSheetOpen(open); }}>
        <SheetContent
          side="right"
          className="flex w-full flex-col border-slate-700 bg-slate-900 text-white sm:max-w-md"
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="text-white">Manage Student Access</SheetTitle>
            {managingLesson && (
              <SheetDescription className="text-slate-400">
                {managingLesson.title} · {formatDT(managingLesson.scheduled_at)}
              </SheetDescription>
            )}
          </SheetHeader>

          {loadingStudents ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center gap-3">
              <SpinnerIcon className="h-8 w-8 animate-spin text-violet-400" />
              <p className="text-sm text-slate-400">Loading students…</p>
            </div>
          ) : allStudents.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <UsersIcon className="mb-3 h-10 w-10 text-slate-600" />
              <p className="text-slate-400">No students registered yet</p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
                <span>{approvedIds.length} of {allStudents.length} approved</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setApprovedIds(allStudents.map((s) => s.id)); setStudentsSaved(false); }}
                    className="rounded-lg px-2 py-1 hover:bg-slate-800 hover:text-white"
                  >
                    Select all
                  </button>
                  <button
                    onClick={() => { setApprovedIds([]); setStudentsSaved(false); }}
                    className="rounded-lg px-2 py-1 hover:bg-slate-800 hover:text-white"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                {allStudents.map((student) => {
                  const approved = approvedIds.includes(student.id);
                  return (
                    <label
                      key={student.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                        approved
                          ? "border-emerald-500/40 bg-emerald-500/10"
                          : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={approved}
                        onChange={() => toggleStudent(student.id)}
                        className="h-4 w-4 accent-violet-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">
                          {student.first_name} {student.last_name}
                        </p>
                        <p className="text-xs text-slate-400">{student.adm_no} · {student.class_level}</p>
                      </div>
                      {approved && (
                        <span className="shrink-0 text-xs font-medium text-emerald-400">Approved</span>
                      )}
                    </label>
                  );
                })}
              </div>

              <div className="mt-4 border-t border-slate-800 pt-4">
                {studentsSaved && (
                  <p className="mb-2 text-center text-sm text-emerald-400">Access saved successfully!</p>
                )}
                <button
                  onClick={saveStudentAccess}
                  disabled={savingStudents}
                  className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-60"
                >
                  {savingStudents ? "Saving…" : "Save Access"}
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
