export type EngagementMetric = {
  label: string;
  value: string;
  detail: string;
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

export type StudentQuizChoice = {
  id?: number;
  label: string;
};

export type RoomStageMode = "camera" | "screenshare" | "whiteboard" | "slides";
export type SpotlightMode = "off" | "teacher" | "content";
export type RecordingStatus = "idle" | "recording" | "paused";
export type RealtimeRole = "student" | "teacher";

export type WhiteboardStroke = {
  id: string;
  color: string;
  width: number;
  tool: "pen" | "eraser";
  points: [number, number][];
};

export type WhiteboardPage = {
  id: string;
  name: string;
  background_template?: "grid" | "lined" | "dots" | "blank";
  strokes: WhiteboardStroke[];
};

export type WhiteboardState = {
  pages: WhiteboardPage[];
  active_page: number;
  updated_at?: string;
};

export type ChatModerationMode = "open" | "qa_queue";

export type RoomState = {
  stage_mode: RoomStageMode;
  teacher_camera_enabled: boolean;
  teacher_mic_enabled: boolean;
  screen_share_enabled: boolean;
  whiteboard_enabled: boolean;
  student_chat_enabled: boolean;
  chat_moderation_mode: ChatModerationMode;
  qa_queue_max_pending: number;
  chat_slow_mode: boolean;
  qa_queue_pending_count: number;
  student_raise_hand_enabled: boolean;
  join_approval_enabled: boolean;
  spotlight_mode: SpotlightMode;
  breakout_enabled: boolean;
  monitored_breakout_room_id: number | null;
  breakout_timer_ends_at: string | null;
  last_breakout_layout_available: boolean;
  recording_status: RecordingStatus;
  recording_started_at: string | null;
};

export type StudentBreakoutRoom = {
  id: number;
  name: string;
  member_names: string[];
  teacher_present: boolean;
};

export type BreakoutBroadcast = {
  message: string;
  sent_at: string;
};

export type TeacherBreakoutRoom = {
  id: number;
  name: string;
  member_count: number;
  teacher_present: boolean;
  spokesperson_student_id: number | null;
  spokesperson_name: string | null;
  students: Array<{
    student_id: number;
    name: string;
    status: "Present" | "Pending";
  }>;
};

export type LastBreakoutSummary = {
  room_count: number;
  total_learners: number;
  rooms: Array<{
    name: string;
    member_names: string[];
    spokesperson_name: string | null;
  }>;
};

export type TeacherPoll = {
  id: number;
  question: string;
  is_active: boolean;
  response_count: number;
  options: Array<{
    id: number;
    label: string;
    value: number;
  }>;
};

export type TeacherQuiz = {
  id: number;
  question: string;
  is_active: boolean;
  choices: Array<{
    id: number;
    label: string;
  }>;
};

export type SessionResourceItem = {
  id: number;
  title: string;
  url: string;
  file_url?: string | null;
};

export type LearningProgram = {
  id: number;
  organization_id: number;
  title: string;
  slug: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
};

export type OrgMember = {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
};

export type YouTubeIntegrationStatus = {
  connected: boolean;
  channel_name: string;
  channel_id: string;
  connected_at: string | null;
  oauth_configured: boolean;
  stream_status: string;
  stream_title: string;
  stream_checked_at: string | null;
  stream_message: string;
};

export type StudentDashboardData = {
  live_class: {
    course_title: string;
    session_title: string;
    youtube_embed_url: string;
    room_code: string;
    is_live: boolean;
    price_label: string;
    payment_required: boolean;
    student_paid: boolean;
    waiting_room_enabled: boolean;
    join_status: "not_required" | "none" | "pending" | "approved" | "denied";
    can_join_room: boolean;
    delivery_mode: "interactive" | "broadcast";
    expected_participants: number;
    broadcast_only: boolean;
    program_title: string;
    program_window: string;
  };
  room_state: RoomState;
  breakout_room: StudentBreakoutRoom | null;
  breakout_broadcast: BreakoutBroadcast | null;
  whiteboard: WhiteboardState;
  engagement_stats: EngagementMetric[];
  poll: {
    id?: number | null;
    question: string;
    response_count: number;
    selected_option_id?: number | null;
    options: PollOption[];
  };
  quiz: {
    id?: number | null;
    question: string;
    selected_choice_id?: number | null;
    submitted?: boolean;
    choices: StudentQuizChoice[];
  };
  courses: CourseCard[];
  messages: ClassroomMessage[];
  session_resources: SessionResourceItem[];
};

export type TeacherDashboardData = {
  form_defaults: {
    title: string;
    youtube_link: string;
    starts_at: string;
    delivery_mode: "interactive" | "broadcast";
    expected_participants: number;
  };
  room_state: RoomState;
  whiteboard: WhiteboardState;
  metrics: EngagementMetric[];
  attendance: {
    student_id: number;
    name: string;
    joined_at: string;
    status: "Present" | "Pending";
    payment: string;
  }[];
  polls: TeacherPoll[];
  quizzes: TeacherQuiz[];
  breakout_rooms: TeacherBreakoutRoom[];
  breakout_broadcast: BreakoutBroadcast | null;
  last_breakout_summary: LastBreakoutSummary | null;
  raise_hand_queue: {
    id: number;
    student_id: number;
    name: string;
    school_class?: string;
    reason: string;
    wait: string;
  }[];
  waiting_room_queue: {
    id: number;
    student_id: number;
    name: string;
    school_class?: string;
    reason: string;
    wait: string;
  }[];
  moderation_insights: {
    id: number;
    sender: string;
    role: "teacher" | "student";
    message: string;
    is_pinned: boolean;
  }[];
  qa_queue: {
    id: number;
    student_id: number;
    sender: string;
    message: string;
    time: string;
  }[];
  messages: ClassroomMessage[];
  stream_preview: {
    badge: string;
    title: string;
    youtube_link: string;
  };
};

export type TeacherSession = {
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
};

export type TeacherStudent = {
  id: number;
  username: string;
  full_name: string;
  email: string;
  school_name: string;
  school_class: string;
};

export type SessionEnrollment = {
  student_id: number;
  username: string;
  full_name: string;
  email: string;
  school_name: string;
  school_class: string;
  progress: number;
  access_status: "live_now" | "upcoming" | "paid" | "locked";
  enrollment_source: "roster" | "join_code" | "invite";
  display_time: string;
};

export type PaymentSummaryData = {
  course_name: string;
  plan: string;
  price: string;
  status: string;
  cta: string;
};

export type OpsMetricsResponse = {
  generated_at: string;
  pending_qa_count: number;
  active_session_count: number;
  waiting_room_request_count: number;
  open_raise_hand_count: number;
  database_ok: boolean;
  redis_ok: boolean;
};

export type OrganizationSummary = {
  id: number;
  name: string;
  slug: string;
  role: "admin" | "teacher" | "student";
};

export type DemoUser = {
  username: string;
  full_name: string;
  email: string;
  role: "student" | "teacher" | "admin";
  organizations?: OrganizationSummary[];
};

export type StudentEnrollByCodeResponse = {
  message: string;
  session: TeacherSession;
};

export type AuthSessionResponse = {
  message: string;
  user: DemoUser;
};

export type PasswordResetRequestResponse = {
  message: string;
  reset_url?: string;
  uid?: string;
  token?: string;
};

export type CreateSessionResponse = {
  message: string;
  session: TeacherSession;
};

export type UpdateTeacherSessionResponse = {
  message: string;
  session: TeacherSession;
};

export type TeacherEnrollmentMutationResponse = {
  message: string;
  enrollment: SessionEnrollment;
};

export type TeacherSessionDetailResponse = {
  session: TeacherSession;
  dashboard: TeacherDashboardData;
};

export type TeacherRoomStateMutationResponse = {
  message: string;
  room_state: RoomState;
};

export type TeacherBreakoutMutationResponse = {
  message: string;
  breakout_rooms: TeacherBreakoutRoom[];
  room_state?: RoomState;
};

export type TeacherBreakoutBroadcastResponse = {
  message: string;
  broadcast: BreakoutBroadcast;
};

export type TeacherWhiteboardMutationResponse = {
  message: string;
  whiteboard: WhiteboardState;
};

export type StudentRealtimeSnapshot = {
  type: "student_snapshot";
  dashboard: StudentDashboardData;
};

export type StudentRealtimeEvent =
  | {
      type: "student_event";
      event: "refresh_required";
    }
  | {
      type: "student_event";
      event: "room_state_updated";
      room_state: RoomState;
    }
  | {
      type: "student_event";
      event: "breakout_broadcast_updated";
      breakout_broadcast: BreakoutBroadcast | null;
    }
  | {
      type: "student_event";
      event: "message_created";
      message: ClassroomMessage;
    }
  | {
      type: "student_event";
      event: "poll_updated";
      poll: StudentDashboardData["poll"];
    };

export type TeacherRealtimeSnapshot = {
  type: "teacher_snapshot";
  session: TeacherSession;
  dashboard: TeacherDashboardData;
  enrollments: SessionEnrollment[];
};

export type ClassroomSignalPayload =
  | {
      kind: "viewer_ready";
      media: "screen" | "audio" | "camera";
    }
  | {
      kind: "viewer_left";
      media: "screen" | "audio" | "camera";
    }
  | {
      kind: "offer" | "answer";
      media: "screen" | "audio" | "camera";
      description: RTCSessionDescriptionInit;
    }
  | {
      kind: "ice_candidate";
      media: "screen" | "audio" | "camera";
      candidate: RTCIceCandidateInit;
    }
  | {
      kind: "reaction";
      emoji: string;
    }
  | {
      kind: "raise_hand";
      reason: string;
      request_id?: number;
    }
  | {
      kind: "raise_hand_resolved";
      request_id: number;
    }
  | {
      kind: "removed_from_room";
      session_title?: string;
    }
  | {
      kind: "speak_permission_granted";
      request_id?: number;
    }
  | {
      kind: "speak_permission_revoked";
      request_id?: number;
      reason?: string;
    }
  | {
      kind: "speaker_offer";
      description: RTCSessionDescriptionInit;
    }
  | {
      kind: "speaker_answer";
      description: RTCSessionDescriptionInit;
    }
  | {
      kind: "speaker_ice_candidate";
      candidate: RTCIceCandidateInit;
    };

export type ClassroomSignalMessage = {
  type: "signal";
  source_username: string;
  source_role: RealtimeRole;
  payload: ClassroomSignalPayload;
};

export type ClassroomSignalOutboundMessage = {
  type: "signal";
  target_role: RealtimeRole;
  target_username?: string;
  payload: ClassroomSignalPayload;
};

export type TeacherAttendanceMutationResponse = {
  message: string;
  attendance: {
    student_id: number;
    status: "Present" | "Pending";
    joined_at: string;
  };
};

export type TeacherRaiseHandMutationResponse = {
  message: string;
  request: {
    id: number;
    student_id: number;
    status: "resolved";
  };
};

export type TeacherJoinRequestMutationResponse = {
  message: string;
  request: {
    id: number;
    student_id: number;
    status: "approved" | "denied";
  };
};

export type TeacherChatModerationResponse = {
  message: string;
  chat_message: {
    id: number;
    is_pinned: boolean;
    is_hidden: boolean;
    qa_status?: string;
  };
};

export type TeacherQaQueueBulkApproveResponse = {
  message: string;
  approved: number;
  dismissed: number;
};

export type TeacherChatMessageResponse = {
  message: string;
  chat_message: ClassroomMessage;
};

export type TeacherPollMutationResponse = {
  message: string;
  poll: {
    id: number;
    question: string;
    is_active: boolean;
  };
};

export type TeacherQuizMutationResponse = {
  message: string;
  quiz: {
    id: number;
    question: string;
    is_active: boolean;
  };
};

export type StudentPollVoteResponse = {
  message: string;
  poll: StudentDashboardData["poll"];
};

export type StudentQuizSubmissionResponse = {
  message: string;
  quiz: StudentDashboardData["quiz"];
};

export type StudentChatMessageResponse = {
  message: string;
  chat_message: ClassroomMessage;
  qa_queued?: boolean;
};

export type StudentJoinRequestResponse = {
  message: string;
  request: {
    id: number;
    status: "pending";
  };
};

export type StudentRaiseHandResponse = {
  message: string;
  request: {
    id: number;
    reason: string;
    status: "open";
  };
};

export type SimulatePaymentResponse = {
  message: string;
  status: "success";
  transaction_reference: string;
  phone_number: string;
  course_name: string;
};
