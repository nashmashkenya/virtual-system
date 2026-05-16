import { Router, type IRouter, type Request, type Response } from "express";
import { randomBytes, createHash } from "crypto";

const router: IRouter = Router();

/* ─────────────────────────────────────────────────────────────
   In-memory stores (survive the process lifetime)
───────────────────────────────────────────────────────────── */
interface StoredUser {
  username: string;
  full_name: string;
  email: string;
  role: "student" | "teacher" | "admin";
  password_hash: string;
}

const users = new Map<string, StoredUser>();
const sessions = new Map<string, string>(); // sessionId → username

function hash(pw: string) {
  return createHash("sha256").update(pw).digest("hex");
}

function toPublic(u: StoredUser) {
  return { username: u.username, full_name: u.full_name, email: u.email, role: u.role };
}

/* ── Seed demo accounts ── */
const DEMO_USERS: StoredUser[] = [
  { username: "aisha.student", full_name: "Aisha Noor",   email: "aisha.student@edustream.test",  role: "student", password_hash: hash("password123") },
  { username: "brian.student", full_name: "Brian Otieno", email: "brian.student@edustream.test",  role: "student", password_hash: hash("password123") },
  { username: "grace.teacher", full_name: "Grace Njeri",  email: "grace.teacher@edustream.test",  role: "teacher", password_hash: hash("password123") },
];
DEMO_USERS.forEach((u) => users.set(u.username, u));

/* ── Cookie helpers ── */
const COOKIE = "ep_session";
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function createSession(username: string, res: Response) {
  const id = randomBytes(32).toString("hex");
  sessions.set(id, username);
  res.cookie(COOKIE, id, COOKIE_OPTS);
  return id;
}

function getSessionUser(req: Request): StoredUser | null {
  const id = req.cookies?.[COOKIE] as string | undefined;
  if (!id) return null;
  const username = sessions.get(id);
  if (!username) return null;
  return users.get(username) ?? null;
}

/* ─────────────────────────────────────────────────────────────
   GET /api/auth/demo-users/
───────────────────────────────────────────────────────────── */
router.get("/auth/demo-users/", (_req, res) => {
  res.json(DEMO_USERS.map(toPublic));
});

/* ─────────────────────────────────────────────────────────────
   GET /api/auth/me/
───────────────────────────────────────────────────────────── */
router.get("/auth/me/", (req, res) => {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ message: "Not authenticated." });
  res.json(toPublic(user));
});

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/session/login
   Body: { username, password }
───────────────────────────────────────────────────────────── */
router.post("/auth/session/login", (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  const user = users.get(username.trim().toLowerCase()) ?? users.get(username.trim());
  if (!user || user.password_hash !== hash(password)) {
    return res.status(401).json({ message: "Incorrect username or password." });
  }

  createSession(user.username, res);
  res.json({ message: "Signed in successfully.", user: toPublic(user) });
});

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/session/register
   Body: { first_name, last_name, username, email, password, role,
           school_class?, phone_number? }
───────────────────────────────────────────────────────────── */
router.post("/auth/session/register", (req, res) => {
  const {
    first_name, last_name, username, email, password, role,
    school_class, phone_number,
  } = req.body as Record<string, string | undefined>;

  if (!first_name || !username || !role) {
    return res.status(400).json({ message: "Name, username, and role are required." });
  }

  const slug = username.trim().toLowerCase();

  if (users.has(slug)) {
    return res.status(409).json({ message: "That username is already taken. Please choose another." });
  }

  // Derive password: explicit password > first 7 digits of phone > username
  let pw = password?.trim();
  if (!pw && phone_number) {
    pw = phone_number.replace(/\D/g, "").slice(0, 7);
  }
  if (!pw) {
    return res.status(400).json({ message: "A password is required." });
  }

  const full_name = [first_name.trim(), last_name?.trim() ?? ""].join(" ").trim();
  const resolvedEmail = email?.trim() || `${slug}@elimupawa.local`;

  const newUser: StoredUser = {
    username: slug,
    full_name,
    email: resolvedEmail,
    role: (role === "teacher" ? "teacher" : "student") as StoredUser["role"],
    password_hash: hash(pw),
  };

  users.set(slug, newUser);
  createSession(slug, res);

  res.status(201).json({ message: "Account created successfully.", user: toPublic(newUser) });
});

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/session/logout
───────────────────────────────────────────────────────────── */
router.post("/auth/session/logout", (req, res) => {
  const id = req.cookies?.[COOKIE] as string | undefined;
  if (id) sessions.delete(id);
  res.clearCookie(COOKIE);
  res.json({ message: "Logged out." });
});

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/session/password-reset/request  (stub)
───────────────────────────────────────────────────────────── */
router.post("/auth/session/password-reset/request", (req, res) => {
  res.json({ message: "If that email exists, a reset link has been sent." });
});

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/session/password-reset/confirm  (stub)
───────────────────────────────────────────────────────────── */
router.post("/auth/session/password-reset/confirm", (_req, res) => {
  res.json({ message: "Password updated successfully." });
});

export default router;
