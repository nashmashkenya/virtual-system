import { Router, type IRouter, type Request, type Response } from "express";
import { sessionsStore, roomStatesStore, whiteboardsStore, chatStore, pollsStore, quizzesStore, getActiveSessionId, buildDashboard, enrollmentsStore } from "./teacher";
import { broadcastToAll, broadcastToTeacher } from "../lib/socket";

const router: IRouter = Router();

/* ─────────────────────────────────────────────────────────────
   Shared state references (simple in-process stubs)
   ───────────────────────────────────────────────────────────── */
let messageIdSeq = 200;
let raiseHandIdSeq = 20;
let joinRequestIdSeq = 20;

const livePollOptions = [
  { id: 1, label: "Attendance rate", value: 36 },
  { id: 2, label: "Completion rate", value: 48 },
  { id: 3, label: "Average quiz score", value: 16 },
];

const pollState = {
  id: 1,
  question: "Which metric should the class prioritize this week?",
  response_count: 37,
  selected_option_id: null as number | null,
  options: livePollOptions,
};

const quizState = {
  id: 1,
  question: "Which dashboard view is best for tracking cohort retention?",
  selected_choice_id: null as number | null,
  submitted: false,
  choices: [
    { id: 1, label: "Weekly retention chart" },
    { id: 2, label: "Invoice ledger" },
    { id: 3, label: "Chat transcript" },
    { id: 4, label: "Quiz timer" },
  ],
};

const studentMessages = [
  { id: 1, sender: "Grace Njeri", role: "teacher", message: "Welcome in. We are reviewing dashboards and cohort KPIs today.", time: "6:02 PM" },
  { id: 2, sender: "Kevin", role: "student", message: "Can you repeat the retention formula after the break?", time: "6:04 PM" },
  { id: 3, sender: "Aisha", role: "student", message: "Quiz panel loaded perfectly on my phone.", time: "6:05 PM" },
];

function getActiveSession() {
  const activeId = getActiveSessionId();
  return sessionsStore.get(activeId) || Array.from(sessionsStore.values())[0];
}

/* ─────────────────────────────────────────────────────────────
   GET /api/student/dashboard/
   ───────────────────────────────────────────────────────────── */
router.get("/student/dashboard/", (_req, res) => {
  const activeSession = getActiveSession();

  const defaultLiveClass = {
    course_title: "Data Analytics Bootcamp",
    session_title: "Growth reporting with realtime classroom insights",
    youtube_embed_url: "https://www.youtube.com/embed/jfKfPfyJRdk?rel=0",
    room_code: "data-001",
    is_live: true,
    status: "Live",
    price_label: "KSh 3,500",
    payment_required: true,
    student_paid: false,
    waiting_room_enabled: false,
    join_status: "not_required",
    can_join_room: true,
    delivery_mode: "broadcast",
    expected_participants: 1200,
    broadcast_only: true,
    program_title: "",
    program_window: "",
  };

  const defaultRoomState = {
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
    last_breakout_layout_available: false,
    recording_status: "idle",
    recording_started_at: null,
  };

  const liveClass = activeSession ? {
    course_title: activeSession.title,
    session_title: activeSession.description || activeSession.title,
    youtube_embed_url: activeSession.youtube_link || "https://www.youtube.com/embed/jfKfPfyJRdk?rel=0",
    room_code: activeSession.room_code,
    is_live: activeSession.status === "Live" || activeSession.status === "Upcoming",
    status: activeSession.status,
    price_label: activeSession.is_paid ? `KSh ${activeSession.price_amount}` : "Free",
    payment_required: activeSession.is_paid,
    student_paid: false,
    waiting_room_enabled: false,
    join_status: "not_required",
    can_join_room: true,
    delivery_mode: activeSession.delivery_mode,
    expected_participants: activeSession.expected_participants,
    broadcast_only: activeSession.delivery_mode === "broadcast",
    program_title: activeSession.program_title || "",
    program_window: "",
  } : defaultLiveClass;

  const roomState = activeSession ? (roomStatesStore.get(activeSession.id) || defaultRoomState) : defaultRoomState;

  const activePolls = activeSession ? (pollsStore.get(activeSession.id) || []) : [];
  const activePoll = activePolls.find(p => p.is_active) || null;

  const activeQuizzes = activeSession ? (quizzesStore.get(activeSession.id) || []) : [];
  const activeQuiz = activeQuizzes.find(q => q.is_active) || null;

  const messages = activeSession ? (chatStore.get(activeSession.id) || []) : studentMessages;

  const whiteboard = activeSession ? (whiteboardsStore.get(activeSession.id) || {
    pages: [{ id: "page-1", name: "Page 1", strokes: [] }],
    active_page: 0,
    updated_at: new Date().toISOString(),
  }) : {
    pages: [{ id: "page-1", name: "Page 1", strokes: [] }],
    active_page: 0,
    updated_at: new Date().toISOString(),
  };

  const courses = activeSession ? [
    {
      session_id: activeSession.id,
      title: activeSession.title,
      coach: activeSession.teacher_name || "Grace Njeri",
      time: activeSession.starts_at,
      status: activeSession.status === "Live" ? "Live now" : "Upcoming",
      join_status: "not_required",
      can_join_room: true,
      progress: 82,
    }
  ] : [
    { session_id: 1, title: "Data Analytics Bootcamp", coach: "Grace Njeri", time: "Today • 6:00 PM", status: "Live now", join_status: "not_required", can_join_room: true, progress: 82 },
    { session_id: 2, title: "UI Engineering Masterclass", coach: "Grace Njeri", time: "Tomorrow • 8:00 PM", status: "Upcoming", join_status: "not_required", can_join_room: false, progress: 54 },
  ];

  res.json({
    live_class: liveClass,
    room_state: roomState,
    breakout_room: null,
    breakout_broadcast: null,
    whiteboard: whiteboard,
    engagement_stats: [
      { label: "Chat", value: `${messages.length} messages`, detail: "Realtime chat active" },
      { label: "Raise Hand", value: "Priority enabled", detail: "Teacher queue active" },
      { label: "Polls", value: activePoll ? "1 live poll" : "No live poll", detail: "Realtime responses" },
      { label: "Quiz", value: activeQuiz ? "1 active quiz" : "No active quiz", detail: "Auto-save active" },
    ],
    poll: activePoll || pollState,
    quiz: activeQuiz || quizState,
    courses: courses,
    messages: messages,
    session_resources: [],
  });
});

/* ─────────────────────────────────────────────────────────────
   POST /api/student/poll-vote
   ───────────────────────────────────────────────────────────── */
router.post("/student/poll-vote", (req: Request, res: Response) => {
  const { option_id } = req.body as { option_id: number };
  const activeSession = getActiveSession();
  if (activeSession) {
    const activePolls = pollsStore.get(activeSession.id) || [];
    const activePoll = activePolls.find(p => p.is_active);
    if (activePoll) {
      activePoll.response_count += 1;
      const opt = activePoll.options.find((o) => o.id === option_id);
      if (opt) opt.value += 1;
      broadcastToTeacher(activeSession.room_code, {
        dashboard: buildDashboard(activeSession.id, activeSession),
        enrollments: enrollmentsStore.get(activeSession.id) ?? [],
        session: activeSession,
      });
      res.json({ message: "Vote recorded.", poll: activePoll });
      return;
    }
  }

  pollState.selected_option_id = option_id;
  pollState.response_count += 1;
  const opt = pollState.options.find((o) => o.id === option_id);
  if (opt) opt.value += 1;
  res.json({ message: "Vote recorded.", poll: { ...pollState } });
});

/* ─────────────────────────────────────────────────────────────
   POST /api/student/quiz-submit
   ───────────────────────────────────────────────────────────── */
router.post("/student/quiz-submit", (req: Request, res: Response) => {
  const { choice_id } = req.body as { choice_id: number };
  const activeSession = getActiveSession();
  if (activeSession) {
    const activeQuizzes = quizzesStore.get(activeSession.id) || [];
    const activeQuiz = activeQuizzes.find(q => q.is_active);
    if (activeQuiz) {
      broadcastToTeacher(activeSession.room_code, {
        dashboard: buildDashboard(activeSession.id, activeSession),
        enrollments: enrollmentsStore.get(activeSession.id) ?? [],
        session: activeSession,
      });
      res.json({ message: "Answer submitted.", quiz: activeQuiz });
      return;
    }
  }

  quizState.selected_choice_id = choice_id;
  quizState.submitted = true;
  res.json({ message: "Answer submitted.", quiz: { ...quizState } });
});

/* ─────────────────────────────────────────────────────────────
   POST /api/student/chat-message
   ───────────────────────────────────────────────────────────── */
router.post("/student/chat-message", (req: Request, res: Response) => {
  const { message } = req.body as { message: string; breakout_room_id?: number | null };
  if (!message?.trim()) return res.status(400).json({ message: "Message cannot be empty." });
  const msg = {
    id: ++messageIdSeq,
    sender: "Student",
    role: "student",
    message: message.trim(),
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };

  const activeSession = getActiveSession();
  if (activeSession) {
    const msgs = chatStore.get(activeSession.id) || [];
    msgs.push(msg);
    chatStore.set(activeSession.id, msgs);
    broadcastToAll(activeSession.room_code, {
      event: "message_created",
      message: msg,
    });
    res.json({ message: "Message sent.", chat_message: msg });
    return;
  }

  studentMessages.push(msg);
  res.json({ message: "Message sent.", chat_message: msg });
});

/* ─────────────────────────────────────────────────────────────
   POST /api/student/raise-hand
───────────────────────────────────────────────────────────── */
router.post("/student/raise-hand", (req: Request, res: Response) => {
  const { reason } = req.body as { reason: string };
  const id = ++raiseHandIdSeq;
  res.json({ message: "Hand raised.", request: { id, reason: reason ?? "", status: "open" } });
});

/* ─────────────────────────────────────────────────────────────
   POST /api/student/join-request
───────────────────────────────────────────────────────────── */
router.post("/student/join-request", (_req, res) => {
  const id = ++joinRequestIdSeq;
  res.json({ message: "Join request submitted.", request: { id, status: "pending" } });
});

/* ─────────────────────────────────────────────────────────────
   POST /api/student/enroll
───────────────────────────────────────────────────────────── */
router.post("/student/enroll", (req: Request, res: Response) => {
  const { room_code } = req.body as { room_code: string };
  if (!room_code?.trim()) return res.status(400).json({ message: "Room code is required." });
  const session = {
    id: 1,
    organization_id: null,
    organization_name: "",
    open_enrollment: true,
    program_id: null,
    program_title: "",
    title: "Data Analytics Bootcamp",
    description: "Live session covering growth reporting.",
    youtube_link: "https://www.youtube.com/live/jfKfPfyJRdk",
    starts_at: "2026-05-16T18:00",
    room_code: room_code.trim(),
    is_paid: true,
    price_amount: "3500.00",
    delivery_mode: "broadcast",
    expected_participants: 1200,
    teacher_name: "Grace Njeri",
    status: "Live",
    enrolled_students: 42,
    created_at: "2026-05-01T08:00:00Z",
  };
  res.json({ message: "Enrolled successfully.", session });
});

export default router;
