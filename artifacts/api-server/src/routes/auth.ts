import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

interface ClerkProfile {
  role: "student" | "teacher";
  full_name: string;
  username: string;
}

const clerkProfiles = new Map<string, ClerkProfile>();

/* ─────────────────────────────────────────────────────────────
   GET /api/auth/me/
   Returns the current Clerk user's profile + stored role.
───────────────────────────────────────────────────────────── */
router.get("/auth/me/", (req, res) => {
  const auth = getAuth(req);
  if (!auth?.userId) return res.status(401).json({ message: "Not authenticated." });

  const profile = clerkProfiles.get(auth.userId);
  return res.json({
    id: auth.userId,
    username: profile?.username ?? auth.userId.slice(0, 12),
    full_name: profile?.full_name ?? "",
    email: "",
    role: profile?.role ?? null,
    organizations: [],
  });
});

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/set-role
   Body: { role: "student" | "teacher", full_name?, username? }
   Called once during onboarding.
───────────────────────────────────────────────────────────── */
router.post("/auth/set-role", (req, res) => {
  const auth = getAuth(req);
  if (!auth?.userId) return res.status(401).json({ message: "Not authenticated." });

  const { role, full_name, username } = req.body as {
    role?: string;
    full_name?: string;
    username?: string;
  };

  if (!role || !["student", "teacher"].includes(role)) {
    return res.status(400).json({ message: "Valid role is required (student or teacher)." });
  }

  clerkProfiles.set(auth.userId, {
    role: role as "student" | "teacher",
    full_name: full_name ?? "",
    username: username ?? auth.userId.slice(0, 12),
  });

  return res.json({ message: "Profile saved.", role });
});

/* ─────────────────────────────────────────────────────────────
   Legacy stubs — kept so old frontend calls don't crash
───────────────────────────────────────────────────────────── */
router.get("/auth/demo-users/", (_req, res) => {
  res.json([]);
});

router.post("/auth/session/login", (_req, res) => {
  res.status(410).json({ message: "Sign in via the sign-in page." });
});

router.post("/auth/session/register", (_req, res) => {
  res.status(410).json({ message: "Register via the sign-up page." });
});

router.post("/auth/session/logout", (_req, res) => {
  res.status(410).json({ message: "Sign out via the app." });
});

router.post("/auth/session/password-reset/request", (_req, res) => {
  res.json({ message: "Password reset is handled by the sign-in page." });
});

router.post("/auth/session/password-reset/confirm", (_req, res) => {
  res.json({ message: "Password reset is handled by Clerk." });
});

export default router;
