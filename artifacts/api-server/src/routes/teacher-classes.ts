import { Router, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { teacherClasses, lessons, lessonStudents, students } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

/* ── helpers ── */
function requireTeacher(req: Request, res: Response) {
  if (process.env.SKIP_CLERK_AUTH === "true") {
    return "mock_teacher_id";
  }
  try {
    const auth = getAuth(req);
    if (!auth?.userId) {
      res.status(401).json({ message: "Not authenticated." });
      return null;
    }
    return auth.userId;
  } catch (err) {
    req.log?.error({ err }, "Error checking Clerk auth in requireTeacher");
    res.status(500).json({ message: "Authentication library error." });
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────
   CLASSES
───────────────────────────────────────────────────────────── */

/* GET /api/teacher/classes */
router.get("/teacher/classes", async (req: Request, res: Response) => {
  const teacherId = requireTeacher(req, res);
  if (!teacherId) return;

  const rows = await db
    .select({
      id: teacherClasses.id,
      teacher_id: teacherClasses.teacherId,
      teacher_name: teacherClasses.teacherName,
      subject: teacherClasses.subject,
      class_level: teacherClasses.classLevel,
      description: teacherClasses.description,
      created_at: teacherClasses.createdAt,
      lesson_count: sql<number>`(select count(*)::int from ${lessons} where ${lessons.classId} = ${teacherClasses.id})`,
    })
    .from(teacherClasses)
    .where(eq(teacherClasses.teacherId, teacherId));

  return res.json({ classes: rows });
});

/* POST /api/teacher/classes */
router.post("/teacher/classes", async (req: Request, res: Response) => {
  const teacherId = requireTeacher(req, res);
  if (!teacherId) return;

  const { subject, class_level, description, teacher_name } = req.body as {
    subject?: string;
    class_level?: string;
    description?: string;
    teacher_name?: string;
  };

  if (!subject?.trim()) return res.status(400).json({ message: "Subject is required." });
  if (!class_level?.trim()) return res.status(400).json({ message: "Class level is required." });

  const [cls] = await db.insert(teacherClasses).values({
    teacherId,
    teacherName: teacher_name?.trim() ?? "",
    subject: subject.trim(),
    classLevel: class_level.trim(),
    description: description?.trim() ?? "",
  }).returning();

  return res.status(201).json({ message: "Class created.", class: cls });
});

/* DELETE /api/teacher/classes/:id */
router.delete("/teacher/classes/:id", async (req: Request, res: Response) => {
  const teacherId = requireTeacher(req, res);
  if (!teacherId) return;

  const id = Number(req.params["id"]);
  await db.delete(teacherClasses).where(and(eq(teacherClasses.id, id), eq(teacherClasses.teacherId, teacherId)));
  return res.json({ message: "Class deleted." });
});

/* ─────────────────────────────────────────────────────────────
   LESSONS
───────────────────────────────────────────────────────────── */

/* GET /api/teacher/lessons?class_id= */
router.get("/teacher/lessons", async (req: Request, res: Response) => {
  const teacherId = requireTeacher(req, res);
  if (!teacherId) return;

  const classId = req.query["class_id"] ? Number(req.query["class_id"]) : null;
  const baseQuery = db
    .select({
      id: lessons.id,
      class_id: lessons.classId,
      teacher_id: lessons.teacherId,
      title: lessons.title,
      scheduled_at: lessons.scheduledAt,
      duration_minutes: lessons.durationMinutes,
      created_at: lessons.createdAt,
      approved_count: sql<number>`(select count(*)::int from ${lessonStudents} where ${lessonStudents.lessonId} = ${lessons.id})`,
    })
    .from(lessons);

  const rows = classId
    ? await baseQuery.where(and(eq(lessons.teacherId, teacherId), eq(lessons.classId, classId)))
    : await baseQuery.where(eq(lessons.teacherId, teacherId));

  return res.json({ lessons: rows });
});

/* POST /api/teacher/lessons */
router.post("/teacher/lessons", async (req: Request, res: Response) => {
  const teacherId = requireTeacher(req, res);
  if (!teacherId) return;

  const { class_id, title, scheduled_at, duration_minutes } = req.body as {
    class_id?: number;
    title?: string;
    scheduled_at?: string;
    duration_minutes?: number;
  };

  if (!class_id) return res.status(400).json({ message: "Class is required." });
  if (!title?.trim()) return res.status(400).json({ message: "Lesson title is required." });
  if (!scheduled_at) return res.status(400).json({ message: "Date and time are required." });

  const cls = await db.select({ id: teacherClasses.id }).from(teacherClasses)
    .where(and(eq(teacherClasses.id, class_id), eq(teacherClasses.teacherId, teacherId))).limit(1);
  if (!cls.length) return res.status(404).json({ message: "Class not found." });

  const [lesson] = await db.insert(lessons).values({
    classId: class_id,
    teacherId,
    title: title.trim(),
    scheduledAt: new Date(scheduled_at),
    durationMinutes: duration_minutes ?? 60,
  }).returning();

  return res.status(201).json({ message: "Lesson scheduled.", lesson });
});

/* DELETE /api/teacher/lessons/:id */
router.delete("/teacher/lessons/:id", async (req: Request, res: Response) => {
  const teacherId = requireTeacher(req, res);
  if (!teacherId) return;

  const id = Number(req.params["id"]);
  await db.delete(lessons).where(and(eq(lessons.id, id), eq(lessons.teacherId, teacherId)));
  return res.json({ message: "Lesson deleted." });
});

/* ─────────────────────────────────────────────────────────────
   LESSON STUDENT ACCESS
───────────────────────────────────────────────────────────── */

/* GET /api/teacher/lessons/:id/students — list approved + all students */
router.get("/teacher/lessons/:id/students", async (req: Request, res: Response) => {
  const teacherId = requireTeacher(req, res);
  if (!teacherId) return;

  const lessonId = Number(req.params["id"]);
  const [lesson] = await db.select({ id: lessons.id }).from(lessons)
    .where(and(eq(lessons.id, lessonId), eq(lessons.teacherId, teacherId))).limit(1);
  if (!lesson) return res.status(404).json({ message: "Lesson not found." });

  const approvedIds = (await db.select({ studentId: lessonStudents.studentId }).from(lessonStudents)
    .where(eq(lessonStudents.lessonId, lessonId))).map((r) => r.studentId);

  const allStudents = await db.select({
    id: students.id,
    adm_no: students.admNo,
    first_name: students.firstName,
    last_name: students.lastName,
    class_level: students.classLevel,
  }).from(students);

  return res.json({
    approved_ids: approvedIds,
    all_students: allStudents,
  });
});

/* PUT /api/teacher/lessons/:id/students — replace approved list */
router.put("/teacher/lessons/:id/students", async (req: Request, res: Response) => {
  const teacherId = requireTeacher(req, res);
  if (!teacherId) return;

  const lessonId = Number(req.params["id"]);
  const { student_ids } = req.body as { student_ids?: number[] };
  if (!Array.isArray(student_ids)) return res.status(400).json({ message: "student_ids must be an array." });

  const [lesson] = await db.select({ id: lessons.id }).from(lessons)
    .where(and(eq(lessons.id, lessonId), eq(lessons.teacherId, teacherId))).limit(1);
  if (!lesson) return res.status(404).json({ message: "Lesson not found." });

  await db.delete(lessonStudents).where(eq(lessonStudents.lessonId, lessonId));

  if (student_ids.length > 0) {
    await db.insert(lessonStudents).values(
      student_ids.map((sid) => ({ lessonId, studentId: sid }))
    );
  }

  return res.json({ message: "Student access updated.", approved_count: student_ids.length });
});

/* GET /api/teacher/all-students — list all registered students */
router.get("/teacher/all-students", async (req: Request, res: Response) => {
  const teacherId = requireTeacher(req, res);
  if (!teacherId) return;

  const rows = await db.select({
    id: students.id,
    adm_no: students.admNo,
    first_name: students.firstName,
    last_name: students.lastName,
    class_level: students.classLevel,
  }).from(students).orderBy(students.classLevel, students.lastName);

  return res.json({ students: rows });
});

export default router;
