import {
  demoUsersFallback,
  paymentSummaryFallback,
  studentDashboardFallback,
  teacherDashboardFallback,
} from "@/lib/mock-data";
import type {
  AuthSessionResponse,
  CreateSessionResponse,
  DemoUser,
  PaymentSummaryData,
  PasswordResetRequestResponse,
  SessionEnrollment,
  SimulatePaymentResponse,
  StudentChatMessageResponse,
  StudentPollVoteResponse,
  StudentJoinRequestResponse,
  StudentRaiseHandResponse,
  StudentDashboardData,
  StudentQuizSubmissionResponse,
  StudentEnrollByCodeResponse,
  TeacherDashboardData,
  TeacherAttendanceMutationResponse,
  TeacherBreakoutMutationResponse,
  TeacherBreakoutBroadcastResponse,
  TeacherChatMessageResponse,
  TeacherChatModerationResponse,
  TeacherQaQueueBulkApproveResponse,
  TeacherEnrollmentMutationResponse,
  TeacherJoinRequestMutationResponse,
  TeacherPoll,
  TeacherPollMutationResponse,
  TeacherQuiz,
  TeacherQuizMutationResponse,
  TeacherRaiseHandMutationResponse,
  TeacherRoomStateMutationResponse,
  TeacherSessionDetailResponse,
  TeacherSession,
  TeacherStudent,
  TeacherWhiteboardMutationResponse,
  WhiteboardState,
  UpdateTeacherSessionResponse,
  ChatModerationMode,
  LearningProgram,
  OrgMember,
  OpsMetricsResponse,
  SessionResourceItem,
  YouTubeIntegrationStatus,
} from "@/lib/types";

export class ApiError extends Error {
  retryAfterSeconds?: number;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return (await response.json()) as T;
}

async function fetchWithFallback<T>(path: string, fallback: T): Promise<T> {
  try {
    return await fetchJson<T>(path);
  } catch {
    return fallback;
  }
}

export function getStudentDashboard(): Promise<StudentDashboardData> {
  return fetchWithFallback("/api/student/dashboard/", studentDashboardFallback);
}

export function getTeacherDashboard(): Promise<TeacherDashboardData> {
  return fetchWithFallback("/api/teacher/dashboard/", teacherDashboardFallback);
}

export function getDemoUsers(): Promise<DemoUser[]> {
  return fetchWithFallback("/api/auth/demo-users/", demoUsersFallback);
}

export async function getCurrentDemoUser(): Promise<DemoUser | null> {
  try {
    const response = await fetch("/api/auth/me/", { credentials: "include" });
    if (!response.ok) return null;
    return (await response.json()) as DemoUser;
  } catch {
    return null;
  }
}

export function getPaymentSummary(): Promise<PaymentSummaryData> {
  return fetchWithFallback("/api/payments/summary/", paymentSummaryFallback);
}

export async function loginDemoUser(payload: { username: string; password: string }): Promise<AuthSessionResponse> {
  const response = await fetch("/api/auth/session/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message ?? "Unable to sign in.");
  }
  return (await response.json()) as AuthSessionResponse;
}

export async function registerUser(payload: {
  first_name: string;
  last_name: string;
  username: string;
  email?: string;
  password?: string;
  role: "student" | "teacher";
  school_name?: string;
  school_class?: string;
  phone_number?: string;
  bio?: string;
  expertise?: string;
}): Promise<AuthSessionResponse> {
  const response = await fetch("/api/auth/session/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message ?? "Unable to create account.");
  }
  return (await response.json()) as AuthSessionResponse;
}

export async function logoutDemoUser(): Promise<void> {
  await fetch("/api/auth/session/logout", { method: "POST", credentials: "include" });
}

export async function requestPasswordReset(payload: { email: string }): Promise<PasswordResetRequestResponse> {
  const response = await fetch("/api/auth/session/password-reset/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message ?? "Unable to request reset.");
  }
  return (await response.json()) as PasswordResetRequestResponse;
}

export async function confirmPasswordReset(payload: {
  uid: string;
  token: string;
  new_password: string;
}): Promise<{ message: string }> {
  const response = await fetch("/api/auth/session/password-reset/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message ?? "Unable to reset password.");
  }
  return (await response.json()) as { message: string };
}

export async function submitStudentPollVote(payload: { option_id: number }): Promise<StudentPollVoteResponse> {
  const response = await fetch("/api/student/poll-vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Unable to submit poll vote.");
  return (await response.json()) as StudentPollVoteResponse;
}

export async function submitStudentQuizAnswer(payload: { choice_id: number }): Promise<StudentQuizSubmissionResponse> {
  const response = await fetch("/api/student/quiz-submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Unable to submit quiz answer.");
  return (await response.json()) as StudentQuizSubmissionResponse;
}

export async function submitStudentChatMessage(payload: { message: string; breakout_room_id?: number | null }): Promise<StudentChatMessageResponse> {
  const response = await fetch("/api/student/chat-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string; retry_after?: number } | null;
    const err = new ApiError(data?.message ?? "Unable to send message.");
    if (data?.retry_after) err.retryAfterSeconds = data.retry_after;
    throw err;
  }
  return (await response.json()) as StudentChatMessageResponse;
}

export async function submitStudentRaiseHand(payload: { reason: string }): Promise<StudentRaiseHandResponse> {
  const response = await fetch("/api/student/raise-hand", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Unable to raise hand.");
  return (await response.json()) as StudentRaiseHandResponse;
}

export async function submitStudentJoinRequest(): Promise<StudentJoinRequestResponse> {
  const response = await fetch("/api/student/join-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error("Unable to request join.");
  return (await response.json()) as StudentJoinRequestResponse;
}

export async function submitStudentEnrollByRoomCode(payload: { room_code: string }): Promise<StudentEnrollByCodeResponse> {
  const response = await fetch("/api/student/enroll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Unable to enroll.");
  return (await response.json()) as StudentEnrollByCodeResponse;
}

export async function getTeacherSessions(): Promise<TeacherSession[]> {
  return fetchWithFallback("/api/teacher/sessions/", []);
}

export async function getTeacherPrograms(): Promise<LearningProgram[]> {
  return fetchJson("/api/teacher/programs/");
}

export async function createSession(payload: {
  title: string;
  youtube_link?: string;
  starts_at: string;
  description?: string;
  is_paid?: boolean;
  price_amount?: number;
  delivery_mode?: "interactive" | "broadcast";
  expected_participants?: number;
  organization_id?: number;
  open_enrollment?: boolean;
  program_id?: number | null;
}): Promise<CreateSessionResponse> {
  const response = await fetch("/api/teacher/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Unable to create session.");
  return (await response.json()) as CreateSessionResponse;
}

export async function updateTeacherSession(sessionId: number, payload: {
  title: string;
  youtube_link?: string;
  starts_at: string;
  description?: string;
  is_paid?: boolean;
  price_amount?: number;
  delivery_mode?: "interactive" | "broadcast";
  expected_participants?: number;
  organization_id?: number;
  open_enrollment?: boolean;
  program_id?: number | null;
}): Promise<UpdateTeacherSessionResponse> {
  const response = await fetch(`/api/teacher/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Unable to update session.");
  return (await response.json()) as UpdateTeacherSessionResponse;
}

export async function deleteTeacherSession(sessionId: number): Promise<{ message: string }> {
  const response = await fetch(`/api/teacher/sessions/${sessionId}`, { method: "DELETE", credentials: "include" });
  if (!response.ok) throw new Error("Unable to delete session.");
  return (await response.json()) as { message: string };
}

export async function updateTeacherRoomState(sessionId: number, payload: Partial<{
  stage_mode: string;
  teacher_camera_enabled: boolean;
  teacher_mic_enabled: boolean;
  screen_share_enabled: boolean;
  whiteboard_enabled: boolean;
  student_chat_enabled: boolean;
  chat_moderation_mode: ChatModerationMode;
  qa_queue_max_pending: number;
  chat_slow_mode: boolean;
  student_raise_hand_enabled: boolean;
  join_approval_enabled: boolean;
  spotlight_mode: string;
  monitored_breakout_room_id: number | null;
  breakout_timer_minutes: number;
  extend_breakout_timer_minutes: number;
  clear_breakout_timer: boolean;
  recording_status: string;
}>): Promise<TeacherRoomStateMutationResponse> {
  const response = await fetch(`/api/teacher/sessions/${sessionId}/room-state`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Unable to update room state.");
  return (await response.json()) as TeacherRoomStateMutationResponse;
}

export async function createTeacherBreakouts(payload: { sessionId: number; room_count?: number; reuse_last_breakouts?: boolean }): Promise<TeacherBreakoutMutationResponse> {
  const response = await fetch(`/api/teacher/sessions/${payload.sessionId}/breakouts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ room_count: payload.room_count, reuse_last_breakouts: payload.reuse_last_breakouts }),
  });
  if (!response.ok) throw new Error("Unable to create breakout rooms.");
  return (await response.json()) as TeacherBreakoutMutationResponse;
}

export async function moveStudentToBreakout(payload: { sessionId: number; student_id: number; breakout_room_id?: number | null }): Promise<TeacherBreakoutMutationResponse> {
  const response = await fetch(`/api/teacher/sessions/${payload.sessionId}/breakouts`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ student_id: payload.student_id, breakout_room_id: payload.breakout_room_id ?? null }),
  });
  if (!response.ok) throw new Error("Unable to move student to breakout.");
  return (await response.json()) as TeacherBreakoutMutationResponse;
}

export async function updateBreakoutSpokesperson(payload: { sessionId: number; room_id: number; spokesperson_student_id?: number | null }): Promise<TeacherBreakoutMutationResponse> {
  const response = await fetch(`/api/teacher/sessions/${payload.sessionId}/breakouts`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ room_id: payload.room_id, spokesperson_student_id: payload.spokesperson_student_id ?? null }),
  });
  if (!response.ok) throw new Error("Unable to update breakout spokesperson.");
  return (await response.json()) as TeacherBreakoutMutationResponse;
}

export async function clearTeacherBreakouts(sessionId: number): Promise<TeacherBreakoutMutationResponse> {
  const response = await fetch(`/api/teacher/sessions/${sessionId}/breakouts`, { method: "DELETE", credentials: "include" });
  if (!response.ok) throw new Error("Unable to clear breakout rooms.");
  return (await response.json()) as TeacherBreakoutMutationResponse;
}

export async function sendTeacherBreakoutBroadcast(payload: { sessionId: number; message: string }): Promise<TeacherBreakoutBroadcastResponse> {
  const response = await fetch(`/api/teacher/sessions/${payload.sessionId}/breakouts`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message: payload.message }),
  });
  if (!response.ok) throw new Error("Unable to send breakout broadcast.");
  return (await response.json()) as TeacherBreakoutBroadcastResponse;
}

export async function sendTeacherChatMessage(payload: { sessionId: number; message: string; breakout_room_id?: number | null }): Promise<TeacherChatMessageResponse> {
  const response = await fetch(`/api/teacher/sessions/${payload.sessionId}/chat-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message: payload.message, breakout_room_id: payload.breakout_room_id ?? null }),
  });
  if (!response.ok) throw new Error("Unable to send teacher chat message.");
  return (await response.json()) as TeacherChatMessageResponse;
}

export async function getTeacherWhiteboard(sessionId: number): Promise<WhiteboardState> {
  return fetchWithFallback<WhiteboardState>(`/api/teacher/sessions/${sessionId}/whiteboard/`, {
    pages: [],
    active_page: 0,
  });
}

export async function saveTeacherWhiteboard(sessionId: number, payload: WhiteboardState): Promise<TeacherWhiteboardMutationResponse> {
  const response = await fetch(`/api/teacher/sessions/${sessionId}/whiteboard`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Unable to save whiteboard.");
  return (await response.json()) as TeacherWhiteboardMutationResponse;
}

export async function clearTeacherWhiteboard(sessionId: number): Promise<TeacherWhiteboardMutationResponse> {
  const response = await fetch(`/api/teacher/sessions/${sessionId}/whiteboard`, { method: "DELETE", credentials: "include" });
  if (!response.ok) throw new Error("Unable to clear whiteboard.");
  return (await response.json()) as TeacherWhiteboardMutationResponse;
}

export async function assignStudentToSession(payload: { sessionId: number; student_id: number; access_status?: string; display_time?: string }): Promise<TeacherEnrollmentMutationResponse> {
  const response = await fetch(`/api/teacher/sessions/${payload.sessionId}/enrollments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ student_id: payload.student_id, access_status: payload.access_status, display_time: payload.display_time }),
  });
  if (!response.ok) throw new Error("Unable to assign student.");
  return (await response.json()) as TeacherEnrollmentMutationResponse;
}

export async function removeStudentFromSession(payload: { sessionId: number; student_id: number }): Promise<{ message: string }> {
  const response = await fetch(`/api/teacher/sessions/${payload.sessionId}/enrollments`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ student_id: payload.student_id }),
  });
  if (!response.ok) throw new Error("Unable to remove student.");
  return (await response.json()) as { message: string };
}

export async function getSessionEnrollments(sessionId: number): Promise<SessionEnrollment[]> {
  return fetchWithFallback(`/api/teacher/sessions/${sessionId}/enrollments/`, []);
}

export async function updateTeacherAttendance(sessionId: number, payload: { student_id: number; status: "Present" | "Pending" }): Promise<TeacherAttendanceMutationResponse> {
  const response = await fetch(`/api/teacher/sessions/${sessionId}/attendance`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Unable to update attendance.");
  return (await response.json()) as TeacherAttendanceMutationResponse;
}

export async function resolveTeacherRaiseHand(sessionId: number, payload: { request_id: number; action: "speak" | "dismiss" }): Promise<TeacherRaiseHandMutationResponse> {
  const response = await fetch(`/api/teacher/sessions/${sessionId}/raise-hands`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Unable to resolve raise hand.");
  return (await response.json()) as TeacherRaiseHandMutationResponse;
}

export async function resolveTeacherJoinRequest(sessionId: number, payload: { request_id: number; action: "approve" | "deny" }): Promise<TeacherJoinRequestMutationResponse> {
  const response = await fetch(`/api/teacher/sessions/${sessionId}/join-requests`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Unable to resolve join request.");
  return (await response.json()) as TeacherJoinRequestMutationResponse;
}

export async function moderateTeacherChatMessage(sessionId: number, payload: { message_id: number; action: "pin" | "unpin" | "hide" }): Promise<TeacherChatModerationResponse> {
  const response = await fetch(`/api/teacher/sessions/${sessionId}/chat-moderation`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Unable to moderate message.");
  return (await response.json()) as TeacherChatModerationResponse;
}

export async function bulkApproveQaQueue(sessionId: number): Promise<TeacherQaQueueBulkApproveResponse> {
  const response = await fetch(`/api/teacher/sessions/${sessionId}/qa-queue/bulk`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "approve_all" }),
  });
  if (!response.ok) throw new Error("Unable to approve QA queue.");
  return (await response.json()) as TeacherQaQueueBulkApproveResponse;
}

export async function getTeacherStudents(): Promise<TeacherStudent[]> {
  return fetchWithFallback("/api/teacher/students/", []);
}

export async function getTeacherSessionDetail(sessionId: number): Promise<TeacherSessionDetailResponse> {
  return fetchJson(`/api/teacher/sessions/${sessionId}/`);
}

export async function getSessionPolls(sessionId: number): Promise<TeacherPoll[]> {
  return fetchJson(`/api/teacher/sessions/${sessionId}/polls`);
}

export async function createSessionPoll(payload: { sessionId: number; question: string; options: string[] }): Promise<TeacherPollMutationResponse> {
  const response = await fetch(`/api/teacher/sessions/${payload.sessionId}/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ question: payload.question, options: payload.options }),
  });
  if (!response.ok) throw new Error("Unable to create poll.");
  return (await response.json()) as TeacherPollMutationResponse;
}

export async function activateSessionPoll(payload: { sessionId: number; poll_id: number }): Promise<TeacherPollMutationResponse> {
  const response = await fetch(`/api/teacher/sessions/${payload.sessionId}/polls`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ poll_id: payload.poll_id }),
  });
  if (!response.ok) throw new Error("Unable to activate poll.");
  return (await response.json()) as TeacherPollMutationResponse;
}

export async function updateSessionPoll(payload: { sessionId: number; poll_id: number; question: string; options: string[] }): Promise<TeacherPollMutationResponse> {
  const response = await fetch(`/api/teacher/sessions/${payload.sessionId}/polls`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ poll_id: payload.poll_id, question: payload.question, options: payload.options }),
  });
  if (!response.ok) throw new Error("Unable to update poll.");
  return (await response.json()) as TeacherPollMutationResponse;
}

export async function getSessionQuizzes(sessionId: number): Promise<TeacherQuiz[]> {
  return fetchJson(`/api/teacher/sessions/${sessionId}/quizzes`);
}

export async function createSessionQuiz(payload: { sessionId: number; question: string; choices: string[] }): Promise<TeacherQuizMutationResponse> {
  const response = await fetch(`/api/teacher/sessions/${payload.sessionId}/quizzes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ question: payload.question, choices: payload.choices }),
  });
  if (!response.ok) throw new Error("Unable to create quiz.");
  return (await response.json()) as TeacherQuizMutationResponse;
}

export async function activateSessionQuiz(payload: { sessionId: number; quiz_id: number }): Promise<TeacherQuizMutationResponse> {
  const response = await fetch(`/api/teacher/sessions/${payload.sessionId}/quizzes`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ quiz_id: payload.quiz_id }),
  });
  if (!response.ok) throw new Error("Unable to activate quiz.");
  return (await response.json()) as TeacherQuizMutationResponse;
}

export async function updateSessionQuiz(payload: { sessionId: number; quiz_id: number; question: string; choices: string[] }): Promise<TeacherQuizMutationResponse> {
  const response = await fetch(`/api/teacher/sessions/${payload.sessionId}/quizzes`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ quiz_id: payload.quiz_id, question: payload.question, choices: payload.choices }),
  });
  if (!response.ok) throw new Error("Unable to update quiz.");
  return (await response.json()) as TeacherQuizMutationResponse;
}

export async function simulatePayment(payload: { phone_number: string; course_name: string }): Promise<SimulatePaymentResponse> {
  const response = await fetch("/api/payments/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Unable to process payment.");
  return (await response.json()) as SimulatePaymentResponse;
}

export async function getSessionResources(sessionId: number): Promise<SessionResourceItem[]> {
  return fetchJson(`/api/teacher/sessions/${sessionId}/resources/`);
}

export async function createSessionResource(sessionId: number, payload: { title: string; url?: string; file?: File | null }): Promise<SessionResourceItem> {
  const hasFile = payload.file && payload.file.size > 0;
  const body = hasFile
    ? (() => {
        const form = new FormData();
        form.append("title", payload.title);
        if (payload.url?.trim()) form.append("url", payload.url.trim());
        form.append("file", payload.file as File);
        return form;
      })()
    : JSON.stringify({ title: payload.title, url: payload.url?.trim() ?? "" });

  const response = await fetch(`/api/teacher/sessions/${sessionId}/resources/`, {
    method: "POST",
    headers: hasFile ? undefined : { "Content-Type": "application/json" },
    credentials: "include",
    body,
  });
  if (!response.ok) throw new Error("Unable to add resource.");
  return (await response.json()) as SessionResourceItem;
}

export async function deleteSessionResource(sessionId: number, resourceId: number): Promise<void> {
  const response = await fetch(`/api/teacher/sessions/${sessionId}/resources/${resourceId}/`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) throw new Error("Unable to remove resource.");
}

export async function getOrganizationMembers(organizationId: number): Promise<OrgMember[]> {
  return fetchJson(`/api/organizations/${organizationId}/members/`);
}

export async function addOrganizationMember(organizationId: number, payload: { username: string; role: "student" | "teacher" | "admin" }): Promise<void> {
  const response = await fetch(`/api/organizations/${organizationId}/members/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message ?? "Unable to add member.");
  }
}

export async function removeOrganizationMember(organizationId: number, userId: number): Promise<void> {
  const response = await fetch(`/api/organizations/${organizationId}/members/${userId}/`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message ?? "Unable to remove member.");
  }
}

export async function downloadSessionRosterPdf(sessionId: number): Promise<void> {
  const response = await fetch(`/api/teacher/sessions/${sessionId}/enrollments/export`, {
    method: "GET",
    credentials: "include",
  });
  if (!response.ok) throw new Error(`Export failed (${response.status})`);
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  let filename = `roster-${sessionId}.pdf`;
  const match = disposition?.match(/filename="([^"]+)"/);
  if (match?.[1]) filename = match[1];
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function getOpsMetrics(): Promise<OpsMetricsResponse> {
  return fetchJson("/api/ops/metrics");
}

export async function getTeacherYouTubeIntegrationStatus(youtubeLink?: string): Promise<YouTubeIntegrationStatus> {
  const query = youtubeLink ? `?youtube_link=${encodeURIComponent(youtubeLink)}` : "";
  const response = await fetch(`/api/teacher/integrations/youtube/${query}`, { credentials: "include" });
  if (!response.ok) throw new Error("Unable to load YouTube integration status.");
  return (await response.json()) as YouTubeIntegrationStatus;
}

export async function connectTeacherYouTubeIntegration(): Promise<{ auth_url: string }> {
  const response = await fetch("/api/teacher/integrations/youtube/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error("Unable to connect YouTube.");
  return (await response.json()) as { auth_url: string };
}

export async function disconnectTeacherYouTubeIntegration(): Promise<void> {
  const response = await fetch("/api/teacher/integrations/youtube/", { method: "DELETE", credentials: "include" });
  if (!response.ok && response.status !== 204) throw new Error("Unable to disconnect YouTube.");
}

export async function createLearningProgram(payload: {
  organization_id: number;
  title: string;
  starts_at: string;
  ends_at: string;
}): Promise<LearningProgram> {
  const response = await fetch("/api/teacher/programs/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Unable to create program.");
  return (await response.json()) as LearningProgram;
}

export async function updateTeacherJoinRequest(payload: {
  sessionId: number;
  request_id: number;
  action: "approve" | "deny";
}): Promise<TeacherJoinRequestMutationResponse> {
  const response = await fetch(`/api/teacher/sessions/${payload.sessionId}/join-requests`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ request_id: payload.request_id, action: payload.action }),
  });
  if (!response.ok) throw new Error("Unable to update join request.");
  return (await response.json()) as TeacherJoinRequestMutationResponse;
}

export async function updateSessionEnrollment(payload: {
  sessionId: number;
  student_id: number;
  access_status?: SessionEnrollment["access_status"];
  progress?: number;
  display_time?: string;
}): Promise<TeacherEnrollmentMutationResponse> {
  const response = await fetch(`/api/teacher/sessions/${payload.sessionId}/enrollments`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ student_id: payload.student_id, access_status: payload.access_status, progress: payload.progress, display_time: payload.display_time }),
  });
  if (!response.ok) throw new Error("Unable to update enrollment.");
  return (await response.json()) as TeacherEnrollmentMutationResponse;
}

export async function updateSessionAttendance(payload: {
  sessionId: number;
  student_id: number;
  status: "Present" | "Pending";
}): Promise<TeacherAttendanceMutationResponse> {
  const response = await fetch(`/api/teacher/sessions/${payload.sessionId}/attendance`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ student_id: payload.student_id, status: payload.status }),
  });
  if (!response.ok) throw new Error("Unable to update attendance.");
  return (await response.json()) as TeacherAttendanceMutationResponse;
}

export async function resolveRaiseHandRequest(payload: {
  sessionId: number;
  request_id: number;
}): Promise<TeacherRaiseHandMutationResponse> {
  const response = await fetch(`/api/teacher/sessions/${payload.sessionId}/raise-hands`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ request_id: payload.request_id }),
  });
  if (!response.ok) throw new Error("Unable to resolve raise-hand request.");
  return (await response.json()) as TeacherRaiseHandMutationResponse;
}

export async function moderateChatMessage(payload: {
  sessionId: number;
  message_id: number;
  action: "pin" | "unpin" | "hide" | "approve_qa" | "dismiss_qa";
}): Promise<TeacherChatModerationResponse> {
  const response = await fetch(`/api/teacher/sessions/${payload.sessionId}/chat-moderation`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message_id: payload.message_id, action: payload.action }),
  });
  if (!response.ok) throw new Error("Unable to moderate chat message.");
  return (await response.json()) as TeacherChatModerationResponse;
}

export async function approveAllSessionQaMessages(sessionId: number): Promise<TeacherQaQueueBulkApproveResponse> {
  const response = await fetch(`/api/teacher/sessions/${sessionId}/qa-queue/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "approve_all" }),
  });
  if (!response.ok) throw new Error("Unable to publish all queued questions.");
  return (await response.json()) as TeacherQaQueueBulkApproveResponse;
}

export async function dismissAllSessionQaMessages(sessionId: number): Promise<TeacherQaQueueBulkApproveResponse> {
  const response = await fetch(`/api/teacher/sessions/${sessionId}/qa-queue/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "dismiss_all" }),
  });
  if (!response.ok) throw new Error("Unable to dismiss all queued questions.");
  return (await response.json()) as TeacherQaQueueBulkApproveResponse;
}
