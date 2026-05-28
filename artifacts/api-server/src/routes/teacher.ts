import { Router, type IRouter, type Request, type Response } from "express";
import { randomBytes } from "crypto";

const router: IRouter = Router();

/* ─────────────────────────────────────────────────────────────
   Types (mirrored from frontend — kept local to avoid coupling)
───────────────────────────────────────────────────────────── */
interface RoomState {
  stage_mode: string;
  teacher_camera_enabled: boolean;
  teacher_mic_enabled: boolean;
  screen_share_enabled: boolean;
  whiteboard_enabled: boolean;
  student_chat_enabled: boolean;
  chat_moderation_mode: string;
  qa_queue_max_pending: number;
  chat_slow_mode: boolean;
  qa_queue_pending_count: number;
  student_raise_hand_enabled: boolean;
  join_approval_enabled: boolean;
  spotlight_mode: string;
  breakout_enabled: boolean;
  monitored_breakout_room_id: number | null;
  breakout_timer_ends_at: string | null;
  last_breakout_layout_available: boolean;
  recording_status: string;
  recording_started_at: string | null;
}

interface TeacherSession {
  id: number;
  organization_id: number | null;
  organization_name: string;
  open_enrollment: boolean;
  program_id: number | null;
  program_title: string;
  title: string;
  description: string;
  youtube_link: string;
  starts_at: string;
  room_code: string;
  is_paid: boolean;
  price_amount: string;
  delivery_mode: "interactive" | "broadcast";
  expected_participants: number;
  teacher_name: string;
  status: string;
  enrolled_students: number;
  created_at: string;
}

interface TeacherStudent {
  id: number;
  username: string;
  full_name: string;
  email: string;
  school_name: string;
  school_class: string;
}

interface LearningProgram {
  id: number;
  organization_id: number;
  title: string;
  slug: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
}

interface TeacherPoll {
  id: number;
  question: string;
  is_active: boolean;
  response_count: number;
  options: Array<{ id: number; label: string; value: number }>;
}

interface TeacherQuiz {
  id: number;
  question: string;
  is_active: boolean;
  choices: Array<{ id: number; label: string }>;
}

interface WhiteboardState {
  pages: Array<{ id: string; name: string; background_template?: string; strokes: unknown[] }>;
  active_page: number;
  updated_at?: string;
}

interface SessionEnrollment {
  student_id: number;
  username: string;
  full_name: string;
  email: string;
  school_name: string;
  school_class: string;
  progress: number;
  access_status: string;
  enrollment_source: string;
  display_time: string;
}

interface SessionResourceItem {
  id: number;
  title: string;
  url: string;
  file_url?: string | null;
}

interface ClassroomMessage {
  id: number;
  sender: string;
  role: string;
  message: string;
  time: string;
}

interface TeacherBreakoutRoom {
  id: number;
  name: string;
  member_count: number;
  teacher_present: boolean;
  spokesperson_student_id: number | null;
  spokesperson_name: string | null;
  students: Array<{ student_id: number; name: string; status: string }>;
}

/* ─────────────────────────────────────────────────────────────
   In-memory stores
───────────────────────────────────────────────────────────── */
let sessionIdSeq = 100;
let pollIdSeq = 10;
let quizIdSeq = 10;
let resourceIdSeq = 10;
let programIdSeq = 10;
let messageIdSeq = 100;
let raiseHandIdSeq = 10;

const defaultRoomState = (): RoomState => ({
  stage_mode: "camera",
  teacher_camera_enabled: false,
  teacher_mic_enabled: true,
  screen_share_enabled: false,
  whiteboard_enabled: false,
  student_chat_enabled: true,
  chat_moderation_mode: "open",
  qa_queue_max_pending: 75,
  chat_slow_mode: false,
  qa_queue_pending_count: 0,
  student_raise_hand_enabled: true,
  join_approval_enabled: false,
  spotlight_mode: "off",
  breakout_enabled: false,
  monitored_breakout_room_id: null,
  breakout_timer_ends_at: null,
  last_breakout_layout_available: true,
  recording_status: "idle",
  recording_started_at: null,
});

const defaultWhiteboard = (): WhiteboardState => ({
  pages: [{ id: "page-1", name: "Page 1", strokes: [] }],
  active_page: 0,
  updated_at: new Date().toISOString(),
});

function roomCode() {
  return randomBytes(3).toString("hex");
}

/* ── Seed sessions ── */
export const sessionsStore = new Map<number, TeacherSession>([
  [
    1,
    {
      id: 1,
      organization_id: null,
      organization_name: "",
      open_enrollment: true,
      program_id: null,
      program_title: "",
      title: "Data Analytics Bootcamp",
      description: "Live session covering growth reporting and cohort KPIs.",
      youtube_link: "https://www.youtube.com/live/jfKfPfyJRdk",
      starts_at: "2026-05-16T18:00",
      room_code: "data-001",
      is_paid: true,
      price_amount: "3500.00",
      delivery_mode: "broadcast",
      expected_participants: 1200,
      teacher_name: "Grace Njeri",
      status: "Live",
      enrolled_students: 42,
      created_at: "2026-05-01T08:00:00Z",
    },
  ],
  [
    2,
    {
      id: 2,
      organization_id: null,
      organization_name: "",
      open_enrollment: true,
      program_id: null,
      program_title: "",
      title: "UI Engineering Masterclass",
      description: "Deep dive into component architecture and design systems.",
      youtube_link: "",
      starts_at: "2026-05-17T20:00",
      room_code: "ui-eng-002",
      is_paid: false,
      price_amount: "0.00",
      delivery_mode: "interactive",
      expected_participants: 80,
      teacher_name: "Grace Njeri",
      status: "Upcoming",
      enrolled_students: 24,
      created_at: "2026-05-02T09:30:00Z",
    },
  ],
]);

const studentsStore = new Map<number, TeacherStudent>([
  [1, { id: 1, username: "aisha.student", full_name: "Aisha Noor", email: "aisha.student@edustream.test", school_name: "Nairobi Academy", school_class: "Form 4" }],
  [2, { id: 2, username: "brian.student", full_name: "Brian Otieno", email: "brian.student@edustream.test", school_name: "Mombasa High", school_class: "Form 3" }],
  [3, { id: 3, username: "faith.student", full_name: "Faith Wanjiru", email: "faith.student@edustream.test", school_name: "Nakuru Girls", school_class: "Form 2" }],
  [4, { id: 4, username: "john.student", full_name: "John Kamau", email: "john.student@edustream.test", school_name: "Kisumu Boys", school_class: "Form 1" }],
]);

const programsStore = new Map<number, LearningProgram>([
  [
    1,
    {
      id: 1,
      organization_id: 1,
      title: "Data Science Certificate 2026",
      slug: "data-science-cert-2026",
      starts_at: "2026-01-15",
      ends_at: "2026-06-30",
      created_at: "2025-12-01T10:00:00Z",
    },
  ],
]);

export const roomStatesStore = new Map<number, RoomState>([
  [1, defaultRoomState()],
  [2, defaultRoomState()],
]);

export const whiteboardsStore = new Map<number, WhiteboardState>([
  [1, defaultWhiteboard()],
  [2, defaultWhiteboard()],
]);

const enrollmentsStore = new Map<number, SessionEnrollment[]>([
  [
    1,
    [
      { student_id: 1, username: "aisha.student", full_name: "Aisha Noor", email: "aisha.student@edustream.test", school_name: "Nairobi Academy", school_class: "Form 4", progress: 82, access_status: "live_now", enrollment_source: "roster", display_time: "6:00 PM" },
      { student_id: 2, username: "brian.student", full_name: "Brian Otieno", email: "brian.student@edustream.test", school_name: "Mombasa High", school_class: "Form 3", progress: 54, access_status: "live_now", enrollment_source: "join_code", display_time: "6:01 PM" },
      { student_id: 3, username: "faith.student", full_name: "Faith Wanjiru", email: "faith.student@edustream.test", school_name: "Nakuru Girls", school_class: "Form 2", progress: 30, access_status: "locked", enrollment_source: "roster", display_time: "-" },
      { student_id: 4, username: "john.student", full_name: "John Kamau", email: "john.student@edustream.test", school_name: "Kisumu Boys", school_class: "Form 1", progress: 67, access_status: "live_now", enrollment_source: "join_code", display_time: "6:03 PM" },
    ],
  ],
  [2, []],
]);

export const pollsStore = new Map<number, TeacherPoll[]>([
  [
    1,
    [
      {
        id: 1,
        question: "Which metric should the class prioritize this week?",
        is_active: true,
        response_count: 37,
        options: [
          { id: 1, label: "Attendance rate", value: 36 },
          { id: 2, label: "Completion rate", value: 48 },
          { id: 3, label: "Average quiz score", value: 16 },
        ],
      },
    ],
  ],
  [2, []],
]);

export const quizzesStore = new Map<number, TeacherQuiz[]>([
  [
    1,
    [
      {
        id: 1,
        question: "Which dashboard view is best for tracking cohort retention?",
        is_active: true,
        choices: [
          { id: 1, label: "Weekly retention chart" },
          { id: 2, label: "Invoice ledger" },
          { id: 3, label: "Chat transcript" },
          { id: 4, label: "Quiz timer" },
        ],
      },
    ],
  ],
  [2, []],
]);

const resourcesStore = new Map<number, SessionResourceItem[]>([
  [1, []],
  [2, []],
]);

export const chatStore = new Map<number, ClassroomMessage[]>([
  [
    1,
    [
      { id: 1, sender: "Grace Njeri", role: "teacher", message: "Welcome in. We are reviewing dashboards and cohort KPIs today.", time: "6:02 PM" },
      { id: 2, sender: "Kevin", role: "student", message: "Can you repeat the retention formula after the break?", time: "6:04 PM" },
      { id: 3, sender: "Aisha", role: "student", message: "Quiz panel loaded perfectly on my phone.", time: "6:05 PM" },
    ],
  ],
  [2, []],
]);

const breakoutsStore = new Map<number, TeacherBreakoutRoom[]>([
  [
    1,
    [
      {
        id: 1,
        name: "Breakout Room 1",
        member_count: 2,
        teacher_present: true,
        spokesperson_student_id: 1,
        spokesperson_name: "Aisha Noor",
        students: [
          { student_id: 1, name: "Aisha Noor", status: "Present" },
          { student_id: 2, name: "Brian Otieno", status: "Pending" },
        ],
      },
    ],
  ],
  [2, []],
]);

const attendanceStore = new Map<number, Array<{ student_id: number; name: string; joined_at: string; status: string; payment: string }>>([
  [
    1,
    [
      { student_id: 1, name: "Aisha Noor", joined_at: "5:58 PM", status: "Present", payment: "Paid" },
      { student_id: 2, name: "Brian Otieno", joined_at: "6:01 PM", status: "Present", payment: "Paid" },
      { student_id: 3, name: "Faith Wanjiru", joined_at: "-", status: "Pending", payment: "Locked" },
      { student_id: 4, name: "John Kamau", joined_at: "6:03 PM", status: "Present", payment: "Paid" },
    ],
  ],
  [2, []],
]);

const raiseHandStore = new Map<number, Array<{ id: number; student_id: number; name: string; school_class?: string; reason: string; wait: string }>>([
  [
    1,
    [
      { id: 1, student_id: 2, name: "Kevin", reason: "Needs clarification on CAC", wait: "1m" },
      { id: 2, student_id: 3, name: "Joy", reason: "Sharing sample dashboard", wait: "3m" },
    ],
  ],
  [2, []],
]);

const waitingRoomStore = new Map<number, Array<{ id: number; student_id: number; name: string; school_class?: string; reason: string; wait: string }>>([
  [1, [{ id: 1, student_id: 5, name: "Mary Wambui", reason: "Waiting to join class", wait: "1m" }]],
  [2, []],
]);

/* ─────────────────────────────────────────────────────────────
   Helper: build TeacherDashboardData for a session
───────────────────────────────────────────────────────────── */
function buildDashboard(sessionId: number, session?: TeacherSession) {
  const s = session ?? sessionsStore.get(1)!;
  return {
    form_defaults: {
      title: s.title,
      youtube_link: s.youtube_link,
      starts_at: s.starts_at,
      delivery_mode: s.delivery_mode,
      expected_participants: s.expected_participants,
    },
    room_state: roomStatesStore.get(sessionId) ?? defaultRoomState(),
    whiteboard: whiteboardsStore.get(sessionId) ?? defaultWhiteboard(),
    metrics: [
      { label: "Live attendance", value: String(enrollmentsStore.get(sessionId)?.length ?? 0), detail: `${enrollmentsStore.get(sessionId)?.length ?? 0} enrolled learners` },
      { label: "Paid learners", value: "18", detail: "Access unlocked for the next class" },
      { label: "Locked learners", value: "06", detail: "Need payment or approval" },
      { label: "Average progress", value: "76%", detail: "Across the active roster" },
      { label: "Raised hands", value: String(raiseHandStore.get(sessionId)?.length ?? 0), detail: "Pending questions" },
      { label: "Q&A queue", value: "00 / 75", detail: "Open chat (not queuing)" },
      { label: "Revenue today", value: "KSh 72,000", detail: "12 successful payments" },
    ],
    attendance: attendanceStore.get(sessionId) ?? [],
    polls: pollsStore.get(sessionId) ?? [],
    quizzes: quizzesStore.get(sessionId) ?? [],
    breakout_rooms: breakoutsStore.get(sessionId) ?? [],
    breakout_broadcast: null,
    last_breakout_summary: null,
    raise_hand_queue: raiseHandStore.get(sessionId) ?? [],
    waiting_room_queue: waitingRoomStore.get(sessionId) ?? [],
    moderation_insights: [
      { id: 1, sender: "Kevin", role: "student", message: "Can you clarify the CAC formula?", is_pinned: true },
      { id: 2, sender: "Aisha Noor", role: "student", message: "Dashboard screenshot shared.", is_pinned: false },
    ],
    qa_queue: [],
    messages: chatStore.get(sessionId) ?? [],
    stream_preview: {
      badge: s.status === "Live" ? "Now streaming" : "Not streaming",
      title: s.title,
      youtube_link: s.youtube_link,
    },
  };
}

let activeSessionId = 1;

export function getActiveSessionId(): number {
  return activeSessionId;
}

export function setActiveSessionId(id: number): void {
  activeSessionId = id;
}

function getActiveSession(): TeacherSession {
  return sessionsStore.get(activeSessionId) || sessionsStore.get(1)!;
}


/* ─────────────────────────────────────────────────────────────
   GET /api/teacher/dashboard/
───────────────────────────────────────────────────────────── */
router.get("/teacher/dashboard/", (_req, res) => {
  const s = getActiveSession();
  res.json(buildDashboard(s.id, s));
});

/* ─────────────────────────────────────────────────────────────
   GET /api/teacher/sessions/
───────────────────────────────────────────────────────────── */
router.get("/teacher/sessions/", (_req, res) => {
  res.json(Array.from(sessionsStore.values()));
});

/* ─────────────────────────────────────────────────────────────
   POST /api/teacher/sessions
───────────────────────────────────────────────────────────── */
router.post("/teacher/sessions", (req, res) => {
  const body = req.body as Partial<TeacherSession> & { title?: string };
  if (!body.title) return res.status(400).json({ message: "Title is required." });
  const id = ++sessionIdSeq;
  const session: TeacherSession = {
    id,
    organization_id: body.organization_id ?? null,
    organization_name: "",
    open_enrollment: body.open_enrollment ?? true,
    program_id: body.program_id ?? null,
    program_title: body.program_id ? (programsStore.get(body.program_id)?.title ?? "") : "",
    title: body.title,
    description: body.description ?? "",
    youtube_link: body.youtube_link ?? "",
    starts_at: body.starts_at ?? new Date().toISOString(),
    room_code: roomCode(),
    is_paid: body.is_paid ?? false,
    price_amount: body.price_amount ? String(body.price_amount) : "0.00",
    delivery_mode: (body.delivery_mode as "interactive" | "broadcast") ?? "interactive",
    expected_participants: body.expected_participants ?? 50,
    teacher_name: "Grace Njeri",
    status: "Upcoming",
    enrolled_students: 0,
    created_at: new Date().toISOString(),
  };
  sessionsStore.set(id, session);
  activeSessionId = id;
  roomStatesStore.set(id, defaultRoomState());
  whiteboardsStore.set(id, defaultWhiteboard());
  enrollmentsStore.set(id, []);
  pollsStore.set(id, []);
  quizzesStore.set(id, []);
  resourcesStore.set(id, []);
  chatStore.set(id, []);
  breakoutsStore.set(id, []);
  attendanceStore.set(id, []);
  raiseHandStore.set(id, []);
  waitingRoomStore.set(id, []);
  res.status(201).json({ message: "Session created.", session });
});

/* ─────────────────────────────────────────────────────────────
   GET /api/teacher/sessions/:id/
───────────────────────────────────────────────────────────── */
router.get("/teacher/sessions/:id/", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const session = sessionsStore.get(id);
  if (!session) return res.status(404).json({ message: "Session not found." });
  activeSessionId = id;
  res.json({ session, dashboard: buildDashboard(id, session) });
});

/* ─────────────────────────────────────────────────────────────
   PATCH /api/teacher/sessions/:id
───────────────────────────────────────────────────────────── */
router.patch("/teacher/sessions/:id", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const session = sessionsStore.get(id);
  if (!session) return res.status(404).json({ message: "Session not found." });
  const body = req.body as Partial<TeacherSession>;
  const updated: TeacherSession = { ...session, ...body, id };
  sessionsStore.set(id, updated);
  activeSessionId = id;
  res.json({ message: "Session updated.", session: updated });
});

/* ─────────────────────────────────────────────────────────────
   DELETE /api/teacher/sessions/:id
───────────────────────────────────────────────────────────── */
router.delete("/teacher/sessions/:id", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  if (!sessionsStore.has(id)) return res.status(404).json({ message: "Session not found." });
  sessionsStore.delete(id);
  res.json({ message: "Session deleted." });
});

/* ─────────────────────────────────────────────────────────────
   PATCH /api/teacher/sessions/:id/room-state
───────────────────────────────────────────────────────────── */
router.patch("/teacher/sessions/:id/room-state", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const current = roomStatesStore.get(id) ?? defaultRoomState();
  const updated: RoomState = { ...current, ...(req.body as Partial<RoomState>) };
  roomStatesStore.set(id, updated);
  res.json({ message: "Room state updated.", room_state: updated });
});

/* ─────────────────────────────────────────────────────────────
   Breakouts — POST / PATCH / PUT / DELETE
───────────────────────────────────────────────────────────── */
router.post("/teacher/sessions/:id/breakouts", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const { room_count = 2 } = req.body as { room_count?: number };
  const enrs = enrollmentsStore.get(id) ?? [];
  const rooms: TeacherBreakoutRoom[] = Array.from({ length: room_count }, (_, i) => ({
    id: i + 1,
    name: `Breakout Room ${i + 1}`,
    member_count: 0,
    teacher_present: false,
    spokesperson_student_id: null,
    spokesperson_name: null,
    students: [],
  }));
  enrs.forEach((e, i) => {
    const room = rooms[i % room_count];
    room.students.push({ student_id: e.student_id, name: e.full_name, status: "Present" });
    room.member_count++;
  });
  breakoutsStore.set(id, rooms);
  const rs = roomStatesStore.get(id) ?? defaultRoomState();
  rs.breakout_enabled = true;
  roomStatesStore.set(id, rs);
  res.json({ message: "Breakout rooms created.", breakout_rooms: rooms, room_state: rs });
});

router.patch("/teacher/sessions/:id/breakouts", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const rooms = breakoutsStore.get(id) ?? [];
  const { student_id, breakout_room_id, room_id, spokesperson_student_id } = req.body as {
    student_id?: number;
    breakout_room_id?: number | null;
    room_id?: number;
    spokesperson_student_id?: number | null;
  };
  if (room_id !== undefined) {
    const room = rooms.find((r) => r.id === room_id);
    if (room) {
      room.spokesperson_student_id = spokesperson_student_id ?? null;
      room.spokesperson_name = spokesperson_student_id
        ? (room.students.find((s) => s.student_id === spokesperson_student_id)?.name ?? null)
        : null;
    }
  } else if (student_id !== undefined) {
    rooms.forEach((r) => {
      r.students = r.students.filter((s) => s.student_id !== student_id);
      r.member_count = r.students.length;
    });
    if (breakout_room_id !== null && breakout_room_id !== undefined) {
      const target = rooms.find((r) => r.id === breakout_room_id);
      const studentName = Array.from(
        (enrollmentsStore.get(id) ?? []).find((e) => e.student_id === student_id)
          ? [{ full_name: (enrollmentsStore.get(id) ?? []).find((e) => e.student_id === student_id)!.full_name }]
          : []
      )[0]?.full_name ?? "Student";
      if (target) {
        target.students.push({ student_id, name: studentName, status: "Present" });
        target.member_count++;
      }
    }
  }
  breakoutsStore.set(id, rooms);
  res.json({ message: "Breakout updated.", breakout_rooms: rooms });
});

router.put("/teacher/sessions/:id/breakouts", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const { message } = req.body as { message: string };
  const broadcast = { message: message ?? "", sent_at: new Date().toLocaleTimeString() };
  res.json({ message: "Broadcast sent.", broadcast });
});

router.delete("/teacher/sessions/:id/breakouts", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  breakoutsStore.set(id, []);
  const rs = roomStatesStore.get(id) ?? defaultRoomState();
  rs.breakout_enabled = false;
  roomStatesStore.set(id, rs);
  res.json({ message: "Breakout rooms cleared.", breakout_rooms: [], room_state: rs });
});

/* ─────────────────────────────────────────────────────────────
   Chat message
───────────────────────────────────────────────────────────── */
router.post("/teacher/sessions/:id/chat-message", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const { message } = req.body as { message: string };
  const msg: ClassroomMessage = {
    id: ++messageIdSeq,
    sender: "Teacher",
    role: "teacher",
    message: message ?? "",
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
  const msgs = chatStore.get(id) ?? [];
  msgs.push(msg);
  chatStore.set(id, msgs);
  res.json({ message: "Message sent.", chat_message: msg });
});

/* ─────────────────────────────────────────────────────────────
   Whiteboard
───────────────────────────────────────────────────────────── */
router.get("/teacher/sessions/:id/whiteboard/", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  res.json(whiteboardsStore.get(id) ?? defaultWhiteboard());
});

router.put("/teacher/sessions/:id/whiteboard", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const wb = { ...(req.body as WhiteboardState), updated_at: new Date().toISOString() };
  whiteboardsStore.set(id, wb);
  res.json({ message: "Whiteboard saved.", whiteboard: wb });
});

router.delete("/teacher/sessions/:id/whiteboard", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const wb = defaultWhiteboard();
  whiteboardsStore.set(id, wb);
  res.json({ message: "Whiteboard cleared.", whiteboard: wb });
});

/* ─────────────────────────────────────────────────────────────
   Enrollments
───────────────────────────────────────────────────────────── */
router.get("/teacher/sessions/:id/enrollments/", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  res.json(enrollmentsStore.get(id) ?? []);
});

router.post("/teacher/sessions/:id/enrollments", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const { student_id, access_status = "upcoming", display_time = "" } = req.body as {
    student_id: number;
    access_status?: string;
    display_time?: string;
  };
  const student = studentsStore.get(student_id);
  if (!student) return res.status(404).json({ message: "Student not found." });
  const list = enrollmentsStore.get(id) ?? [];
  const enrollment: SessionEnrollment = {
    student_id: student.id,
    username: student.username,
    full_name: student.full_name,
    email: student.email,
    school_name: student.school_name,
    school_class: student.school_class,
    progress: 0,
    access_status,
    enrollment_source: "roster",
    display_time,
  };
  const existing = list.findIndex((e) => e.student_id === student_id);
  if (existing >= 0) list[existing] = enrollment;
  else list.push(enrollment);
  enrollmentsStore.set(id, list);
  res.json({ message: "Student enrolled.", enrollment });
});

router.patch("/teacher/sessions/:id/enrollments", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const { student_id, access_status, progress, display_time } = req.body as {
    student_id: number;
    access_status?: string;
    progress?: number;
    display_time?: string;
  };
  const list = enrollmentsStore.get(id) ?? [];
  const idx = list.findIndex((e) => e.student_id === student_id);
  if (idx < 0) return res.status(404).json({ message: "Enrollment not found." });
  if (access_status !== undefined) list[idx].access_status = access_status;
  if (progress !== undefined) list[idx].progress = progress;
  if (display_time !== undefined) list[idx].display_time = display_time;
  enrollmentsStore.set(id, list);
  res.json({ message: "Enrollment updated.", enrollment: list[idx] });
});

router.delete("/teacher/sessions/:id/enrollments", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const { student_id } = req.body as { student_id: number };
  const list = (enrollmentsStore.get(id) ?? []).filter((e) => e.student_id !== student_id);
  enrollmentsStore.set(id, list);
  res.json({ message: "Student removed." });
});

/* ─────────────────────────────────────────────────────────────
   Enrollment roster export (simple CSV/text stub)
───────────────────────────────────────────────────────────── */
router.get("/teacher/sessions/:id/enrollments/export", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const list = enrollmentsStore.get(id) ?? [];
  const lines = ["Name,Username,Email,School,Class,Progress,Access,Time", ...list.map((e) => `${e.full_name},${e.username},${e.email},${e.school_name},${e.school_class},${e.progress}%,${e.access_status},${e.display_time}`)];
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="roster-${id}.csv"`);
  res.send(lines.join("\n"));
});

/* ─────────────────────────────────────────────────────────────
   Attendance
───────────────────────────────────────────────────────────── */
router.patch("/teacher/sessions/:id/attendance", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const { student_id, status } = req.body as { student_id: number; status: "Present" | "Pending" };
  const list = attendanceStore.get(id) ?? [];
  const idx = list.findIndex((a) => a.student_id === student_id);
  const joined_at = status === "Present" ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
  if (idx >= 0) {
    list[idx].status = status;
    list[idx].joined_at = joined_at;
  }
  res.json({ message: "Attendance updated.", attendance: { student_id, status, joined_at } });
});

/* ─────────────────────────────────────────────────────────────
   Raise hand
───────────────────────────────────────────────────────────── */
router.patch("/teacher/sessions/:id/raise-hands", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const { request_id } = req.body as { request_id: number; action?: string };
  const queue = raiseHandStore.get(id) ?? [];
  const filtered = queue.filter((r) => r.id !== request_id);
  raiseHandStore.set(id, filtered);
  res.json({ message: "Request resolved.", request: { id: request_id, student_id: 0, status: "resolved" } });
});

/* ─────────────────────────────────────────────────────────────
   Join requests
───────────────────────────────────────────────────────────── */
router.patch("/teacher/sessions/:id/join-requests", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const { request_id, action } = req.body as { request_id: number; action: "approve" | "deny" };
  const queue = waitingRoomStore.get(id) ?? [];
  const filtered = queue.filter((r) => r.id !== request_id);
  waitingRoomStore.set(id, filtered);
  res.json({ message: `Request ${action}d.`, request: { id: request_id, student_id: 0, status: action === "approve" ? "approved" : "denied" } });
});

/* ─────────────────────────────────────────────────────────────
   Chat moderation
───────────────────────────────────────────────────────────── */
router.patch("/teacher/sessions/:id/chat-moderation", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const { message_id, action } = req.body as { message_id: number; action: string };
  const msgs = chatStore.get(id) ?? [];
  const msg = msgs.find((m) => m.id === message_id);
  res.json({
    message: "Message moderated.",
    chat_message: {
      id: message_id,
      is_pinned: action === "pin",
      is_hidden: action === "hide",
      qa_status: action === "approve_qa" ? "approved" : action === "dismiss_qa" ? "dismissed" : undefined,
    },
  });
});

/* ─────────────────────────────────────────────────────────────
   QA queue bulk
───────────────────────────────────────────────────────────── */
router.patch("/teacher/sessions/:id/qa-queue/bulk", (req: Request, res: Response) => {
  res.json({ message: "QA queue updated.", approved: 0, dismissed: 0 });
});

router.post("/teacher/sessions/:id/qa-queue/bulk", (req: Request, res: Response) => {
  const { action } = req.body as { action: string };
  res.json({ message: `QA queue: ${action}`, approved: action === "approve_all" ? 1 : 0, dismissed: action === "dismiss_all" ? 1 : 0 });
});

/* ─────────────────────────────────────────────────────────────
   Polls
───────────────────────────────────────────────────────────── */
router.get("/teacher/sessions/:id/polls", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  res.json(pollsStore.get(id) ?? []);
});

router.post("/teacher/sessions/:id/polls", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const { question, options } = req.body as { question: string; options: string[] };
  if (!question || !options?.length) return res.status(400).json({ message: "Question and options required." });
  const poll: TeacherPoll = {
    id: ++pollIdSeq,
    question,
    is_active: false,
    response_count: 0,
    options: options.map((label, i) => ({ id: i + 1, label, value: 0 })),
  };
  const list = pollsStore.get(id) ?? [];
  list.push(poll);
  pollsStore.set(id, list);
  res.status(201).json({ message: "Poll created.", poll });
});

router.patch("/teacher/sessions/:id/polls", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const { poll_id } = req.body as { poll_id: number };
  const list = pollsStore.get(id) ?? [];
  list.forEach((p) => (p.is_active = p.id === poll_id));
  pollsStore.set(id, list);
  const poll = list.find((p) => p.id === poll_id);
  res.json({ message: "Poll activated.", poll: poll ? { id: poll.id, question: poll.question, is_active: poll.is_active } : null });
});

router.put("/teacher/sessions/:id/polls", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const { poll_id, question, options } = req.body as { poll_id: number; question: string; options: string[] };
  const list = pollsStore.get(id) ?? [];
  const idx = list.findIndex((p) => p.id === poll_id);
  if (idx < 0) return res.status(404).json({ message: "Poll not found." });
  list[idx] = { ...list[idx], question, options: options.map((label, i) => ({ id: i + 1, label, value: 0 })) };
  pollsStore.set(id, list);
  const p = list[idx];
  res.json({ message: "Poll updated.", poll: { id: p.id, question: p.question, is_active: p.is_active } });
});

/* ─────────────────────────────────────────────────────────────
   Quizzes
───────────────────────────────────────────────────────────── */
router.get("/teacher/sessions/:id/quizzes", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  res.json(quizzesStore.get(id) ?? []);
});

router.post("/teacher/sessions/:id/quizzes", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const { question, choices } = req.body as { question: string; choices: string[] };
  if (!question || !choices?.length) return res.status(400).json({ message: "Question and choices required." });
  const quiz: TeacherQuiz = {
    id: ++quizIdSeq,
    question,
    is_active: false,
    choices: choices.map((label, i) => ({ id: i + 1, label })),
  };
  const list = quizzesStore.get(id) ?? [];
  list.push(quiz);
  quizzesStore.set(id, list);
  res.status(201).json({ message: "Quiz created.", quiz });
});

router.patch("/teacher/sessions/:id/quizzes", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const { quiz_id } = req.body as { quiz_id: number };
  const list = quizzesStore.get(id) ?? [];
  list.forEach((q) => (q.is_active = q.id === quiz_id));
  quizzesStore.set(id, list);
  const quiz = list.find((q) => q.id === quiz_id);
  res.json({ message: "Quiz activated.", quiz: quiz ? { id: quiz.id, question: quiz.question, is_active: quiz.is_active } : null });
});

router.put("/teacher/sessions/:id/quizzes", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const { quiz_id, question, choices } = req.body as { quiz_id: number; question: string; choices: string[] };
  const list = quizzesStore.get(id) ?? [];
  const idx = list.findIndex((q) => q.id === quiz_id);
  if (idx < 0) return res.status(404).json({ message: "Quiz not found." });
  list[idx] = { ...list[idx], question, choices: choices.map((label, i) => ({ id: i + 1, label })) };
  quizzesStore.set(id, list);
  const q = list[idx];
  res.json({ message: "Quiz updated.", quiz: { id: q.id, question: q.question, is_active: q.is_active } });
});

/* ─────────────────────────────────────────────────────────────
   Resources
───────────────────────────────────────────────────────────── */
router.get("/teacher/sessions/:id/resources/", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  res.json(resourcesStore.get(id) ?? []);
});

router.post("/teacher/sessions/:id/resources/", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const { title, url = "" } = req.body as { title: string; url?: string };
  if (!title) return res.status(400).json({ message: "Title is required." });
  const resource: SessionResourceItem = { id: ++resourceIdSeq, title, url, file_url: null };
  const list = resourcesStore.get(id) ?? [];
  list.push(resource);
  resourcesStore.set(id, list);
  res.status(201).json(resource);
});

router.delete("/teacher/sessions/:id/resources/:resourceId/", (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  const resourceId = Number(req.params["resourceId"]);
  const list = (resourcesStore.get(id) ?? []).filter((r) => r.id !== resourceId);
  resourcesStore.set(id, list);
  res.status(204).send();
});

/* ─────────────────────────────────────────────────────────────
   Students
───────────────────────────────────────────────────────────── */
router.get("/teacher/students/", (_req, res) => {
  res.json(Array.from(studentsStore.values()));
});

/* ─────────────────────────────────────────────────────────────
   Programs
───────────────────────────────────────────────────────────── */
router.get("/teacher/programs/", (_req, res) => {
  res.json(Array.from(programsStore.values()));
});

router.post("/teacher/programs/", (req, res) => {
  const body = req.body as Partial<LearningProgram>;
  if (!body.title) return res.status(400).json({ message: "Title is required." });
  const id = ++programIdSeq;
  const program: LearningProgram = {
    id,
    organization_id: body.organization_id ?? 1,
    title: body.title,
    slug: body.title.toLowerCase().replace(/\s+/g, "-"),
    starts_at: body.starts_at ?? new Date().toISOString().split("T")[0],
    ends_at: body.ends_at ?? new Date().toISOString().split("T")[0],
    created_at: new Date().toISOString(),
  };
  programsStore.set(id, program);
  res.status(201).json(program);
});

/* ─────────────────────────────────────────────────────────────
   YouTube integration
───────────────────────────────────────────────────────────── */
router.get("/teacher/integrations/youtube/", (_req, res) => {
  res.json({
    connected: false,
    channel_name: "",
    channel_id: "",
    connected_at: null,
    oauth_configured: false,
    stream_status: "idle",
    stream_title: "",
    stream_checked_at: null,
    stream_message: "Connect your YouTube account to enable live streaming.",
  });
});

router.post("/teacher/integrations/youtube/", (_req, res) => {
  res.json({ auth_url: "https://accounts.google.com/o/oauth2/auth?response_type=code&scope=openssl" });
});

router.delete("/teacher/integrations/youtube/", (_req, res) => {
  res.status(204).send();
});

export default router;
