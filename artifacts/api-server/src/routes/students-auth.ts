import { Router, type Request, type Response } from "express";
import { randomBytes } from "crypto";
import { db } from "@workspace/db";
import { students, studentSessions, lessons, lessonStudents, teacherClasses } from "@workspace/db/schema";
import { eq, and, gt, sql } from "drizzle-orm";

const router = Router();

const COOKIE_NAME = "student_token";
const SESSION_DAYS = 30;

function genToken() {
  return randomBytes(32).toString("hex");
}

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "none" as const,
    secure: true,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

/* ── POST /api/students/register ── */
router.post("/students/register", async (req: Request, res: Response) => {
  const { adm_no, first_name, last_name, class_level, parent_phone } = req.body as {
    adm_no?: string;
    first_name?: string;
    last_name?: string;
    class_level?: string;
    parent_phone?: string;
  };

  if (!adm_no?.trim()) return res.status(400).json({ message: "ADM No is required." });
  if (!first_name?.trim()) return res.status(400).json({ message: "First name is required." });
  if (!last_name?.trim()) return res.status(400).json({ message: "Last name is required." });
  if (!class_level?.trim()) return res.status(400).json({ message: "Class is required." });
  if (!parent_phone?.trim()) return res.status(400).json({ message: "Parent phone is required." });
  if (!/^\d/.test(parent_phone.trim())) return res.status(400).json({ message: "Parent phone must start with a digit." });

  const existing = await db.select({ id: students.id }).from(students).where(eq(students.admNo, adm_no.trim())).limit(1);
  if (existing.length > 0) return res.status(409).json({ message: "A student with this ADM No already exists." });

  const [student] = await db.insert(students).values({
    admNo: adm_no.trim().toUpperCase(),
    firstName: first_name.trim(),
    lastName: last_name.trim(),
    classLevel: class_level.trim(),
    parentPhone: parent_phone.trim(),
  }).returning();

  const token = genToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(studentSessions).values({ studentId: student.id, token, expiresAt });

  res.cookie(COOKIE_NAME, token, cookieOpts());
  return res.status(201).json({
    message: "Account created.",
    student: {
      id: student.id,
      adm_no: student.admNo,
      first_name: student.firstName,
      last_name: student.lastName,
      class_level: student.classLevel,
    },
  });
});

/* ── POST /api/students/login ── */
router.post("/students/login", async (req: Request, res: Response) => {
  const { adm_no, password } = req.body as { adm_no?: string; password?: string };

  if (!adm_no?.trim()) return res.status(400).json({ message: "ADM No is required." });
  if (!password) return res.status(400).json({ message: "Password is required." });

  const [student] = await db.select().from(students).where(eq(students.admNo, adm_no.trim().toUpperCase())).limit(1);
  if (!student) return res.status(401).json({ message: "Invalid ADM No or password." });

  const expectedPassword = student.parentPhone.trim()[0];
  if (password !== expectedPassword) return res.status(401).json({ message: "Invalid ADM No or password." });

  const token = genToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(studentSessions).values({ studentId: student.id, token, expiresAt });

  res.cookie(COOKIE_NAME, token, cookieOpts());
  return res.json({
    message: "Logged in.",
    student: {
      id: student.id,
      adm_no: student.admNo,
      first_name: student.firstName,
      last_name: student.lastName,
      class_level: student.classLevel,
    },
  });
});

/* ── POST /api/students/logout ── */
router.post("/students/logout", async (req: Request, res: Response) => {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (token) {
    await db.delete(studentSessions).where(eq(studentSessions.token, token));
  }
  res.clearCookie(COOKIE_NAME, { path: "/" });
  return res.json({ message: "Logged out." });
});

/* ── GET /api/students/me ── */
router.get("/students/me", async (req: Request, res: Response) => {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) return res.status(401).json({ message: "Not authenticated." });

  const [session] = await db
    .select({ studentId: studentSessions.studentId })
    .from(studentSessions)
    .where(and(eq(studentSessions.token, token), gt(studentSessions.expiresAt, new Date())))
    .limit(1);

  if (!session) return res.status(401).json({ message: "Session expired or invalid." });

  const [student] = await db.select().from(students).where(eq(students.id, session.studentId)).limit(1);
  if (!student) return res.status(401).json({ message: "Student not found." });

  return res.json({
    id: student.id,
    adm_no: student.admNo,
    first_name: student.firstName,
    last_name: student.lastName,
    class_level: student.classLevel,
    parent_phone: student.parentPhone,
  });
});

/* ── GET /api/students/dashboard ── */
router.get("/students/dashboard", async (req: Request, res: Response) => {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) return res.status(401).json({ message: "Not authenticated." });

  const [session] = await db
    .select({ studentId: studentSessions.studentId })
    .from(studentSessions)
    .where(and(eq(studentSessions.token, token), gt(studentSessions.expiresAt, new Date())))
    .limit(1);

  if (!session) return res.status(401).json({ message: "Session expired or invalid." });

  const [student] = await db.select().from(students).where(eq(students.id, session.studentId)).limit(1);
  if (!student) return res.status(401).json({ message: "Student not found." });

  const approvedLessons = await db
    .select({
      lesson_id: lessons.id,
      lesson_title: lessons.title,
      scheduled_at: lessons.scheduledAt,
      duration_minutes: lessons.durationMinutes,
      subject: teacherClasses.subject,
      class_level: teacherClasses.classLevel,
      teacher_name: teacherClasses.teacherName,
    })
    .from(lessonStudents)
    .innerJoin(lessons, eq(lessons.id, lessonStudents.lessonId))
    .innerJoin(teacherClasses, eq(teacherClasses.id, lessons.classId))
    .where(eq(lessonStudents.studentId, student.id))
    .orderBy(sql`${lessons.scheduledAt} ASC`);

  return res.json({
    student: {
      id: student.id,
      adm_no: student.admNo,
      first_name: student.firstName,
      last_name: student.lastName,
      class_level: student.classLevel,
    },
    lessons: approvedLessons,
  });
});

export default router;
