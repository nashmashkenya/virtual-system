import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

interface OrgMember {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
}

const orgMembers = new Map<number, OrgMember[]>([
  [
    1,
    [
      { user_id: 1, username: "grace.teacher", full_name: "Grace Njeri", email: "grace.teacher@edustream.test", role: "teacher" },
      { user_id: 2, username: "aisha.student", full_name: "Aisha Noor", email: "aisha.student@edustream.test", role: "student" },
    ],
  ],
]);

let memberIdSeq = 100;

/* ─────────────────────────────────────────────────────────────
   GET /api/organizations/:id/members/
───────────────────────────────────────────────────────────── */
router.get("/organizations/:id/members/", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  res.json(orgMembers.get(id) ?? []);
});

/* ─────────────────────────────────────────────────────────────
   POST /api/organizations/:id/members/
───────────────────────────────────────────────────────────── */
router.post("/organizations/:id/members/", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const { username, role } = req.body as { username: string; role: string };
  if (!username || !role) return res.status(400).json({ message: "Username and role are required." });
  const list = orgMembers.get(id) ?? [];
  if (list.find((m) => m.username === username)) {
    return res.status(409).json({ message: "Member already exists." });
  }
  const member: OrgMember = {
    user_id: ++memberIdSeq,
    username,
    full_name: username,
    email: `${username}@elimupawa.local`,
    role,
  };
  list.push(member);
  orgMembers.set(id, list);
  res.status(201).json(member);
});

/* ─────────────────────────────────────────────────────────────
   DELETE /api/organizations/:id/members/:userId/
───────────────────────────────────────────────────────────── */
router.delete("/organizations/:id/members/:userId/", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const userId = Number(req.params["userId"]);
  const list = (orgMembers.get(id) ?? []).filter((m) => m.user_id !== userId);
  orgMembers.set(id, list);
  res.status(204).send();
});

export default router;
