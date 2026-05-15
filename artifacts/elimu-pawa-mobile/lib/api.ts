import type {
  AuthSessionResponse,
  ClassroomMessage,
  DemoUser,
  PaymentSummaryData,
  StudentDashboardData,
  TeacherDashboardData,
  TeacherSession,
} from "./types";

const domain = process.env.EXPO_PUBLIC_DOMAIN;
const BASE_URL = domain ? `https://${domain}` : "";

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Failed: ${path}`);
  return (await response.json()) as T;
}

async function fetchWithFallback<T>(path: string, fallback: T): Promise<T> {
  try {
    return await fetchJson<T>(path);
  } catch {
    return fallback;
  }
}

export const mockDemoUsers: DemoUser[] = [
  { username: "aisha.student", full_name: "Aisha Noor", email: "aisha.student@edustream.test", role: "student" },
  { username: "brian.student", full_name: "Brian Otieno", email: "brian.student@edustream.test", role: "student" },
  { username: "grace.teacher", full_name: "Grace Njeri", email: "grace.teacher@edustream.test", role: "teacher" },
];

const mockStudentDashboard: StudentDashboardData = {
  live_class: {
    course_title: "Data Analytics Bootcamp",
    session_title: "Growth reporting with realtime classroom insights",
    youtube_embed_url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    room_code: "data-analytics-bootcamp",
    is_live: true,
    price_label: "KSh 3,500",
    payment_required: false,
    student_paid: true,
    waiting_room_enabled: false,
    join_status: "not_required",
    can_join_room: true,
    delivery_mode: "broadcast",
    expected_participants: 1200,
    broadcast_only: true,
  },
  messages: [
    { id: 1, sender: "Grace Njeri", role: "teacher", message: "Welcome everyone! We're starting in 2 minutes.", time: "6:01 PM" },
    { id: 2, sender: "Aisha Noor", role: "student", message: "Ready to learn!", time: "6:02 PM" },
    { id: 3, sender: "Brian Otieno", role: "student", message: "Can you share the slides?", time: "6:03 PM" },
    { id: 4, sender: "Grace Njeri", role: "teacher", message: "Slides will be in the resources tab after class.", time: "6:04 PM" },
  ],
  poll: {
    question: "How familiar are you with data pipelines?",
    options: [
      { label: "Complete beginner", value: 40 },
      { label: "Some experience", value: 35 },
      { label: "Intermediate", value: 20 },
      { label: "Advanced", value: 5 },
    ],
    voted: false,
  },
  courses: [
    { title: "Data Analytics Bootcamp", coach: "Grace Njeri", time: "Today · 6:00 PM", status: "Live now", progress: 82 },
    { title: "UI Engineering Masterclass", coach: "David Kimani", time: "Tomorrow · 8:00 PM", status: "Upcoming", progress: 54 },
    { title: "Business English Live", coach: "Mary Atieno", time: "Sat · 10:00 AM", status: "Paid", progress: 67 },
  ],
  engagement: [
    { label: "Sessions attended", value: "12", detail: "this month" },
    { label: "Avg. score", value: "84%", detail: "quiz average" },
    { label: "Streak", value: "7 days", detail: "in a row" },
  ],
};

const mockTeacherDashboard: TeacherDashboardData = {
  sessions: [
    { id: 1, title: "Data Analytics Bootcamp", starts_at: "2026-05-15T18:00:00Z", status: "live", enrolled_count: 42, room_code: "data-analytics-bootcamp", delivery_mode: "broadcast", is_live: true },
    { id: 2, title: "UI Engineering Masterclass", starts_at: "2026-05-16T20:00:00Z", status: "scheduled", enrolled_count: 28, room_code: "ui-engineering", delivery_mode: "interactive", is_live: false },
    { id: 3, title: "Business English Live", starts_at: "2026-05-17T10:00:00Z", status: "scheduled", enrolled_count: 15, room_code: "business-english", delivery_mode: "interactive", is_live: false },
  ],
  total_students: 85,
  total_sessions: 3,
  form_defaults: { title: "", youtube_link: "", starts_at: "", delivery_mode: "interactive", expected_participants: 30 },
};

const mockPaymentSummary: PaymentSummaryData = {
  total_revenue: "KSh 147,500",
  pending_amount: "KSh 21,000",
  paid_count: 42,
  pending_count: 6,
  currency: "KSh",
  entries: [
    { id: 1, student_name: "Aisha Noor", course: "Data Analytics Bootcamp", amount: "KSh 3,500", status: "paid", date: "May 14, 2026", phone: "+254712345678" },
    { id: 2, student_name: "Brian Otieno", course: "UI Engineering Masterclass", amount: "KSh 4,200", status: "paid", date: "May 14, 2026" },
    { id: 3, student_name: "Fatuma Hassan", course: "Business English Live", amount: "KSh 2,800", status: "pending", date: "May 13, 2026" },
    { id: 4, student_name: "John Mutua", course: "Data Analytics Bootcamp", amount: "KSh 3,500", status: "paid", date: "May 12, 2026" },
    { id: 5, student_name: "Sylvia Wanjiru", course: "UI Engineering Masterclass", amount: "KSh 4,200", status: "failed", date: "May 11, 2026" },
    { id: 6, student_name: "Omar Salim", course: "Business English Live", amount: "KSh 2,800", status: "pending", date: "May 10, 2026" },
  ],
};

export async function getDemoUsers(): Promise<DemoUser[]> {
  return fetchWithFallback("/api/auth/demo-users/", mockDemoUsers);
}

export async function getCurrentUser(): Promise<DemoUser | null> {
  try {
    return await fetchJson<DemoUser>("/api/auth/me/");
  } catch {
    return null;
  }
}

export async function loginUser(payload: { username: string; password: string }): Promise<AuthSessionResponse> {
  const response = await fetch(`${BASE_URL}/api/auth/session/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as any)?.detail ?? (data as any)?.error ?? "Login failed. Check your credentials.");
  }
  return (await response.json()) as AuthSessionResponse;
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/auth/session/logout`, { method: "POST", credentials: "include" });
  } catch {
    // Ignore
  }
}

export async function getStudentDashboard(): Promise<StudentDashboardData> {
  return fetchWithFallback("/api/student/dashboard/", mockStudentDashboard);
}

export async function getTeacherDashboard(): Promise<TeacherDashboardData> {
  return fetchWithFallback("/api/teacher/dashboard/", mockTeacherDashboard);
}

export async function getTeacherSessions(): Promise<TeacherSession[]> {
  return fetchWithFallback("/api/teacher/sessions/", mockTeacherDashboard.sessions);
}

export async function getPaymentSummary(): Promise<PaymentSummaryData> {
  return fetchWithFallback("/api/payments/summary/", mockPaymentSummary);
}

export async function sendChatMessage(_message: string): Promise<ClassroomMessage | null> {
  return null;
}
