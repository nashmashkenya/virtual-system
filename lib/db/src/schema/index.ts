import { pgTable, serial, text, integer, timestamp, primaryKey, boolean, date } from "drizzle-orm/pg-core";

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  admNo: text("adm_no").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  classLevel: text("class_level").notNull(),
  parentPhone: text("parent_phone").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const studentSessions = pgTable("student_sessions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const teacherClasses = pgTable("teacher_classes", {
  id: serial("id").primaryKey(),
  teacherId: text("teacher_id").notNull(),
  teacherName: text("teacher_name").notNull().default(""),
  subject: text("subject").notNull(),
  classLevel: text("class_level").notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull().references(() => teacherClasses.id, { onDelete: "cascade" }),
  teacherId: text("teacher_id").notNull(),
  title: text("title").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const lessonStudents = pgTable("lesson_students", {
  lessonId: integer("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.lessonId, table.studentId] }),
]);

export const adminClassLevels = pgTable("admin_class_levels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const adminSubjects = pgTable("admin_subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const adminTerms = pgTable("admin_terms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  year: integer("year").notNull(),
  termNumber: integer("term_number").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isCurrent: boolean("is_current").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const adminSessions = pgTable("admin_sessions", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const schoolSettings = pgTable("school_settings", {
  id: serial("id").primaryKey(),
  schoolName: text("school_name").notNull().default(""),
  schoolLogo: text("school_logo").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Student = typeof students.$inferSelect;
export type TeacherClass = typeof teacherClasses.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type AdminClassLevel = typeof adminClassLevels.$inferSelect;
export type AdminSubject = typeof adminSubjects.$inferSelect;
export type AdminTerm = typeof adminTerms.$inferSelect;
