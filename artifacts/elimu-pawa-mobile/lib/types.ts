export type DemoUser = {
  username: string;
  full_name: string;
  email: string;
  role: "student" | "teacher" | "admin";
  organizations?: OrganizationSummary[];
};

export type OrganizationSummary = {
  id: number;
  name: string;
  role: string;
};

export type CourseCard = {
  session_id?: number;
  title: string;
  coach: string;
  time: string;
  starts_at?: string;
  status: string;
  join_status?: "not_required" | "none" | "pending" | "approved" | "denied";
  can_join_room?: boolean;
  progress: number;
};

export type ClassroomMessage = {
  id: number;
  sender: string;
  role: "teacher" | "student";
  message: string;
  time: string;
};

export type PollOption = {
  id?: number;
  label: string;
  value: number;
};

export type LiveClassInfo = {
  course_title: string;
  session_title: string;
  youtube_embed_url: string;
  room_code: string;
  is_live: boolean;
  price_label: string;
  payment_required: boolean;
  student_paid: boolean;
  waiting_room_enabled: boolean;
  join_status: string;
  can_join_room: boolean;
  delivery_mode: string;
  expected_participants: number;
  broadcast_only: boolean;
};

export type StudentDashboardData = {
  live_class: LiveClassInfo;
  messages: ClassroomMessage[];
  poll: {
    id?: number;
    question: string;
    options: PollOption[];
    voted: boolean;
  } | null;
  courses: CourseCard[];
  engagement: { label: string; value: string; detail: string }[];
};

export type TeacherSession = {
  id: number;
  title: string;
  starts_at: string;
  status: string;
  enrolled_count: number;
  room_code: string;
  delivery_mode: "interactive" | "broadcast";
  is_live?: boolean;
};

export type TeacherDashboardData = {
  sessions: TeacherSession[];
  total_students: number;
  total_sessions: number;
  form_defaults: {
    title: string;
    youtube_link: string;
    starts_at: string;
    delivery_mode: string;
    expected_participants: number;
  };
};

export type PaymentEntry = {
  id: number;
  student_name: string;
  course: string;
  amount: string;
  status: "paid" | "pending" | "failed";
  date: string;
  phone?: string;
};

export type PaymentSummaryData = {
  total_revenue: string;
  pending_amount: string;
  paid_count: number;
  pending_count: number;
  currency: string;
  entries: PaymentEntry[];
};

export type AuthSessionResponse = {
  user: DemoUser;
  message: string;
};
