const API = import.meta.env.VITE_API_BASE_URL ?? "";

export interface StudentProfile {
  id: number;
  adm_no: string;
  first_name: string;
  last_name: string;
  class_level: string;
  parent_phone?: string;
}

export interface ApprovedLesson {
  lesson_id: number;
  lesson_title: string;
  scheduled_at: string;
  duration_minutes: number;
  subject: string;
  class_level: string;
  teacher_name: string;
}

export async function getStudentMe(): Promise<StudentProfile | null> {
  try {
    const r = await fetch(`${API}/api/students/me`, { credentials: "include" });
    if (!r.ok) return null;
    return r.json() as Promise<StudentProfile>;
  } catch {
    return null;
  }
}

export async function studentRegister(data: {
  adm_no: string;
  first_name: string;
  last_name: string;
  class_level: string;
  parent_phone: string;
}): Promise<{ ok: boolean; message: string; student?: StudentProfile }> {
  const r = await fetch(`${API}/api/students/register`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await r.json() as { message: string; student?: StudentProfile };
  return { ok: r.ok, ...json };
}

export async function studentLogin(adm_no: string, password: string): Promise<{ ok: boolean; message: string; student?: StudentProfile }> {
  const r = await fetch(`${API}/api/students/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adm_no, password }),
  });
  const json = await r.json() as { message: string; student?: StudentProfile };
  return { ok: r.ok, ...json };
}

export async function studentLogout(): Promise<void> {
  await fetch(`${API}/api/students/logout`, { method: "POST", credentials: "include" });
}

export async function getStudentDashboard(): Promise<{ student: StudentProfile; lessons: ApprovedLesson[] } | null> {
  try {
    const r = await fetch(`${API}/api/students/dashboard`, { credentials: "include" });
    if (!r.ok) return null;
    return r.json() as Promise<{ student: StudentProfile; lessons: ApprovedLesson[] }>;
  } catch {
    return null;
  }
}

/* ── Teacher class & lesson API (called from teacher pages) ── */

export interface TeacherClass {
  id: number;
  subject: string;
  class_level: string;
  description: string;
  teacher_name: string;
  created_at: string;
}

export interface ScheduledLesson {
  id: number;
  class_id: number;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  created_at: string;
}

export async function getTeacherClasses(): Promise<TeacherClass[]> {
  const r = await fetch(`${API}/api/teacher/classes`, { credentials: "include" });
  if (!r.ok) return [];
  const d = await r.json() as { classes: TeacherClass[] };
  return d.classes ?? [];
}

export async function createTeacherClass(data: { subject: string; class_level: string; description: string; teacher_name: string }): Promise<{ ok: boolean; message: string; class?: TeacherClass }> {
  const r = await fetch(`${API}/api/teacher/classes`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await r.json() as { message: string; class?: TeacherClass };
  return { ok: r.ok, ...json };
}

export async function deleteTeacherClass(id: number): Promise<void> {
  await fetch(`${API}/api/teacher/classes/${id}`, { method: "DELETE", credentials: "include" });
}

export async function getTeacherLessons(class_id?: number): Promise<ScheduledLesson[]> {
  const url = class_id ? `${API}/api/teacher/lessons?class_id=${class_id}` : `${API}/api/teacher/lessons`;
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) return [];
  const d = await r.json() as { lessons: ScheduledLesson[] };
  return d.lessons ?? [];
}

export async function createLesson(data: { class_id: number; title: string; scheduled_at: string; duration_minutes: number }): Promise<{ ok: boolean; message: string; lesson?: ScheduledLesson }> {
  const r = await fetch(`${API}/api/teacher/lessons`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await r.json() as { message: string; lesson?: ScheduledLesson };
  return { ok: r.ok, ...json };
}

export async function deleteLesson(id: number): Promise<void> {
  await fetch(`${API}/api/teacher/lessons/${id}`, { method: "DELETE", credentials: "include" });
}

export async function getLessonStudents(lessonId: number): Promise<{ approved_ids: number[]; all_students: StudentProfile[] }> {
  const r = await fetch(`${API}/api/teacher/lessons/${lessonId}/students`, { credentials: "include" });
  if (!r.ok) return { approved_ids: [], all_students: [] };
  return r.json() as Promise<{ approved_ids: number[]; all_students: StudentProfile[] }>;
}

export async function updateLessonStudents(lessonId: number, student_ids: number[]): Promise<{ ok: boolean; message: string }> {
  const r = await fetch(`${API}/api/teacher/lessons/${lessonId}/students`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_ids }),
  });
  const json = await r.json() as { message: string };
  return { ok: r.ok, ...json };
}

export async function getAllStudents(): Promise<StudentProfile[]> {
  const r = await fetch(`${API}/api/teacher/all-students`, { credentials: "include" });
  if (!r.ok) return [];
  const d = await r.json() as { students: StudentProfile[] };
  return d.students ?? [];
}
