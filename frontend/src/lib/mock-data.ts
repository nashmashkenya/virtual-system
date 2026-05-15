import type {
  ClassroomMessage,
  CourseCard,
  DemoUser,
  EngagementMetric,
  PaymentSummaryData,
  StudentDashboardData,
  TeacherDashboardData,
} from "@/lib/types";

export const marketingStats = [
  { label: "Active learners", value: "12.4K+" },
  { label: "Live completion rate", value: "96%" },
  { label: "Schools onboarded", value: "180+" },
];

export const pricingPlans = [
  {
    name: "Starter",
    price: "$29",
    description: "For solo tutors launching live cohorts fast.",
    features: ["Up to 50 students", "M-Pesa-ready checkout", "Assignments and quizzes"],
  },
  {
    name: "Growth",
    price: "$99",
    description: "For learning businesses scaling several classrooms.",
    features: ["Unlimited courses", "Advanced attendance", "Realtime chat and polls"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For institutions that need deeper control and support.",
    features: ["SSO and custom roles", "Priority onboarding", "Dedicated infrastructure"],
  },
];

export const studentCourses: CourseCard[] = [
  {
    title: "Data Analytics Bootcamp",
    coach: "Grace Njeri",
    time: "Today • 6:00 PM",
    status: "Live now",
    progress: 82,
  },
  {
    title: "UI Engineering Masterclass",
    coach: "David Kimani",
    time: "Tomorrow • 8:00 PM",
    status: "Upcoming",
    progress: 54,
  },
  {
    title: "Business English Live",
    coach: "Mary Atieno",
    time: "Sat • 10:00 AM",
    status: "Paid",
    progress: 67,
  },
];

export const classroomMessages: ClassroomMessage[] = [
  {
    id: 1,
    sender: "Grace Njeri",
    role: "teacher",
    message: "Welcome in. We are reviewing dashboards and cohort KPIs today.",
    time: "6:02 PM",
  },
  {
    id: 2,
    sender: "Kevin",
    role: "student",
    message: "Can you repeat the retention formula after the break?",
    time: "6:04 PM",
  },
  {
    id: 3,
    sender: "Aisha",
    role: "student",
    message: "Quiz panel loaded perfectly on my phone.",
    time: "6:05 PM",
  },
];

export const livePoll = {
  question: "Which metric should the class prioritize this week?",
  options: [
    { label: "Attendance rate", value: 36 },
    { label: "Completion rate", value: 48 },
    { label: "Average quiz score", value: 16 },
  ],
};

export const attendanceRows = [
  { name: "Aisha Noor", joinedAt: "5:58 PM", status: "Present", payment: "Paid" },
  { name: "Brian Otieno", joinedAt: "6:01 PM", status: "Present", payment: "Paid" },
  { name: "Faith Wanjiru", joinedAt: "-", status: "Pending", payment: "Locked" },
  { name: "John Kamau", joinedAt: "6:03 PM", status: "Present", payment: "Paid" },
];

export const raiseHandQueue = [
  { id: 1, student_id: 1, name: "Kevin", reason: "Needs clarification on CAC", wait: "1m" },
  { id: 2, student_id: 2, name: "Joy", reason: "Sharing sample dashboard", wait: "3m" },
  { id: 3, student_id: 3, name: "Ahmed", reason: "Question on assignment", wait: "5m" },
];

export const sessionMetrics: EngagementMetric[] = [
  { label: "Live attendance", value: "42", detail: "48 enrolled learners" },
  { label: "Paid learners", value: "18", detail: "Access unlocked for the next class" },
  { label: "Locked learners", value: "06", detail: "Need payment or approval" },
  { label: "Average progress", value: "76%", detail: "Across the active roster" },
  { label: "Raised hands", value: "07", detail: "2 urgent questions" },
  { label: "Q&A queue", value: "00 / 75", detail: "Open chat (not queuing)" },
  { label: "Revenue today", value: "KSh 72,000", detail: "12 successful payments" },
];

export const studentDashboardFallback: StudentDashboardData = {
  live_class: {
    course_title: "Data Analytics Bootcamp",
    session_title: "Growth reporting with realtime classroom insights",
    youtube_embed_url: "https://www.youtube.com/embed/jfKfPfyJRdk?rel=0",
    room_code: "data-analytics-bootcamp",
    is_live: true,
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
  },
  room_state: {
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
  },
  breakout_room: null,
  breakout_broadcast: null,
  whiteboard: {
    pages: [
      {
        id: "page-1",
        name: "Page 1",
        strokes: [],
      },
    ],
    active_page: 0,
    updated_at: "-",
  },
  engagement_stats: [
    { label: "Chat", value: "24 messages", detail: "Teacher highlights enabled" },
    { label: "Raise Hand", value: "Priority enabled", detail: "Queue sorted by urgency" },
    { label: "Polls", value: "1 live poll", detail: "Realtime responses" },
    { label: "Quiz", value: "4 questions", detail: "Auto-save active" },
  ],
  poll: {
    id: 1,
    question: livePoll.question,
    response_count: 37,
    selected_option_id: null,
    options: livePoll.options,
  },
  quiz: {
    id: 1,
    question: "Which dashboard view is best for tracking cohort retention?",
    selected_choice_id: null,
    submitted: false,
    choices: [
      { id: 1, label: "Weekly retention chart" },
      { id: 2, label: "Invoice ledger" },
      { id: 3, label: "Chat transcript" },
      { id: 4, label: "Quiz timer" },
    ],
  },
  courses: studentCourses,
  messages: classroomMessages,
  session_resources: [],
};

export const teacherDashboardFallback: TeacherDashboardData = {
  form_defaults: {
    title: "Advanced Data Analytics",
    youtube_link: "https://www.youtube.com/live/jfKfPfyJRdk",
    starts_at: "2026-04-10T18:00",
    delivery_mode: "broadcast",
    expected_participants: 1200,
  },
  room_state: {
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
  },
  whiteboard: {
    pages: [
      {
        id: "page-1",
        name: "Page 1",
        strokes: [],
      },
    ],
    active_page: 0,
    updated_at: "-",
  },
  metrics: sessionMetrics,
  attendance: attendanceRows.map((row, index) => ({
    student_id: index + 1,
    name: row.name,
    joined_at: row.joinedAt,
    status: row.status as "Present" | "Pending",
    payment: row.payment,
  })),
  polls: [
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
  quizzes: [
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
  raise_hand_queue: raiseHandQueue,
  breakout_rooms: [
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
  breakout_broadcast: {
    message: "You have 5 minutes left. Choose one speaker for your group.",
    sent_at: "6:12 PM",
  },
  last_breakout_summary: {
    room_count: 2,
    total_learners: 4,
    rooms: [
      {
        name: "Breakout Room 1",
        member_names: ["Aisha Noor", "Brian Otieno"],
        spokesperson_name: "Aisha Noor",
      },
      {
        name: "Breakout Room 2",
        member_names: ["Faith Wanjiru", "John Kamau"],
        spokesperson_name: "John Kamau",
      },
    ],
  },
  waiting_room_queue: [
    { id: 1, student_id: 5, name: "Mary Wambui", reason: "Waiting to join class", wait: "1m" },
  ],
  moderation_insights: [
    {
      id: 1,
      sender: "Kevin",
      role: "student",
      message: "Can you clarify the CAC formula consistency for this cohort report?",
      is_pinned: true,
    },
    {
      id: 2,
      sender: "Aisha Noor",
      role: "student",
      message: "I shared a polished dashboard screenshot for the class review.",
      is_pinned: false,
    },
    {
      id: 3,
      sender: "Joy",
      role: "student",
      message: "There is a small audio sync issue on mobile Safari.",
      is_pinned: false,
    },
  ],
  qa_queue: [],
  messages: classroomMessages,
  stream_preview: {
    badge: "Now streaming",
    title: "Advanced Data Analytics",
    youtube_link: "https://www.youtube.com/live/jfKfPfyJRdk",
  },
};

export const paymentSummaryFallback: PaymentSummaryData = {
  course_name: "Data Analytics Bootcamp",
  plan: "Monthly live access",
  price: "KSh 3,500",
  status: "awaiting_payment",
  cta: "Pay with M-Pesa",
};

export const demoUsersFallback: DemoUser[] = [
  {
    username: "aisha.student",
    full_name: "Aisha Noor",
    email: "aisha.student@edustream.test",
    role: "student",
  },
  {
    username: "brian.student",
    full_name: "Brian Otieno",
    email: "brian.student@edustream.test",
    role: "student",
  },
  {
    username: "grace.teacher",
    full_name: "Grace Njeri",
    email: "grace.teacher@edustream.test",
    role: "teacher",
  },
];
