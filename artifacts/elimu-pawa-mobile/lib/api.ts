const BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...rest } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...rest, headers });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { message?: string }).message ?? "Request failed");
  }
  return data as T;
}

export interface Student {
  id: number;
  adm_no: string;
  first_name: string;
  last_name: string;
  class_level: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  student: Student;
}

export interface Lesson {
  lesson_id: number;
  lesson_title: string;
  scheduled_at: string;
  duration_minutes: number;
  subject: string;
  class_level: string;
  teacher_name: string;
}

export interface DashboardResponse {
  student: Student;
  lessons: Lesson[];
}

export const studentLogin = (adm_no: string, password: string) =>
  request<AuthResponse>("/students/login", {
    method: "POST",
    body: JSON.stringify({ adm_no, password }),
  });

export const studentRegister = (data: {
  adm_no: string;
  first_name: string;
  last_name: string;
  class_level: string;
  parent_phone: string;
}) =>
  request<AuthResponse>("/students/register", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const studentLogout = (token: string) =>
  request<{ message: string }>("/students/logout", {
    method: "POST",
    token,
  });

export const getStudentDashboard = (token: string) =>
  request<DashboardResponse>("/students/dashboard", { token });
