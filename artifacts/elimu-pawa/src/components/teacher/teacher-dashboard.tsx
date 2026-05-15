
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BadgeHelp,
  BookOpenText,
  ClipboardList,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  Disc3,
  Download,
  DoorOpen,
  Hand,
  History,
  LayoutGrid,
  LayoutPanelLeft,
  ListOrdered,
  MessageSquareText,
  Mic,
  MicOff,
  Pause,
  PhoneOff,
  Pin,
  PinOff,
  RefreshCw,
  Send,
  Settings2,
  Sidebar,
  Sparkles,
  Square,
  Timer,
  UsersRound,
  Video,
  VideoOff,
} from "lucide-react";
import {
  addOrganizationMember,
  assignStudentToSession,
  activateSessionPoll,
  activateSessionQuiz,
  clearTeacherBreakouts,
  clearTeacherWhiteboard,
  connectTeacherYouTubeIntegration,
  createLearningProgram,
  createTeacherBreakouts,
  createSession,
  createSessionPoll,
  createSessionQuiz,
  createSessionResource,
  deleteSessionResource,
  deleteTeacherSession,
  downloadSessionRosterPdf,
  removeOrganizationMember,
  getOrganizationMembers,
  getSessionEnrollments,
  getSessionResources,
  getTeacherPrograms,
  getTeacherYouTubeIntegrationStatus,
  getOpsMetrics,
  getTeacherWhiteboard,
  getTeacherSessionDetail,
  getTeacherStudents,
  moderateChatMessage,
  approveAllSessionQaMessages,
  dismissAllSessionQaMessages,
  moveStudentToBreakout,
  removeStudentFromSession,
  resolveRaiseHandRequest,
  saveTeacherWhiteboard,
  sendTeacherBreakoutBroadcast,
  sendTeacherChatMessage,
  disconnectTeacherYouTubeIntegration,
  updateBreakoutSpokesperson,
  updateSessionPoll,
  updateSessionQuiz,
  updateSessionAttendance,
  updateSessionEnrollment,
  updateTeacherJoinRequest,
  updateTeacherRoomState,
  updateTeacherSession,
} from "@/lib/api";
import { WhiteboardStage } from "@/components/classroom/whiteboard-stage";
import { useClassroomSignaling } from "@/hooks/use-classroom-signaling";
import { useClassroomRealtime } from "@/hooks/use-classroom-realtime";
import { usePollingRefresh } from "@/hooks/use-polling-refresh";
import { useAppStore } from "@/lib/store";
import { normalizeYouTubeEmbedUrl } from "@/lib/video";
import { getIceServers } from "@/lib/webrtc";
import type {
  ClassroomSignalMessage,
  LearningProgram,
  OrgMember,
  OrganizationSummary,
  RoomStageMode,
  SessionEnrollment,
  SessionResourceItem,
  SpotlightMode,
  TeacherBreakoutRoom,
  TeacherDashboardData,
  OpsMetricsResponse,
  TeacherRealtimeSnapshot,
  TeacherSession,
  TeacherStudent,
  YouTubeIntegrationStatus,
  WhiteboardState,
} from "@/lib/types";

type EnrollmentDraft = {
  access_status: SessionEnrollment["access_status"];
  progress: number;
};

type AttendanceDraft = {
  status: "Present" | "Pending";
};

/** Next quarter-hour, for quick “new class” defaults. */
function defaultStartsAtForNewSession(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 15, 0, 0);
  return d.toISOString().slice(0, 16);
}

export function TeacherDashboard({
  dashboard,
  sessions: initialSessions,
  currentUsername,
  accessToken,
  organizations = [],
}: {
  dashboard: TeacherDashboardData;
  sessions: TeacherSession[];
  currentUsername: string;
  accessToken?: string;
  organizations?: OrganizationSummary[];
}) {
  const [title, setTitle] = useState(dashboard.form_defaults.title);
  const [youtubeLink, setYoutubeLink] = useState(dashboard.form_defaults.youtube_link);
  const [startsAt, setStartsAt] = useState(dashboard.form_defaults.starts_at);
  const [deliveryMode, setDeliveryMode] = useState<"interactive" | "broadcast">(
    dashboard.form_defaults.delivery_mode,
  );
  const [expectedParticipants, setExpectedParticipants] = useState(
    dashboard.form_defaults.delivery_mode === "broadcast"
      ? Math.min(5000, Math.max(200, dashboard.form_defaults.expected_participants))
      : Math.min(200, Math.max(10, dashboard.form_defaults.expected_participants)),
  );
  const [sessions, setSessions] = useState(initialSessions);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(initialSessions[0]?.id ?? null);
  const [description, setDescription] = useState("");
  const [sessionOrgId, setSessionOrgId] = useState<number | null>(null);
  const [openEnrollment, setOpenEnrollment] = useState(true);
  const [sessionProgramId, setSessionProgramId] = useState<number | null>(null);
  const [programs, setPrograms] = useState<LearningProgram[]>([]);
  const [sessionResources, setSessionResources] = useState<SessionResourceItem[]>([]);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [memberUsername, setMemberUsername] = useState("");
  const [newProgramTitle, setNewProgramTitle] = useState("");
  const [newProgramStart, setNewProgramStart] = useState("");
  const [newProgramEnd, setNewProgramEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [enrollments, setEnrollments] = useState<SessionEnrollment[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [, setLoadingEnrollments] = useState(false);
  const [loadingSessionDetail, setLoadingSessionDetail] = useState(false);
  const [exportingEnrollments, setExportingEnrollments] = useState(false);
  const [showRosterTools, setShowRosterTools] = useState(false);
  const [classSaveMessage, setClassSaveMessage] = useState<string | null>(null);
  const [studentStreamFilter, setStudentStreamFilter] = useState("all");
  const [mutatingEnrollment, setMutatingEnrollment] = useState(false);
  const [savingEnrollmentId, setSavingEnrollmentId] = useState<number | null>(null);
  const [savingAttendanceId, setSavingAttendanceId] = useState<number | null>(null);
  const [updatingJoinRequestId, setUpdatingJoinRequestId] = useState<number | null>(null);
  const [bulkApprovingJoinRequests, setBulkApprovingJoinRequests] = useState(false);
  const [resolvingRaiseHandId, setResolvingRaiseHandId] = useState<number | null>(null);
  const [moderatingMessageId, setModeratingMessageId] = useState<number | null>(null);
  const [approvingAllQa, setApprovingAllQa] = useState(false);
  const [dismissingAllQa, setDismissingAllQa] = useState(false);
  const [qaMaxDraft, setQaMaxDraft] = useState(String(dashboard.room_state.qa_queue_max_pending));
  const [activatingPollId, setActivatingPollId] = useState<number | null>(null);
  const [activatingQuizId, setActivatingQuizId] = useState<number | null>(null);
  const [editingPollId, setEditingPollId] = useState<number | null>(null);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptionsInput, setPollOptionsInput] = useState("");
  const [savingPollAuthoring, setSavingPollAuthoring] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<number | null>(null);
  const [quizQuestion, setQuizQuestion] = useState("");
  const [quizChoicesInput, setQuizChoicesInput] = useState("");
  const [savingQuizAuthoring, setSavingQuizAuthoring] = useState(false);
  const [activePanel, setActivePanel] = useState<"session" | "students" | "engagement">("students");
  const [simpleViewEnabled, setSimpleViewEnabled] = useState(true);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);
  /** Step index inside Class setup (modal): 1..4 for broadcast, 1..3 for interactive. */
  const [classSetupWizardStep, setClassSetupWizardStep] = useState(1);
  /** Collapse delivery mode, org, etc. for a faster “new class” path. */
  const [showAdvancedSessionSetup, setShowAdvancedSessionSetup] = useState(false);
  /** True after “New room” — avoids showing the previous room’s code while drafting. */
  const [draftingNewSession, setDraftingNewSession] = useState(false);
  /** Jitsi-style: toolbar auto-hides unless pinned or “More” is open */
  const [simpleToolbarVisible, setSimpleToolbarVisible] = useState(true);
  const [simpleToolbarPinned, setSimpleToolbarPinned] = useState(false);
  const [hoveredDockControl, setHoveredDockControl] = useState<string | null>(null);
  const simpleToolbarHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showLastBreakoutSummary, setShowLastBreakoutSummary] = useState(false);
  const [grantingSpeakerRequestId, setGrantingSpeakerRequestId] = useState<number | null>(null);
  const [revokingSpeakerRequestId, setRevokingSpeakerRequestId] = useState<number | null>(null);
  const [activeSpeakerRequestId, setActiveSpeakerRequestId] = useState<number | null>(null);
  const [activeSpeakerName, setActiveSpeakerName] = useState<string | null>(null);
  const [enrollmentDrafts, setEnrollmentDrafts] = useState<Record<number, EnrollmentDraft>>({});
  const [attendanceDrafts, setAttendanceDrafts] = useState<Record<number, AttendanceDraft>>({});
  const [currentDashboard, setCurrentDashboard] = useState(dashboard);
  const [liveReactions, setLiveReactions] = useState<
    Array<{ id: number; emoji: string; name: string }>
  >([]);
  const [liveRaiseHandSignals, setLiveRaiseHandSignals] = useState<
    Array<{ id: number; name: string; reason: string }>
  >([]);
  const [whiteboardState, setWhiteboardState] = useState<WhiteboardState>(dashboard.whiteboard);
  const [mutatingRoomState, setMutatingRoomState] = useState(false);
  const [savingWhiteboard, setSavingWhiteboard] = useState(false);
  const [whiteboardSaveState, setWhiteboardSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [whiteboardLocked, setWhiteboardLocked] = useState(false);
  const [whiteboardPresentMode, setWhiteboardPresentMode] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [micEnabled, setMicEnabled] = useState(dashboard.room_state.teacher_mic_enabled);
  const [micBusy, setMicBusy] = useState(false);
  const [micInputLevel, setMicInputLevel] = useState(0);
  const [micSpeaking, setMicSpeaking] = useState(false);
  const [screenShareEnabled, setScreenShareEnabled] = useState(dashboard.room_state.screen_share_enabled);
  const [screenShareBusy, setScreenShareBusy] = useState(false);
  const [breakoutRoomCount, setBreakoutRoomCount] = useState(2);
  const [breakoutTimerMinutes, setBreakoutTimerMinutes] = useState(10);
  const [breakoutTimerNow, setBreakoutTimerNow] = useState<number | null>(null);
  const [managingBreakouts, setManagingBreakouts] = useState(false);
  const [movingBreakoutStudentId, setMovingBreakoutStudentId] = useState<number | null>(null);
  const [savingSpokespersonRoomId, setSavingSpokespersonRoomId] = useState<number | null>(null);
  const [monitoringBreakoutRoomId, setMonitoringBreakoutRoomId] = useState<number | null>(null);
  const [breakoutBroadcastDraft, setBreakoutBroadcastDraft] = useState("");
  const [sendingBreakoutBroadcast, setSendingBreakoutBroadcast] = useState(false);
  const [breakoutChatDraft, setBreakoutChatDraft] = useState("");
  const [sendingBreakoutChatRoomId, setSendingBreakoutChatRoomId] = useState<number | null>(null);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [opsMetrics, setOpsMetrics] = useState<OpsMetricsResponse | null>(null);
  const [loadingOpsMetrics, setLoadingOpsMetrics] = useState(false);
  const [opsMetricsError, setOpsMetricsError] = useState<string | null>(null);
  const [youtubeIntegration, setYoutubeIntegration] = useState<YouTubeIntegrationStatus | null>(null);
  const [youtubeIntegrationLoading, setYoutubeIntegrationLoading] = useState(false);
  const [youtubeIntegrationBusy, setYoutubeIntegrationBusy] = useState(false);
  const addNotification = useAppStore((state) => state.addNotification);
  const youtubeLinkInputRef = useRef<HTMLInputElement | null>(null);
  const expectedParticipantRange = useMemo(
    () => (deliveryMode === "broadcast" ? { min: 200, max: 5000 } : { min: 10, max: 200 }),
    [deliveryMode],
  );
  const trimmedYoutubeLink = youtubeLink.trim();
  const normalizedBroadcastPreviewUrl = useMemo(
    () => normalizeYouTubeEmbedUrl(trimmedYoutubeLink),
    [trimmedYoutubeLink],
  );
  const hasBroadcastLink = trimmedYoutubeLink.length > 0;
  const broadcastLinkLooksValid =
    !hasBroadcastLink ||
    normalizedBroadcastPreviewUrl.includes("youtube.com/embed/") ||
    normalizedBroadcastPreviewUrl.includes("youtube-nocookie.com/embed/");
  const [broadcastHealthState, setBroadcastHealthState] = useState<
    "needs_link" | "checking" | "reachable" | "unverified" | "invalid"
  >("needs_link");
  const [broadcastHealthCheckedAt, setBroadcastHealthCheckedAt] = useState<number | null>(null);
  const goLiveReadiness = useMemo(() => {
    const oauthReady = Boolean(youtubeIntegration?.connected);
    const linkReady = hasBroadcastLink && broadcastLinkLooksValid;
    const streamLive = youtubeIntegration?.stream_status === "live";
    const streamScheduled = youtubeIntegration?.stream_status === "scheduled";
    const checks = [
      {
        id: "oauth",
        label: "YouTube connected",
        ok: oauthReady,
      },
      {
        id: "link",
        label: "YouTube link added",
        ok: linkReady,
      },
      {
        id: "stream",
        label: "Stream status confirmed",
        ok: streamLive || streamScheduled,
      },
    ];
    const score = checks.filter((check) => check.ok).length;
    const level = score === 3 ? "ready" : score === 2 ? "almost" : "not_ready";
    const message =
      level === "ready"
        ? "Ready to go live."
        : level === "almost"
          ? "Almost ready. Complete one more item."
          : "Not ready yet. Complete setup steps below.";
    return { checks, score, level, message };
  }, [youtubeIntegration?.connected, youtubeIntegration?.stream_status, hasBroadcastLink, broadcastLinkLooksValid]);

  const classSetupWizardStepCount = 1;
  const classSetupWizardSteps = useMemo(
    () => [{ step: 1, label: "Quick class setup", hint: "Basics and create" }],
    [],
  );

  const programsForSelectedOrg = useMemo(
    () => programs.filter((p) => p.organization_id === sessionOrgId),
    [programs, sessionOrgId],
  );

  useEffect(() => {
    if (organizations.length) {
      setSessionOrgId((prev) => prev ?? organizations[0].id);
    }
  }, [organizations]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await getTeacherPrograms();
        if (active) {
          setPrograms(data);
        }
      } catch {
        if (active) {
          setPrograms([]);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedSessionId) {
      setSessionResources([]);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const data = await getSessionResources(selectedSessionId);
        if (active) {
          setSessionResources(data);
        }
      } catch {
        if (active) {
          setSessionResources([]);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedSessionId]);

  useEffect(() => {
    if (!sessionOrgId) {
      setOrgMembers([]);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const data = await getOrganizationMembers(sessionOrgId);
        if (active) {
          setOrgMembers(data);
        }
      } catch {
        if (active) {
          setOrgMembers([]);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [sessionOrgId]);

  useEffect(() => {
    if (deliveryMode !== "broadcast") {
      return;
    }
    let active = true;
    const refreshIntegrationStatus = async () => {
      if (active) {
        setYoutubeIntegrationLoading(true);
      }
      try {
        const status = await getTeacherYouTubeIntegrationStatus(trimmedYoutubeLink);
        if (!active) {
          return;
        }
        setYoutubeIntegration(status);
      } catch {
        if (active) {
          setYoutubeIntegration(null);
        }
      } finally {
        if (active) {
          setYoutubeIntegrationLoading(false);
        }
      }
    };
    void refreshIntegrationStatus();
    const intervalId = window.setInterval(() => {
      void refreshIntegrationStatus();
    }, 30000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [deliveryMode, trimmedYoutubeLink]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const url = new URL(window.location.href);
    const oauthStatus = url.searchParams.get("youtube_oauth");
    if (!oauthStatus) {
      return;
    }
    if (oauthStatus === "connected") {
      addNotification({
        id: `youtube-oauth-success-${Date.now()}`,
        title: "YouTube connected",
        message: "OAuth completed. Your account is now linked.",
        tone: "success",
      });
      void getTeacherYouTubeIntegrationStatus(trimmedYoutubeLink)
        .then((status) => setYoutubeIntegration(status))
        .catch(() => undefined);
    } else {
      addNotification({
        id: `youtube-oauth-failed-${Date.now()}`,
        title: "YouTube connection incomplete",
        message: "OAuth did not complete. Please try connecting again.",
        tone: "warning",
      });
    }
    url.searchParams.delete("youtube_oauth");
    window.history.replaceState({}, "", url.toString());
  }, [addNotification, trimmedYoutubeLink]);

  useEffect(() => {
    if (deliveryMode !== "broadcast") {
      setBroadcastHealthState("needs_link");
      setBroadcastHealthCheckedAt(null);
      return;
    }
    if (!hasBroadcastLink) {
      setBroadcastHealthState("needs_link");
      setBroadcastHealthCheckedAt(null);
      return;
    }
    if (!broadcastLinkLooksValid) {
      setBroadcastHealthState("invalid");
      setBroadcastHealthCheckedAt(Date.now());
      return;
    }

    let cancelled = false;
    const checkBroadcastLinkHealth = async () => {
      setBroadcastHealthState("checking");
      try {
        const response = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(trimmedYoutubeLink)}&format=json`,
          { method: "GET" },
        );
        if (cancelled) {
          return;
        }
        setBroadcastHealthState(response.ok ? "reachable" : "unverified");
      } catch {
        if (cancelled) {
          return;
        }
        setBroadcastHealthState("unverified");
      } finally {
        if (!cancelled) {
          setBroadcastHealthCheckedAt(Date.now());
        }
      }
    };

    void checkBroadcastLinkHealth();
    const interval = window.setInterval(() => {
      void checkBroadcastLinkHealth();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [deliveryMode, hasBroadcastLink, broadcastLinkLooksValid, trimmedYoutubeLink]);

  useEffect(() => {
    if (!showRightPanel) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowRightPanel(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showRightPanel]);

  useEffect(() => {
    setClassSetupWizardStep((step) => Math.min(step, classSetupWizardStepCount));
  }, [classSetupWizardStepCount]);

  const prevShowRightPanelRef = useRef(false);
  useEffect(() => {
    if (showRightPanel && !prevShowRightPanelRef.current && !editingSessionId) {
      setClassSetupWizardStep(1);
    }
    prevShowRightPanelRef.current = showRightPanel;
  }, [showRightPanel, editingSessionId]);

  const clampExpectedParticipants = useCallback(
    (value: number, mode: "interactive" | "broadcast") => {
      const range = mode === "broadcast" ? { min: 200, max: 5000 } : { min: 10, max: 200 };
      if (!Number.isFinite(value)) {
        return range.min;
      }
      return Math.min(range.max, Math.max(range.min, Math.round(value)));
    },
    [],
  );
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingSourceRef = useRef<"camera" | "screen" | null>(null);
  const breakoutWarningShownForRef = useRef<string | null>(null);
  const previousBreakoutEnabledRef = useRef(dashboard.room_state.breakout_enabled);
  const cameraPeerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const micPeerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const screenPeerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const speakRequestUsernamesRef = useRef<Map<number, string>>(new Map());
  const activeSpeakerUsernameRef = useRef<string | null>(null);
  const activeSpeakerNameRef = useRef<string | null>(null);
  const speakerPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const speakerAudioRef = useRef<HTMLAudioElement | null>(null);
  const micAudioContextRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micMonitorRafRef = useRef<number | null>(null);
  const whiteboardAutosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuedWhiteboardRef = useRef<WhiteboardState | null>(null);
  const failedWhiteboardRef = useRef<WhiteboardState | null>(null);
  const whiteboardSaveInFlightRef = useRef(false);
  const closeSpeakerPeerConnection = () => {
    const peerConnection = speakerPeerConnectionRef.current;
    if (peerConnection) {
      peerConnection.ontrack = null;
      peerConnection.onicecandidate = null;
      peerConnection.onconnectionstatechange = null;
      peerConnection.close();
    }
    speakerPeerConnectionRef.current = null;
    const audioElement = speakerAudioRef.current;
    if (audioElement) {
      audioElement.srcObject = null;
    }
  };
  const theme = useAppStore((state) => state.theme);
  const isLightTheme = theme === "light";
  const hasPendingSessionMutation =
    saving ||
    loadingSessionDetail ||
    mutatingEnrollment ||
    savingEnrollmentId !== null ||
    savingAttendanceId !== null ||
    updatingJoinRequestId !== null ||
    resolvingRaiseHandId !== null ||
    moderatingMessageId !== null ||
    activatingPollId !== null ||
    activatingQuizId !== null ||
    managingBreakouts ||
    movingBreakoutStudentId !== null ||
    savingSpokespersonRoomId !== null ||
    monitoringBreakoutRoomId !== null ||
    sendingBreakoutBroadcast ||
    sendingBreakoutChatRoomId !== null ||
    mutatingRoomState ||
    exportingEnrollments ||
    recordingBusy ||
    savingWhiteboard ||
    savingPollAuthoring ||
    savingQuizAuthoring;

  const stopMicActivityMonitor = useCallback(() => {
    if (micMonitorRafRef.current !== null) {
      window.cancelAnimationFrame(micMonitorRafRef.current);
      micMonitorRafRef.current = null;
    }
    micAnalyserRef.current?.disconnect();
    micAnalyserRef.current = null;
    if (micAudioContextRef.current) {
      void micAudioContextRef.current.close();
      micAudioContextRef.current = null;
    }
    setMicInputLevel(0);
    setMicSpeaking(false);
  }, []);

  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? null;
  const showAdvancedSessionFields = editingSessionId !== null || showAdvancedSessionSetup;
  /** One field + one button until teacher opens “More settings”. */
  const simpleClassSetup = !editingSessionId && !showAdvancedSessionSetup;
  /** Hide floating meeting dock, PiP camera, and advanced toolbar while configuring a class. */
  const hideMeetingControlsForSetup =
    activePanel === "session" || draftingNewSession || (!selectedSessionId && sessions.length === 0);
  const broadcastOnlyClassroom = selectedSession?.delivery_mode === "broadcast";
  const realtimeStatus = useClassroomRealtime<TeacherRealtimeSnapshot>({
    roomCode: selectedSession?.room_code ?? null,
    username: currentUsername,
    role: "teacher",
    accessToken,
    enabled: Boolean(selectedSession),
    onMessage: (message) => {
      setCurrentDashboard(message.dashboard);
      setEnrollments(message.enrollments);
      setSessions((current) =>
        current.map((session) => (session.id === message.session.id ? message.session : session)),
      );
    },
  });
  const { sendMessage: sendSignalMessage } = useClassroomSignaling({
    roomCode: selectedSession?.room_code ?? null,
    username: currentUsername,
    role: "teacher",
    accessToken,
    enabled: Boolean(selectedSession) && !broadcastOnlyClassroom,
    onMessage: (message: ClassroomSignalMessage) => {
      if (message.source_role !== "student") {
        return;
      }

      if (message.payload.kind === "reaction") {
        const { emoji } = message.payload;
        const reactionId = Date.now() + Math.random();
        setLiveReactions((current) => [
          ...current,
          {
            id: reactionId,
            emoji,
            name: resolveParticipantName(message.source_username),
          },
        ]);
        window.setTimeout(() => {
          setLiveReactions((current) => current.filter((item) => item.id !== reactionId));
        }, 2500);
        return;
      }

      if (message.payload.kind === "raise_hand") {
        const { request_id, reason } = message.payload;
        const signalId = request_id ?? Date.now();
        const name = resolveParticipantName(message.source_username);
        if (request_id) {
          speakRequestUsernamesRef.current.set(request_id, message.source_username);
        }
        setLiveRaiseHandSignals((current) => {
          const next = [
            {
              id: signalId,
              name,
              reason,
            },
            ...current.filter((item) => item.id !== signalId),
          ];
          return next.slice(0, 4);
        });
        setActivePanel("engagement");
        addNotification({
          id: `raise-hand-live-${signalId}`,
          title: `${name} raised a hand`,
          message: reason,
          tone: "info",
        });
        return;
      }

      if (message.payload.kind === "speaker_offer") {
        const speakerOfferPayload = message.payload;
        if (message.source_username !== activeSpeakerUsernameRef.current) {
          return;
        }

        closeSpeakerPeerConnection();
        const peerConnection = new RTCPeerConnection({
          iceServers: getIceServers(),
        });
        speakerPeerConnectionRef.current = peerConnection;

        peerConnection.ontrack = (event) => {
          const [stream] = event.streams;
          if (!stream || !speakerAudioRef.current) {
            return;
          }
          speakerAudioRef.current.srcObject = stream;
          void speakerAudioRef.current.play().catch(() => undefined);
        };

        peerConnection.onicecandidate = (event) => {
          if (!event.candidate || !activeSpeakerUsernameRef.current) {
            return;
          }
          sendSignalMessage({
            type: "signal",
            target_role: "student",
            target_username: activeSpeakerUsernameRef.current,
            payload: {
              kind: "speaker_ice_candidate",
              candidate: event.candidate.toJSON(),
            },
          });
        };

        peerConnection.onconnectionstatechange = () => {
          if (["closed", "disconnected", "failed"].includes(peerConnection.connectionState)) {
            closeSpeakerPeerConnection();
            activeSpeakerUsernameRef.current = null;
            activeSpeakerNameRef.current = null;
            setActiveSpeakerRequestId(null);
            setActiveSpeakerName(null);
          }
        };

        void (async () => {
          try {
            await peerConnection.setRemoteDescription(speakerOfferPayload.description);
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            if (!activeSpeakerUsernameRef.current) {
              return;
            }
            sendSignalMessage({
              type: "signal",
              target_role: "student",
              target_username: activeSpeakerUsernameRef.current,
              payload: {
                kind: "speaker_answer",
                description: answer,
              },
            });
          } catch {
            closeSpeakerPeerConnection();
          }
        })();
        return;
      }

      if (message.payload.kind === "speaker_ice_candidate") {
        if (message.source_username !== activeSpeakerUsernameRef.current) {
          return;
        }
        const peerConnection = speakerPeerConnectionRef.current;
        if (!peerConnection) {
          return;
        }
        void peerConnection.addIceCandidate(message.payload.candidate).catch(() => undefined);
        return;
      }

      if (message.payload.kind === "viewer_ready") {
        if (message.payload.media === "screen") {
          void publishScreenShareToStudent(message.source_username);
        } else if (message.payload.media === "audio") {
          void publishMicrophoneToStudent(message.source_username);
        } else {
          void publishCameraToStudent(message.source_username);
        }
        return;
      }

      if (message.payload.kind === "viewer_left") {
        if (message.payload.media === "screen") {
          closeScreenSharePeer(message.source_username);
        } else if (message.payload.media === "audio") {
          closeMicPeer(message.source_username);
        } else {
          closeCameraPeer(message.source_username);
        }
        return;
      }

      if (message.payload.kind === "answer") {
        const { media, description } = message.payload;
        const peerConnection =
          media === "screen"
            ? screenPeerConnectionsRef.current.get(message.source_username)
            : media === "audio"
              ? micPeerConnectionsRef.current.get(message.source_username)
              : cameraPeerConnectionsRef.current.get(message.source_username);
        if (!peerConnection) {
          return;
        }

        void peerConnection.setRemoteDescription(description).catch(() => {
          if (media === "screen") {
            closeScreenSharePeer(message.source_username);
          } else if (media === "audio") {
            closeMicPeer(message.source_username);
          } else {
            closeCameraPeer(message.source_username);
          }
        });
        return;
      }

      if (message.payload.kind === "ice_candidate") {
        const { media, candidate } = message.payload;
        const peerConnection =
          media === "screen"
            ? screenPeerConnectionsRef.current.get(message.source_username)
            : media === "audio"
              ? micPeerConnectionsRef.current.get(message.source_username)
              : cameraPeerConnectionsRef.current.get(message.source_username);
        if (!peerConnection) {
          return;
        }

        void peerConnection.addIceCandidate(candidate).catch(() => undefined);
      }
    },
  });
  const syncBadgeLabel =
    !isHydrated
      ? "Live sync"
      : realtimeStatus === "connected"
      ? "Realtime sync on"
      : realtimeStatus === "connecting"
        ? "Connecting live sync"
        : "Live sync reconnecting";

  useEffect(() => {
    setIsHydrated(true);
  }, []);
  const enrolledStudentIds = useMemo(
    () => new Set(enrollments.map((enrollment) => enrollment.student_id)),
    [enrollments],
  );
  const studentStreamOptions = useMemo(() => {
    const values = new Set<string>();
    students.forEach((student) => {
      const stream = student.school_class?.trim();
      if (stream) {
        values.add(stream);
      }
    });
    enrollments.forEach((enrollment) => {
      const stream = enrollment.school_class?.trim();
      if (stream) {
        values.add(stream);
      }
    });
    currentDashboard.waiting_room_queue.forEach((entry) => {
      const stream = entry.school_class?.trim();
      if (stream) {
        values.add(stream);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [students, enrollments, currentDashboard.waiting_room_queue]);
  const sortedEnrollments = useMemo(
    () =>
      [...enrollments]
        .filter((enrollment) =>
          studentStreamFilter === "all" ? true : enrollment.school_class === studentStreamFilter,
        )
        .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [enrollments, studentStreamFilter],
  );
  const availableStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          !enrolledStudentIds.has(student.id) &&
          (studentStreamFilter === "all" ? true : student.school_class === studentStreamFilter),
      ),
    [students, enrolledStudentIds, studentStreamFilter],
  );
  const filteredWaitingRoomQueue = useMemo(
    () =>
      currentDashboard.waiting_room_queue.filter((entry) =>
        studentStreamFilter === "all" ? true : entry.school_class === studentStreamFilter,
      ),
    [currentDashboard.waiting_room_queue, studentStreamFilter],
  );
  const resolveParticipantName = useCallback(
    (username: string) =>
      enrollments.find((entry) => entry.username === username)?.full_name ??
      students.find((entry) => entry.username === username)?.full_name ??
      username,
    [enrollments, students],
  );

  const closeScreenSharePeer = useCallback((studentUsername: string) => {
    const peerConnection = screenPeerConnectionsRef.current.get(studentUsername);
    if (!peerConnection) {
      return;
    }

    peerConnection.onicecandidate = null;
    peerConnection.onconnectionstatechange = null;
    peerConnection.close();
    screenPeerConnectionsRef.current.delete(studentUsername);
  }, []);

  const closeCameraPeer = useCallback((studentUsername: string) => {
    const peerConnection = cameraPeerConnectionsRef.current.get(studentUsername);
    if (!peerConnection) {
      return;
    }

    peerConnection.onicecandidate = null;
    peerConnection.onconnectionstatechange = null;
    peerConnection.close();
    cameraPeerConnectionsRef.current.delete(studentUsername);
  }, []);

  const closeMicPeer = useCallback((studentUsername: string) => {
    const peerConnection = micPeerConnectionsRef.current.get(studentUsername);
    if (!peerConnection) {
      return;
    }

    peerConnection.onicecandidate = null;
    peerConnection.onconnectionstatechange = null;
    peerConnection.close();
    micPeerConnectionsRef.current.delete(studentUsername);
  }, []);

  const closeAllScreenSharePeers = useCallback(() => {
    const connectedStudents = Array.from(screenPeerConnectionsRef.current.keys());
    connectedStudents.forEach((studentUsername) => {
      closeScreenSharePeer(studentUsername);
    });
  }, [closeScreenSharePeer]);

  const closeAllCameraPeers = useCallback(() => {
    const connectedStudents = Array.from(cameraPeerConnectionsRef.current.keys());
    connectedStudents.forEach((studentUsername) => {
      closeCameraPeer(studentUsername);
    });
  }, [closeCameraPeer]);

  const closeAllMicPeers = useCallback(() => {
    const connectedStudents = Array.from(micPeerConnectionsRef.current.keys());
    connectedStudents.forEach((studentUsername) => {
      closeMicPeer(studentUsername);
    });
  }, [closeMicPeer]);

  const publishScreenShareToStudent = useCallback(
    async (studentUsername: string) => {
      if (!screenStreamRef.current || !screenShareEnabled) {
        return;
      }

      closeScreenSharePeer(studentUsername);

      const peerConnection = new RTCPeerConnection({
        iceServers: getIceServers(),
      });
      screenPeerConnectionsRef.current.set(studentUsername, peerConnection);

      screenStreamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, screenStreamRef.current as MediaStream);
      });

      peerConnection.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }

        sendSignalMessage({
          type: "signal",
          target_role: "student",
          target_username: studentUsername,
          payload: {
            kind: "ice_candidate",
            media: "screen",
            candidate: event.candidate.toJSON(),
          },
        });
      };

      peerConnection.onconnectionstatechange = () => {
        if (["closed", "disconnected", "failed"].includes(peerConnection.connectionState)) {
          closeScreenSharePeer(studentUsername);
        }
      };

      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        sendSignalMessage({
          type: "signal",
          target_role: "student",
          target_username: studentUsername,
          payload: {
            kind: "offer",
            media: "screen",
            description: offer,
          },
        });
      } catch {
        closeScreenSharePeer(studentUsername);
      }
    },
    [closeScreenSharePeer, screenShareEnabled, sendSignalMessage],
  );

  const publishMicrophoneToStudent = useCallback(
    async (studentUsername: string) => {
      if (!micStreamRef.current || !micEnabled) {
        return;
      }

      closeMicPeer(studentUsername);

      const peerConnection = new RTCPeerConnection({
        iceServers: getIceServers(),
      });
      micPeerConnectionsRef.current.set(studentUsername, peerConnection);

      micStreamRef.current.getAudioTracks().forEach((track) => {
        peerConnection.addTrack(track, micStreamRef.current as MediaStream);
      });

      peerConnection.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }

        sendSignalMessage({
          type: "signal",
          target_role: "student",
          target_username: studentUsername,
          payload: {
            kind: "ice_candidate",
            media: "audio",
            candidate: event.candidate.toJSON(),
          },
        });
      };

      peerConnection.onconnectionstatechange = () => {
        if (["closed", "disconnected", "failed"].includes(peerConnection.connectionState)) {
          closeMicPeer(studentUsername);
        }
      };

      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        sendSignalMessage({
          type: "signal",
          target_role: "student",
          target_username: studentUsername,
          payload: {
            kind: "offer",
            media: "audio",
            description: offer,
          },
        });
      } catch {
        closeMicPeer(studentUsername);
      }
    },
    [closeMicPeer, micEnabled, sendSignalMessage],
  );

  const publishCameraToStudent = useCallback(
    async (studentUsername: string) => {
      if (!cameraStreamRef.current || !cameraEnabled) {
        return;
      }

      closeCameraPeer(studentUsername);

      const peerConnection = new RTCPeerConnection({
        iceServers: getIceServers(),
      });
      cameraPeerConnectionsRef.current.set(studentUsername, peerConnection);

      cameraStreamRef.current.getVideoTracks().forEach((track) => {
        peerConnection.addTrack(track, cameraStreamRef.current as MediaStream);
      });

      peerConnection.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }

        sendSignalMessage({
          type: "signal",
          target_role: "student",
          target_username: studentUsername,
          payload: {
            kind: "ice_candidate",
            media: "camera",
            candidate: event.candidate.toJSON(),
          },
        });
      };

      peerConnection.onconnectionstatechange = () => {
        if (["closed", "disconnected", "failed"].includes(peerConnection.connectionState)) {
          closeCameraPeer(studentUsername);
        }
      };

      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        sendSignalMessage({
          type: "signal",
          target_role: "student",
          target_username: studentUsername,
          payload: {
            kind: "offer",
            media: "camera",
            description: offer,
          },
        });
      } catch {
        closeCameraPeer(studentUsername);
      }
    },
    [cameraEnabled, closeCameraPeer, sendSignalMessage],
  );

  const updateSessionEnrollmentCount = (sessionId: number, updater: (current: number) => number) => {
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              enrolled_students: Math.max(0, updater(session.enrolled_students)),
            }
          : session,
      ),
    );
  };

  const refreshSelectedSession = async (sessionId: number) => {
    const detail = await getTeacherSessionDetail(sessionId);
    setCurrentDashboard(detail.dashboard);
    setSessions((current) =>
      current.map((session) => (session.id === sessionId ? detail.session : session)),
    );
  };

  const splitEditorLines = (value: string) =>
    value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

  const getRecordableStream = useCallback(() => {
    if (screenShareEnabled && screenStreamRef.current) {
      return {
        source: "screen" as const,
        stream: screenStreamRef.current,
      };
    }
    if (cameraEnabled && cameraStreamRef.current) {
      return {
        source: "camera" as const,
        stream: cameraStreamRef.current,
      };
    }
    return null;
  }, [cameraEnabled, screenShareEnabled]);

  const syncRecordingStatus = useCallback(
    async (nextStatus: "idle" | "recording" | "paused") => {
      if (!selectedSessionId) {
        return;
      }
      const response = await updateTeacherRoomState(selectedSessionId, {
        recording_status: nextStatus,
      });
      setCurrentDashboard((state) => ({
        ...state,
        room_state: response.room_state,
      }));
    },
    [selectedSessionId],
  );

  const downloadRecording = useCallback(() => {
    if (!recordingChunksRef.current.length) {
      return;
    }
    const blob = new Blob(recordingChunksRef.current, { type: "video/webm" });
    recordingChunksRef.current = [];
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeTitle = (selectedSession?.title ?? "elimuapwa-classroom").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    anchor.href = downloadUrl;
    anchor.download = `${safeTitle}-${Date.now()}.webm`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }, [selectedSession?.title]);

  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  useEffect(() => {
    if (!cameraVideoRef.current) {
      return;
    }

    cameraVideoRef.current.srcObject = cameraStreamRef.current;
  }, [cameraEnabled]);

  useEffect(() => {
    if (!screenVideoRef.current) {
      return;
    }

    screenVideoRef.current.srcObject = screenStreamRef.current;
  }, [screenShareEnabled]);

  useEffect(() => {
    if (!micEnabled || !micStreamRef.current) {
      stopMicActivityMonitor();
      return;
    }

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.82;

    const source = audioContext.createMediaStreamSource(micStreamRef.current);
    source.connect(analyser);

    micAudioContextRef.current = audioContext;
    micAnalyserRef.current = analyser;

    const buffer = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(buffer);

      let sumSquares = 0;
      for (let index = 0; index < buffer.length; index += 1) {
        const centered = (buffer[index] - 128) / 128;
        sumSquares += centered * centered;
      }

      const rms = Math.sqrt(sumSquares / buffer.length);
      const normalized = Math.min(1, rms * 6);
      setMicInputLevel(normalized);
      setMicSpeaking(normalized > 0.08);
      micMonitorRafRef.current = window.requestAnimationFrame(tick);
    };

    micMonitorRafRef.current = window.requestAnimationFrame(tick);

    return () => {
      source.disconnect();
      stopMicActivityMonitor();
    };
  }, [micEnabled, stopMicActivityMonitor]);

  useEffect(() => {
    return () => {
      if (whiteboardAutosaveTimerRef.current) {
        clearTimeout(whiteboardAutosaveTimerRef.current);
        whiteboardAutosaveTimerRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
      recordingChunksRef.current = [];
      recordingSourceRef.current = null;
      closeAllCameraPeers();
      closeAllMicPeers();
      closeAllScreenSharePeers();
      const speakerPeerConnection = speakerPeerConnectionRef.current;
      if (speakerPeerConnection) {
        speakerPeerConnection.ontrack = null;
        speakerPeerConnection.onicecandidate = null;
        speakerPeerConnection.onconnectionstatechange = null;
        speakerPeerConnection.close();
      }
      speakerPeerConnectionRef.current = null;
      stopMicActivityMonitor();
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    };
  }, [closeAllCameraPeers, closeAllMicPeers, closeAllScreenSharePeers, stopMicActivityMonitor]);

  useEffect(() => {
    if (currentDashboard.room_state.recording_status === "idle") {
      return;
    }
    if (recordingSourceRef.current === "screen" && screenShareEnabled) {
      return;
    }
    if (recordingSourceRef.current === "camera" && cameraEnabled) {
      return;
    }
    if (!recordingSourceRef.current) {
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    recordingSourceRef.current = null;
    recordingChunksRef.current = [];
    void syncRecordingStatus("idle");
    addNotification({
      id: `recording-source-ended-${Date.now()}`,
      title: "Recording stopped",
      message: "The recording source ended, so recording was stopped automatically.",
      tone: "info",
    });
  }, [
    addNotification,
    cameraEnabled,
    currentDashboard.room_state.recording_status,
    screenShareEnabled,
    syncRecordingStatus,
  ]);

  useEffect(() => {
    if (!currentDashboard.room_state.breakout_timer_ends_at) {
      breakoutWarningShownForRef.current = null;
      return;
    }

    setBreakoutTimerNow(Date.now());
    const timerId = window.setInterval(() => {
      setBreakoutTimerNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [currentDashboard.room_state.breakout_timer_ends_at]);

  useEffect(() => {
    const endsAt = currentDashboard.room_state.breakout_timer_ends_at;
    const remainingMs = endsAt && breakoutTimerNow !== null ? new Date(endsAt).getTime() - breakoutTimerNow : null;
    const warningActive = remainingMs !== null && Number.isFinite(remainingMs) && remainingMs > 0 && remainingMs <= 60000;
    if (!currentDashboard.room_state.breakout_enabled || !endsAt || !warningActive) {
      return;
    }

    if (breakoutWarningShownForRef.current === endsAt) {
      return;
    }

    breakoutWarningShownForRef.current = endsAt;
    addNotification({
      id: `breakout-warning-${endsAt}`,
      title: "1 minute left in breakouts",
      message: "Ask groups to wrap up now. Breakout rooms will close automatically when the timer ends.",
      tone: "info",
    });
  }, [
    addNotification,
    breakoutTimerNow,
    currentDashboard.room_state.breakout_enabled,
    currentDashboard.room_state.breakout_timer_ends_at,
  ]);

  useEffect(() => {
    if (!selectedSessionId) {
      setCurrentDashboard(dashboard);
    }
  }, [dashboard, selectedSessionId]);

  useEffect(() => {
    setShowLastBreakoutSummary(false);
  }, [selectedSessionId]);

  useEffect(() => {
    const wasBreakoutEnabled = previousBreakoutEnabledRef.current;
    const isBreakoutEnabled = currentDashboard.room_state.breakout_enabled;
    if (wasBreakoutEnabled && !isBreakoutEnabled && currentDashboard.last_breakout_summary) {
      setShowLastBreakoutSummary(true);
    }
    previousBreakoutEnabledRef.current = isBreakoutEnabled;
  }, [currentDashboard.last_breakout_summary, currentDashboard.room_state.breakout_enabled]);

  useEffect(() => {
    if (!currentDashboard.last_breakout_summary) {
      setShowLastBreakoutSummary(false);
    }
  }, [currentDashboard.last_breakout_summary]);

  useEffect(() => {
    setWhiteboardState(currentDashboard.whiteboard);
  }, [currentDashboard.whiteboard]);

  useEffect(() => {
    queuedWhiteboardRef.current = null;
    failedWhiteboardRef.current = null;
    whiteboardSaveInFlightRef.current = false;
    if (whiteboardAutosaveTimerRef.current) {
      clearTimeout(whiteboardAutosaveTimerRef.current);
      whiteboardAutosaveTimerRef.current = null;
    }
    setWhiteboardSaveState("idle");
  }, [selectedSessionId]);

  useEffect(() => {
    setMicEnabled(currentDashboard.room_state.teacher_mic_enabled);
  }, [currentDashboard.room_state.teacher_mic_enabled]);

  useEffect(() => {
    setScreenShareEnabled(currentDashboard.room_state.screen_share_enabled);
  }, [currentDashboard.room_state.screen_share_enabled]);

  useEffect(() => {
    if (screenShareEnabled) {
      return;
    }

    closeAllScreenSharePeers();
  }, [closeAllScreenSharePeers, screenShareEnabled]);

  useEffect(() => {
    if (cameraEnabled) {
      return;
    }

    closeAllCameraPeers();
  }, [cameraEnabled, closeAllCameraPeers]);

  useEffect(() => {
    if (!currentDashboard.raise_hand_queue.length) {
      setLiveRaiseHandSignals([]);
      return;
    }

    const openIds = new Set(currentDashboard.raise_hand_queue.map((entry) => entry.id));
    setLiveRaiseHandSignals((current) => current.filter((entry) => openIds.has(entry.id)));
  }, [currentDashboard.raise_hand_queue]);

  useEffect(() => {
    if (micEnabled) {
      return;
    }

    closeAllMicPeers();
  }, [closeAllMicPeers, micEnabled]);

  useEffect(() => {
    let active = true;

    const loadStudents = async () => {
      setLoadingStudents(true);
      try {
        const response = await getTeacherStudents();
        if (active) {
          setStudents(response);
        }
      } catch {
        if (active) {
          addNotification({
            id: `students-load-${Date.now()}`,
            title: "Student directory unavailable",
            message: "We could not load the student roster right now.",
            tone: "warning",
          });
        }
      } finally {
        if (active) {
          setLoadingStudents(false);
        }
      }
    };

    void loadStudents();

    return () => {
      active = false;
    };
  }, [addNotification]);

  useEffect(() => {
    let active = true;

    const loadSessionDetail = async () => {
      if (!selectedSessionId) {
        setCurrentDashboard(dashboard);
        return;
      }

      setLoadingSessionDetail(true);
      try {
        const response = await getTeacherSessionDetail(selectedSessionId);
        if (active) {
          setCurrentDashboard(response.dashboard);
          setSessions((current) =>
            current.map((session) => (session.id === selectedSessionId ? response.session : session)),
          );
        }
      } catch {
        if (active) {
          addNotification({
            id: `session-detail-load-${Date.now()}`,
            title: "Session insights unavailable",
            message: "We could not refresh the selected session details right now.",
            tone: "warning",
          });
        }
      } finally {
        if (active) {
          setLoadingSessionDetail(false);
        }
      }
    };

    void loadSessionDetail();

    return () => {
      active = false;
    };
  }, [addNotification, dashboard, selectedSessionId]);

  useEffect(() => {
    let active = true;

    const loadEnrollments = async () => {
      if (!selectedSessionId) {
        setEnrollments([]);
        return;
      }

      setLoadingEnrollments(true);
      try {
        const response = await getSessionEnrollments(selectedSessionId);
        if (active) {
          setEnrollments(response);
        }
      } catch {
        if (active) {
          addNotification({
            id: `enrollment-load-${Date.now()}`,
            title: "Roster unavailable",
            message: "Session enrollments could not be loaded right now.",
            tone: "warning",
          });
        }
      } finally {
        if (active) {
          setLoadingEnrollments(false);
        }
      }
    };

    void loadEnrollments();

    return () => {
      active = false;
    };
  }, [addNotification, selectedSessionId]);

  useEffect(() => {
    if (!availableStudents.length) {
      setSelectedStudentId(null);
      return;
    }

    setSelectedStudentId((current) =>
      current && availableStudents.some((student) => student.id === current) ? current : availableStudents[0].id,
    );
  }, [availableStudents]);

  useEffect(() => {
    setEnrollmentDrafts(
      Object.fromEntries(
        enrollments.map((enrollment) => [
          enrollment.student_id,
          {
            access_status: enrollment.access_status,
            progress: enrollment.progress,
          },
        ]),
      ),
    );
  }, [enrollments]);

  useEffect(() => {
    setAttendanceDrafts(
      Object.fromEntries(
        currentDashboard.attendance.map((row) => [
          row.student_id,
          {
            status: row.status,
          },
        ]),
      ),
    );
  }, [currentDashboard.attendance]);

  useEffect(() => {
    setEditingPollId(null);
    setPollQuestion("");
    setPollOptionsInput("");
    setEditingQuizId(null);
    setQuizQuestion("");
    setQuizChoicesInput("");
    setShowRosterTools(false);
  }, [selectedSessionId]);

  useEffect(() => {
    setQaMaxDraft(String(currentDashboard.room_state.qa_queue_max_pending));
  }, [currentDashboard.room_state.qa_queue_max_pending]);

  usePollingRefresh(
    async () => {
      if (!selectedSessionId || hasPendingSessionMutation) {
        return;
      }

      try {
        const [detail, roster] = await Promise.all([
          getTeacherSessionDetail(selectedSessionId),
          getSessionEnrollments(selectedSessionId),
        ]);

        setCurrentDashboard(detail.dashboard);
        setSessions((current) =>
          current.map((session) => (session.id === selectedSessionId ? detail.session : session)),
        );
        setEnrollments(roster);
      } catch {
        // Keep the current session snapshot if background refresh fails.
      }
    },
    15000,
    Boolean(selectedSessionId) && realtimeStatus !== "connected",
    5000,
  );

  const handlePublish = async () => {
    if (!editingSessionId && !title.trim()) {
      addNotification({
        id: `session-title-${Date.now()}`,
        title: "Name your class",
        message: "Enter a title before creating the room.",
        tone: "warning",
      });
      return;
    }

    setClassSaveMessage(null);
    setSaving(true);
    const normalizedExpectedParticipants = clampExpectedParticipants(expectedParticipants, deliveryMode);
    setExpectedParticipants(normalizedExpectedParticipants);
    const trimmedYoutube = youtubeLink.trim();

    try {
      if (editingSessionId) {
        const response = await updateTeacherSession(editingSessionId, {
          title,
          youtube_link: trimmedYoutube,
          starts_at: startsAt,
          description,
          delivery_mode: deliveryMode,
          expected_participants: normalizedExpectedParticipants,
          organization_id: sessionOrgId ?? undefined,
          open_enrollment: openEnrollment,
          program_id: sessionProgramId,
        });

        setSessions((current) =>
          current.map((session) => (session.id === editingSessionId ? response.session : session)),
        );
        addNotification({
          id: `session-update-${Date.now()}`,
          title: "Session updated",
          message: `${response.session.title} was updated successfully.`,
          tone: "success",
        });
        setClassSaveMessage(`Saved successfully: ${response.session.title}.`);
        if (selectedSessionId === editingSessionId) {
          try {
            const detail = await getTeacherSessionDetail(editingSessionId);
            setCurrentDashboard(detail.dashboard);
          } catch {
            // Keep the successful update state even if the insight refresh misses.
          }
        }
      } else {
        const response = await createSession({
          title: title.trim(),
          youtube_link: trimmedYoutube,
          starts_at: startsAt,
          description,
          delivery_mode: deliveryMode,
          expected_participants: normalizedExpectedParticipants,
          organization_id: sessionOrgId ?? undefined,
          open_enrollment: openEnrollment,
          program_id: sessionProgramId ?? undefined,
        });

        setSessions((current) => [response.session, ...current]);
        setSelectedSessionId((current) => current ?? response.session.id);
        setShowAdvancedSessionSetup(false);
        setDraftingNewSession(false);
        addNotification({
          id: `session-${Date.now()}`,
          title: "Session published",
          message: `${response.session.title} is live with room ${response.session.room_code}.`,
          tone: "success",
        });
        setClassSaveMessage(
          `Class created successfully: ${response.session.title} (Room code ${response.session.room_code}).`,
        );
      }

      setEditingSessionId(null);
      setDescription("");
    } catch {
      addNotification({
        id: `session-warning-${Date.now()}`,
        title: "Backend unavailable",
        message: "Session changes could not be saved right now.",
        tone: "warning",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (session: TeacherSession) => {
    setClassSaveMessage(null);
    setEditingSessionId(session.id);
    setDraftingNewSession(false);
    setShowAdvancedSessionSetup(true);
    setTitle(session.title);
    setYoutubeLink(session.youtube_link);
    setStartsAt(session.starts_at.slice(0, 16));
    setDescription(session.description);
    setDeliveryMode(session.delivery_mode);
    setExpectedParticipants(clampExpectedParticipants(session.expected_participants, session.delivery_mode));
    setSessionOrgId(session.organization_id ?? organizations[0]?.id ?? null);
    setOpenEnrollment(session.open_enrollment);
    setSessionProgramId(session.program_id);
    setClassSetupWizardStep(2);
  };

  const handleDelete = async (sessionId: number) => {
    try {
      await deleteTeacherSession(sessionId);
      const remainingSessions = sessions.filter((session) => session.id !== sessionId);
      setSessions(remainingSessions);
      if (editingSessionId === sessionId) {
        setEditingSessionId(null);
        setDescription("");
      }
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(remainingSessions[0]?.id ?? null);
      }
      addNotification({
        id: `session-delete-${Date.now()}`,
        title: "Session deleted",
        message: "The class session was removed successfully.",
        tone: "success",
      });
    } catch {
      addNotification({
        id: `session-delete-error-${Date.now()}`,
        title: "Delete failed",
        message: "We could not delete that session right now.",
        tone: "warning",
      });
    }
  };

  const handleResetForm = () => {
    setClassSaveMessage(null);
    setEditingSessionId(null);
    setShowAdvancedSessionSetup(false);
    setDraftingNewSession(true);
    setTitle("");
    setYoutubeLink("");
    setStartsAt(defaultStartsAtForNewSession());
    setDeliveryMode("interactive");
    setExpectedParticipants(clampExpectedParticipants(40, "interactive"));
    setDescription("");
    setSessionOrgId(organizations[0]?.id ?? null);
    setOpenEnrollment(true);
    setSessionProgramId(null);
    setClassSetupWizardStep(1);
  };

  const handlePasteYouTubeLink = async () => {
    try {
      const pasted = await navigator.clipboard.readText();
      if (!pasted.trim()) {
        addNotification({
          id: `broadcast-link-empty-${Date.now()}`,
          title: "Clipboard is empty",
          message: "Copy your YouTube link first, then tap Paste link.",
          tone: "warning",
        });
        return;
      }
      setYoutubeLink(pasted.trim());
      addNotification({
        id: `broadcast-link-pasted-${Date.now()}`,
        title: "Link pasted",
        message: "Review the preview card below before you publish.",
        tone: "success",
      });
    } catch {
      addNotification({
        id: `broadcast-link-paste-failed-${Date.now()}`,
        title: "Paste not allowed",
        message: "Browser blocked clipboard access. Paste the link manually.",
        tone: "warning",
      });
    }
  };

  const handleConnectYouTube = async () => {
    setYoutubeIntegrationBusy(true);
    try {
      const result = await connectTeacherYouTubeIntegration();
      if (result.auth_url) {
        window.location.assign(result.auth_url);
        return;
      }
      throw new Error("Missing OAuth URL");
    } catch {
      addNotification({
        id: `youtube-connect-failed-${Date.now()}`,
        title: "YouTube connect failed",
        message: "We could not start OAuth right now. You can keep using paste-link mode.",
        tone: "warning",
      });
    } finally {
      setYoutubeIntegrationBusy(false);
    }
  };

  const handleDisconnectYouTube = async () => {
    setYoutubeIntegrationBusy(true);
    try {
      await disconnectTeacherYouTubeIntegration();
      setYoutubeIntegration({
        connected: false,
        channel_name: "",
        channel_id: "",
        connected_at: null,
        oauth_configured: youtubeIntegration?.oauth_configured ?? false,
        stream_status: "not_connected",
        stream_title: "",
        stream_checked_at: null,
        stream_message: "Reconnect YouTube to resume live status checks.",
      });
      addNotification({
        id: `youtube-disconnect-${Date.now()}`,
        title: "YouTube disconnected",
        message: "You can still run broadcasts using the YouTube link field.",
        tone: "success",
      });
    } catch {
      addNotification({
        id: `youtube-disconnect-failed-${Date.now()}`,
        title: "Could not disconnect",
        message: "Please try again in a moment.",
        tone: "warning",
      });
    } finally {
      setYoutubeIntegrationBusy(false);
    }
  };

  const handleClassSetupWizardNext = useCallback(() => {
    if (classSetupWizardStep === 1 && !title.trim()) {
      addNotification({
        id: `class-wizard-title-${Date.now()}`,
        title: "Class name needed",
        message: "Add a short class name before continuing.",
        tone: "warning",
      });
      return;
    }
    setClassSetupWizardStep((s) => Math.min(classSetupWizardStepCount, s + 1));
  }, [addNotification, classSetupWizardStep, classSetupWizardStepCount, title]);

  const handleClassSetupWizardBack = useCallback(() => {
    setClassSetupWizardStep((s) => Math.max(1, s - 1));
  }, []);

  const toggleClassToolsModal = useCallback(() => {
    setShowRightPanel((current) => {
      const next = !current;
      if (next) {
        setActivePanel("session");
      }
      return next;
    });
  }, []);

  const getPrimaryBroadcastAction = () => {
    if (!youtubeIntegration?.connected) {
      return {
        label: "Connect YouTube",
        tone: "blue" as const,
        helpText: youtubeIntegration?.oauth_configured
          ? "Connect once with Google to enable live stream checks."
          : "OAuth setup is required on the server first.",
        onClick: () => void handleConnectYouTube(),
        disabled: youtubeIntegrationBusy || youtubeIntegrationLoading || !youtubeIntegration?.oauth_configured,
      };
    }
    if (!hasBroadcastLink || !broadcastLinkLooksValid) {
      return {
        label: "Add YouTube link",
        tone: "amber" as const,
        helpText: "Opens step 2 to paste the exact YouTube watch/live link.",
        onClick: () => {
          setClassSetupWizardStep(2);
          window.requestAnimationFrame(() => {
            youtubeLinkInputRef.current?.focus();
            youtubeLinkInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          });
        },
        disabled: false,
      };
    }
    if (youtubeIntegration.stream_status !== "live" && youtubeIntegration.stream_status !== "scheduled") {
      return {
        label: "Start stream in YouTube",
        tone: "amber" as const,
        helpText: "Open YouTube Studio and start or schedule the stream.",
        onClick: () => window.open("https://studio.youtube.com/", "_blank", "noopener,noreferrer"),
        disabled: false,
      };
    }
    return {
      label: saving ? "Starting..." : "Start class now",
      tone: "green" as const,
      helpText: "Everything looks ready. Start class from this page.",
      onClick: () => void handlePublish(),
      disabled: saving,
    };
  };

  const handleQuickCreateProgram = async () => {
    if (!sessionOrgId || !newProgramTitle.trim() || !newProgramStart || !newProgramEnd) {
      return;
    }
    try {
      const created = await createLearningProgram({
        organization_id: sessionOrgId,
        title: newProgramTitle.trim(),
        starts_at: newProgramStart,
        ends_at: newProgramEnd,
      });
      setPrograms((prev) => [created, ...prev]);
      setSessionProgramId(created.id);
      setNewProgramTitle("");
      addNotification({
        id: `program-${Date.now()}`,
        title: "Program created",
        message: `${created.title} is available for sessions.`,
        tone: "success",
      });
    } catch {
      addNotification({
        id: `program-err-${Date.now()}`,
        title: "Program not saved",
        message: "Check dates and try again.",
        tone: "warning",
      });
    }
  };

  const handleInviteOrgMember = async () => {
    if (!sessionOrgId || !memberUsername.trim()) {
      return;
    }
    try {
      await addOrganizationMember(sessionOrgId, {
        username: memberUsername.trim(),
        role: "student",
      });
      setMemberUsername("");
      const next = await getOrganizationMembers(sessionOrgId);
      setOrgMembers(next);
      addNotification({
        id: `member-${Date.now()}`,
        title: "Member updated",
        message: "They can appear in your school roster.",
        tone: "success",
      });
    } catch (error) {
      addNotification({
        id: `member-err-${Date.now()}`,
        title: "Could not add member",
        message: error instanceof Error ? error.message : "Try again.",
        tone: "warning",
      });
    }
  };

  const handleAddSessionResource = async () => {
    if (!selectedSessionId || !resourceTitle.trim()) {
      return;
    }
    if (!resourceUrl.trim() && !resourceFile) {
      addNotification({
        id: `res-need-${Date.now()}`,
        title: "Link or file needed",
        message: "Add a URL, choose a file, or both.",
        tone: "info",
      });
      return;
    }
    try {
      const created = await createSessionResource(selectedSessionId, {
        title: resourceTitle.trim(),
        url: resourceUrl.trim() || undefined,
        file: resourceFile,
      });
      setSessionResources((prev) => [...prev, created]);
      setResourceTitle("");
      setResourceUrl("");
      setResourceFile(null);
      addNotification({
        id: `res-${Date.now()}`,
        title: "Material added",
        message: "Students see it under class materials.",
        tone: "success",
      });
    } catch {
      addNotification({
        id: `res-err-${Date.now()}`,
        title: "Material not saved",
        message: "Check the URL and try again.",
        tone: "warning",
      });
    }
  };

  const handleRemoveOrgMember = async (userId: number) => {
    if (!sessionOrgId) {
      return;
    }
    setRemovingMemberId(userId);
    try {
      await removeOrganizationMember(sessionOrgId, userId);
      setOrgMembers((prev) => prev.filter((m) => m.user_id !== userId));
      addNotification({
        id: `member-rm-${Date.now()}`,
        title: "Member removed",
        message: "They no longer belong to this organization.",
        tone: "success",
      });
    } catch (error) {
      addNotification({
        id: `member-rm-err-${Date.now()}`,
        title: "Could not remove",
        message: error instanceof Error ? error.message : "Try again.",
        tone: "warning",
      });
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleRemoveSessionResource = async (resourceId: number) => {
    if (!selectedSessionId) {
      return;
    }
    try {
      await deleteSessionResource(selectedSessionId, resourceId);
      setSessionResources((prev) => prev.filter((r) => r.id !== resourceId));
    } catch {
      addNotification({
        id: `res-del-${Date.now()}`,
        title: "Remove failed",
        message: "Could not delete that material right now.",
        tone: "warning",
      });
    }
  };

  const handleCopy = async () => {
    const inviteUrl = `https://elimuapwaclassroom.com/join/${encodeURIComponent(title.toLowerCase().replace(/\s+/g, "-"))}`;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      addNotification({
        id: `copy-${Date.now()}`,
        title: "Invite link copied",
        message: "Share the session link with enrolled students.",
        tone: "success",
      });
    } catch {
      addNotification({
        id: `copy-warning-${Date.now()}`,
        title: "Copy failed",
        message: inviteUrl,
        tone: "info",
      });
    }
  };

  const showBroadcastDeliveryNotice = useCallback((feature: string) => {
    addNotification({
      id: `broadcast-only-${feature}-${Date.now()}`,
      title: "Broadcast room locked",
      message: `This class is using broadcast delivery. Run ${feature} through YouTube Live or OBS instead of direct browser fanout.`,
      tone: "info",
    });
  }, [addNotification]);

  const handleStageModeChange = async (stageMode: RoomStageMode) => {
    if (!selectedSessionId) {
      return;
    }
    if (broadcastOnlyClassroom) {
      showBroadcastDeliveryNotice(stageMode === "screenshare" ? "screen sharing" : stageMode);
      return;
    }

    setMutatingRoomState(true);
    try {
      const response = await updateTeacherRoomState(selectedSessionId, {
        stage_mode: stageMode,
      });
      setCurrentDashboard((state) => ({
        ...state,
        room_state: response.room_state,
      }));

      if (stageMode === "whiteboard") {
        const whiteboard = await getTeacherWhiteboard(selectedSessionId);
        setWhiteboardState(whiteboard);
      }
    } catch {
      addNotification({
        id: `room-stage-${Date.now()}`,
        title: "Stage switch failed",
        message: "We could not change the teacher stage right now.",
        tone: "warning",
      });
    } finally {
      setMutatingRoomState(false);
    }
  };

  const handleToggleChatModerationMode = async () => {
    if (!selectedSessionId || !currentDashboard.room_state.student_chat_enabled) {
      return;
    }

    const nextMode = currentDashboard.room_state.chat_moderation_mode === "qa_queue" ? "open" : "qa_queue";
    setMutatingRoomState(true);
    try {
      const response = await updateTeacherRoomState(selectedSessionId, {
        chat_moderation_mode: nextMode,
      });
      setCurrentDashboard((state) => ({
        ...state,
        room_state: response.room_state,
      }));
      addNotification({
        id: `chat-mod-${Date.now()}`,
        title: nextMode === "qa_queue" ? "Q&A queue enabled" : "Open chat restored",
        message:
          nextMode === "qa_queue"
            ? "Student messages in the main room are held until you publish them."
            : "Student messages in the main room appear immediately again.",
        tone: "info",
      });
    } catch {
      addNotification({
        id: `chat-mod-error-${Date.now()}`,
        title: "Chat mode failed",
        message: "We could not update chat moderation mode right now.",
        tone: "warning",
      });
    } finally {
      setMutatingRoomState(false);
    }
  };

  const handleCommitQaMaxPending = async () => {
    if (!selectedSessionId) {
      return;
    }

    const parsed = Number.parseInt(qaMaxDraft, 10);
    if (Number.isNaN(parsed) || parsed < 5 || parsed > 500) {
      addNotification({
        id: `qa-max-invalid-${Date.now()}`,
        title: "Invalid queue limit",
        message: "Enter a whole number between 5 and 500.",
        tone: "warning",
      });
      setQaMaxDraft(String(currentDashboard.room_state.qa_queue_max_pending));
      return;
    }

    if (parsed === currentDashboard.room_state.qa_queue_max_pending) {
      return;
    }

    setMutatingRoomState(true);
    try {
      const response = await updateTeacherRoomState(selectedSessionId, {
        qa_queue_max_pending: parsed,
      });
      setCurrentDashboard((state) => ({
        ...state,
        room_state: response.room_state,
      }));
      addNotification({
        id: `qa-max-${Date.now()}`,
        title: "Queue limit updated",
        message: `Up to ${parsed} pending questions can wait for review.`,
        tone: "info",
      });
    } catch {
      addNotification({
        id: `qa-max-error-${Date.now()}`,
        title: "Update failed",
        message: "We could not change the Q&A queue limit right now.",
        tone: "warning",
      });
      setQaMaxDraft(String(currentDashboard.room_state.qa_queue_max_pending));
    } finally {
      setMutatingRoomState(false);
    }
  };

  const handleToggleStudentPermission = async (
    field: "student_chat_enabled" | "student_raise_hand_enabled" | "join_approval_enabled",
    nextValue: boolean,
    labels: { on: string; off: string; failure: string },
  ) => {
    if (!selectedSessionId) {
      return;
    }

    setMutatingRoomState(true);
    try {
      const response = await updateTeacherRoomState(selectedSessionId, {
        [field]: nextValue,
      });
      setCurrentDashboard((state) => ({
        ...state,
        room_state: response.room_state,
      }));
      addNotification({
        id: `${field}-${Date.now()}`,
        title: nextValue ? labels.on : labels.off,
        message: nextValue
          ? "Students can use this room control again."
          : "Students can no longer use this room control right now.",
        tone: "info",
      });
    } catch {
      addNotification({
        id: `${field}-error-${Date.now()}`,
        title: labels.failure,
        message: "We could not update that classroom permission right now.",
        tone: "warning",
      });
    } finally {
      setMutatingRoomState(false);
    }
  };

  const handleSetSpotlightMode = async (nextMode: SpotlightMode) => {
    if (!selectedSessionId) {
      return;
    }

    setMutatingRoomState(true);
    try {
      const response = await updateTeacherRoomState(selectedSessionId, {
        spotlight_mode: nextMode,
      });
      setCurrentDashboard((state) => ({
        ...state,
        room_state: response.room_state,
      }));
      addNotification({
        id: `spotlight-mode-${Date.now()}`,
        title: nextMode === "off" ? "Spotlight cleared" : "Spotlight updated",
        message:
          nextMode === "teacher"
            ? "Students will keep the teacher camera visually emphasized."
            : nextMode === "content"
              ? "Students will keep the teaching stage visually emphasized."
              : "The room returned to the normal layout.",
        tone: "info",
      });
    } catch {
      addNotification({
        id: `spotlight-mode-error-${Date.now()}`,
        title: "Spotlight update failed",
        message: "We could not update spotlight mode right now.",
        tone: "warning",
      });
    } finally {
      setMutatingRoomState(false);
    }
  };

  const handleCreateBreakouts = async (reuseLastBreakouts = false) => {
    if (!selectedSessionId) {
      return;
    }
    if (broadcastOnlyClassroom || (selectedSession?.expected_participants ?? 0) > 200) {
      addNotification({
        id: `breakouts-disabled-${Date.now()}`,
        title: "Breakouts disabled for large lecture",
        message: "Use follow-up cohorts for breakouts. Large broadcast classes should stay in the main lecture room.",
        tone: "warning",
      });
      return;
    }
    setManagingBreakouts(true);
    try {
      const response = await createTeacherBreakouts({
        sessionId: selectedSessionId,
        room_count: reuseLastBreakouts ? undefined : breakoutRoomCount,
        reuse_last_breakouts: reuseLastBreakouts,
      });
      setCurrentDashboard((state) => ({
        ...state,
        breakout_rooms: response.breakout_rooms,
        room_state: response.room_state ?? state.room_state,
      }));
      await refreshSelectedSession(selectedSessionId);
      addNotification({
        id: `breakouts-created-${Date.now()}`,
        title: reuseLastBreakouts ? "Breakout groups reopened" : "Breakout rooms ready",
        message: reuseLastBreakouts
          ? "The previous breakout groups were reopened for this session."
          : `${breakoutRoomCount} breakout rooms were created for this session.`,
        tone: "success",
      });
    } catch {
      addNotification({
        id: `breakouts-create-error-${Date.now()}`,
        title: "Breakout setup failed",
        message: reuseLastBreakouts
          ? "We could not reopen the previous breakout groups right now."
          : "We could not create breakout rooms right now.",
        tone: "warning",
      });
    } finally {
      setManagingBreakouts(false);
    }
  };

  const handleMoveStudentBreakout = async (studentId: number, breakoutRoomId: number | null) => {
    if (!selectedSessionId) {
      return;
    }
    setMovingBreakoutStudentId(studentId);
    try {
      await moveStudentToBreakout({
        sessionId: selectedSessionId,
        student_id: studentId,
        breakout_room_id: breakoutRoomId,
      });
      await refreshSelectedSession(selectedSessionId);
    } catch {
      addNotification({
        id: `breakout-move-error-${Date.now()}`,
        title: "Breakout move failed",
        message: "We could not update that learner's breakout room.",
        tone: "warning",
      });
    } finally {
      setMovingBreakoutStudentId(null);
    }
  };

  const handleSetBreakoutSpokesperson = async (roomId: number, spokespersonStudentId: number | null) => {
    if (!selectedSessionId) {
      return;
    }

    setSavingSpokespersonRoomId(roomId);
    try {
      await updateBreakoutSpokesperson({
        sessionId: selectedSessionId,
        room_id: roomId,
        spokesperson_student_id: spokespersonStudentId,
      });
      await refreshSelectedSession(selectedSessionId);
      addNotification({
        id: `breakout-spokesperson-${Date.now()}`,
        title: spokespersonStudentId ? "Spokesperson selected" : "Spokesperson cleared",
        message: spokespersonStudentId
          ? "That learner will now appear as the room spokesperson in the breakout summary."
          : "This breakout room no longer has a selected spokesperson.",
        tone: "success",
      });
    } catch {
      addNotification({
        id: `breakout-spokesperson-error-${Date.now()}`,
        title: "Spokesperson update failed",
        message: "We could not update the breakout spokesperson right now.",
        tone: "warning",
      });
    } finally {
      setSavingSpokespersonRoomId(null);
    }
  };

  const handleClearBreakouts = async () => {
    if (!selectedSessionId) {
      return;
    }
    setManagingBreakouts(true);
    try {
      const response = await clearTeacherBreakouts(selectedSessionId);
      setCurrentDashboard((state) => ({
        ...state,
        breakout_rooms: response.breakout_rooms,
        room_state: response.room_state ?? state.room_state,
      }));
      await refreshSelectedSession(selectedSessionId);
      addNotification({
        id: `breakouts-cleared-${Date.now()}`,
        title: "Breakout rooms closed",
        message: "All learners were returned to the main room.",
        tone: "info",
      });
    } catch {
      addNotification({
        id: `breakouts-clear-error-${Date.now()}`,
        title: "Breakout close failed",
        message: "We could not close breakout rooms right now.",
        tone: "warning",
      });
    } finally {
      setManagingBreakouts(false);
    }
  };

  const handleStartBreakoutTimer = async () => {
    if (!selectedSessionId) {
      return;
    }

    setMutatingRoomState(true);
    try {
      const response = await updateTeacherRoomState(selectedSessionId, {
        breakout_timer_minutes: breakoutTimerMinutes,
      });
      setCurrentDashboard((state) => ({
        ...state,
        room_state: response.room_state,
      }));
      addNotification({
        id: `breakout-timer-start-${Date.now()}`,
        title: "Breakout timer started",
        message: `All breakout rooms now have a ${breakoutTimerMinutes}-minute countdown and will close automatically when time is up.`,
        tone: "success",
      });
    } catch {
      addNotification({
        id: `breakout-timer-start-error-${Date.now()}`,
        title: "Breakout timer failed",
        message: "We could not start the breakout timer right now.",
        tone: "warning",
      });
    } finally {
      setMutatingRoomState(false);
    }
  };

  const handleClearBreakoutTimer = async () => {
    if (!selectedSessionId || !currentDashboard.room_state.breakout_timer_ends_at) {
      return;
    }

    setMutatingRoomState(true);
    try {
      const response = await updateTeacherRoomState(selectedSessionId, {
        clear_breakout_timer: true,
      });
      setCurrentDashboard((state) => ({
        ...state,
        room_state: response.room_state,
      }));
      addNotification({
        id: `breakout-timer-clear-${Date.now()}`,
        title: "Breakout timer cleared",
        message: "The breakout countdown was removed for all rooms.",
        tone: "info",
      });
    } catch {
      addNotification({
        id: `breakout-timer-clear-error-${Date.now()}`,
        title: "Timer clear failed",
        message: "We could not clear the breakout timer right now.",
        tone: "warning",
      });
    } finally {
      setMutatingRoomState(false);
    }
  };

  const handleExtendBreakoutTimer = async (minutes: number) => {
    if (!selectedSessionId || !currentDashboard.room_state.breakout_timer_ends_at) {
      return;
    }

    setMutatingRoomState(true);
    try {
      const response = await updateTeacherRoomState(selectedSessionId, {
        extend_breakout_timer_minutes: minutes,
      });
      setCurrentDashboard((state) => ({
        ...state,
        room_state: response.room_state,
      }));
      addNotification({
        id: `breakout-timer-extend-${Date.now()}`,
        title: "Breakout timer extended",
        message: `Added ${minutes} minute${minutes === 1 ? "" : "s"} to the active breakout countdown.`,
        tone: "success",
      });
    } catch {
      addNotification({
        id: `breakout-timer-extend-error-${Date.now()}`,
        title: "Timer extension failed",
        message: "We could not extend the breakout timer right now.",
        tone: "warning",
      });
    } finally {
      setMutatingRoomState(false);
    }
  };

  const handleSendBreakoutBroadcast = async () => {
    if (!selectedSessionId) {
      return;
    }
    const nextMessage = breakoutBroadcastDraft.trim();
    if (!nextMessage) {
      addNotification({
        id: `breakout-broadcast-empty-${Date.now()}`,
        title: "Broadcast needs a message",
        message: "Write a short instruction before sending it to all breakout rooms.",
        tone: "info",
      });
      return;
    }

    setSendingBreakoutBroadcast(true);
    try {
      const response = await sendTeacherBreakoutBroadcast({
        sessionId: selectedSessionId,
        message: nextMessage,
      });
      setCurrentDashboard((state) => ({
        ...state,
        breakout_broadcast: response.broadcast,
      }));
      setBreakoutBroadcastDraft("");
      await refreshSelectedSession(selectedSessionId);
      addNotification({
        id: `breakout-broadcast-sent-${Date.now()}`,
        title: "Broadcast sent",
        message: "Every breakout room has received your instruction.",
        tone: "success",
      });
    } catch {
      addNotification({
        id: `breakout-broadcast-error-${Date.now()}`,
        title: "Broadcast failed",
        message: "We could not send that breakout message right now.",
        tone: "warning",
      });
    } finally {
      setSendingBreakoutBroadcast(false);
    }
  };

  const handleMonitorBreakoutRoom = async (breakoutRoomId: number | null) => {
    if (!selectedSessionId) {
      return;
    }

    setMonitoringBreakoutRoomId(breakoutRoomId ?? -1);
    try {
      const response = await updateTeacherRoomState(selectedSessionId, {
        monitored_breakout_room_id: breakoutRoomId,
      });
      setCurrentDashboard((state) => ({
        ...state,
        room_state: response.room_state,
      }));
      await refreshSelectedSession(selectedSessionId);
      addNotification({
        id: `breakout-monitor-${Date.now()}`,
        title: breakoutRoomId ? "Joined breakout room" : "Left breakout room",
        message: breakoutRoomId
          ? "Students in that breakout room can now see that the teacher is present."
          : "You are now back in the main teacher room overview.",
        tone: "info",
      });
    } catch {
      addNotification({
        id: `breakout-monitor-error-${Date.now()}`,
        title: "Breakout join failed",
        message: "We could not update the monitored breakout room right now.",
        tone: "warning",
      });
    } finally {
      setMonitoringBreakoutRoomId(null);
    }
  };

  const handleSendBreakoutChat = async (breakoutRoomId: number) => {
    if (!selectedSessionId) {
      return;
    }
    const nextMessage = breakoutChatDraft.trim();
    if (!nextMessage) {
      return;
    }

    setSendingBreakoutChatRoomId(breakoutRoomId);
    try {
      const response = await sendTeacherChatMessage({
        sessionId: selectedSessionId,
        message: nextMessage,
        breakout_room_id: breakoutRoomId,
      });
      setCurrentDashboard((state) => ({
        ...state,
        messages: state.messages.some((message) => message.id === response.chat_message.id)
          ? state.messages
          : [response.chat_message, ...state.messages].slice(0, 12),
      }));
      setBreakoutChatDraft("");
      await refreshSelectedSession(selectedSessionId);
      addNotification({
        id: `breakout-chat-sent-${Date.now()}`,
        title: "Breakout message sent",
        message: "Your message was sent only to that breakout room.",
        tone: "success",
      });
    } catch {
      addNotification({
        id: `breakout-chat-error-${Date.now()}`,
        title: "Message not sent",
        message: "We could not send that breakout message right now.",
        tone: "warning",
      });
    } finally {
      setSendingBreakoutChatRoomId(null);
    }
  };

  const handleStartRecording = async () => {
    const activeSource = getRecordableStream();
    if (!activeSource) {
      addNotification({
        id: `recording-source-missing-${Date.now()}`,
        title: "Recording needs video",
        message: "Start your camera or screen share before recording this lesson.",
        tone: "info",
      });
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      addNotification({
        id: `recording-unsupported-${Date.now()}`,
        title: "Recording unavailable",
        message: "This browser does not support in-browser recording.",
        tone: "warning",
      });
      return;
    }

    setRecordingBusy(true);
    try {
      recordingChunksRef.current = [];
      const preferredMimeTypes = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
      const mimeType = preferredMimeTypes.find((item) => MediaRecorder.isTypeSupported(item));
      const recorder = mimeType
        ? new MediaRecorder(activeSource.stream, { mimeType })
        : new MediaRecorder(activeSource.stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        mediaRecorderRef.current = null;
        recordingSourceRef.current = null;
        downloadRecording();
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      recordingSourceRef.current = activeSource.source;
      await syncRecordingStatus("recording");
      addNotification({
        id: `recording-start-${Date.now()}`,
        title: "Recording started",
        message:
          activeSource.source === "screen"
            ? "The current screen share is being recorded locally."
            : "The current camera feed is being recorded locally.",
        tone: "success",
      });
    } catch {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
      recordingSourceRef.current = null;
      recordingChunksRef.current = [];
      addNotification({
        id: `recording-start-error-${Date.now()}`,
        title: "Recording failed",
        message: "We could not start lesson recording right now.",
        tone: "warning",
      });
    } finally {
      setRecordingBusy(false);
    }
  };

  const handleToggleRecordingPause = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      return;
    }
    setRecordingBusy(true);
    try {
      if (currentDashboard.room_state.recording_status === "recording" && recorder.state === "recording") {
        recorder.pause();
        await syncRecordingStatus("paused");
        addNotification({
          id: `recording-paused-${Date.now()}`,
          title: "Recording paused",
          message: "Lesson recording was paused.",
          tone: "info",
        });
      } else {
        recorder.resume();
        await syncRecordingStatus("recording");
        addNotification({
          id: `recording-resumed-${Date.now()}`,
          title: "Recording resumed",
          message: "Lesson recording is live again.",
          tone: "success",
        });
      }
    } catch {
      addNotification({
        id: `recording-pause-error-${Date.now()}`,
        title: "Recording update failed",
        message: "We could not update the recording state right now.",
        tone: "warning",
      });
    } finally {
      setRecordingBusy(false);
    }
  };

  const handleStopRecording = async () => {
    setRecordingBusy(true);
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      } else {
        mediaRecorderRef.current = null;
        recordingSourceRef.current = null;
        recordingChunksRef.current = [];
      }
      await syncRecordingStatus("idle");
      addNotification({
        id: `recording-stop-${Date.now()}`,
        title: "Recording saved",
        message: "The lesson recording has been stopped and downloaded.",
        tone: "success",
      });
    } catch {
      addNotification({
        id: `recording-stop-error-${Date.now()}`,
        title: "Stop recording failed",
        message: "We could not stop the recording cleanly right now.",
        tone: "warning",
      });
    } finally {
      setRecordingBusy(false);
    }
  };

  const handleUpdateJoinRequest = async (
    requestId: number,
    studentName: string,
    action: "approve" | "deny",
  ) => {
    if (!selectedSessionId) {
      return;
    }

    setUpdatingJoinRequestId(requestId);
    try {
      await updateTeacherJoinRequest({
        sessionId: selectedSessionId,
        request_id: requestId,
        action,
      });
      await refreshSelectedSession(selectedSessionId);
      addNotification({
        id: `join-request-${action}-${Date.now()}`,
        title: action === "approve" ? "Student approved" : "Student denied",
        message:
          action === "approve"
            ? `${studentName} can now enter the live room.`
            : `${studentName} was kept in the waiting room.`,
        tone: "info",
      });
    } catch {
      addNotification({
        id: `join-request-error-${Date.now()}`,
        title: "Waiting room update failed",
        message: "We could not update that join request right now.",
        tone: "warning",
      });
    } finally {
      setUpdatingJoinRequestId(null);
    }
  };

  const handleBulkApproveJoinRequests = async () => {
    if (!selectedSessionId || filteredWaitingRoomQueue.length === 0) {
      return;
    }

    setBulkApprovingJoinRequests(true);
    try {
      for (const entry of filteredWaitingRoomQueue) {
        await updateTeacherJoinRequest({
          sessionId: selectedSessionId,
          request_id: entry.id,
          action: "approve",
        });
      }
      await refreshSelectedSession(selectedSessionId);
      addNotification({
        id: `join-request-bulk-approve-${Date.now()}`,
        title: "Students approved",
        message: `${filteredWaitingRoomQueue.length} students were approved from waiting room.`,
        tone: "success",
      });
    } catch {
      addNotification({
        id: `join-request-bulk-approve-error-${Date.now()}`,
        title: "Bulk approve failed",
        message: "We could not approve all waiting students right now.",
        tone: "warning",
      });
    } finally {
      setBulkApprovingJoinRequests(false);
    }
  };

  const persistWhiteboardNow = useCallback(
    async (nextWhiteboard: WhiteboardState) => {
      if (!selectedSessionId) {
        return;
      }
      if (whiteboardSaveInFlightRef.current) {
        queuedWhiteboardRef.current = nextWhiteboard;
        return;
      }

      whiteboardSaveInFlightRef.current = true;
      setSavingWhiteboard(true);
      setWhiteboardSaveState("saving");
      try {
        const response = await saveTeacherWhiteboard(selectedSessionId, nextWhiteboard);
        failedWhiteboardRef.current = null;
        setWhiteboardState(response.whiteboard);
        setCurrentDashboard((state) => ({
          ...state,
          room_state: {
            ...state.room_state,
            stage_mode: "whiteboard",
            whiteboard_enabled: true,
          },
          whiteboard: response.whiteboard,
        }));
        setWhiteboardSaveState("saved");
      } catch {
        failedWhiteboardRef.current = nextWhiteboard;
        setWhiteboardSaveState("error");
      } finally {
        whiteboardSaveInFlightRef.current = false;
        setSavingWhiteboard(false);
        const queuedWhiteboard = queuedWhiteboardRef.current;
        queuedWhiteboardRef.current = null;
        if (queuedWhiteboard) {
          void persistWhiteboardNow(queuedWhiteboard);
        }
      }
    },
    [selectedSessionId],
  );

  const persistWhiteboard = useCallback(
    (nextWhiteboard: WhiteboardState) => {
      if (!selectedSessionId) {
        return;
      }
      setWhiteboardState(nextWhiteboard);
      queuedWhiteboardRef.current = nextWhiteboard;
      setWhiteboardSaveState("saving");

      if (whiteboardAutosaveTimerRef.current) {
        clearTimeout(whiteboardAutosaveTimerRef.current);
      }
      whiteboardAutosaveTimerRef.current = setTimeout(() => {
        whiteboardAutosaveTimerRef.current = null;
        const payload = queuedWhiteboardRef.current;
        queuedWhiteboardRef.current = null;
        if (payload) {
          void persistWhiteboardNow(payload);
        }
      }, 650);
    },
    [persistWhiteboardNow, selectedSessionId],
  );

  const handleRetryWhiteboardSave = useCallback(() => {
    if (!failedWhiteboardRef.current) {
      return;
    }
    void persistWhiteboardNow(failedWhiteboardRef.current);
  }, [persistWhiteboardNow]);

  const handleClearWhiteboard = async () => {
    if (!selectedSessionId) {
      return;
    }

    if (whiteboardAutosaveTimerRef.current) {
      clearTimeout(whiteboardAutosaveTimerRef.current);
      whiteboardAutosaveTimerRef.current = null;
    }
    queuedWhiteboardRef.current = null;
    setSavingWhiteboard(true);
    setWhiteboardSaveState("saving");
    try {
      const response = await clearTeacherWhiteboard(selectedSessionId);
      failedWhiteboardRef.current = null;
      setWhiteboardState(response.whiteboard);
      setCurrentDashboard((state) => ({
        ...state,
        whiteboard: response.whiteboard,
      }));
      setWhiteboardSaveState("saved");
    } catch {
      failedWhiteboardRef.current = whiteboardState;
      setWhiteboardSaveState("error");
      addNotification({
        id: `whiteboard-clear-${Date.now()}`,
        title: "Clear failed",
        message: "We could not clear the whiteboard right now.",
        tone: "warning",
      });
    } finally {
      setSavingWhiteboard(false);
    }
  };

  const handleToggleCamera = async () => {
    if (broadcastOnlyClassroom) {
      showBroadcastDeliveryNotice("camera");
      return;
    }
    if (cameraEnabled) {
      closeAllCameraPeers();
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = null;
      }
      setCameraEnabled(false);
      if (selectedSessionId) {
        void updateTeacherRoomState(selectedSessionId, {
          teacher_camera_enabled: false,
        })
          .then((response) => {
            setCurrentDashboard((state) => ({
              ...state,
              room_state: response.room_state,
            }));
          })
          .catch(() => undefined);
      }
      addNotification({
        id: `camera-off-${Date.now()}`,
        title: "Camera off",
        message: "Your local camera preview has been turned off.",
        tone: "info",
      });
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      addNotification({
        id: `camera-unsupported-${Date.now()}`,
        title: "Camera unavailable",
        message: "This browser cannot start a camera preview here.",
        tone: "warning",
      });
      return;
    }

    setCameraBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack || videoTrack.readyState !== "live") {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("Camera track did not start.");
      }
      closeAllCameraPeers();
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        const playPromise = cameraVideoRef.current.play();
        if (playPromise) {
          await playPromise.catch(() => undefined);
        }
      }
      videoTrack.onended = () => {
        setCameraEnabled(false);
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = null;
        }
      };
      setCameraEnabled(true);
      if (selectedSessionId) {
        void updateTeacherRoomState(selectedSessionId, {
          stage_mode: "camera",
          teacher_camera_enabled: true,
        })
          .then((response) => {
            setCurrentDashboard((state) => ({
              ...state,
              room_state: response.room_state,
            }));
          })
          .catch(() => undefined);
      }
      addNotification({
        id: `camera-on-${Date.now()}`,
        title: "Camera on",
        message: "Your local camera preview is now live in the room.",
        tone: "success",
      });
    } catch {
      addNotification({
        id: `camera-error-${Date.now()}`,
        title: "Camera blocked",
        message: "Allow camera access in the browser to use the meeting controls.",
        tone: "warning",
      });
    } finally {
      setCameraBusy(false);
    }
  };

  const handleToggleMic = async () => {
    if (broadcastOnlyClassroom) {
      showBroadcastDeliveryNotice("microphone");
      return;
    }
    if (micEnabled) {
      closeAllMicPeers();
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
      setMicEnabled(false);
      if (selectedSessionId) {
        void updateTeacherRoomState(selectedSessionId, {
          teacher_mic_enabled: false,
        })
          .then((response) => {
            setCurrentDashboard((state) => ({
              ...state,
              room_state: response.room_state,
            }));
          })
          .catch(() => undefined);
      }
      addNotification({
        id: `mic-off-${Date.now()}`,
        title: "Microphone muted",
        message: "Your microphone is now off for this room.",
        tone: "info",
      });
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      addNotification({
        id: `mic-unsupported-${Date.now()}`,
        title: "Microphone unavailable",
        message: "This browser cannot start a microphone input here.",
        tone: "warning",
      });
      return;
    }

    setMicBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      micStreamRef.current = stream;
      setMicEnabled(true);
      if (selectedSessionId) {
        const response = await updateTeacherRoomState(selectedSessionId, {
          teacher_mic_enabled: true,
        });
        setCurrentDashboard((state) => ({
          ...state,
          room_state: response.room_state,
        }));
      }
      addNotification({
        id: `mic-on-${Date.now()}`,
        title: "Microphone on",
        message: "Your microphone is ready for the classroom.",
        tone: "success",
      });
    } catch {
      addNotification({
        id: `mic-error-${Date.now()}`,
        title: "Microphone blocked",
        message: "Allow microphone access in the browser to use this control.",
        tone: "warning",
      });
    } finally {
      setMicBusy(false);
    }
  };

  const stopScreenShare = async (nextStageMode: RoomStageMode = "camera") => {
    closeAllScreenSharePeers();
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }
    setScreenShareEnabled(false);

    if (selectedSessionId) {
      try {
        const response = await updateTeacherRoomState(selectedSessionId, {
          stage_mode: nextStageMode,
          screen_share_enabled: false,
        });
        setCurrentDashboard((state) => ({
          ...state,
          room_state: response.room_state,
        }));
      } catch {
        // Leave the local UI stopped even if the room-state sync misses.
      }
    }
  };

  const handleToggleScreenShare = async () => {
    if (broadcastOnlyClassroom) {
      showBroadcastDeliveryNotice("screen sharing");
      return;
    }
    if (screenShareEnabled) {
      await stopScreenShare();
      addNotification({
        id: `screenshare-off-${Date.now()}`,
        title: "Presenting stopped",
        message: "Your screen is no longer being shared from this device.",
        tone: "info",
      });
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      addNotification({
        id: `screenshare-unsupported-${Date.now()}`,
        title: "Screen share unavailable",
        message: "This browser cannot start screen sharing here.",
        tone: "warning",
      });
      return;
    }

    setScreenShareBusy(true);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      closeAllScreenSharePeers();
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = stream;
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }

      const [videoTrack] = stream.getVideoTracks();
      if (videoTrack) {
        videoTrack.onended = () => {
          void stopScreenShare();
        };
      }

      setScreenShareEnabled(true);
      if (selectedSessionId) {
        const response = await updateTeacherRoomState(selectedSessionId, {
          stage_mode: "screenshare",
          screen_share_enabled: true,
        });
        setCurrentDashboard((state) => ({
          ...state,
          room_state: response.room_state,
        }));
      }
      addNotification({
        id: `screenshare-on-${Date.now()}`,
        title: "Presenting now",
        message: "Your screen is now previewing in the teacher room.",
        tone: "success",
      });
    } catch {
      addNotification({
        id: `screenshare-error-${Date.now()}`,
        title: "Screen share blocked",
        message: "Choose a window or screen in the browser prompt to present.",
        tone: "warning",
      });
    } finally {
      setScreenShareBusy(false);
    }
  };

  const handleLeaveCall = () => {
    if (currentDashboard.room_state.recording_status !== "idle") {
      void handleStopRecording();
    }
    closeAllCameraPeers();
    closeAllMicPeers();
    closeAllScreenSharePeers();
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
    setCameraEnabled(false);
    setMicEnabled(false);
    setScreenShareEnabled(false);
    setActivePanel("session");
    if (selectedSessionId) {
      void updateTeacherRoomState(selectedSessionId, {
        teacher_camera_enabled: false,
        teacher_mic_enabled: false,
        screen_share_enabled: false,
        stage_mode: "camera",
      })
        .then((response) => {
          setCurrentDashboard((state) => ({
            ...state,
            room_state: response.room_state,
          }));
        })
        .catch(() => undefined);
    }
    addNotification({
      id: `leave-call-${Date.now()}`,
      title: "You left the call",
      message: "Local camera controls were turned off.",
      tone: "info",
    });
  };

  const handleAssignStudent = async () => {
    if (!selectedSessionId || !selectedStudentId) {
      return;
    }

    setMutatingEnrollment(true);
    try {
      const alreadyEnrolled = enrollments.some((enrollment) => enrollment.student_id === selectedStudentId);
      const response = await assignStudentToSession({
        sessionId: selectedSessionId,
        student_id: selectedStudentId,
      });
      setEnrollments((current) =>
        current.some((item) => item.student_id === response.enrollment.student_id)
          ? current.map((item) =>
              item.student_id === response.enrollment.student_id ? response.enrollment : item,
            )
          : [...current, response.enrollment],
      );
      if (!alreadyEnrolled) {
        updateSessionEnrollmentCount(selectedSessionId, (current) => current + 1);
      }
      try {
        const detail = await getTeacherSessionDetail(selectedSessionId);
        setCurrentDashboard(detail.dashboard);
        setSessions((current) =>
          current.map((session) => (session.id === selectedSessionId ? detail.session : session)),
        );
      } catch {
        // Preserve the successful roster update even if summary refresh misses.
      }
      addNotification({
        id: `assign-student-${Date.now()}`,
        title: "Student assigned",
        message: `${response.enrollment.full_name} has been added to ${selectedSession?.title ?? "the session"}.`,
        tone: "success",
      });
    } catch {
      addNotification({
        id: `assign-student-error-${Date.now()}`,
        title: "Assignment failed",
        message: "We could not add that learner right now.",
        tone: "warning",
      });
    } finally {
      setMutatingEnrollment(false);
    }
  };

  const handleRemoveStudent = async (studentId: number, studentName: string) => {
    if (!selectedSessionId) {
      return;
    }

    setMutatingEnrollment(true);
    try {
      await removeStudentFromSession({
        sessionId: selectedSessionId,
        student_id: studentId,
      });
      setEnrollments((current) => current.filter((enrollment) => enrollment.student_id !== studentId));
      updateSessionEnrollmentCount(selectedSessionId, (current) => current - 1);
      try {
        const detail = await getTeacherSessionDetail(selectedSessionId);
        setCurrentDashboard(detail.dashboard);
        setSessions((current) =>
          current.map((session) => (session.id === selectedSessionId ? detail.session : session)),
        );
      } catch {
        // Preserve the successful roster update even if summary refresh misses.
      }
      addNotification({
        id: `remove-student-${Date.now()}`,
        title: "Student removed",
        message: `${studentName} was removed from ${selectedSession?.title ?? "the session"}.`,
        tone: "success",
      });
    } catch {
      addNotification({
        id: `remove-student-error-${Date.now()}`,
        title: "Removal failed",
        message: "We could not remove that learner right now.",
        tone: "warning",
      });
    } finally {
      setMutatingEnrollment(false);
    }
  };

  const handleDownloadRosterPdf = async () => {
    if (!selectedSessionId) {
      return;
    }
    setExportingEnrollments(true);
    try {
      await downloadSessionRosterPdf(selectedSessionId);
      addNotification({
        id: `enroll-export-${Date.now()}`,
        title: "Download started",
        message: "Roster PDF saved to your device.",
        tone: "success",
      });
    } catch {
      addNotification({
        id: `enroll-export-error-${Date.now()}`,
        title: "Export failed",
        message: "We could not download the roster PDF. Try again.",
        tone: "warning",
      });
    } finally {
      setExportingEnrollments(false);
    }
  };

  const handleEnrollmentDraftChange = (
    studentId: number,
    field: keyof EnrollmentDraft,
    value: EnrollmentDraft[keyof EnrollmentDraft],
  ) => {
    setEnrollmentDrafts((current) => ({
      ...current,
      [studentId]: {
        access_status: current[studentId]?.access_status ?? "upcoming",
        progress: current[studentId]?.progress ?? 0,
        [field]: value,
      },
    }));
  };

  const handleSaveEnrollment = async (enrollment: SessionEnrollment) => {
    if (!selectedSessionId) {
      return;
    }

    const draft = enrollmentDrafts[enrollment.student_id];
    if (!draft) {
      return;
    }

    setSavingEnrollmentId(enrollment.student_id);
    try {
      const response = await updateSessionEnrollment({
        sessionId: selectedSessionId,
        student_id: enrollment.student_id,
        access_status: draft.access_status,
        progress: draft.progress,
      });
      setEnrollments((current) =>
        current.map((item) => (item.student_id === enrollment.student_id ? response.enrollment : item)),
      );
      try {
        const detail = await getTeacherSessionDetail(selectedSessionId);
        setCurrentDashboard(detail.dashboard);
        setSessions((current) =>
          current.map((session) => (session.id === selectedSessionId ? detail.session : session)),
        );
      } catch {
        // Preserve the successful roster update even if summary refresh misses.
      }
      addNotification({
        id: `enrollment-update-${Date.now()}`,
        title: "Enrollment updated",
        message: `${response.enrollment.full_name}'s roster settings were saved.`,
        tone: "success",
      });
    } catch {
      addNotification({
        id: `enrollment-update-error-${Date.now()}`,
        title: "Save failed",
        message: "We could not save that learner's enrollment settings right now.",
        tone: "warning",
      });
    } finally {
      setSavingEnrollmentId(null);
    }
  };

  const handleAttendanceDraftChange = (
    studentId: number,
    status: AttendanceDraft["status"],
  ) => {
    setAttendanceDrafts((current) => ({
      ...current,
      [studentId]: { status },
    }));
  };

  const handleSaveAttendance = async (studentId: number, studentName: string) => {
    if (!selectedSessionId) {
      return;
    }

    const draft = attendanceDrafts[studentId];
    if (!draft) {
      return;
    }

    setSavingAttendanceId(studentId);
    try {
      await updateSessionAttendance({
        sessionId: selectedSessionId,
        student_id: studentId,
        status: draft.status,
      });
      const detail = await getTeacherSessionDetail(selectedSessionId);
      setCurrentDashboard(detail.dashboard);
      setSessions((current) =>
        current.map((session) => (session.id === selectedSessionId ? detail.session : session)),
      );
      addNotification({
        id: `attendance-update-${Date.now()}`,
        title: "Attendance updated",
        message: `${studentName}'s attendance was saved.`,
        tone: "success",
      });
    } catch {
      addNotification({
        id: `attendance-update-error-${Date.now()}`,
        title: "Attendance save failed",
        message: "We could not update that learner's attendance right now.",
        tone: "warning",
      });
    } finally {
      setSavingAttendanceId(null);
    }
  };

  const handleResolveRaiseHand = async (requestId: number, studentName: string) => {
    if (!selectedSessionId) {
      return;
    }

    setResolvingRaiseHandId(requestId);
    try {
      const targetUsername = speakRequestUsernamesRef.current.get(requestId);
      if (targetUsername) {
        sendSignalMessage({
          type: "signal",
          target_role: "student",
          target_username: targetUsername,
          payload: {
            kind: "raise_hand_resolved",
            request_id: requestId,
          },
        });
      }
      if (activeSpeakerRequestId === requestId) {
        if (targetUsername) {
          sendSignalMessage({
            type: "signal",
            target_role: "student",
            target_username: targetUsername,
            payload: {
              kind: "speak_permission_revoked",
              request_id: requestId,
              reason: "Raise hand request was closed.",
            },
          });
        }
        closeSpeakerPeerConnection();
        activeSpeakerUsernameRef.current = null;
        activeSpeakerNameRef.current = null;
        setActiveSpeakerRequestId(null);
        setActiveSpeakerName(null);
      }
      await resolveRaiseHandRequest({
        sessionId: selectedSessionId,
        request_id: requestId,
      });
      const detail = await getTeacherSessionDetail(selectedSessionId);
      setCurrentDashboard(detail.dashboard);
      setSessions((current) =>
        current.map((session) => (session.id === selectedSessionId ? detail.session : session)),
      );
      addNotification({
        id: `raise-hand-resolve-${Date.now()}`,
        title: "Question resolved",
        message: `${studentName}'s raise-hand request was cleared from the queue.`,
        tone: "success",
      });
    } catch {
      addNotification({
        id: `raise-hand-resolve-error-${Date.now()}`,
        title: "Resolve failed",
        message: "We could not resolve that raise-hand request right now.",
        tone: "warning",
      });
    } finally {
      setResolvingRaiseHandId(null);
    }
  };

  const handleGrantSpeaking = async (requestId: number, studentName: string) => {
    const targetUsername = speakRequestUsernamesRef.current.get(requestId);
    if (!targetUsername) {
      addNotification({
        id: `grant-speak-missing-${Date.now()}`,
        title: "Unable to grant speaking",
        message: "Ask the learner to raise their hand again so the live request can sync.",
        tone: "warning",
      });
      return;
    }

    setGrantingSpeakerRequestId(requestId);
    try {
      if (activeSpeakerUsernameRef.current && activeSpeakerUsernameRef.current !== targetUsername) {
        sendSignalMessage({
          type: "signal",
          target_role: "student",
          target_username: activeSpeakerUsernameRef.current,
          payload: {
            kind: "speak_permission_revoked",
            reason: "Another learner was brought to stage.",
          },
        });
      }

      sendSignalMessage({
        type: "signal",
        target_role: "student",
        target_username: targetUsername,
        payload: {
          kind: "speak_permission_granted",
          request_id: requestId,
        },
      });
      activeSpeakerUsernameRef.current = targetUsername;
      activeSpeakerNameRef.current = studentName;
      setActiveSpeakerRequestId(requestId);
      setActiveSpeakerName(studentName);
      addNotification({
        id: `grant-speak-${Date.now()}`,
        title: "Learner approved to speak",
        message: `${studentName} can now unmute and speak.`,
        tone: "success",
      });
    } finally {
      setGrantingSpeakerRequestId(null);
    }
  };

  const handleRevokeSpeaking = (requestId: number, studentName: string) => {
    const targetUsername = speakRequestUsernamesRef.current.get(requestId);
    if (targetUsername) {
      sendSignalMessage({
        type: "signal",
        target_role: "student",
        target_username: targetUsername,
        payload: {
          kind: "speak_permission_revoked",
          request_id: requestId,
          reason: "Teacher ended speaking turn.",
        },
      });
    }
    setRevokingSpeakerRequestId(requestId);
    closeSpeakerPeerConnection();
    activeSpeakerUsernameRef.current = null;
    activeSpeakerNameRef.current = null;
    setActiveSpeakerRequestId((current) => (current === requestId ? null : current));
    setActiveSpeakerName(null);
    window.setTimeout(() => setRevokingSpeakerRequestId(null), 150);
    addNotification({
      id: `revoke-speak-${Date.now()}`,
      title: "Speaking access removed",
      message: `${studentName} has been muted.`,
      tone: "info",
    });
  };

  const handleModerateMessage = async (
    messageId: number,
    sender: string,
    action: "pin" | "unpin" | "hide" | "approve_qa" | "dismiss_qa",
  ) => {
    if (!selectedSessionId) {
      return;
    }

    setModeratingMessageId(messageId);
    try {
      await moderateChatMessage({
        sessionId: selectedSessionId,
        message_id: messageId,
        action,
      });
      const detail = await getTeacherSessionDetail(selectedSessionId);
      setCurrentDashboard(detail.dashboard);
      setSessions((current) =>
        current.map((session) => (session.id === selectedSessionId ? detail.session : session)),
      );
      const title =
        action === "hide"
          ? "Message hidden"
          : action === "pin"
            ? "Message pinned"
            : action === "unpin"
              ? "Message unpinned"
              : action === "approve_qa"
                ? "Question published"
                : "Question dismissed";
      addNotification({
        id: `moderation-${action}-${Date.now()}`,
        title,
        message: `${sender}'s message was updated in moderation.`,
        tone: "success",
      });
    } catch {
      addNotification({
        id: `moderation-error-${Date.now()}`,
        title: "Moderation failed",
        message: "We could not update that chat message right now.",
        tone: "warning",
      });
    } finally {
      setModeratingMessageId(null);
    }
  };

  const handleApproveAllQa = async () => {
    if (!selectedSessionId) {
      return;
    }

    setApprovingAllQa(true);
    try {
      const result = await approveAllSessionQaMessages(selectedSessionId);
      const detail = await getTeacherSessionDetail(selectedSessionId);
      setCurrentDashboard(detail.dashboard);
      setSessions((current) =>
        current.map((session) => (session.id === selectedSessionId ? detail.session : session)),
      );
      addNotification({
        id: `qa-bulk-${Date.now()}`,
        title: result.approved > 0 ? "Questions published" : "Nothing to publish",
        message: result.message,
        tone: result.approved > 0 ? "success" : "info",
      });
    } catch {
      addNotification({
        id: `qa-bulk-error-${Date.now()}`,
        title: "Bulk publish failed",
        message: "We could not publish all queued questions right now.",
        tone: "warning",
      });
    } finally {
      setApprovingAllQa(false);
    }
  };

  const handleDismissAllQa = async () => {
    if (!selectedSessionId) {
      return;
    }

    setDismissingAllQa(true);
    try {
      const result = await dismissAllSessionQaMessages(selectedSessionId);
      const detail = await getTeacherSessionDetail(selectedSessionId);
      setCurrentDashboard(detail.dashboard);
      setSessions((current) =>
        current.map((session) => (session.id === selectedSessionId ? detail.session : session)),
      );
      addNotification({
        id: `qa-dismiss-${Date.now()}`,
        title: result.dismissed > 0 ? "Questions dismissed" : "Nothing to dismiss",
        message: result.message,
        tone: result.dismissed > 0 ? "success" : "info",
      });
    } catch {
      addNotification({
        id: `qa-dismiss-error-${Date.now()}`,
        title: "Bulk dismiss failed",
        message: "We could not dismiss all queued questions right now.",
        tone: "warning",
      });
    } finally {
      setDismissingAllQa(false);
    }
  };

  const handleToggleChatSlowMode = async () => {
    if (!selectedSessionId || !currentDashboard.room_state.student_chat_enabled) {
      return;
    }

    const next = !currentDashboard.room_state.chat_slow_mode;
    setMutatingRoomState(true);
    try {
      const response = await updateTeacherRoomState(selectedSessionId, {
        chat_slow_mode: next,
      });
      setCurrentDashboard((state) => ({
        ...state,
        room_state: response.room_state,
      }));
      addNotification({
        id: `chat-slow-${Date.now()}`,
        title: next ? "Slow chat on" : "Slow chat off",
        message: next
          ? "Students get a lower chat rate limit in the main room."
          : "Normal student chat rate limits apply.",
        tone: "info",
      });
    } catch {
      addNotification({
        id: `chat-slow-error-${Date.now()}`,
        title: "Update failed",
        message: "We could not change slow chat mode right now.",
        tone: "warning",
      });
    } finally {
      setMutatingRoomState(false);
    }
  };

  const handleActivatePoll = async (pollId: number, question: string) => {
    if (!selectedSessionId) {
      return;
    }

    setActivatingPollId(pollId);
    try {
      await activateSessionPoll({
        sessionId: selectedSessionId,
        poll_id: pollId,
      });
      const detail = await getTeacherSessionDetail(selectedSessionId);
      setCurrentDashboard(detail.dashboard);
      setSessions((current) =>
        current.map((session) => (session.id === selectedSessionId ? detail.session : session)),
      );
      addNotification({
        id: `poll-activate-${Date.now()}`,
        title: "Poll activated",
        message: `${question} is now the active classroom poll.`,
        tone: "success",
      });
    } catch {
      addNotification({
        id: `poll-activate-error-${Date.now()}`,
        title: "Poll activation failed",
        message: "We could not activate that poll right now.",
        tone: "warning",
      });
    } finally {
      setActivatingPollId(null);
    }
  };

  const handleActivateQuiz = async (quizId: number, question: string) => {
    if (!selectedSessionId) {
      return;
    }

    setActivatingQuizId(quizId);
    try {
      await activateSessionQuiz({
        sessionId: selectedSessionId,
        quiz_id: quizId,
      });
      const detail = await getTeacherSessionDetail(selectedSessionId);
      setCurrentDashboard(detail.dashboard);
      setSessions((current) =>
        current.map((session) => (session.id === selectedSessionId ? detail.session : session)),
      );
      addNotification({
        id: `quiz-activate-${Date.now()}`,
        title: "Quiz activated",
        message: `${question} is now the active classroom quiz.`,
        tone: "success",
      });
    } catch {
      addNotification({
        id: `quiz-activate-error-${Date.now()}`,
        title: "Quiz activation failed",
        message: "We could not activate that quiz right now.",
        tone: "warning",
      });
    } finally {
      setActivatingQuizId(null);
    }
  };

  const handleEditPoll = (pollId: number) => {
    const poll = currentDashboard.polls.find((item) => item.id === pollId);
    if (!poll) {
      return;
    }

    setEditingPollId(poll.id);
    setPollQuestion(poll.question);
    setPollOptionsInput(poll.options.map((option) => option.label).join("\n"));
  };

  const handleResetPollForm = () => {
    setEditingPollId(null);
    setPollQuestion("");
    setPollOptionsInput("");
  };

  const handleSavePoll = async () => {
    if (!selectedSessionId) {
      return;
    }

    const options = splitEditorLines(pollOptionsInput);
    if (!pollQuestion.trim() || options.length < 2) {
      addNotification({
        id: `poll-form-error-${Date.now()}`,
        title: "Poll needs more detail",
        message: "Add a question and at least two options before saving.",
        tone: "warning",
      });
      return;
    }

    setSavingPollAuthoring(true);
    try {
      if (editingPollId) {
        await updateSessionPoll({
          sessionId: selectedSessionId,
          poll_id: editingPollId,
          question: pollQuestion.trim(),
          options,
        });
      } else {
        await createSessionPoll({
          sessionId: selectedSessionId,
          question: pollQuestion.trim(),
          options,
        });
      }

      await refreshSelectedSession(selectedSessionId);
      handleResetPollForm();
      addNotification({
        id: `poll-save-${Date.now()}`,
        title: editingPollId ? "Poll updated" : "Poll created",
        message: `${pollQuestion.trim()} was saved successfully.`,
        tone: "success",
      });
    } catch {
      addNotification({
        id: `poll-save-error-${Date.now()}`,
        title: "Poll save failed",
        message: "We could not save that poll right now.",
        tone: "warning",
      });
    } finally {
      setSavingPollAuthoring(false);
    }
  };

  const handleEditQuiz = (quizId: number) => {
    const quiz = currentDashboard.quizzes.find((item) => item.id === quizId);
    if (!quiz) {
      return;
    }

    setEditingQuizId(quiz.id);
    setQuizQuestion(quiz.question);
    setQuizChoicesInput(quiz.choices.map((choice) => choice.label).join("\n"));
  };

  const handleResetQuizForm = () => {
    setEditingQuizId(null);
    setQuizQuestion("");
    setQuizChoicesInput("");
  };

  const handleSaveQuiz = async () => {
    if (!selectedSessionId) {
      return;
    }

    const choices = splitEditorLines(quizChoicesInput);
    if (!quizQuestion.trim() || choices.length < 2) {
      addNotification({
        id: `quiz-form-error-${Date.now()}`,
        title: "Quiz needs more detail",
        message: "Add a question and at least two choices before saving.",
        tone: "warning",
      });
      return;
    }

    setSavingQuizAuthoring(true);
    try {
      if (editingQuizId) {
        await updateSessionQuiz({
          sessionId: selectedSessionId,
          quiz_id: editingQuizId,
          question: quizQuestion.trim(),
          choices,
        });
      } else {
        await createSessionQuiz({
          sessionId: selectedSessionId,
          question: quizQuestion.trim(),
          choices,
        });
      }

      await refreshSelectedSession(selectedSessionId);
      handleResetQuizForm();
      addNotification({
        id: `quiz-save-${Date.now()}`,
        title: editingQuizId ? "Quiz updated" : "Quiz created",
        message: `${quizQuestion.trim()} was saved successfully.`,
        tone: "success",
      });
    } catch {
      addNotification({
        id: `quiz-save-error-${Date.now()}`,
        title: "Quiz save failed",
        message: "We could not save that quiz right now.",
        tone: "warning",
      });
    } finally {
      setSavingQuizAuthoring(false);
    }
  };

  const liveAttendanceCount = currentDashboard.attendance.filter((row) => row.status === "Present").length;
  const openHandsCount = currentDashboard.raise_hand_queue.length;
  const waitingRoomCount = currentDashboard.waiting_room_queue.length;
  const qaQueueMetric = useMemo(
    () => currentDashboard.metrics.find((m) => m.label === "Q&A queue"),
    [currentDashboard.metrics],
  );
  const breakoutRoomAssignments = new Map<number, TeacherBreakoutRoom["id"] | null>(
    enrollments.map((enrollment) => {
      const assignedRoom =
        currentDashboard.breakout_rooms.find((room) =>
          room.students.some((student) => student.student_id === enrollment.student_id),
        ) ?? null;
      return [enrollment.student_id, assignedRoom?.id ?? null];
    }),
  );
  const monitoredBreakoutRoom =
    currentDashboard.breakout_rooms.find(
      (room) => room.id === currentDashboard.room_state.monitored_breakout_room_id,
    ) ?? null;
  const breakoutTimerRemainingMs = useMemo(() => {
    const endsAt = currentDashboard.room_state.breakout_timer_ends_at;
    if (!endsAt) {
      return null;
    }

    if (breakoutTimerNow === null) {
      return null;
    }
    const remainingMs = new Date(endsAt).getTime() - breakoutTimerNow;
    return Number.isFinite(remainingMs) ? remainingMs : null;
  }, [breakoutTimerNow, currentDashboard.room_state.breakout_timer_ends_at]);
  const breakoutTimerWarningActive =
    breakoutTimerRemainingMs !== null && breakoutTimerRemainingMs > 0 && breakoutTimerRemainingMs <= 60000;
  const breakoutTimerLabel = useMemo(() => {
    const endsAt = currentDashboard.room_state.breakout_timer_ends_at;
    if (!endsAt) {
      return null;
    }

    if (breakoutTimerNow === null) {
      return null;
    }
    const remainingMs = new Date(endsAt).getTime() - breakoutTimerNow;
    if (!Number.isFinite(remainingMs)) {
      return null;
    }

    if (remainingMs <= 0) {
      return "Time is up";
    }

    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} left`;
  }, [breakoutTimerNow, currentDashboard.room_state.breakout_timer_ends_at]);
  const selectedSessionStartsAt = selectedSession
    ? selectedSession.starts_at.replace("T", " ").replace("Z", "").slice(0, 16)
    : "Ready when you are";

  /** Shared pill styling for Advanced view so it matches the dock control language */
  const advPill =
    "inline-flex min-h-[42px] items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white transition duration-150 disabled:cursor-not-allowed disabled:opacity-60";

  const loadOpsMetrics = useCallback(async () => {
    setLoadingOpsMetrics(true);
    try {
      const response = await getOpsMetrics();
      setOpsMetrics(response);
      setOpsMetricsError(null);
    } catch (error) {
      setOpsMetricsError(error instanceof Error ? error.message : "Unable to load ops metrics.");
    } finally {
      setLoadingOpsMetrics(false);
    }
  }, []);

  useEffect(() => {
    if (activePanel !== "engagement") {
      return;
    }

    void loadOpsMetrics();
  }, [activePanel, loadOpsMetrics]);

  useEffect(() => {
    if (
      simpleViewEnabled &&
      !showAdvancedControls &&
      activePanel === "session" &&
      !showRightPanel
    ) {
      setActivePanel("students");
    }
  }, [activePanel, showAdvancedControls, simpleViewEnabled, showRightPanel]);

  const SIMPLE_TOOLBAR_HIDE_MS = 4500;

  const bumpSimpleToolbarVisibility = useCallback(() => {
    if (!simpleViewEnabled || hideMeetingControlsForSetup) {
      return;
    }
    setSimpleToolbarVisible(true);
    if (simpleToolbarPinned || showAdvancedControls) {
      if (simpleToolbarHideTimerRef.current) {
        clearTimeout(simpleToolbarHideTimerRef.current);
        simpleToolbarHideTimerRef.current = null;
      }
      return;
    }
    if (simpleToolbarHideTimerRef.current) {
      clearTimeout(simpleToolbarHideTimerRef.current);
    }
    simpleToolbarHideTimerRef.current = setTimeout(() => {
      setSimpleToolbarVisible(false);
      simpleToolbarHideTimerRef.current = null;
    }, SIMPLE_TOOLBAR_HIDE_MS);
  }, [simpleViewEnabled, simpleToolbarPinned, showAdvancedControls, hideMeetingControlsForSetup]);

  useEffect(() => {
    if (!simpleViewEnabled) {
      setSimpleToolbarVisible(true);
      if (simpleToolbarHideTimerRef.current) {
        clearTimeout(simpleToolbarHideTimerRef.current);
        simpleToolbarHideTimerRef.current = null;
      }
      return;
    }
    const onActivity = () => bumpSimpleToolbarVisibility();
    window.addEventListener("mousemove", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    bumpSimpleToolbarVisibility();
    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [simpleViewEnabled, bumpSimpleToolbarVisibility]);

  useEffect(() => {
    if (!simpleViewEnabled) {
      return;
    }
    bumpSimpleToolbarVisibility();
  }, [showAdvancedControls, simpleViewEnabled, bumpSimpleToolbarVisibility]);

  useEffect(() => {
    if (hideMeetingControlsForSetup) {
      setSimpleToolbarVisible(false);
    }
  }, [hideMeetingControlsForSetup]);

  const jitsiDockBtn =
    "group relative inline-flex h-12 min-w-[3.3rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-[10px] font-semibold leading-tight text-white transition-all duration-150 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-lg hover:ring-2 hover:ring-white/45 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-50";
  const jitsiDockLabelBase =
    "pointer-events-none absolute left-1/2 z-[80] -translate-x-1/2 whitespace-nowrap rounded-md border border-white/20 bg-slate-900/95 px-2 py-1 text-[10px] font-semibold tracking-[0.01em] text-white shadow-2xl transition-all duration-150";
  const jitsiDockBtnOn = "bg-emerald-600/95 shadow-sm shadow-emerald-950/35 hover:bg-emerald-500";
  const jitsiDockBtnOff = "bg-slate-700/95 hover:bg-slate-600/95";
  const jitsiDockBtnAccent = "bg-blue-600/95 shadow-sm shadow-blue-950/35 hover:bg-blue-500";
  const getDockLabelClass = (label: string) =>
    `${jitsiDockLabelBase} ${
      hoveredDockControl === label ? "-top-8 opacity-100" : "-top-7 translate-y-1 opacity-0"
    }`;
  const dockHoverHandlers = (label: string) => ({
    onMouseEnter: () => setHoveredDockControl(label),
    onMouseLeave: () => setHoveredDockControl((current) => (current === label ? null : current)),
    onFocus: () => setHoveredDockControl(label),
    onBlur: () => setHoveredDockControl((current) => (current === label ? null : current)),
  });
  const primaryBroadcastAction = getPrimaryBroadcastAction();

  return (
    <div
      className={`${
        isLightTheme ? "teacher-dashboard-light" : ""
      } teacher-dashboard-modern grid gap-4 ${
        simpleViewEnabled
          ? simpleToolbarVisible && !hideMeetingControlsForSetup
            ? "pb-[4.5rem]"
            : "pb-2"
          : ""
      }`}
    >
      <section className="space-y-4">
        <div
          className={`flex flex-wrap items-center justify-between rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_85%,transparent)] shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] ${
            simpleViewEnabled ? "gap-2 px-2 py-1.5" : "gap-3 px-3 py-2.5"
          }`}
        >
          <div className={`flex flex-wrap items-center ${simpleViewEnabled ? "gap-1.5" : "gap-2"}`}>
            <span
              className={`rounded-full bg-rose-500 font-semibold text-white shadow-sm ${
                simpleViewEnabled ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
              }`}
            >
              {selectedSession?.status ?? currentDashboard.stream_preview.badge}
            </span>
            <span
              className={`rounded-full font-semibold ${
                simpleViewEnabled ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
              } ${
                broadcastOnlyClassroom ? "bg-[#4285f4]/85 text-white" : "bg-emerald-500/20 text-emerald-100"
              }`}
            >
              {broadcastOnlyClassroom ? "Broadcast (YouTube Live)" : "Interactive (Live room)"}
            </span>
            <span
              className={`rounded-full border border-white/10 bg-white/5 font-medium text-slate-300 ${
                simpleViewEnabled ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
              }`}
            >
              {syncBadgeLabel}
            </span>
            {selectedSession ? (
              <span
                className={`rounded-full border border-white/10 bg-white/5 font-medium text-slate-300 ${
                  simpleViewEnabled ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
                }`}
              >
                {selectedSession.room_code}
              </span>
            ) : null}
          </div>
          <div className={`flex flex-wrap items-center ${simpleViewEnabled ? "gap-1.5" : "gap-3"}`}>
            <button
              type="button"
              onClick={() => setSimpleViewEnabled((current) => !current)}
              className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 font-semibold text-white transition hover:bg-white/10 ${
                simpleViewEnabled ? "px-2.5 py-1.5 text-[11px]" : "gap-2 px-4 py-3 text-sm"
              }`}
            >
              {simpleViewEnabled ? "Simple view" : "Advanced view"}
            </button>
            <select
              value={selectedSessionId ?? ""}
              onChange={(event) => {
                setSelectedSessionId(Number(event.target.value) || null);
                setDraftingNewSession(false);
              }}
              className={`rounded-full border border-white/10 bg-white/5 text-white outline-none transition focus:border-blue-400 ${
                simpleViewEnabled ? "max-w-[10rem] px-2 py-1.5 text-[11px]" : "px-4 py-3 text-sm"
              }`}
            >
              {sessions.length ? null : <option value="">Create a session first</option>}
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.organization_name
                    ? `${session.title} · ${session.organization_name}`
                    : session.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 font-semibold text-white transition hover:bg-white/10 ${
                simpleViewEnabled ? "px-2.5 py-1.5 text-[11px]" : "gap-2 px-4 py-3 text-sm"
              }`}
            >
              <Copy className={simpleViewEnabled ? "h-3.5 w-3.5" : "h-4 w-4"} />
              Copy invite
            </button>
            <button
              type="button"
              onClick={() => void toggleClassToolsModal()}
              className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 font-semibold text-white transition hover:bg-white/10 ${
                simpleViewEnabled ? "px-2.5 py-1.5 text-[11px]" : "gap-2 px-4 py-3 text-sm"
              }`}
            >
              {showRightPanel ? "Close tools" : "Class tools"}
            </button>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-[#15171a] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.28)] sm:p-5">
          <div className="teacher-stage-screen overflow-hidden rounded-[28px] border border-white/10 bg-black">
            <div className="relative aspect-[16/10] w-full">
              {selectedSession && currentDashboard.room_state.stage_mode === "whiteboard" ? (
                <>
                  <WhiteboardStage
                    whiteboard={whiteboardState}
                    editable
                    locked={whiteboardLocked}
                    showControls={!whiteboardPresentMode}
                    onChange={persistWhiteboard}
                    onClear={() => void handleClearWhiteboard()}
                  />
                  <div className="pointer-events-auto absolute right-3 top-3 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/65 px-3 py-1.5 text-xs text-white shadow-xl backdrop-blur">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        whiteboardSaveState === "saving"
                          ? "bg-amber-300"
                          : whiteboardSaveState === "saved"
                            ? "bg-emerald-300"
                            : whiteboardSaveState === "error"
                              ? "bg-rose-300"
                              : "bg-slate-400"
                      }`}
                    />
                    <span className="font-semibold">
                      {whiteboardSaveState === "saving"
                        ? "Saving..."
                        : whiteboardSaveState === "saved"
                          ? "Saved"
                          : whiteboardSaveState === "error"
                            ? "Save failed"
                            : "Ready"}
                    </span>
                    {whiteboardSaveState === "error" ? (
                      <button
                        type="button"
                        onClick={handleRetryWhiteboardSave}
                        className="rounded-full border border-rose-300/40 bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-100 transition hover:bg-rose-500/25"
                      >
                        Retry
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setWhiteboardLocked((current) => !current)}
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition ${
                        whiteboardLocked
                          ? "border-amber-300/45 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30"
                          : "border-white/20 bg-white/10 text-slate-100 hover:bg-white/20"
                      }`}
                    >
                      {whiteboardLocked ? "Unlock board" : "Lock board"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setWhiteboardPresentMode((current) => !current)}
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition ${
                        whiteboardPresentMode
                          ? "border-[#8ab4f8]/45 bg-[#4285f4]/25 text-[#d2e3fc] hover:bg-[#4285f4]/35"
                          : "border-white/20 bg-white/10 text-slate-100 hover:bg-white/20"
                      }`}
                    >
                      {whiteboardPresentMode ? "Exit present" : "Present mode"}
                    </button>
                  </div>
                </>
              ) : selectedSession && currentDashboard.room_state.stage_mode === "camera" ? (
                cameraEnabled ? (
                  <video
                    ref={cameraVideoRef}
                    className="h-full w-full bg-black object-cover"
                    autoPlay
                    muted
                    playsInline
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#101114] px-6 text-center text-white">
                    <VideoOff className="h-10 w-10 text-slate-400" />
                    <div>
                      <p className="text-xl font-semibold">Camera mode ready</p>
                      <p className="mt-2 text-sm text-slate-300">
                        Turn on your camera to show your live preview on stage.
                      </p>
                    </div>
                  </div>
                )
              ) : selectedSession && currentDashboard.room_state.stage_mode === "screenshare" ? (
                screenShareEnabled ? (
                  <video
                    ref={screenVideoRef}
                    className="h-full w-full bg-black object-contain"
                    autoPlay
                    muted
                    playsInline
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#101114] px-6 text-center text-white">
                    <LayoutPanelLeft className="h-10 w-10 text-slate-400" />
                    <div>
                      <p className="text-xl font-semibold">Screen share mode ready</p>
                      <p className="mt-2 text-sm text-slate-300">
                        Click Present to choose the screen or window you want to show.
                      </p>
                    </div>
                  </div>
                )
              ) : selectedSession ? (
                <iframe
                  className="h-full w-full"
                  src={normalizeYouTubeEmbedUrl(selectedSession.youtube_link)}
                  title="Teacher live session preview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-white">
                  <CalendarDays className="h-10 w-10 text-slate-400" />
                  <div>
                    <p className="text-xl font-semibold">Create your first live room</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Add one session in Setup to turn this page into your classroom.
                    </p>
                  </div>
                </div>
              )}

              {simpleViewEnabled ? (
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/50 via-transparent to-transparent px-3 py-2 text-white">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-tight">
                      {selectedSession?.title ?? currentDashboard.stream_preview.title}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-200/90">{selectedSessionStartsAt}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    <span className="rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {liveAttendanceCount} live
                    </span>
                    <span className="rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-medium capitalize text-white">
                      {currentDashboard.room_state.stage_mode}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 bg-gradient-to-b from-black/70 via-black/20 to-transparent px-5 py-5 text-white">
                  <div className="min-w-0">
                    <p className="truncate text-xl font-semibold sm:text-2xl">
                      {selectedSession?.title ?? currentDashboard.stream_preview.title}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-200">{selectedSessionStartsAt}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white">
                      {enrollments.length} students
                    </span>
                    <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white">
                      {liveAttendanceCount} live
                    </span>
                    <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-medium capitalize text-white">
                      {currentDashboard.room_state.stage_mode}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                        micEnabled ? "bg-emerald-500/80 text-white" : "bg-black/45 text-white"
                      }`}
                    >
                      {micEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                      {micEnabled ? "Mic on" : "Mic off"}
                      {micEnabled ? (
                        <span className="inline-flex items-end gap-[2px]" aria-hidden="true">
                          <span
                            className={`w-[2px] rounded-full bg-white transition-all ${
                              micSpeaking ? "opacity-100" : "opacity-50"
                            }`}
                            style={{ height: `${4 + micInputLevel * 8}px` }}
                          />
                          <span
                            className={`w-[2px] rounded-full bg-white transition-all ${
                              micSpeaking ? "opacity-100" : "opacity-50"
                            }`}
                            style={{ height: `${5 + micInputLevel * 12}px` }}
                          />
                          <span
                            className={`w-[2px] rounded-full bg-white transition-all ${
                              micSpeaking ? "opacity-100" : "opacity-50"
                            }`}
                            style={{ height: `${4 + micInputLevel * 9}px` }}
                          />
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        broadcastOnlyClassroom ? "bg-[#4285f4]/85 text-white" : "bg-emerald-500/20 text-emerald-100"
                      }`}
                    >
                      {broadcastOnlyClassroom ? "YouTube broadcast" : "Interactive room"}
                    </span>
                    {screenShareEnabled ? (
                      <span className="rounded-full bg-[#4285f4]/80 px-3 py-1 text-xs font-medium text-white">
                        Presenting
                      </span>
                    ) : null}
                    {!currentDashboard.room_state.student_chat_enabled ? (
                      <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white">
                        Chat off
                      </span>
                    ) : null}
                    {!currentDashboard.room_state.student_raise_hand_enabled ? (
                      <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white">
                        Hands off
                      </span>
                    ) : null}
                    {currentDashboard.room_state.join_approval_enabled ? (
                      <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white">
                        Waiting room
                      </span>
                    ) : null}
                    {currentDashboard.room_state.spotlight_mode !== "off" ? (
                      <span className="rounded-full bg-amber-400/85 px-3 py-1 text-xs font-medium text-slate-950">
                        Spotlight {currentDashboard.room_state.spotlight_mode}
                      </span>
                    ) : null}
                    {currentDashboard.room_state.breakout_enabled ? (
                      <span className="rounded-full bg-emerald-500/80 px-3 py-1 text-xs font-medium text-white">
                        Breakouts live
                      </span>
                    ) : null}
                    {breakoutTimerLabel ? (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          breakoutTimerWarningActive ? "bg-amber-400/90 text-slate-950" : "bg-sky-400/85 text-slate-950"
                        }`}
                      >
                        {breakoutTimerWarningActive
                          ? `Breakouts ending in ${breakoutTimerLabel}`
                          : `Breakout timer ${breakoutTimerLabel}`}
                      </span>
                    ) : null}
                    {monitoredBreakoutRoom ? (
                      <span className="rounded-full bg-emerald-300/90 px-3 py-1 text-xs font-medium text-slate-950">
                        In {monitoredBreakoutRoom.name}
                      </span>
                    ) : null}
                    {currentDashboard.room_state.recording_status !== "idle" ? (
                      <span className="rounded-full bg-rose-500/85 px-3 py-1 text-xs font-medium text-white">
                        {currentDashboard.room_state.recording_status === "paused" ? "Recording paused" : "Recording"}
                      </span>
                    ) : null}
                  </div>
                </div>
              )}

              {liveReactions.length ? (
                <div
                  className={`pointer-events-none absolute inset-x-0 flex justify-center gap-2 px-4 ${
                    simpleViewEnabled ? "bottom-20 text-[11px]" : "bottom-24"
                  }`}
                >
                  {liveReactions.map((reaction) => (
                    <div
                      key={reaction.id}
                      className={`rounded-full bg-black/65 font-semibold text-white shadow-xl ${
                        simpleViewEnabled ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-sm"
                      }`}
                    >
                      <span className="mr-2 text-lg">{reaction.emoji}</span>
                      {reaction.name}
                    </div>
                  ))}
                </div>
              ) : null}

              {!hideMeetingControlsForSetup ? (
                <div
                  className={`absolute overflow-hidden rounded-xl border bg-slate-950 shadow-2xl ${
                    simpleViewEnabled ? "bottom-16 right-3 max-sm:bottom-14" : "bottom-5 right-5 rounded-2xl"
                  } ${
                    currentDashboard.room_state.spotlight_mode === "teacher"
                      ? "border-amber-300/80 ring-2 ring-amber-300/60"
                      : "border-white/15"
                  }`}
                >
                  {cameraEnabled ? (
                    <video
                      ref={cameraVideoRef}
                      className={`object-cover ${simpleViewEnabled ? "h-20 w-32" : "h-28 w-44"}`}
                      autoPlay
                      muted
                      playsInline
                    />
                  ) : (
                    <div
                      className={`flex flex-col items-center justify-center gap-1 bg-slate-900 text-slate-200 ${
                        simpleViewEnabled ? "h-20 w-32 gap-1" : "h-28 w-44 gap-2"
                      }`}
                    >
                      <VideoOff className={simpleViewEnabled ? "h-4 w-4" : "h-5 w-5"} />
                      <span className={`font-medium ${simpleViewEnabled ? "text-[10px]" : "text-xs"}`}>Camera off</span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {!simpleViewEnabled || showAdvancedControls ? (
          <div
            className={`mt-4 rounded-3xl border border-white/10 bg-[#15171a]/95 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.28)] backdrop-blur-md ring-1 ring-white/5 ${
              hideMeetingControlsForSetup ? "hidden" : ""
            }`}
            aria-hidden={hideMeetingControlsForSetup}
          >
            <div className="mb-3 border-b border-white/10 pb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Advanced controls</p>
              <p className="mt-1 text-[11px] text-slate-500">
                Full toolbar grouped like the simple dock — same actions, clearer layout.
              </p>
            </div>
            <div
              className="teacher-meeting-dock space-y-4"
              role="toolbar"
              aria-label="Advanced meeting controls"
            >
              {broadcastOnlyClassroom ? (
                <div className="w-full rounded-2xl border border-[#4285f4]/30 bg-[#4285f4]/10 px-4 py-3 text-center text-sm text-[#d2e3fc]">
                  Broadcast delivery is active for this room. Students watch through YouTube Live, so direct browser media
                  controls and large-room breakouts stay off here.
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-3 sm:p-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Media</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleToggleCamera()}
                      disabled={cameraBusy || broadcastOnlyClassroom}
                      hidden={simpleViewEnabled}
                      className={`${advPill} ${
                        currentDashboard.room_state.stage_mode === "camera" || cameraEnabled
                          ? "bg-[#3c4043] hover:bg-[#4a4f53]"
                          : "border border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      {cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                      {cameraBusy ? "Starting..." : cameraEnabled ? "Camera on" : "Camera off"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleMic()}
                      disabled={micBusy || broadcastOnlyClassroom}
                      hidden={simpleViewEnabled}
                      className={`${advPill} ${
                        micEnabled ? "bg-[#3c4043] hover:bg-[#4a4f53]" : "border border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                      {micBusy ? "Starting..." : micEnabled ? "Mic on" : "Mic off"}
                      {micEnabled ? (
                        <span className="inline-flex items-end gap-[2px] pl-1" aria-hidden="true">
                          <span
                            className={`w-[2px] rounded-full bg-white transition-all ${
                              micSpeaking ? "opacity-100" : "opacity-50"
                            }`}
                            style={{ height: `${4 + micInputLevel * 7}px` }}
                          />
                          <span
                            className={`w-[2px] rounded-full bg-white transition-all ${
                              micSpeaking ? "opacity-100" : "opacity-50"
                            }`}
                            style={{ height: `${5 + micInputLevel * 10}px` }}
                          />
                          <span
                            className={`w-[2px] rounded-full bg-white transition-all ${
                              micSpeaking ? "opacity-100" : "opacity-50"
                            }`}
                            style={{ height: `${4 + micInputLevel * 8}px` }}
                          />
                        </span>
                      ) : null}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-3 sm:p-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Stage &amp; share</p>
                  <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleStageModeChange("whiteboard")}
              disabled={mutatingRoomState || savingWhiteboard || broadcastOnlyClassroom}
              hidden={simpleViewEnabled && !showAdvancedControls}
              className={`${advPill} ${
                currentDashboard.room_state.stage_mode === "whiteboard"
                  ? "bg-[#3c4043] hover:bg-[#4a4f53]"
                  : "border border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <BadgeHelp className="h-4 w-4" />
              {savingWhiteboard ? "Saving board..." : "Whiteboard"}
            </button>
            <button
              type="button"
              onClick={() => void handleStageModeChange("screenshare")}
              disabled={mutatingRoomState || screenShareBusy || broadcastOnlyClassroom}
              hidden={simpleViewEnabled && !showAdvancedControls}
              className={`${advPill} ${
                currentDashboard.room_state.stage_mode === "screenshare"
                  ? "bg-[#3c4043] hover:bg-[#4a4f53]"
                  : "border border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <LayoutPanelLeft className="h-4 w-4" />
              {screenShareBusy ? "Starting..." : screenShareEnabled ? "Presenting" : "Present"}
            </button>
            <button
              type="button"
              onClick={() => void handleToggleScreenShare()}
              disabled={screenShareBusy || broadcastOnlyClassroom}
              hidden={simpleViewEnabled && !showAdvancedControls}
              className={`${advPill} ${
                screenShareEnabled ? "bg-[#3c4043] hover:bg-[#4a4f53]" : "border border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <LayoutPanelLeft className="h-4 w-4" />
              {screenShareBusy ? "Starting..." : screenShareEnabled ? "Stop presenting" : "Start presenting"}
            </button>
            <button
              type="button"
              onClick={() =>
                void handleSetSpotlightMode(
                  currentDashboard.room_state.spotlight_mode === "teacher" ? "off" : "teacher",
                )
              }
              disabled={mutatingRoomState || !currentDashboard.room_state.teacher_camera_enabled}
              hidden={simpleViewEnabled && !showAdvancedControls}
              className={`${advPill} ${
                currentDashboard.room_state.spotlight_mode === "teacher"
                  ? "bg-[#3c4043] hover:bg-[#4a4f53]"
                  : "border border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <Video className="h-4 w-4" />
              {currentDashboard.room_state.spotlight_mode === "teacher" ? "Teacher spotlight" : "Spotlight you"}
            </button>
            <button
              type="button"
              onClick={() =>
                void handleSetSpotlightMode(
                  currentDashboard.room_state.spotlight_mode === "content" ? "off" : "content",
                )
              }
              disabled={mutatingRoomState || currentDashboard.room_state.stage_mode === "camera"}
              hidden={simpleViewEnabled && !showAdvancedControls}
              className={`${advPill} ${
                currentDashboard.room_state.spotlight_mode === "content"
                  ? "bg-[#3c4043] hover:bg-[#4a4f53]"
                  : "border border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <LayoutPanelLeft className="h-4 w-4" />
              {currentDashboard.room_state.spotlight_mode === "content" ? "Stage spotlight" : "Spotlight stage"}
            </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-3 sm:p-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Recording</p>
                  <div className="flex flex-wrap gap-2">
            {currentDashboard.room_state.recording_status === "idle" ? (
              <button
                type="button"
                onClick={() => void handleStartRecording()}
                disabled={recordingBusy}
                hidden={simpleViewEnabled && !showAdvancedControls}
                className={`${advPill} border border-white/10 bg-white/5 hover:bg-white/10`}
              >
                <Disc3 className="h-4 w-4" />
                {recordingBusy ? "Starting rec..." : "Start recording"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void handleToggleRecordingPause()}
                  disabled={recordingBusy}
                  hidden={simpleViewEnabled && !showAdvancedControls}
                  className={`${advPill} bg-[#3c4043] hover:bg-[#4a4f53]`}
                >
                  <Pause className="h-4 w-4" />
                  {recordingBusy
                    ? "Saving rec..."
                    : currentDashboard.room_state.recording_status === "paused"
                      ? "Resume recording"
                      : "Pause recording"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleStopRecording()}
                  disabled={recordingBusy}
                  hidden={simpleViewEnabled && !showAdvancedControls}
                  className={`${advPill} border border-rose-400/30 text-rose-200 hover:bg-rose-500/10`}
                >
                  <Square className="h-4 w-4" />
                  Stop recording
                </button>
              </>
            )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-3 sm:p-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Class tools</p>
                  <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                void handleToggleStudentPermission(
                  "join_approval_enabled",
                  !currentDashboard.room_state.join_approval_enabled,
                  {
                    on: "Waiting room on",
                    off: "Waiting room off",
                    failure: "Waiting room failed",
                  },
                )
              }
              disabled={mutatingRoomState}
              hidden={simpleViewEnabled && !showAdvancedControls}
              className={`${advPill} ${
                currentDashboard.room_state.join_approval_enabled
                  ? "bg-[#3c4043] hover:bg-[#4a4f53]"
                  : "border border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <UsersRound className="h-4 w-4" />
              {currentDashboard.room_state.join_approval_enabled ? "Waiting room on" : "Waiting room off"}
            </button>
            <button
              type="button"
              onClick={() =>
                void handleToggleStudentPermission(
                  "student_chat_enabled",
                  !currentDashboard.room_state.student_chat_enabled,
                  {
                    on: "Student chat on",
                    off: "Student chat off",
                    failure: "Chat permission failed",
                  },
                )
              }
              disabled={mutatingRoomState}
              hidden={simpleViewEnabled}
              className={`${advPill} ${
                currentDashboard.room_state.student_chat_enabled
                  ? "border border-white/10 bg-white/5 hover:bg-white/10"
                  : "bg-[#3c4043] hover:bg-[#4a4f53]"
              }`}
            >
              <MessageSquareText className="h-4 w-4" />
              {currentDashboard.room_state.student_chat_enabled ? "Chat on" : "Chat off"}
            </button>
            <button
              type="button"
              onClick={() => void handleToggleChatModerationMode()}
              disabled={mutatingRoomState || !currentDashboard.room_state.student_chat_enabled}
              hidden={simpleViewEnabled && !showAdvancedControls}
              className={`${advPill} ${
                currentDashboard.room_state.chat_moderation_mode === "qa_queue"
                  ? "bg-[#3c4043] hover:bg-[#4a4f53]"
                  : "border border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <ListOrdered className="h-4 w-4" />
              {currentDashboard.room_state.chat_moderation_mode === "qa_queue" ? "Q&A queue on" : "Q&A queue off"}
            </button>
            <button
              type="button"
              onClick={() => void handleToggleChatSlowMode()}
              disabled={mutatingRoomState || !currentDashboard.room_state.student_chat_enabled}
              hidden={simpleViewEnabled}
              className={`${advPill} ${
                currentDashboard.room_state.chat_slow_mode
                  ? "bg-[#3c4043] hover:bg-[#4a4f53]"
                  : "border border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <BadgeHelp className="h-4 w-4" />
              {currentDashboard.room_state.chat_slow_mode ? "Slow mode on" : "Slow mode"}
            </button>
            <button
              type="button"
              onClick={() =>
                void handleToggleStudentPermission(
                  "student_raise_hand_enabled",
                  !currentDashboard.room_state.student_raise_hand_enabled,
                  {
                    on: "Hand raise on",
                    off: "Hand raise off",
                    failure: "Hand raise permission failed",
                  },
                )
              }
              disabled={mutatingRoomState}
              hidden={simpleViewEnabled}
              className={`${advPill} ${
                currentDashboard.room_state.student_raise_hand_enabled
                  ? "border border-white/10 bg-white/5 hover:bg-white/10"
                  : "bg-[#3c4043] hover:bg-[#4a4f53]"
              }`}
            >
              <Hand className="h-4 w-4" />
              {currentDashboard.room_state.student_raise_hand_enabled ? "Hands on" : "Hands off"}
            </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/25 p-3 sm:p-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Panels &amp; exit</p>
                <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActivePanel("students")}
              hidden={simpleViewEnabled}
              className={`${advPill} ${
                activePanel === "students"
                  ? "bg-[#3c4043] hover:bg-[#4a4f53]"
                  : "border border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <UsersRound className="h-4 w-4" />
              Students
            </button>
            <button
              type="button"
              onClick={() => setActivePanel("engagement")}
              hidden={simpleViewEnabled}
              className={`${advPill} ${
                activePanel === "engagement"
                  ? "bg-[#3c4043] hover:bg-[#4a4f53]"
                  : "border border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <LayoutPanelLeft className="h-4 w-4" />
              Activities
            </button>
            <button
              type="button"
              onClick={() => setActivePanel("session")}
              hidden={simpleViewEnabled && !showAdvancedControls}
              className={`${advPill} ${
                activePanel === "session"
                  ? "bg-[#3c4043] hover:bg-[#4a4f53]"
                  : "border border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              Class setup
            </button>
            {simpleViewEnabled ? (
              <button
                type="button"
                onClick={() => setShowAdvancedControls((current) => !current)}
                hidden
                className={`${advPill} border border-white/10 bg-white/5 hover:bg-white/10`}
              >
                {showAdvancedControls ? "Hide more controls" : "More controls"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowAdvancedControls((current) => !current)}
              hidden={simpleViewEnabled}
              className={`${advPill} border border-white/10 bg-white/5 hover:bg-white/10`}
            >
              {showAdvancedControls ? "Hide controls" : "Show controls"}
            </button>
            <button
              type="button"
              onClick={handleLeaveCall}
              hidden={simpleViewEnabled}
              className={`${advPill} bg-rose-500 font-semibold hover:bg-rose-400`}
            >
              <PhoneOff className="h-4 w-4" />
              Leave call
            </button>
                </div>
              </div>
            </div>
          </div>
          ) : null}
        </div>
      </section>

      {showRightPanel && typeof document !== "undefined"
        ? createPortal(
            <div
              className="teacher-class-tools-modal teacher-dashboard-modern fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5"
              role="presentation"
            >
              <button
                type="button"
                className="absolute inset-0 bg-[#201f1e]/45 backdrop-blur-[3px] transition-opacity dark:bg-black/50"
                aria-label="Close class tools"
                onClick={() => setShowRightPanel(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="teacher-class-tools-title"
                className="relative z-10 flex max-h-[min(92dvh,920px)] w-full max-w-[min(100%,56rem)] flex-col overflow-hidden rounded-xl border border-[#d2d0ce] bg-[#faf9f8] shadow-[0_12px_48px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.06)] lg:max-w-[min(100%,72rem)]"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#edebe9] bg-white px-4 py-3.5 sm:px-5">
                  <div className="min-w-0 pr-2">
                    <h2
                      id="teacher-class-tools-title"
                      className="text-base font-semibold text-[#201f1e] sm:text-lg"
                    >
                      Class tools
                    </h2>
                    <p className="text-xs text-[#605e5c] sm:text-sm">
                      Guided class setup (especially for broadcast), roster, and activities
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRightPanel(false)}
                    className="shrink-0 rounded-md border border-[#8a8886] bg-white px-3.5 py-2 text-sm font-semibold text-[#201f1e] shadow-sm transition hover:bg-[#f3f2f1] active:bg-[#edebe9]"
                  >
                    Close
                  </button>
                </div>
                <div className="teacher-right-panel min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-[#f3f2f1] px-3 pb-6 pt-3 sm:px-5">
        <div className="rounded-[28px] border border-white/10 bg-[#15171a] p-3 text-white">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "session", label: "Class setup", icon: CalendarDays },
              { id: "students", label: "Students", icon: UsersRound },
              { id: "engagement", label: "Activities", icon: MessageSquareText },
            ].map((item) => {
              const Icon = item.icon;
              const active = activePanel === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActivePanel(item.id as "session" | "students" | "engagement")}
                  className={`flex flex-col items-center gap-2 rounded-2xl px-3 py-3 text-xs font-semibold transition ${
                    active
                      ? "bg-[#4285f4] text-white"
                      : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {activePanel === "session" ? (
          <div className="rounded-[28px] border border-white/10 bg-[#15171a] p-5 text-white">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">Your class</h2>
                  <p className="text-sm text-slate-300">
                    {deliveryMode === "broadcast"
                      ? "Keep it simple: add class basics and create. Add YouTube and more details later."
                      : "Keep it simple: add class basics and create. Update other details later."}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 p-3 text-[#8ab4f8]">
                  <ListOrdered className="h-5 w-5" aria-hidden />
                </div>
              </div>

              <div className="mb-4 rounded-2xl border border-white/10 bg-black/25 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Your progress</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {classSetupWizardSteps.map(({ step, label, hint }) => {
                    const active = classSetupWizardStep === step;
                    const done = classSetupWizardStep > step;
                    return (
                      <button
                        key={step}
                        type="button"
                        onClick={() => {
                          if (done || active) {
                            setClassSetupWizardStep(step);
                          }
                        }}
                        disabled={!done && !active}
                        title={hint}
                        className={`flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-xl border px-2.5 py-2 text-left transition sm:min-w-[6.75rem] sm:flex-none ${
                          active
                            ? "border-[#4285f4]/50 bg-[#4285f4]/15 text-white"
                            : done
                              ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-100"
                              : "cursor-not-allowed border-white/10 bg-white/[0.04] text-slate-500"
                        }`}
                      >
                        <span className="text-[11px] font-bold text-slate-400">
                          {step}/{classSetupWizardStepCount}
                        </span>
                        <span className="text-xs font-semibold leading-tight">{label}</span>
                        <span className="text-[10px] leading-snug text-slate-400">{hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {selectedSession ? (
                  <button
                    type="button"
                    onClick={() => handleEdit(selectedSession)}
                    className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                  >
                    Edit selected room
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                >
                  New room
                </button>
              </div>

              <div className="grid gap-4">
                {classSetupWizardStep === 1 ? (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-white">Class name</span>
                      <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder={editingSessionId ? undefined : "e.g. Tuesday Form 2 English"}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-white">Start time</span>
                      <input
                        type="datetime-local"
                        value={startsAt}
                        onChange={(event) => setStartsAt(event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
                      />
                    </label>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-white">Delivery mode</span>
                        <select
                          value={deliveryMode}
                          onChange={(event) => {
                            const nextMode = event.target.value as "interactive" | "broadcast";
                            setDeliveryMode(nextMode);
                            setExpectedParticipants((current) => clampExpectedParticipants(current, nextMode));
                          }}
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
                        >
                          <option value="interactive">Interactive room</option>
                          <option value="broadcast">Broadcast lecture</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-white">
                          Expected participants ({expectedParticipantRange.min}-{expectedParticipantRange.max})
                        </span>
                        <input
                          type="number"
                          min={expectedParticipantRange.min}
                          max={expectedParticipantRange.max}
                          placeholder={`${expectedParticipantRange.min}-${expectedParticipantRange.max}`}
                          value={expectedParticipants}
                          onChange={(event) =>
                            setExpectedParticipants(
                              clampExpectedParticipants(
                                Number(event.target.value) || expectedParticipantRange.min,
                                deliveryMode,
                              ),
                            )
                          }
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
                        />
                        <p className="mt-2 text-xs text-slate-300">
                          {deliveryMode === "broadcast"
                            ? "Recommended range for broadcast: 200-5000 participants."
                            : "Recommended range for interactive: 10-200 participants."}
                        </p>
                      </label>
                    </div>
                    <details className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-white">
                        Help: interactive vs broadcast (tap to read)
                      </summary>
                      <p className="mt-2 text-xs text-slate-300">
                        Choose one mode based on class size and how much live interaction you need.
                      </p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div
                          className={`rounded-xl border px-3 py-3 ${
                            deliveryMode === "interactive"
                              ? "border-emerald-400/40 bg-emerald-500/10"
                              : "border-white/10 bg-black/20"
                          }`}
                        >
                          <p className="text-sm font-semibold text-white">Interactive room</p>
                          <p className="mt-1 text-xs font-semibold text-emerald-200">Expected range: 10-200 participants</p>
                          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-300">
                            <li>Best for smaller classes and high participation.</li>
                            <li>Use when you want more direct live interaction.</li>
                            <li>Recommended when breakouts and active facilitation matter.</li>
                          </ul>
                        </div>
                        <div
                          className={`rounded-xl border px-3 py-3 ${
                            deliveryMode === "broadcast"
                              ? "border-[#4285f4]/40 bg-[#4285f4]/10"
                              : "border-white/10 bg-black/20"
                          }`}
                        >
                          <p className="text-sm font-semibold text-white">Broadcast lecture</p>
                          <p className="mt-1 text-xs font-semibold text-[#d2e3fc]">Expected range: 200-5000 participants</p>
                          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-300">
                            <li>Best for large classes (hundreds to thousands).</li>
                            <li>Students watch video via YouTube, then interact in ElimuPawa Classroom.</li>
                            <li>Recommended for stable one-to-many teaching delivery.</li>
                          </ul>
                        </div>
                      </div>
                    </details>
                    {simpleClassSetup ? (
                      <div className="rounded-2xl border border-emerald-300/70 bg-emerald-500/20 p-4 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]">
                        <p className="text-sm font-bold text-white">Quick setup (recommended)</p>
                        <p className="mt-1 text-xs text-white/95">
                          Tap once to create your class now. You can edit YouTube link, roster, and other settings later.
                        </p>
                        <button
                          type="button"
                          onClick={() => void handlePublish()}
                          disabled={saving}
                          className="mt-3 w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {saving ? "Creating class..." : editingSessionId ? "Save changes now" : "Create class now"}
                        </button>
                      </div>
                    ) : null}
                    {!simpleClassSetup ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => void handlePublish()}
                          disabled={saving}
                          className="w-full rounded-2xl bg-[#4285f4] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#5b95f5] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {saving ? "Saving..." : editingSessionId ? "Save changes" : "Create class"}
                        </button>
                        {classSaveMessage ? (
                          <p className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-100">
                            {classSaveMessage}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                ) : null}

                {deliveryMode === "broadcast" && classSetupWizardStep === 2 ? (
                  <div className="space-y-3 rounded-2xl border border-[#4285f4]/25 bg-[#4285f4]/[0.07] p-4">
                    <p className="text-sm font-semibold text-white">Step 2 — Add your video link</p>
                    <p className="text-xs text-slate-300">
                      Paste your YouTube live/watch link. Google connect is optional.
                    </p>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-white">YouTube Live link</span>
                      <div className="space-y-2">
                        <input
                          ref={youtubeLinkInputRef}
                          value={youtubeLink}
                          onChange={(event) => setYoutubeLink(event.target.value)}
                          placeholder="Paste YouTube live/watch link here"
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handlePasteYouTubeLink()}
                            className="rounded-full border border-[#4285f4]/40 bg-[#4285f4]/10 px-3 py-1.5 text-xs font-semibold text-[#d2e3fc] transition hover:bg-[#4285f4]/20"
                          >
                            Paste link
                          </button>
                          <a
                            href="https://studio.youtube.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                          >
                            Open YouTube Studio
                          </a>
                          {hasBroadcastLink ? (
                            broadcastLinkLooksValid ? (
                              <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
                                Link looks good
                              </span>
                            ) : (
                              <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200">
                                Check link format
                              </span>
                            )
                          ) : (
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
                              Add your link here
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">Google connect (optional)</p>
                          <p className="mt-1 text-xs text-slate-300">
                            Connect to see live stream status automatically.
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            youtubeIntegration?.connected
                              ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                              : "border border-white/15 bg-white/5 text-slate-300"
                          }`}
                        >
                          {youtubeIntegrationLoading
                            ? "Checking..."
                            : youtubeIntegration?.connected
                              ? "Connected"
                              : "Not connected"}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {youtubeIntegration?.connected ? (
                          <button
                            type="button"
                            onClick={() => void handleDisconnectYouTube()}
                            disabled={youtubeIntegrationBusy}
                            className="rounded-full border border-white/20 bg-black/25 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {youtubeIntegrationBusy ? "Disconnecting..." : "Disconnect"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleConnectYouTube()}
                            disabled={
                              youtubeIntegrationBusy ||
                              youtubeIntegrationLoading ||
                              (youtubeIntegration ? !youtubeIntegration.oauth_configured : false)
                            }
                            className="rounded-full border border-[#4285f4]/45 bg-[#4285f4]/22 px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4285f4]/30 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {youtubeIntegrationBusy ? "Redirecting..." : "Connect with Google"}
                          </button>
                        )}
                      </div>
                      {!youtubeIntegrationLoading && youtubeIntegration && !youtubeIntegration.oauth_configured ? (
                        <p className="mt-2 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-100">
                          Google connect is not ready yet on this server.
                        </p>
                      ) : null}
                      {youtubeIntegration?.channel_id ? (
                        <p className="mt-2 text-[11px] text-slate-400">Channel ID: {youtubeIntegration.channel_id}</p>
                      ) : null}
                      {youtubeIntegration?.connected_at ? (
                        <p className="mt-2 text-[11px] text-slate-400">
                          Connected{" "}
                          {isHydrated ? new Date(youtubeIntegration.connected_at).toLocaleString() : "recently"}.
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {deliveryMode === "interactive" && classSetupWizardStep === 2 ? (
                  <>
                    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-sm font-semibold text-white">Step 2 — Video link (optional)</p>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-white">
                          Video link <span className="font-normal text-slate-400">(optional)</span>
                        </span>
                        <input
                          value={youtubeLink}
                          onChange={(event) => setYoutubeLink(event.target.value)}
                          placeholder="YouTube — can add later"
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400"
                        />
                      </label>
                    </div>
                    <details className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-white">
                        Help: interactive vs broadcast (tap to read)
                      </summary>
                      <p className="mt-2 text-xs text-slate-300">
                        Choose one mode based on class size and how much live interaction you need.
                      </p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div
                          className={`rounded-xl border px-3 py-3 ${
                            deliveryMode === "interactive"
                              ? "border-emerald-400/40 bg-emerald-500/10"
                              : "border-white/10 bg-black/20"
                          }`}
                        >
                          <p className="text-sm font-semibold text-white">Interactive room</p>
                          <p className="mt-1 text-xs font-semibold text-emerald-200">Expected range: 10-200 participants</p>
                          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-300">
                            <li>Best for smaller classes and high participation.</li>
                            <li>Use when you want more direct live interaction.</li>
                            <li>Recommended when breakouts and active facilitation matter.</li>
                          </ul>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                          <p className="text-sm font-semibold text-white">Broadcast lecture</p>
                          <p className="mt-1 text-xs font-semibold text-[#d2e3fc]">Expected range: 200-5000 participants</p>
                          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-300">
                            <li>Best for large classes (hundreds to thousands).</li>
                            <li>Students watch video via YouTube, then interact in ElimuPawa Classroom.</li>
                            <li>Recommended for stable one-to-many teaching delivery.</li>
                          </ul>
                        </div>
                      </div>
                    </details>
                  </>
                ) : null}

                {deliveryMode === "broadcast" && classSetupWizardStep === 2 ? (
                  <div className="broadcast-wizard-modern space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">Step 2 — Ready check</p>
                        <p className="mt-1 text-xs text-slate-300">
                          Quick status overview. Expand troubleshooting only if needed.
                        </p>
                      </div>
                    </div>
                    {youtubeIntegration?.connected ? (
                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-xs font-semibold text-white">Live status (from your connected channel)</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                          <span
                            className={`rounded-full px-2.5 py-1 font-semibold ${
                              youtubeIntegration.stream_status === "live"
                                ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                                : youtubeIntegration.stream_status === "scheduled"
                                  ? "border border-[#4285f4]/40 bg-[#4285f4]/10 text-[#d2e3fc]"
                                  : youtubeIntegration.stream_status === "ended"
                                    ? "border border-slate-300/30 bg-white/5 text-slate-300"
                                    : youtubeIntegration.stream_status === "offline"
                                      ? "border border-amber-400/40 bg-amber-500/10 text-amber-200"
                                      : youtubeIntegration.stream_status === "api_error"
                                        ? "border border-rose-300/40 bg-rose-500/10 text-rose-200"
                                        : "border border-white/15 bg-white/5 text-slate-300"
                            }`}
                          >
                            Stream:{" "}
                            {youtubeIntegration.stream_status === "live"
                              ? "Live now"
                              : youtubeIntegration.stream_status === "scheduled"
                                ? "Scheduled"
                                : youtubeIntegration.stream_status === "ended"
                                  ? "Ended"
                                  : youtubeIntegration.stream_status === "offline"
                                    ? "Offline"
                                    : youtubeIntegration.stream_status === "invalid_link"
                                      ? "Invalid link"
                                      : youtubeIntegration.stream_status === "no_link"
                                        ? "Add link"
                                        : youtubeIntegration.stream_status === "token_unavailable"
                                          ? "Reconnect needed"
                                          : youtubeIntegration.stream_status === "api_error"
                                            ? "API issue"
                                            : "Checking"}
                          </span>
                          {youtubeIntegration.stream_checked_at ? (
                            <span className="text-slate-400">
                              Updated{" "}
                              {isHydrated ? new Date(youtubeIntegration.stream_checked_at).toLocaleTimeString() : "now"}
                            </span>
                          ) : null}
                        </div>
                        {youtubeIntegration.stream_message ? (
                          <p className="mt-2 text-[11px] text-slate-300">{youtubeIntegration.stream_message}</p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="rounded-xl border border-dashed border-white/15 bg-black/15 px-3 py-2 text-xs text-slate-300">
                        Connect YouTube in step 2 to see automatic stream status. You can still run class with a pasted
                        link only.
                      </p>
                    )}
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white">Ready score</p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            goLiveReadiness.level === "ready"
                              ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                              : goLiveReadiness.level === "almost"
                                ? "border border-amber-400/40 bg-amber-500/10 text-amber-200"
                                : "border border-rose-300/40 bg-rose-500/10 text-rose-200"
                          }`}
                        >
                          {goLiveReadiness.score}/3 ·{" "}
                          {goLiveReadiness.level === "ready"
                            ? "Ready"
                            : goLiveReadiness.level === "almost"
                              ? "Almost ready"
                              : "Not ready"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-300">{goLiveReadiness.message}</p>
                      <div className="mt-2 grid gap-1.5">
                        {goLiveReadiness.checks.map((check) => (
                          <div key={check.id} className="flex items-center gap-2 text-xs">
                            <span
                              className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                                check.ok
                                  ? "bg-emerald-500/20 text-emerald-200"
                                  : "bg-white/10 text-slate-300"
                              }`}
                            >
                              {check.ok ? "✓" : "•"}
                            </span>
                            <span className={check.ok ? "text-emerald-200" : "text-slate-300"}>{check.label}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={primaryBroadcastAction.onClick}
                          disabled={primaryBroadcastAction.disabled}
                          className={`rounded-full px-3.5 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            primaryBroadcastAction.tone === "green"
                              ? "border border-emerald-400/50 bg-emerald-500/20 text-white hover:bg-emerald-500/30"
                              : primaryBroadcastAction.tone === "amber"
                                ? "border border-amber-400/50 bg-amber-500/20 text-white hover:bg-amber-500/30"
                                : "border border-[#4285f4]/45 bg-[#4285f4]/22 text-white hover:bg-[#4285f4]/30"
                          }`}
                        >
                          {primaryBroadcastAction.label}
                        </button>
                        <span className="text-[11px] text-slate-300">{primaryBroadcastAction.helpText}</span>
                      </div>
                    </div>
                    <details className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <summary className="cursor-pointer text-xs font-semibold text-slate-200">
                        Need help? Show quick fixes
                      </summary>
                      <div className="mt-3 grid gap-2.5">
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-white">
                              <span className="mr-2 rounded-full bg-[#4285f4]/25 px-2 py-0.5 text-xs text-[#d2e3fc]">1</span>
                              Add your YouTube Live link
                            </p>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                hasBroadcastLink
                                  ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                                  : "border border-white/15 bg-white/5 text-slate-300"
                              }`}
                            >
                              {hasBroadcastLink ? "Done" : "Pending"}
                            </span>
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-white">
                              <span className="mr-2 rounded-full bg-[#4285f4]/25 px-2 py-0.5 text-xs text-[#d2e3fc]">2</span>
                              Check the link status
                            </p>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                !hasBroadcastLink
                                  ? "border border-white/15 bg-white/5 text-slate-300"
                                  : broadcastLinkLooksValid
                                    ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                                    : "border border-amber-400/40 bg-amber-500/10 text-amber-200"
                              }`}
                            >
                              {!hasBroadcastLink ? "Waiting" : broadcastLinkLooksValid ? "Looks good" : "Needs fix"}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                            <span
                              className={`rounded-full px-2.5 py-1 font-semibold ${
                                broadcastHealthState === "reachable"
                                  ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                                  : broadcastHealthState === "checking"
                                    ? "border border-[#4285f4]/40 bg-[#4285f4]/10 text-[#d2e3fc]"
                                    : broadcastHealthState === "invalid"
                                      ? "border border-amber-400/40 bg-amber-500/10 text-amber-200"
                                      : "border border-white/15 bg-white/5 text-slate-300"
                              }`}
                            >
                              {broadcastHealthState === "reachable"
                                ? "Auto-check: link verified"
                                : broadcastHealthState === "checking"
                                  ? "Auto-check: checking now..."
                                  : broadcastHealthState === "invalid"
                                    ? "Auto-check: invalid YouTube link"
                                    : broadcastHealthState === "needs_link"
                                      ? "Auto-check: waiting for link"
                                      : "Auto-check: pending"}
                            </span>
                            {broadcastHealthCheckedAt ? (
                              <span className="text-slate-400">
                                Last check: {isHydrated ? new Date(broadcastHealthCheckedAt).toLocaleTimeString() : "now"}
                              </span>
                            ) : null}
                          </div>
                          <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-slate-200">
                            <li>Confirm your stream is live in YouTube Studio.</li>
                            <li>Copy the live watch link again, then tap <strong>Paste link</strong>.</li>
                            <li>If still blank, refresh this page once.</li>
                          </ol>
                        </div>
                      </div>
                    </details>
                  </div>
                ) : null}

                {classSetupWizardStep === 1 ? (
                  <>
                    <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/[0.07] px-3 py-2 text-xs text-emerald-100">
                      <span className="font-semibold text-emerald-200">Optional settings.</span> Use these only if needed.
                      You can create a class without filling them.
                    </div>
                    {showAdvancedSessionFields ? (
                      <>
                        {!editingSessionId ? (
                          <button
                            type="button"
                            onClick={() => setShowAdvancedSessionSetup(false)}
                            className="self-start rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                          >
                            Hide more settings
                          </button>
                        ) : null}
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-white">Description</span>
                          <textarea
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            className="min-h-20 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
                            placeholder="What this class covers"
                          />
                        </label>

                        {organizations.length > 0 ? (
                          <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-sm font-semibold text-white">Organization &amp; access</p>
                            <label className="block">
                              <span className="mb-2 block text-sm font-medium text-white">Organization</span>
                              <select
                                value={sessionOrgId ?? ""}
                                onChange={(event) => setSessionOrgId(Number(event.target.value) || null)}
                                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
                              >
                                {organizations.map((org) => (
                                  <option key={org.id} value={org.id}>
                                    {org.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                              <input
                                type="checkbox"
                                checked={openEnrollment}
                                onChange={(event) => setOpenEnrollment(event.target.checked)}
                                className="h-4 w-4 rounded border-white/20 bg-transparent"
                              />
                              Open enrollment (learners can self-join with the room code)
                            </label>
                            <label className="block">
                              <span className="mb-2 block text-sm font-medium text-white">
                                Program / cohort (optional)
                              </span>
                              <select
                                value={sessionProgramId ?? ""}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setSessionProgramId(value === "" ? null : Number(value));
                                }}
                                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
                              >
                                <option value="">None</option>
                                {programsForSelectedOrg.map((program) => (
                                  <option key={program.id} value={program.id}>
                                    {program.title}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <div className="grid gap-2 rounded-xl border border-white/10 bg-black/25 p-3">
                              <p className="text-xs font-semibold text-slate-300">New holiday program</p>
                              <input
                                value={newProgramTitle}
                                onChange={(event) => setNewProgramTitle(event.target.value)}
                                placeholder="Program title"
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                              />
                              <div className="grid gap-2 md:grid-cols-2">
                                <input
                                  type="datetime-local"
                                  value={newProgramStart}
                                  onChange={(event) => setNewProgramStart(event.target.value)}
                                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                                />
                                <input
                                  type="datetime-local"
                                  value={newProgramEnd}
                                  onChange={(event) => setNewProgramEnd(event.target.value)}
                                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => void handleQuickCreateProgram()}
                                className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
                              >
                                Save program
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {sessionOrgId ? (
                          <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-sm font-semibold text-white">School roster</p>
                            <p className="text-xs text-slate-400">
                              Add a learner by username (they must already have an account).
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <input
                                value={memberUsername}
                                onChange={(event) => setMemberUsername(event.target.value)}
                                placeholder="username"
                                className="min-w-[10rem] flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => void handleInviteOrgMember()}
                                className="rounded-xl bg-emerald-600/90 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
                              >
                                Add as student
                              </button>
                            </div>
                            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-slate-300">
                              {orgMembers.map((member) => (
                                <li
                                  key={member.user_id}
                                  className="flex items-center justify-between gap-2 rounded-lg bg-black/20 px-2 py-1"
                                >
                                  <span className="font-medium text-white">{member.full_name}</span>
                                  <span className="flex items-center gap-2">
                                    <span className="text-slate-400">{member.role}</span>
                                    {member.username !== currentUsername ? (
                                      <button
                                        type="button"
                                        onClick={() => void handleRemoveOrgMember(member.user_id)}
                                        disabled={removingMemberId === member.user_id}
                                        className="text-[11px] font-semibold text-rose-300 hover:text-rose-200 disabled:opacity-50"
                                      >
                                        {removingMemberId === member.user_id ? "…" : "Remove"}
                                      </button>
                                    ) : null}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-sm font-semibold text-white">Optional settings</p>
                        <p className="mt-1 text-xs text-slate-300">
                          Open only when you want to add description, organization, roster, or materials.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowAdvancedSessionSetup(true)}
                          className="mt-3 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                        >
                          Open optional settings
                        </button>
                      </div>
                    )}

                {showAdvancedSessionFields && selectedSessionId ? (
                  <details className="group rounded-2xl border border-white/10 bg-white/[0.03] open:border-[#4285f4]/30">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-white marker:content-none [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center justify-between gap-2">
                        <span>Students &amp; handouts (optional)</span>
                        <span className="text-xs font-normal text-slate-400 group-open:hidden">Tap to expand</span>
                        <span className="hidden text-xs font-normal text-slate-400 group-open:inline">Tap to hide</span>
                      </span>
                    </summary>
                    <div className="space-y-4 border-t border-white/10 px-4 pb-4 pt-2">
                    <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-sm font-semibold text-white">Add a student to this class</p>
                      <p className="text-xs text-slate-400">
                        Pick a learner from your school, or share the room code so they can join on their own.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                        <label className="block min-w-0">
                          <span className="mb-2 block text-xs font-medium text-slate-300">Student</span>
                          <select
                            value={selectedStudentId ?? ""}
                            onChange={(event) => setSelectedStudentId(Number(event.target.value) || null)}
                            disabled={
                              !selectedSession || !availableStudents.length || loadingStudents || mutatingEnrollment
                            }
                            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {loadingStudents ? <option value="">Loading…</option> : null}
                            {!loadingStudents && !availableStudents.length ? (
                              <option value="">Everyone on your list is already in this class</option>
                            ) : null}
                            {availableStudents.map((student) => (
                              <option key={student.id} value={student.id}>
                                {student.full_name}
                                {student.school_class ? ` (${student.school_class})` : ""}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={handleAssignStudent}
                          disabled={!selectedSession || !selectedStudentId || mutatingEnrollment}
                          className="mt-auto rounded-2xl bg-[#4285f4] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#5b95f5] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {mutatingEnrollment ? "Adding…" : "Add to class"}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowRosterTools((open) => !open)}
                        className="text-left text-xs font-semibold text-[#8ab4f8] underline-offset-2 hover:underline"
                      >
                        {showRosterTools ? "Hide" : "Need to remove someone or use breakout groups?"} — click here
                      </button>
                      {showRosterTools ? (
                        <div className="max-h-[min(50vh,420px)] space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/25 p-3">
                          {!sortedEnrollments.length ? (
                            <p className="text-xs text-slate-400">No students enrolled yet.</p>
                          ) : (
                            sortedEnrollments.map((enrollment) => {
                              const draft = enrollmentDrafts[enrollment.student_id] ?? {
                                access_status: enrollment.access_status,
                                progress: enrollment.progress,
                              };
                              return (
                                <div
                                  key={enrollment.student_id}
                                  className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm"
                                >
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                      <p className="font-semibold text-white">{enrollment.full_name}</p>
                                      <p className="text-xs text-slate-400">
                                        {enrollment.email}
                                        {enrollment.school_class ? ` • Class ${enrollment.school_class}` : ""}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveStudent(enrollment.student_id, enrollment.full_name)}
                                      disabled={mutatingEnrollment}
                                      className="rounded-lg border border-rose-400/30 px-2 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                  <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                                    <select
                                      value={draft.access_status}
                                      onChange={(event) =>
                                        handleEnrollmentDraftChange(
                                          enrollment.student_id,
                                          "access_status",
                                          event.target.value as EnrollmentDraft["access_status"],
                                        )
                                      }
                                      className="rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-xs text-white outline-none"
                                    >
                                      <option value="live_now">Live now</option>
                                      <option value="upcoming">Upcoming</option>
                                      <option value="paid">Paid</option>
                                      <option value="locked">Locked</option>
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEnrollment(enrollment)}
                                      disabled={savingEnrollmentId === enrollment.student_id}
                                      className="rounded-lg bg-[#4285f4] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                    >
                                      {savingEnrollmentId === enrollment.student_id ? "Saving…" : "Save"}
                                    </button>
                                  </div>
                                  {currentDashboard.breakout_rooms.length ? (
                                    <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto]">
                                      <select
                                        value={breakoutRoomAssignments.get(enrollment.student_id) ?? ""}
                                        onChange={(event) =>
                                          void handleMoveStudentBreakout(
                                            enrollment.student_id,
                                            event.target.value ? Number(event.target.value) : null,
                                          )
                                        }
                                        disabled={movingBreakoutStudentId === enrollment.student_id}
                                        className="rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-xs text-white outline-none disabled:opacity-50"
                                      >
                                        <option value="">Main room</option>
                                        {currentDashboard.breakout_rooms.map((room) => (
                                          <option key={room.id} value={room.id}>
                                            {room.name}
                                          </option>
                                        ))}
                                      </select>
                                      <span className="self-center text-[10px] text-slate-400">
                                        {movingBreakoutStudentId === enrollment.student_id ? "Moving…" : "Breakout"}
                                      </span>
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })
                          )}
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm font-semibold text-white">Async materials (links)</p>
                    <p className="text-xs text-slate-400">Shown to students on their dashboard for this class.</p>
                    <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
                      <input
                        value={resourceTitle}
                        onChange={(event) => setResourceTitle(event.target.value)}
                        placeholder="Title"
                        className="min-w-[8rem] flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                      />
                      <input
                        value={resourceUrl}
                        onChange={(event) => setResourceUrl(event.target.value)}
                        placeholder="https://… (optional if you upload)"
                        className="min-w-[12rem] flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                      />
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10">
                        <input
                          type="file"
                          className="hidden"
                          onChange={(event) => setResourceFile(event.target.files?.[0] ?? null)}
                        />
                        {resourceFile ? resourceFile.name : "Upload file"}
                      </label>
                      <button
                        type="button"
                        onClick={() => void handleAddSessionResource()}
                        className="rounded-xl bg-[#4285f4] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#5b95f5]"
                      >
                        Add material
                      </button>
                    </div>
                    <ul className="space-y-2 text-sm">
                      {sessionResources.map((resource) => (
                        <li
                          key={resource.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                        >
                          <a
                            href={resource.file_url || resource.url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-[#8ab4f8] underline-offset-2 hover:underline"
                          >
                            {resource.title}
                          </a>
                          <button
                            type="button"
                            onClick={() => void handleRemoveSessionResource(resource.id)}
                            className="text-xs font-semibold text-rose-300 hover:text-rose-200"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                    </div>
                  </details>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  {selectedSession && !draftingNewSession ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
                      Room code: {selectedSession.room_code}
                    </span>
                  ) : null}
                  {draftingNewSession ? (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-100">
                      Your room code appears after you tap Start class
                    </span>
                  ) : null}
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
                    {loadingSessionDetail ? "Refreshing room..." : `${enrollments.length} students in room`}
                  </span>
                  {selectedSessionId ? (
                    <button
                      type="button"
                      onClick={() => void handleDownloadRosterPdf()}
                      disabled={exportingEnrollments || enrollments.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-600/15 px-3 py-2 font-semibold text-emerald-200 transition hover:bg-emerald-600/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden />
                      {exportingEnrollments ? "Preparing…" : "Download roster (PDF)"}
                    </button>
                  ) : null}
                  {selectedSession ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
                      {selectedSession.delivery_mode === "broadcast"
                        ? `Broadcast lecture • ${selectedSession.expected_participants} expected`
                        : `Interactive room • ${selectedSession.expected_participants} expected`}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void handlePublish()}
                    disabled={saving}
                    className="flex-1 rounded-2xl bg-[#4285f4] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#5b95f5] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving…" : editingSessionId ? "Save changes" : "Create class"}
                  </button>
                  {selectedSession ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedSession.id)}
                      className="rounded-2xl border border-rose-400/30 px-4 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10"
                    >
                      Delete room
                    </button>
                  ) : null}
                </div>
                  </>
                ) : null}

                {classSetupWizardStepCount > 1 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                    <button
                      type="button"
                      onClick={handleClassSetupWizardBack}
                      disabled={classSetupWizardStep <= 1}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                      Back
                    </button>
                    {classSetupWizardStep < classSetupWizardStepCount ? (
                      <button
                        type="button"
                        onClick={() => void handleClassSetupWizardNext()}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#4285f4] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5b95f5]"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      </button>
                    ) : (
                      <span className="max-w-[14rem] text-right text-[11px] text-slate-400 sm:max-w-none">
                        {deliveryMode === "broadcast"
                          ? "Optional details above — then create or save your class."
                          : "Create your class, then use Students and Activities tabs."}
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
          </div>
        ) : null}

        {activePanel === "students" ? (
          <div className="space-y-4">
            {!simpleViewEnabled || showAdvancedControls ? (
            <div className="rounded-[28px] border border-white/10 bg-[#15171a] p-5 text-white">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Waiting room</h2>
                  <p className="text-sm text-slate-300">Approve learners before they enter the live room.</p>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-[#8ab4f8]">
                  {currentDashboard.room_state.join_approval_enabled ? `${waitingRoomCount} waiting` : "Off"}
                </span>
              </div>
              {studentStreamOptions.length ? (
                <div className="mb-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Class stream filter
                    </span>
                    <select
                      value={studentStreamFilter}
                      onChange={(event) => setStudentStreamFilter(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400 sm:w-auto"
                    >
                      <option value="all">All streams</option>
                      {studentStreamOptions.map((stream) => (
                        <option key={stream} value={stream}>
                          {stream}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
              {currentDashboard.room_state.join_approval_enabled ? (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleBulkApproveJoinRequests()}
                    disabled={bulkApprovingJoinRequests || filteredWaitingRoomQueue.length === 0}
                    className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {bulkApprovingJoinRequests
                      ? "Approving..."
                      : `Bulk approve${studentStreamFilter === "all" ? "" : ` (${studentStreamFilter})`}`}
                  </button>
                  <span className="text-xs text-slate-400">
                    {filteredWaitingRoomQueue.length} waiting in current filter
                  </span>
                </div>
              ) : null}
              <div className="space-y-3">
                {currentDashboard.room_state.join_approval_enabled ? (
                  filteredWaitingRoomQueue.length ? (
                    filteredWaitingRoomQueue.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{entry.name}</p>
                            {entry.school_class ? (
                              <p className="mt-1 text-xs font-semibold text-[#8ab4f8]">Class {entry.school_class}</p>
                            ) : null}
                            <p className="mt-1 text-sm text-slate-300">{entry.reason}</p>
                            <p className="mt-2 text-xs font-medium text-slate-300">Waiting {entry.wait}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => void handleUpdateJoinRequest(entry.id, entry.name, "approve")}
                              disabled={updatingJoinRequestId === entry.id}
                              className="rounded-xl bg-[#4285f4] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#5b95f5] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {updatingJoinRequestId === entry.id ? "Saving..." : "Approve"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleUpdateJoinRequest(entry.id, entry.name, "deny")}
                              disabled={updatingJoinRequestId === entry.id}
                              className="rounded-xl border border-rose-400/30 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Deny
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                      No learners waiting for this stream right now.
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    Turn on the waiting room from the control bar to approve students before entry.
                  </div>
                )}
              </div>
            </div>
            ) : null}
            <div
              className="min-w-0 overflow-hidden rounded-2xl border border-[#e1dfdd] bg-gradient-to-b from-[#ffffff] via-[#faf9f8] to-[#f3f2f1] p-4 text-[#242424] shadow-[0_2px_12px_rgba(0,0,0,0.06),0_8px_28px_rgba(15,108,189,0.06)] sm:p-5"
              style={{ fontFamily: "'Segoe UI', 'Segoe UI Web (West European)', system-ui, -apple-system, sans-serif" }}
            >
              <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 max-w-full flex-1 space-y-2">
                  <p className="inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-full border border-[#0f6cbd]/20 bg-gradient-to-r from-[#0f6cbd]/10 to-transparent px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#0f6cbd]">
                    <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                    Small group work
                  </p>
                  <h2 className="bg-gradient-to-r from-[#1a1a1a] to-[#424242] bg-clip-text text-lg font-bold tracking-tight text-transparent sm:text-xl">
                    Breakout rooms
                  </h2>
                  <p className="text-sm leading-relaxed text-[#605e5c]">
                    Send students into smaller groups to talk or work together. When you are finished, bring everyone back to the
                    main class.
                  </p>
                </div>
                <span
                  className={`inline-flex w-fit max-w-full shrink-0 items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ${
                    currentDashboard.room_state.breakout_enabled
                      ? "border border-[#107c10]/30 bg-gradient-to-r from-[#dff6dd] to-[#c8e6c9] text-[#0e700e]"
                      : "border border-[#edebe9] bg-white/90 text-[#605e5c] backdrop-blur-sm"
                  }`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${currentDashboard.room_state.breakout_enabled ? "animate-pulse bg-[#107c10]" : "bg-[#a19f9d]"}`}
                    aria-hidden
                  />
                  <span className="truncate">
                    {currentDashboard.room_state.breakout_enabled
                      ? `${currentDashboard.breakout_rooms.length} groups live`
                      : "Not started"}
                  </span>
                </span>
              </div>

              <div className="min-w-0 rounded-2xl border border-[#edebe9] bg-white/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_24px_rgba(0,0,0,0.04)] backdrop-blur-sm sm:p-5">
                <div className="mb-4 flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f6cbd] to-[#004578] text-sm font-bold text-white shadow-lg shadow-[#0f6cbd]/25">
                    1
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#242424]">Set up groups</p>
                    <p className="text-[11px] font-medium leading-snug text-[#605e5c]">Choose how many small groups to open</p>
                  </div>
                </div>
                <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,220px)_minmax(0,1fr)] xl:items-end">
                  <label className="flex min-w-0 flex-col gap-2">
                    <span className="text-xs font-semibold text-[#323130]">Number of groups</span>
                    <div className="relative min-w-0">
                      <LayoutGrid className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#605e5c]" aria-hidden />
                      <select
                        value={breakoutRoomCount}
                        onChange={(event) => setBreakoutRoomCount(Number(event.target.value))}
                        disabled={managingBreakouts}
                        className="h-11 w-full min-w-0 appearance-none rounded-xl border-2 border-[#e1dfdd] bg-gradient-to-b from-white to-[#faf9f8] pl-10 pr-4 text-sm font-medium text-[#242424] shadow-inner outline-none transition hover:border-[#0f6cbd]/40 focus:border-[#0f6cbd] focus:ring-4 focus:ring-[#0f6cbd]/15 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {[2, 3, 4, 5, 6].map((count) => (
                          <option key={count} value={count}>
                            {count} groups
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>
                  <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => void handleCreateBreakouts()}
                      disabled={
                        !selectedSession ||
                        managingBreakouts ||
                        enrollments.length < 2 ||
                        broadcastOnlyClassroom ||
                        (selectedSession?.expected_participants ?? 0) > 200
                      }
                      className="inline-flex min-h-[2.75rem] min-w-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#3d94ec] to-[#0f6cbd] px-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(15,108,189,0.4)] outline-none transition hover:from-[#4a9eee] hover:to-[#115ea3] hover:shadow-[0_6px_20px_rgba(15,108,189,0.45)] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#0f6cbd] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                    >
                      <UsersRound className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
                      <span className="truncate text-center">
                        {managingBreakouts
                          ? "Please wait…"
                          : currentDashboard.room_state.breakout_enabled
                            ? "Make new groups"
                            : "Start small groups"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleClearBreakouts()}
                      disabled={!currentDashboard.room_state.breakout_enabled || managingBreakouts}
                      aria-label="Bring everyone back to the main class"
                      className="inline-flex min-h-[2.75rem] min-w-0 items-center justify-center gap-2 rounded-xl border-2 border-rose-200 bg-gradient-to-b from-white to-rose-50/90 px-4 py-3 text-sm font-bold text-[#a4262c] shadow-sm outline-none transition hover:border-rose-300 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                    >
                      <DoorOpen className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="text-center leading-tight">Bring everyone back</span>
                    </button>
                  </div>
                </div>
                <p className="mt-3 flex items-start gap-2 rounded-lg bg-[#f3f2f1]/80 px-3 py-2 text-xs leading-relaxed text-[#605e5c]">
                  <BadgeHelp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0f6cbd]" aria-hidden />
                  <span className="min-w-0 break-words">
                    You need at least two students in this class. Students are split evenly across the groups you pick.
                  </span>
                </p>
              </div>

              {!currentDashboard.room_state.breakout_enabled && currentDashboard.room_state.last_breakout_layout_available ? (
                <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void handleCreateBreakouts(true)}
                    disabled={
                      !selectedSession ||
                      managingBreakouts ||
                      broadcastOnlyClassroom ||
                      (selectedSession?.expected_participants ?? 0) > 200
                    }
                    className="inline-flex min-h-[2.5rem] w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-[#c8c6c4] bg-white px-3 py-2 text-left text-xs font-bold text-[#242424] shadow-sm transition hover:border-[#0f6cbd]/35 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 sm:justify-start"
                  >
                    <RefreshCw className="h-3.5 w-3.5 shrink-0 text-[#0f6cbd]" aria-hidden />
                    <span className="min-w-0 break-words">{managingBreakouts ? "Please wait…" : "Use the same groups as last time"}</span>
                  </button>
                  {currentDashboard.last_breakout_summary ? (
                    <button
                      type="button"
                      onClick={() => setShowLastBreakoutSummary(true)}
                      className="inline-flex min-h-[2.5rem] w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-[#0f6cbd]/25 bg-gradient-to-r from-[#0f6cbd]/8 to-transparent px-3 py-2 text-left text-xs font-bold text-[#0f6cbd] shadow-sm transition hover:border-[#0f6cbd]/40 hover:shadow sm:justify-start"
                    >
                      <History className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="min-w-0 break-words">See summary from last time</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
              {!currentDashboard.room_state.breakout_enabled && currentDashboard.last_breakout_summary ? (
                <div className="mt-4 rounded-xl border border-[#edebe9] bg-gradient-to-br from-[#f3f2f1] to-white p-4 shadow-inner">
                  <p className="text-xs font-bold text-[#242424]">Last time you used groups</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#605e5c]">
                    You had {currentDashboard.last_breakout_summary.room_count} groups with{" "}
                    {currentDashboard.last_breakout_summary.total_learners} students in total.
                  </p>
                </div>
              ) : null}
              {broadcastOnlyClassroom || (selectedSession?.expected_participants ?? 0) > 200 ? (
                <div className="mt-4 break-words rounded-xl border border-amber-200/80 bg-gradient-to-r from-[#fff9e6] to-[#fff4ce] p-4 text-xs font-medium leading-relaxed text-[#323130] shadow-sm">
                  For very large broadcast-style classes, small groups are turned off. Run the main lesson here, then use a
                  smaller class later if you need group work.
                </div>
              ) : null}
              <div className="mt-6 min-w-0 space-y-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#605e5c] to-[#3b3a39] text-sm font-bold text-white shadow-md">
                    2
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#242424]">While groups run</p>
                    <p className="text-[11px] font-medium leading-snug text-[#605e5c]">Timer and messages (optional)</p>
                  </div>
                </div>

                <div className="min-w-0 rounded-2xl border border-[#edebe9] bg-white/95 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.05)] backdrop-blur-sm sm:p-5">
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#479ef5] to-[#0f6cbd] text-white shadow-lg shadow-[#0f6cbd]/30">
                        <Timer className="h-5 w-5" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#242424]">Timer for everyone</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-[#605e5c]">
                          Students see this clock in their small groups. When time runs out, groups close and students return to
                          you automatically.
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex max-w-full items-center gap-1.5 self-start rounded-full border border-[#0f6cbd]/20 bg-gradient-to-r from-[#e8f4fc] to-white px-3 py-1.5 text-xs font-bold text-[#0f6cbd] shadow-sm sm:max-w-[min(100%,14rem)] sm:shrink-0">
                      <Timer className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                      <span className="min-w-0 truncate">{breakoutTimerLabel ?? "No timer"}</span>
                    </span>
                  </div>
                  <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,160px)_minmax(0,1fr)] lg:items-end">
                    <label className="flex min-w-0 flex-col gap-2">
                      <span className="text-xs font-semibold text-[#323130]">How long?</span>
                      <select
                        value={breakoutTimerMinutes}
                        onChange={(event) => setBreakoutTimerMinutes(Number(event.target.value))}
                        disabled={!currentDashboard.room_state.breakout_enabled || mutatingRoomState}
                        className="h-11 w-full min-w-0 rounded-xl border-2 border-[#e1dfdd] bg-gradient-to-b from-white to-[#faf9f8] px-3 text-sm font-medium text-[#242424] shadow-inner outline-none transition hover:border-[#0f6cbd]/35 focus:border-[#0f6cbd] focus:ring-4 focus:ring-[#0f6cbd]/12 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {[3, 5, 10, 15, 20, 30].map((minutes) => (
                          <option key={minutes} value={minutes}>
                            {minutes} min
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => void handleStartBreakoutTimer()}
                        disabled={!currentDashboard.room_state.breakout_enabled || mutatingRoomState}
                        className="inline-flex min-h-[2.75rem] min-w-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#3d94ec] to-[#0f6cbd] px-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(15,108,189,0.35)] transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Timer className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="truncate">
                          {mutatingRoomState
                            ? "Saving…"
                            : currentDashboard.room_state.breakout_timer_ends_at
                              ? "Start again"
                              : "Start timer"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleClearBreakoutTimer()}
                        disabled={!currentDashboard.room_state.breakout_timer_ends_at || mutatingRoomState}
                        className="inline-flex min-h-[2.75rem] min-w-0 items-center justify-center gap-2 rounded-xl border-2 border-[#d2d0ce] bg-gradient-to-b from-white to-[#f3f2f1] px-3 text-sm font-bold text-[#323130] shadow-sm transition hover:border-[#8a8886] hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="truncate">Remove timer</span>
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 min-w-0">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#605e5c]">Need more time?</p>
                    <div className="flex min-w-0 flex-wrap gap-2">
                      {[1, 3, 5].map((minutes) => (
                        <button
                          key={minutes}
                          type="button"
                          onClick={() => void handleExtendBreakoutTimer(minutes)}
                          disabled={!currentDashboard.room_state.breakout_timer_ends_at || mutatingRoomState}
                          className="min-h-[2.25rem] min-w-[4.5rem] flex-1 rounded-full border border-[#c8c6c4] bg-gradient-to-b from-white to-[#f3f2f1] px-3 py-2 text-center text-xs font-bold text-[#242424] shadow-sm transition hover:-translate-y-0.5 hover:border-[#0f6cbd]/30 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:flex-initial"
                        >
                          +{minutes} min
                        </button>
                      ))}
                    </div>
                  </div>
                  {breakoutTimerWarningActive ? (
                    <div className="mt-4 break-words rounded-xl border border-amber-300/60 bg-gradient-to-r from-[#fffbeb] to-[#fff4ce] px-3 py-3 text-xs font-medium leading-relaxed text-[#8b6914] shadow-sm sm:px-4">
                      About one minute left — ask groups to wrap up. When the clock hits zero, small groups will close on their
                      own.
                    </div>
                  ) : null}
                </div>

                <div className="min-w-0 rounded-2xl border border-[#edebe9] bg-white/95 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.05)] backdrop-blur-sm sm:p-5">
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8764b8] to-[#5c2d91] text-white shadow-lg shadow-purple-900/20">
                        <Send className="h-5 w-5" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#242424]">Send one note to every group</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-[#605e5c]">
                          Type a short message once — it goes to all small groups at the same time.
                        </p>
                      </div>
                    </div>
                    {currentDashboard.breakout_broadcast ? (
                      <span className="w-fit max-w-full shrink-0 rounded-full bg-[#f3f2f1] px-2.5 py-1 text-[10px] font-bold text-[#605e5c]">
                        <span className="block truncate">Sent {currentDashboard.breakout_broadcast.sent_at}</span>
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
                    <input
                      value={breakoutBroadcastDraft}
                      onChange={(event) => setBreakoutBroadcastDraft(event.target.value)}
                      disabled={!currentDashboard.room_state.breakout_enabled || sendingBreakoutBroadcast}
                      placeholder={
                        currentDashboard.room_state.breakout_enabled
                          ? "Short note to all groups…"
                          : "Start small groups first"
                      }
                      className="h-11 min-h-0 w-full min-w-0 flex-1 rounded-xl border-2 border-[#e1dfdd] bg-gradient-to-b from-white to-[#faf9f8] px-3 text-sm font-medium text-[#242424] placeholder:text-[#a19f9d] shadow-inner outline-none transition focus:border-[#0f6cbd] focus:ring-4 focus:ring-[#0f6cbd]/12 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSendBreakoutBroadcast()}
                      disabled={
                        !currentDashboard.room_state.breakout_enabled ||
                        sendingBreakoutBroadcast ||
                        !breakoutBroadcastDraft.trim()
                      }
                      className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#3d94ec] to-[#0f6cbd] px-4 text-sm font-bold text-white shadow-[0_4px_14px_rgba(15,108,189,0.35)] transition hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 sm:w-auto sm:min-w-[7.5rem]"
                    >
                      <Send className="h-4 w-4 shrink-0" aria-hidden />
                      {sendingBreakoutBroadcast ? "Sending…" : "Send to all"}
                    </button>
                  </div>
                  {currentDashboard.breakout_broadcast ? (
                    <div className="mt-4 min-w-0 break-words rounded-xl border border-[#e1dfdd] bg-gradient-to-r from-[#f3f2f1] to-white px-3 py-3 text-xs font-medium leading-relaxed text-[#242424] sm:px-4">
                      Last message: &quot;{currentDashboard.breakout_broadcast.message}&quot;
                    </div>
                  ) : null}
                </div>
                <div className="mt-2 min-w-0">
                  <div className="mb-3 flex min-w-0 items-center gap-2">
                    <UsersRound className="h-4 w-4 shrink-0 text-[#0f6cbd]" aria-hidden />
                    <p className="min-w-0 truncate text-sm font-bold text-[#242424]">Your groups</p>
                  </div>
                  {currentDashboard.breakout_rooms.length ? (
                    currentDashboard.breakout_rooms.map((room) => (
                      <div
                        key={room.id}
                        className="mb-3 min-w-0 rounded-2xl border border-[#e1dfdd] bg-gradient-to-b from-white to-[#faf9f8] p-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)] last:mb-0 sm:p-4"
                      >
                        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-[#242424]">{room.name}</p>
                            <p className="mt-0.5 break-words text-xs font-medium text-[#605e5c]">
                              {room.member_count} student{room.member_count === 1 ? "" : "s"}
                              {room.spokesperson_name ? (
                                <>
                                  {" "}
                                  · <span className="font-semibold text-[#323130]">Reporter: {room.spokesperson_name}</span>
                                </>
                              ) : null}
                            </p>
                          </div>
                          <div className="flex min-w-0 flex-col gap-2 sm:max-w-[55%] sm:items-end">
                            {room.teacher_present ? (
                              <span className="inline-flex w-fit max-w-full items-center gap-1 rounded-full border border-[#107c10]/25 bg-gradient-to-r from-[#dff6dd] to-[#e8f5e9] px-2.5 py-1 text-[11px] font-bold text-[#0e700e] shadow-sm">
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#107c10]" aria-hidden />
                                <span className="truncate">You are visiting</span>
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => void handleMonitorBreakoutRoom(room.teacher_present ? null : room.id)}
                              disabled={monitoringBreakoutRoomId !== null}
                              className="inline-flex w-full min-w-0 items-center justify-center gap-1.5 rounded-xl border-2 border-[#d2d0ce] bg-white px-3 py-2 text-xs font-bold text-[#242424] shadow-sm transition hover:border-[#0f6cbd]/35 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-0"
                            >
                              <DoorOpen className="h-3.5 w-3.5 shrink-0 text-[#0f6cbd]" aria-hidden />
                              <span className="truncate">
                                {monitoringBreakoutRoomId === room.id
                                  ? "Opening…"
                                  : monitoringBreakoutRoomId === -1 && room.teacher_present
                                    ? "Stepping out…"
                                    : room.teacher_present
                                      ? "Leave group"
                                      : "Visit group"}
                              </span>
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 min-w-0 space-y-2">
                          {room.students.length ? (
                            room.students.map((student) => (
                              <div
                                key={student.student_id}
                                className="flex min-w-0 flex-col gap-2 rounded-xl border border-[#edebe9] bg-white/90 px-3 py-2.5 text-xs shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                              >
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                  <span className="min-w-0 truncate font-bold text-[#242424]">{student.name}</span>
                                  {room.spokesperson_student_id === student.student_id ? (
                                    <span className="shrink-0 rounded-full border border-amber-200 bg-gradient-to-r from-[#fff4ce] to-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8f4700]">
                                      Reports to class
                                    </span>
                                  ) : null}
                                </div>
                                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
                                  <span className="shrink-0 text-xs font-medium text-[#605e5c]">{student.status}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleSetBreakoutSpokesperson(
                                        room.id,
                                        room.spokesperson_student_id === student.student_id ? null : student.student_id,
                                      )
                                    }
                                    disabled={savingSpokespersonRoomId === room.id}
                                    className="w-full min-w-0 rounded-lg border border-[#c8c6c4] bg-gradient-to-b from-white to-[#f3f2f1] px-2.5 py-1.5 text-[11px] font-bold text-[#0f6cbd] shadow-sm transition hover:border-[#0f6cbd]/40 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:max-w-[11rem]"
                                  >
                                    {savingSpokespersonRoomId === room.id
                                      ? "Saving…"
                                      : room.spokesperson_student_id === student.student_id
                                        ? "Clear reporter"
                                        : "Pick reporter"}
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-xl border border-dashed border-[#c8c6c4] bg-[#faf9f8] px-3 py-4 text-center text-xs font-medium text-[#605e5c]">
                              No students in this group yet.
                            </div>
                          )}
                        </div>
                        {room.teacher_present ? (
                          <div className="mt-4 min-w-0 rounded-xl border border-[#a7e3a5] bg-gradient-to-br from-[#f6fcf6] to-[#e8f5e9] p-3 shadow-inner sm:p-4">
                            <p className="text-xs font-bold text-[#0e700e]">Note to this group only</p>
                            <p className="mt-0.5 text-[11px] font-medium text-[#605e5c]">Only this group sees what you type here.</p>
                            <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
                              <input
                                value={breakoutChatDraft}
                                onChange={(event) => setBreakoutChatDraft(event.target.value)}
                                disabled={sendingBreakoutChatRoomId === room.id}
                                placeholder="Short note for this group…"
                                className="h-10 min-w-0 w-full flex-1 rounded-xl border-2 border-[#c8e6c9] bg-white px-3 text-xs font-medium text-[#242424] placeholder:text-[#a19f9d] outline-none transition focus:border-[#107c10] focus:ring-2 focus:ring-[#107c10]/20 disabled:cursor-not-allowed disabled:opacity-50"
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" && !event.shiftKey) {
                                    event.preventDefault();
                                    void handleSendBreakoutChat(room.id);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => void handleSendBreakoutChat(room.id)}
                                disabled={sendingBreakoutChatRoomId === room.id || !breakoutChatDraft.trim()}
                                className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-[#3d94ec] to-[#0f6cbd] px-4 text-xs font-bold text-white shadow-md transition hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 sm:w-auto sm:min-w-[5.5rem]"
                              >
                                <Send className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                {sendingBreakoutChatRoomId === room.id ? "Sending…" : "Send"}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border-2 border-dashed border-[#c8c6c4] bg-gradient-to-b from-white to-[#faf9f8] px-4 py-10 text-center">
                      <LayoutGrid className="mx-auto mb-2 h-8 w-8 text-[#a19f9d]" aria-hidden />
                      <p className="text-sm font-semibold text-[#605e5c]">No groups yet</p>
                      <p className="mx-auto mt-1 max-w-xs text-xs font-medium text-[#a19f9d]">
                        When you start small groups, each group and its students will show here.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-[#15171a] p-5 text-white">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Students</h2>
                  <p className="text-sm text-slate-300">
                    Everyone enrolled in this class. To add or change a student, open <strong className="text-slate-200">Class setup</strong>.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-[#8ab4f8]">
                    {selectedSession ? `${enrollments.length} students` : "Pick a class"}
                  </span>
                  {selectedSessionId ? (
                    <button
                      type="button"
                      onClick={() => void handleDownloadRosterPdf()}
                      disabled={exportingEnrollments || enrollments.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden />
                      Download list
                    </button>
                  ) : null}
                </div>
              </div>

              {!selectedSessionId ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-sm text-slate-400">
                  Choose your class to see who is enrolled.
                </div>
              ) : !enrollments.length ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-sm text-slate-400">
                  No students yet. Share the room code, or add someone under <strong className="text-slate-200">Class setup</strong>.
                </div>
              ) : (
                <ol className="max-h-[min(60vh,520px)] list-none space-y-0 overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-black/20">
                  {sortedEnrollments.map((enrollment, index) => (
                    <li
                      key={enrollment.student_id}
                      className={`flex gap-3 border-b border-white/[0.06] px-4 py-3 last:border-b-0 ${
                        index % 2 === 0 ? "bg-white/[0.02]" : "bg-[#1a1c20]/80"
                      }`}
                    >
                      <span className="w-8 shrink-0 pt-0.5 text-right text-xs tabular-nums text-slate-500">
                        {index + 1}.
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-snug text-white">{enrollment.full_name}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {enrollment.email}
                          {enrollment.school_class ? ` • Class ${enrollment.school_class}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        ) : null}

        {activePanel === "engagement" ? (
          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-[#15171a] p-5 text-white">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Ops snapshot</h2>
                  <p className="text-sm text-slate-300">System-wide counters and dependencies health.</p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadOpsMetrics()}
                  disabled={loadingOpsMetrics}
                  className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingOpsMetrics ? "Refreshing..." : "Refresh"}
                </button>
              </div>
              {opsMetricsError ? (
                <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {opsMetricsError}
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-300">Pending Q&A</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{opsMetrics?.pending_qa_count ?? "--"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-300">Active sessions</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{opsMetrics?.active_session_count ?? "--"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-300">Waiting room</p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {opsMetrics?.waiting_room_request_count ?? "--"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-300">Raised hands</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{opsMetrics?.open_raise_hand_count ?? "--"}</p>
                </div>
              </div>
              {opsMetrics ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      opsMetrics.database_ok ? "bg-emerald-500/20 text-emerald-100" : "bg-rose-500/20 text-rose-100"
                    }`}
                  >
                    DB {opsMetrics.database_ok ? "ok" : "down"}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      opsMetrics.redis_ok ? "bg-emerald-500/20 text-emerald-100" : "bg-amber-500/20 text-amber-100"
                    }`}
                  >
                    Redis {opsMetrics.redis_ok ? "ok" : "degraded"}
                  </span>
                  <span className="text-xs text-slate-300">
                    Updated{" "}
                    {isHydrated
                      ? new Date(opsMetrics.generated_at).toLocaleTimeString()
                      : "Live sync"}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[#15171a] p-5 text-white">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">Live actions</h2>
                  <p className="text-sm text-slate-300">The key things to handle during the call.</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-[#8ab4f8]">
                    {liveAttendanceCount} live
                  </span>
                  {qaQueueMetric ? (
                    <span
                      className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-100"
                      title={qaQueueMetric.detail}
                    >
                      Q&amp;A {qaQueueMetric.value}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                {currentDashboard.attendance.map((row) => {
                  const draft = attendanceDrafts[row.student_id] ?? { status: row.status };

                  return (
                    <div key={row.student_id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{row.name}</p>
                          <p className="mt-1 text-xs text-slate-300">
                            {row.joined_at} · {row.payment}
                          </p>
                        </div>
                        <select
                          value={draft.status}
                          onChange={(event) =>
                            handleAttendanceDraftChange(
                              row.student_id,
                              event.target.value as AttendanceDraft["status"],
                            )
                          }
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400"
                        >
                          <option value="Present">Present</option>
                          <option value="Pending">Pending</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveAttendance(row.student_id, row.name)}
                        disabled={savingAttendanceId === row.student_id}
                        className="mt-4 rounded-xl bg-[#4285f4] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#5b95f5] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingAttendanceId === row.student_id ? "Saving..." : "Save attendance"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[#15171a] p-5 text-white">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Raise hand queue</h2>
                  <p className="text-sm text-slate-300">Resolve learner requests quickly.</p>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-[#8ab4f8]">
                  {openHandsCount} open
                </span>
              </div>
              {liveRaiseHandSignals.length ? (
                <div className="mb-4 space-y-2">
                  {liveRaiseHandSignals.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 rounded-2xl border border-[#4285f4]/30 bg-[#4285f4]/10 px-4 py-3 text-sm text-white"
                    >
                      <Hand className="h-4 w-4 text-[#8ab4f8]" />
                      <div>
                        <p className="font-semibold">{entry.name}</p>
                        <p className="text-slate-300">{entry.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {activeSpeakerName ? (
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                  <Mic className="h-3.5 w-3.5" />
                  <span>Live speaker: {activeSpeakerName}</span>
                </div>
              ) : null}
              <div className="space-y-3">
                {currentDashboard.raise_hand_queue.length ? (
                  currentDashboard.raise_hand_queue.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{entry.name}</p>
                        <p className="mt-1 text-sm text-slate-300">{entry.reason}</p>
                        <p className="mt-2 text-xs font-medium text-slate-300">Waiting {entry.wait}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {activeSpeakerRequestId === entry.id ? (
                          <button
                            type="button"
                            onClick={() => handleRevokeSpeaking(entry.id, entry.name)}
                            disabled={revokingSpeakerRequestId === entry.id}
                            className="rounded-xl border border-rose-300/50 bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-50 transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {revokingSpeakerRequestId === entry.id ? "Muting..." : "Mute learner"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleGrantSpeaking(entry.id, entry.name)}
                            disabled={
                              grantingSpeakerRequestId === entry.id ||
                              !speakRequestUsernamesRef.current.has(entry.id)
                            }
                            className="rounded-xl border border-emerald-300/50 bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-50 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {grantingSpeakerRequestId === entry.id ? "Allowing..." : "Allow to speak"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleResolveRaiseHand(entry.id, entry.name)}
                          disabled={resolvingRaiseHandId === entry.id}
                          className="rounded-xl bg-[#4285f4] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#5b95f5] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {resolvingRaiseHandId === entry.id ? "Resolving..." : "Resolve"}
                        </button>
                      </div>
                    </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    No active raise-hand requests right now.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {activePanel === "engagement" ? (
          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-[#15171a] p-5 text-white">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Poll control</h2>
                  <p className="text-sm text-slate-300">Create or activate live questions.</p>
                </div>
                <BookOpenText className="h-5 w-5 text-[#8ab4f8]" />
              </div>
              <div className="space-y-4">
                <input
                  value={pollQuestion}
                  onChange={(event) => setPollQuestion(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
                  placeholder="Ask learners a quick question"
                />
                <textarea
                  value={pollOptionsInput}
                  onChange={(event) => setPollOptionsInput(event.target.value)}
                  className="min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
                  placeholder={`Attendance rate\nCompletion rate\nAverage quiz score`}
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSavePoll}
                    disabled={savingPollAuthoring}
                    className="flex-1 rounded-2xl bg-[#4285f4] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#5b95f5] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingPollAuthoring ? "Saving..." : editingPollId ? "Update poll" : "Create poll"}
                  </button>
                  {editingPollId ? (
                    <button
                      type="button"
                      onClick={handleResetPollForm}
                      className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
                <div className="space-y-3">
                  {currentDashboard.polls.map((poll) => (
                    <div key={poll.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{poll.question}</p>
                          <p className="mt-1 text-xs text-slate-300">{poll.response_count} responses</p>
                        </div>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#8ab4f8]">
                          {poll.is_active ? "Active" : "Draft"}
                        </span>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleActivatePoll(poll.id, poll.question)}
                          disabled={activatingPollId === poll.id}
                          className="rounded-xl bg-[#4285f4] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#5b95f5] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {activatingPollId === poll.id ? "Activating..." : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditPoll(poll.id)}
                          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[#15171a] p-5 text-white">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Quiz control</h2>
                  <p className="text-sm text-slate-300">Launch comprehension checks during class.</p>
                </div>
                <BadgeHelp className="h-5 w-5 text-[#8ab4f8]" />
              </div>
              <div className="space-y-4">
                <input
                  value={quizQuestion}
                  onChange={(event) => setQuizQuestion(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
                  placeholder="Ask a quick comprehension question"
                />
                <textarea
                  value={quizChoicesInput}
                  onChange={(event) => setQuizChoicesInput(event.target.value)}
                  className="min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
                  placeholder={`Weekly retention chart\nInvoice ledger\nChat transcript`}
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSaveQuiz}
                    disabled={savingQuizAuthoring}
                    className="flex-1 rounded-2xl bg-[#4285f4] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#5b95f5] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingQuizAuthoring ? "Saving..." : editingQuizId ? "Update quiz" : "Create quiz"}
                  </button>
                  {editingQuizId ? (
                    <button
                      type="button"
                      onClick={handleResetQuizForm}
                      className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
                <div className="space-y-3">
                  {currentDashboard.quizzes.map((quiz) => (
                    <div key={quiz.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{quiz.question}</p>
                          <p className="mt-1 text-xs text-slate-300">{quiz.choices.length} choices</p>
                        </div>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#8ab4f8]">
                          {quiz.is_active ? "Active" : "Draft"}
                        </span>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleActivateQuiz(quiz.id, quiz.question)}
                          disabled={activatingQuizId === quiz.id}
                          className="rounded-xl bg-[#4285f4] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#5b95f5] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {activatingQuizId === quiz.id ? "Activating..." : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditQuiz(quiz.id)}
                          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[#15171a] p-5 text-white">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Q&amp;A queue</h2>
                  <p className="text-sm text-slate-300">
                    Pending main-room questions ({currentDashboard.room_state.qa_queue_pending_count} /{" "}
                    {currentDashboard.room_state.qa_queue_max_pending}).
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleApproveAllQa()}
                    disabled={
                      approvingAllQa ||
                      dismissingAllQa ||
                      mutatingRoomState ||
                      currentDashboard.qa_queue.length === 0 ||
                      currentDashboard.room_state.chat_moderation_mode !== "qa_queue"
                    }
                    className="rounded-xl bg-[#4285f4] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#5b95f5] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {approvingAllQa ? "Publishing..." : "Publish all"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDismissAllQa()}
                    disabled={
                      dismissingAllQa ||
                      approvingAllQa ||
                      mutatingRoomState ||
                      currentDashboard.qa_queue.length === 0 ||
                      currentDashboard.room_state.chat_moderation_mode !== "qa_queue"
                    }
                    className="rounded-xl border border-rose-400/40 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {dismissingAllQa ? "Dismissing..." : "Dismiss all"}
                  </button>
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    Max pending
                    <input
                      type="number"
                      min={5}
                      max={500}
                      value={qaMaxDraft}
                      onChange={(e) => setQaMaxDraft(e.target.value)}
                      onBlur={() => void handleCommitQaMaxPending()}
                      disabled={mutatingRoomState}
                      className="w-20 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm text-white outline-none focus:border-[#4285f4]"
                    />
                  </label>
                </div>
              </div>
              <div className="space-y-3">
                {currentDashboard.qa_queue.length ? (
                  currentDashboard.qa_queue.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{item.sender}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-300">Awaiting review</p>
                        </div>
                        <span className="text-xs text-slate-400">{item.time}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white">{item.message}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleModerateMessage(item.id, item.sender, "approve_qa")}
                          disabled={moderatingMessageId === item.id}
                          className="rounded-xl bg-[#4285f4] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#5b95f5] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {moderatingMessageId === item.id ? "Saving..." : "Publish to chat"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleModerateMessage(item.id, item.sender, "dismiss_qa")}
                          disabled={moderatingMessageId === item.id}
                          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    No questions waiting in the moderated queue.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[#15171a] p-5 text-white">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Chat moderation</h2>
                  <p className="text-sm text-slate-300">Pin or hide messages while teaching.</p>
                </div>
                <ClipboardList className="h-5 w-5 text-[#8ab4f8]" />
              </div>
              <div className="space-y-3">
                {currentDashboard.moderation_insights.length ? (
                  currentDashboard.moderation_insights.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{item.sender}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                            {item.role}
                          </p>
                        </div>
                        {item.is_pinned ? (
                          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-300">
                            Pinned
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white">{item.message}</p>
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleModerateMessage(item.id, item.sender, item.is_pinned ? "unpin" : "pin")
                          }
                          disabled={moderatingMessageId === item.id}
                          className="rounded-xl bg-[#4285f4] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#5b95f5] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {moderatingMessageId === item.id
                            ? "Saving..."
                            : item.is_pinned
                              ? "Unpin"
                              : "Pin"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModerateMessage(item.id, item.sender, "hide")}
                          disabled={moderatingMessageId === item.id}
                          className="rounded-xl border border-rose-400/30 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Hide
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    No active moderation insights right now.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      {simpleViewEnabled && !hideMeetingControlsForSetup ? (
        <>
          <div
            className="fixed inset-x-0 bottom-0 z-[48] h-12 bg-transparent"
            aria-hidden
            onMouseEnter={() => bumpSimpleToolbarVisibility()}
          />
          <div
            className={`fixed inset-x-0 bottom-0 z-50 flex justify-center px-2 pb-2 transition-all duration-300 ease-out ${
              simpleToolbarVisible
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-[110%] opacity-0"
            }`}
          >
            <div className="teacher-meeting-dock jitsi-teacher-toolbar jitsi-teacher-toolbar--float relative flex max-w-full flex-wrap items-center justify-center gap-1.5 overflow-visible px-2.5 py-2 sm:gap-2 sm:px-3.5">
              <div
                className="flex flex-wrap items-center justify-center gap-1 overflow-visible sm:gap-1.5"
                role="toolbar"
                aria-label="Meeting controls"
              >
                <button
                  type="button"
                  onClick={() => void handleToggleMic()}
                  disabled={micBusy || broadcastOnlyClassroom}
                  title={micEnabled ? "Mute microphone" : "Unmute microphone"}
                  aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
                  className={`${jitsiDockBtn} ${micEnabled ? jitsiDockBtnOn : jitsiDockBtnOff}`}
                  {...dockHoverHandlers(micEnabled ? "Mute microphone" : "Unmute microphone")}
                >
                  {micEnabled ? <Mic className="h-[18px] w-[18px]" /> : <MicOff className="h-[18px] w-[18px]" />}
                  <span className={getDockLabelClass(micEnabled ? "Mute microphone" : "Unmute microphone")}>
                    {micEnabled ? "Mute microphone" : "Unmute microphone"}
                  </span>
                  {micEnabled ? (
                    <span className="inline-flex h-2.5 items-end gap-px" aria-hidden="true">
                      <span
                        className={`w-px rounded-full bg-white/90 ${micSpeaking ? "opacity-100" : "opacity-40"}`}
                        style={{ height: `${3 + micInputLevel * 5}px` }}
                      />
                      <span
                        className={`w-px rounded-full bg-white/90 ${micSpeaking ? "opacity-100" : "opacity-40"}`}
                        style={{ height: `${4 + micInputLevel * 7}px` }}
                      />
                      <span
                        className={`w-px rounded-full bg-white/90 ${micSpeaking ? "opacity-100" : "opacity-40"}`}
                        style={{ height: `${3 + micInputLevel * 6}px` }}
                      />
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => void handleToggleCamera()}
                  disabled={cameraBusy || broadcastOnlyClassroom}
                  title={cameraEnabled ? "Turn camera off" : "Turn camera on"}
                  aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
                  className={`${jitsiDockBtn} ${cameraEnabled ? jitsiDockBtnOn : jitsiDockBtnOff}`}
                  {...dockHoverHandlers(cameraEnabled ? "Turn camera off" : "Turn camera on")}
                >
                  {cameraEnabled ? <Video className="h-[18px] w-[18px]" /> : <VideoOff className="h-[18px] w-[18px]" />}
                  <span className={getDockLabelClass(cameraEnabled ? "Turn camera off" : "Turn camera on")}>
                    {cameraEnabled ? "Turn camera off" : "Turn camera on"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleToggleScreenShare()}
                  disabled={screenShareBusy || broadcastOnlyClassroom}
                  title={screenShareEnabled ? "Stop presenting" : "Start presenting"}
                  aria-label={screenShareEnabled ? "Stop presenting" : "Start presenting"}
                  className={`${jitsiDockBtn} ${
                    screenShareEnabled ? jitsiDockBtnAccent : jitsiDockBtnOff
                  }`}
                  {...dockHoverHandlers(screenShareEnabled ? "Stop presenting" : "Start presenting")}
                >
                  <LayoutPanelLeft className="h-[18px] w-[18px]" />
                  <span className={getDockLabelClass(screenShareEnabled ? "Stop presenting" : "Start presenting")}>
                    {screenShareEnabled ? "Stop presenting" : "Start presenting"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActivePanel("students");
                    setShowRightPanel(true);
                  }}
                  title="Open participants panel"
                  aria-label="Participants"
                  className={`${jitsiDockBtn} ${
                    activePanel === "students" ? jitsiDockBtnAccent : jitsiDockBtnOff
                  }`}
                  {...dockHoverHandlers("Open participants panel")}
                >
                  <UsersRound className="h-[18px] w-[18px]" />
                  <span className={getDockLabelClass("Open participants panel")}>Open participants panel</span>
                </button>
                {showAdvancedControls ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        void handleToggleStudentPermission(
                          "student_raise_hand_enabled",
                          !currentDashboard.room_state.student_raise_hand_enabled,
                          {
                            on: "Hand raise on",
                            off: "Hand raise off",
                            failure: "Hand raise permission failed",
                          },
                        )
                      }
                      disabled={mutatingRoomState}
                      title={
                        currentDashboard.room_state.student_raise_hand_enabled
                          ? "Disable raised hands"
                          : "Enable raised hands"
                      }
                      className={`${jitsiDockBtn} ${
                        currentDashboard.room_state.student_raise_hand_enabled ? jitsiDockBtnOn : jitsiDockBtnOff
                      }`}
                      {...dockHoverHandlers(
                        currentDashboard.room_state.student_raise_hand_enabled
                          ? "Disable raised hands"
                          : "Enable raised hands",
                      )}
                    >
                      <Hand className="h-[18px] w-[18px]" />
                      <span
                        className={getDockLabelClass(
                          currentDashboard.room_state.student_raise_hand_enabled
                            ? "Disable raised hands"
                            : "Enable raised hands",
                        )}
                      >
                        {currentDashboard.room_state.student_raise_hand_enabled ? "Disable raised hands" : "Enable raised hands"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void handleToggleStudentPermission(
                          "student_chat_enabled",
                          !currentDashboard.room_state.student_chat_enabled,
                          {
                            on: "Student chat on",
                            off: "Student chat off",
                            failure: "Chat permission failed",
                          },
                        )
                      }
                      disabled={mutatingRoomState}
                      title={
                        currentDashboard.room_state.student_chat_enabled
                          ? "Disable student chat"
                          : "Enable student chat"
                      }
                      className={`${jitsiDockBtn} ${
                        currentDashboard.room_state.student_chat_enabled ? jitsiDockBtnOn : jitsiDockBtnOff
                      }`}
                      {...dockHoverHandlers(
                        currentDashboard.room_state.student_chat_enabled
                          ? "Disable student chat"
                          : "Enable student chat",
                      )}
                    >
                      <MessageSquareText className="h-[18px] w-[18px]" />
                      <span
                        className={getDockLabelClass(
                          currentDashboard.room_state.student_chat_enabled
                            ? "Disable student chat"
                            : "Enable student chat",
                        )}
                      >
                        {currentDashboard.room_state.student_chat_enabled ? "Disable student chat" : "Enable student chat"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleChatSlowMode()}
                      disabled={mutatingRoomState || !currentDashboard.room_state.student_chat_enabled}
                      title={
                        currentDashboard.room_state.chat_slow_mode ? "Disable slow mode" : "Enable slow mode"
                      }
                      className={`${jitsiDockBtn} ${
                        currentDashboard.room_state.chat_slow_mode
                          ? "bg-amber-600 hover:bg-amber-500"
                          : jitsiDockBtnOff
                      }`}
                      {...dockHoverHandlers(
                        currentDashboard.room_state.chat_slow_mode ? "Disable slow mode" : "Enable slow mode",
                      )}
                    >
                      <BadgeHelp className="h-[18px] w-[18px]" />
                      <span
                        className={getDockLabelClass(
                          currentDashboard.room_state.chat_slow_mode ? "Disable slow mode" : "Enable slow mode",
                        )}
                      >
                        {currentDashboard.room_state.chat_slow_mode ? "Disable slow mode" : "Enable slow mode"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActivePanel("engagement");
                        setShowRightPanel(true);
                      }}
                      title="Open activity tools"
                      className={`${jitsiDockBtn} ${
                        activePanel === "engagement" ? jitsiDockBtnAccent : jitsiDockBtnOff
                      }`}
                      {...dockHoverHandlers("Open activity tools")}
                    >
                      <ClipboardList className="h-[18px] w-[18px]" />
                      <span className={getDockLabelClass("Open activity tools")}>Open activity tools</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleClassToolsModal()}
                      title={showRightPanel ? "Close class tools" : "Open class tools"}
                      className={`${jitsiDockBtn} ${showRightPanel ? jitsiDockBtnAccent : jitsiDockBtnOff}`}
                      {...dockHoverHandlers(showRightPanel ? "Close class tools" : "Open class tools")}
                    >
                      <Sidebar className="h-[18px] w-[18px]" />
                      <span className={getDockLabelClass(showRightPanel ? "Close tools" : "Class tools")}>
                        {showRightPanel ? "Close tools" : "Class tools"}
                      </span>
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowAdvancedControls((current) => !current)}
                  aria-expanded={showAdvancedControls}
                  title={showAdvancedControls ? "Hide more controls" : "Show more controls"}
                  aria-label="More options"
                  className={`${jitsiDockBtn} ${
                    showAdvancedControls ? jitsiDockBtnAccent : jitsiDockBtnOff
                  }`}
                  {...dockHoverHandlers(showAdvancedControls ? "Hide more controls" : "Show more controls")}
                >
                  <Settings2 className="h-[18px] w-[18px]" />
                  <span className={getDockLabelClass(showAdvancedControls ? "Hide more controls" : "Show more controls")}>
                    {showAdvancedControls ? "Hide more controls" : "Show more controls"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimpleToolbarPinned((p) => !p);
                    bumpSimpleToolbarVisibility();
                  }}
                  aria-pressed={simpleToolbarPinned}
                  title={simpleToolbarPinned ? "Unpin toolbar" : "Pin toolbar"}
                  aria-label={simpleToolbarPinned ? "Unpin toolbar" : "Pin toolbar visible"}
                  className={`${jitsiDockBtn} ${simpleToolbarPinned ? jitsiDockBtnAccent : jitsiDockBtnOff}`}
                  {...dockHoverHandlers(simpleToolbarPinned ? "Unpin toolbar" : "Pin toolbar")}
                >
                  {simpleToolbarPinned ? <Pin className="h-[18px] w-[18px]" /> : <PinOff className="h-[18px] w-[18px]" />}
                  <span className={getDockLabelClass(simpleToolbarPinned ? "Unpin toolbar" : "Pin toolbar")}>
                    {simpleToolbarPinned ? "Unpin toolbar" : "Pin toolbar"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleLeaveCall}
                  title="Leave class"
                  className="group inline-flex h-12 min-w-[4.4rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl bg-rose-600 shadow-sm shadow-rose-950/35 px-3 text-[10px] font-semibold leading-tight text-white transition hover:bg-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  {...dockHoverHandlers("Leave class")}
                >
                  <PhoneOff className="h-[18px] w-[18px]" />
                  <span className={getDockLabelClass("Leave class")}>Leave class</span>
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {showLastBreakoutSummary && currentDashboard.last_breakout_summary ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl rounded-[28px] border border-white/10 bg-[#15171a] p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.36)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Last breakout summary</h2>
                <p className="mt-1 text-sm text-slate-300">
                  {currentDashboard.last_breakout_summary.room_count} rooms and{" "}
                  {currentDashboard.last_breakout_summary.total_learners} learners from the most recent breakout round.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLastBreakoutSummary(false)}
                className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {currentDashboard.last_breakout_summary.rooms.map((room) => (
                <div key={room.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="font-semibold text-white">{room.name}</p>
                  <p className="mt-1 text-xs text-slate-300">{room.member_names.length} learners</p>
                  {room.spokesperson_name ? (
                    <p className="mt-2 text-xs font-semibold text-amber-200">Speaker: {room.spokesperson_name}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {room.member_names.length ? (
                      room.member_names.map((name) => (
                        <span
                          key={`${room.name}-${name}`}
                          className="rounded-full bg-black/25 px-3 py-1 text-xs font-medium text-slate-200"
                        >
                          {name}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-300">No learners were saved in this room.</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <audio ref={speakerAudioRef} autoPlay className="hidden" />
    </div>
  );
}
