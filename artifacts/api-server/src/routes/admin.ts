import { Router, type Request, type Response } from "express";
import { randomBytes } from "crypto";
import { db } from "@workspace/db";
import {
  adminClassLevels, adminSubjects, adminTerms, adminSessions,
  students, teacherClasses, lessons, schoolSettings,
} from "@workspace/db/schema";
import { eq, and, gt, sql, count } from "drizzle-orm";

const router = Router();
const COOKIE = "admin_token";
const SESSION_DAYS = 1;

function cookieOpts() {
  return { httpOnly: true, sameSite: "none" as const, secure: true, maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000, path: "/" };
}

async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  const token = req.cookies?.[COOKIE] as string | undefined;
  if (!token) { res.status(401).json({ message: "Not authenticated." }); return false; }
  const [s] = await db.select({ id: adminSessions.id }).from(adminSessions)
    .where(and(eq(adminSessions.token, token), gt(adminSessions.expiresAt, new Date()))).limit(1);
  if (!s) { res.status(401).json({ message: "Session expired." }); return false; }
  return true;
}

/* ── POST /api/admin/login ── */
router.post("/admin/login", async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };
  const expectedUser = process.env["ADMIN_USERNAME"] ?? "admin";
  const expectedPass = process.env["ADMIN_PASSWORD"] ?? "changeme";
  if (username !== expectedUser || password !== expectedPass) {
    return res.status(401).json({ message: "Invalid credentials." });
  }
  const token = randomBytes(32).toString("hex");
  await db.insert(adminSessions).values({ token, expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000) });
  res.cookie(COOKIE, token, cookieOpts());
  return res.json({ message: "Logged in." });
});

/* ── POST /api/admin/logout ── */
router.post("/admin/logout", async (req: Request, res: Response) => {
  const token = req.cookies?.[COOKIE] as string | undefined;
  if (token) await db.delete(adminSessions).where(eq(adminSessions.token, token));
  res.clearCookie(COOKIE, { path: "/" });
  return res.json({ message: "Logged out." });
});

/* ── GET /api/admin/me ── */
router.get("/admin/me", async (req: Request, res: Response) => {
  const ok = await requireAdmin(req, res);
  if (!ok) return;
  return res.json({ role: "admin", username: process.env["ADMIN_USERNAME"] ?? "admin" });
});

/* ── GET /api/admin/stats ── */
router.get("/admin/stats", async (req: Request, res: Response) => {
  const ok = await requireAdmin(req, res);
  if (!ok) return;
  const [[studentCount], [classCount], [lessonCount], [subjectCount], [levelCount]] = await Promise.all([
    db.select({ c: count() }).from(students),
    db.select({ c: count() }).from(teacherClasses),
    db.select({ c: count() }).from(lessons),
    db.select({ c: count() }).from(adminSubjects).where(eq(adminSubjects.isActive, true)),
    db.select({ c: count() }).from(adminClassLevels).where(eq(adminClassLevels.isActive, true)),
  ]);
  return res.json({
    students: Number(studentCount?.c ?? 0),
    teacher_classes: Number(classCount?.c ?? 0),
    lessons: Number(lessonCount?.c ?? 0),
    subjects: Number(subjectCount?.c ?? 0),
    class_levels: Number(levelCount?.c ?? 0),
  });
});

/* ────────────────────────────────────────────────────────────
   CLASS LEVELS
──────────────────────────────────────────────────────────── */
router.get("/admin/class-levels", async (req: Request, res: Response) => {
  const ok = await requireAdmin(req, res);
  if (!ok) return;
  const rows = await db.select().from(adminClassLevels).orderBy(adminClassLevels.sortOrder);
  return res.json({ class_levels: rows });
});

router.post("/admin/class-levels", async (req: Request, res: Response) => {
  const ok = await requireAdmin(req, res);
  if (!ok) return;
  const { name, sort_order } = req.body as { name?: string; sort_order?: number };
  if (!name?.trim()) return res.status(400).json({ message: "Name is required." });
  const existing = await db.select({ id: adminClassLevels.id }).from(adminClassLevels)
    .where(eq(adminClassLevels.name, name.trim())).limit(1);
  if (existing.length) return res.status(409).json({ message: "Class level already exists." });
  const maxOrder = await db.execute<{ max: number }>(sql`SELECT COALESCE(MAX(sort_order), 0) as max FROM admin_class_levels`);
  const [row] = await db.insert(adminClassLevels).values({
    name: name.trim(),
    sortOrder: sort_order ?? (Number(maxOrder.rows[0]?.max ?? 0) + 1),
  }).returning();
  return res.status(201).json({ class_level: row });
});

router.patch("/admin/class-levels/:id", async (req: Request, res: Response) => {
  const ok = await requireAdmin(req, res);
  if (!ok) return;
  const id = Number(req.params["id"]);
  const { name, sort_order, is_active } = req.body as { name?: string; sort_order?: number; is_active?: boolean };
  const updates: Partial<typeof adminClassLevels.$inferInsert> = {};
  if (name !== undefined) updates.name = name.trim();
  if (sort_order !== undefined) updates.sortOrder = sort_order;
  if (is_active !== undefined) updates.isActive = is_active;
  const [row] = await db.update(adminClassLevels).set(updates).where(eq(adminClassLevels.id, id)).returning();
  return res.json({ class_level: row });
});

router.delete("/admin/class-levels/:id", async (req: Request, res: Response) => {
  const ok = await requireAdmin(req, res);
  if (!ok) return;
  await db.delete(adminClassLevels).where(eq(adminClassLevels.id, Number(req.params["id"])));
  return res.json({ message: "Deleted." });
});

/* ────────────────────────────────────────────────────────────
   SUBJECTS
──────────────────────────────────────────────────────────── */
router.get("/admin/subjects", async (req: Request, res: Response) => {
  const ok = await requireAdmin(req, res);
  if (!ok) return;
  const rows = await db.select().from(adminSubjects).orderBy(adminSubjects.name);
  return res.json({ subjects: rows });
});

router.post("/admin/subjects", async (req: Request, res: Response) => {
  const ok = await requireAdmin(req, res);
  if (!ok) return;
  const { name } = req.body as { name?: string };
  if (!name?.trim()) return res.status(400).json({ message: "Name is required." });
  const existing = await db.select({ id: adminSubjects.id }).from(adminSubjects)
    .where(eq(adminSubjects.name, name.trim())).limit(1);
  if (existing.length) return res.status(409).json({ message: "Subject already exists." });
  const [row] = await db.insert(adminSubjects).values({ name: name.trim() }).returning();
  return res.status(201).json({ subject: row });
});

router.patch("/admin/subjects/:id", async (req: Request, res: Response) => {
  const ok = await requireAdmin(req, res);
  if (!ok) return;
  const id = Number(req.params["id"]);
  const { name, is_active } = req.body as { name?: string; is_active?: boolean };
  const updates: Partial<typeof adminSubjects.$inferInsert> = {};
  if (name !== undefined) updates.name = name.trim();
  if (is_active !== undefined) updates.isActive = is_active;
  const [row] = await db.update(adminSubjects).set(updates).where(eq(adminSubjects.id, id)).returning();
  return res.json({ subject: row });
});

router.delete("/admin/subjects/:id", async (req: Request, res: Response) => {
  const ok = await requireAdmin(req, res);
  if (!ok) return;
  await db.delete(adminSubjects).where(eq(adminSubjects.id, Number(req.params["id"])));
  return res.json({ message: "Deleted." });
});

/* ────────────────────────────────────────────────────────────
   ACADEMIC TERMS
──────────────────────────────────────────────────────────── */
router.get("/admin/terms", async (req: Request, res: Response) => {
  const ok = await requireAdmin(req, res);
  if (!ok) return;
  const rows = await db.select().from(adminTerms).orderBy(adminTerms.year, adminTerms.termNumber);
  return res.json({ terms: rows });
});

router.post("/admin/terms", async (req: Request, res: Response) => {
  const ok = await requireAdmin(req, res);
  if (!ok) return;
  const { name, year, term_number, start_date, end_date, is_current } = req.body as {
    name?: string; year?: number; term_number?: number;
    start_date?: string; end_date?: string; is_current?: boolean;
  };
  if (!name?.trim()) return res.status(400).json({ message: "Term name is required." });
  if (!year || !term_number) return res.status(400).json({ message: "Year and term number are required." });
  if (!start_date || !end_date) return res.status(400).json({ message: "Start and end dates are required." });
  if (is_current) {
    await db.update(adminTerms).set({ isCurrent: false });
  }
  const [row] = await db.insert(adminTerms).values({
    name: name.trim(), year, termNumber: term_number,
    startDate: start_date, endDate: end_date, isCurrent: is_current ?? false,
  }).returning();
  return res.status(201).json({ term: row });
});

router.patch("/admin/terms/:id", async (req: Request, res: Response) => {
  const ok = await requireAdmin(req, res);
  if (!ok) return;
  const id = Number(req.params["id"]);
  const { name, year, term_number, start_date, end_date, is_current } = req.body as {
    name?: string; year?: number; term_number?: number;
    start_date?: string; end_date?: string; is_current?: boolean;
  };
  if (is_current === true) {
    await db.update(adminTerms).set({ isCurrent: false });
  }
  const updates: Partial<typeof adminTerms.$inferInsert> = {};
  if (name !== undefined) updates.name = name.trim();
  if (year !== undefined) updates.year = year;
  if (term_number !== undefined) updates.termNumber = term_number;
  if (start_date !== undefined) updates.startDate = start_date;
  if (end_date !== undefined) updates.endDate = end_date;
  if (is_current !== undefined) updates.isCurrent = is_current;
  const [row] = await db.update(adminTerms).set(updates).where(eq(adminTerms.id, id)).returning();
  return res.json({ term: row });
});

router.delete("/admin/terms/:id", async (req: Request, res: Response) => {
  const ok = await requireAdmin(req, res);
  if (!ok) return;
  await db.delete(adminTerms).where(eq(adminTerms.id, Number(req.params["id"])));
  return res.json({ message: "Deleted." });
});

/* ────────────────────────────────────────────────────────────
   PUBLIC READ-ONLY (used by student sign-up + teacher forms)
──────────────────────────────────────────────────────────── */
router.get("/public/class-levels", async (_req, res) => {
  const rows = await db.select({ id: adminClassLevels.id, name: adminClassLevels.name })
    .from(adminClassLevels).where(eq(adminClassLevels.isActive, true))
    .orderBy(adminClassLevels.sortOrder);
  return res.json({ class_levels: rows });
});

router.get("/public/subjects", async (_req, res) => {
  const rows = await db.select({ id: adminSubjects.id, name: adminSubjects.name })
    .from(adminSubjects).where(eq(adminSubjects.isActive, true))
    .orderBy(adminSubjects.name);
  return res.json({ subjects: rows });
});

router.get("/public/terms", async (_req, res) => {
  const rows = await db.select().from(adminTerms).orderBy(adminTerms.year, adminTerms.termNumber);
  return res.json({ terms: rows });
});

/* ── GET /api/public/school — public school branding ── */
router.get("/public/school", async (_req, res) => {
  const [row] = await db.select({ schoolName: schoolSettings.schoolName, schoolLogo: schoolSettings.schoolLogo })
    .from(schoolSettings).limit(1);
  return res.json({ school_name: row?.schoolName ?? "", school_logo: row?.schoolLogo ?? "" });
});

/* ── GET /api/admin/settings ── */
router.get("/admin/settings", async (req: Request, res: Response) => {
  const ok = await requireAdmin(req, res);
  if (!ok) return;
  const [row] = await db.select().from(schoolSettings).limit(1);
  return res.json({ school_name: row?.schoolName ?? "", school_logo: row?.schoolLogo ?? "" });
});

/* ── PATCH /api/admin/settings ── */
router.patch("/admin/settings", async (req: Request, res: Response) => {
  const ok = await requireAdmin(req, res);
  if (!ok) return;
  const { school_name, school_logo } = req.body as { school_name?: string; school_logo?: string };
  const [existing] = await db.select({ id: schoolSettings.id }).from(schoolSettings).limit(1);
  if (existing) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (school_name !== undefined) updates["schoolName"] = school_name.trim();
    if (school_logo !== undefined) updates["schoolLogo"] = school_logo;
    await db.update(schoolSettings).set(updates).where(eq(schoolSettings.id, existing.id));
  } else {
    await db.insert(schoolSettings).values({
      schoolName: school_name?.trim() ?? "",
      schoolLogo: school_logo ?? "",
      updatedAt: new Date(),
    });
  }
  const [row] = await db.select().from(schoolSettings).limit(1);
  return res.json({ school_name: row?.schoolName ?? "", school_logo: row?.schoolLogo ?? "" });
});

export default router;
