
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeHelp,
  CircleCheckBig,
  Hand,
  LayoutPanelLeft,
  Lock,
  MessageSquareText,
  Mic,
  MicOff,
  Pin,
  PinOff,
  PhoneOff,
  PlayCircle,
  Signal,
  UsersRound,
  Video,
} from "lucide-react";
import {
  ApiError,
  getStudentDashboard,
  submitStudentChatMessage,
  submitStudentEnrollByRoomCode,
  submitStudentJoinRequest,
  submitStudentPollVote,
  submitStudentQuizAnswer,
  submitStudentRaiseHand,
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
  StudentDashboardData,
  StudentRealtimeEvent,
  StudentRealtimeSnapshot,
} from "@/lib/types";

export function LiveClassroom({
  dashboard,
  currentUsername,
  accessToken,
}: {
  dashboard: StudentDashboardData;
  currentUsername: string;
  accessToken?: string;
}) {
  const addNotification = useAppStore((state) => state.addNotification);
  const [currentDashboard, setCurrentDashboard] = useState(dashboard);
  const [chatDraft, setChatDraft] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [chatCooldownSeconds, setChatCooldownSeconds] = useState(0);
  const [requestingJoin, setRequestingJoin] = useState(false);
  const [removedFromRoom, setRemovedFromRoom] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [submittingPoll, setSubmittingPoll] = useState<number | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState<number | null>(null);
  const [raisingHand, setRaisingHand] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [teacherApprovedSpeaking, setTeacherApprovedSpeaking] = useState(false);
  const [studentMicLive, setStudentMicLive] = useState(false);
  const [activePanel, setActivePanel] = useState<"chat" | "people" | "activities">("chat");
  const [simpleViewEnabled, setSimpleViewEnabled] = useState(true);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [simpleStudentToolbarVisible, setSimpleStudentToolbarVisible] = useState(true);
  const [simpleStudentToolbarPinned, setSimpleStudentToolbarPinned] = useState(false);
  const [hoveredStudentDockControl, setHoveredStudentDockControl] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [joinRoomCodeDraft, setJoinRoomCodeDraft] = useState("");
  const [joinRoomSubmitting, setJoinRoomSubmitting] = useState(false);
  const hasPaid = true;
  const [breakoutTimerNow, setBreakoutTimerNow] = useState<number | null>(null);
  const [liveCameraReady, setLiveCameraReady] = useState(false);
  const [liveScreenReady, setLiveScreenReady] = useState(false);
  const [liveAudioReady, setLiveAudioReady] = useState(false);
  const [broadcastPlaybackState, setBroadcastPlaybackState] = useState<"idle" | "loading" | "live" | "offline">("idle");
  const remoteCameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteCameraStreamRef = useRef<MediaStream | null>(null);
  const cameraPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioStreamRef = useRef<MediaStream | null>(null);
  const audioPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteScreenVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteScreenStreamRef = useRef<MediaStream | null>(null);
  const screenPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const studentMicStreamRef = useRef<MediaStream | null>(null);
  const studentSpeakerPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const studentToolbarHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastJoinStatusRef = useRef(dashboard.live_class.join_status);
  const breakoutWarningShownForRef = useRef<string | null>(null);
  const broadcastOnlyClassroom = currentDashboard.live_class.broadcast_only;
  const broadcastEmbedUrl = useMemo(
    () => normalizeYouTubeEmbedUrl(currentDashboard.live_class.youtube_embed_url),
    [currentDashboard.live_class.youtube_embed_url],
  );

  const closeStudentSpeakerPeer = useCallback(() => {
    const peerConnection = studentSpeakerPeerConnectionRef.current;
    if (peerConnection) {
      peerConnection.onicecandidate = null;
      peerConnection.onconnectionstatechange = null;
      peerConnection.close();
    }
    studentSpeakerPeerConnectionRef.current = null;
  }, []);

  const stopStudentMicPublishing = useCallback(() => {
    closeStudentSpeakerPeer();
    const stream = studentMicStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    studentMicStreamRef.current = null;
    setStudentMicLive(false);
  }, [closeStudentSpeakerPeer]);

  const joinLabel = useMemo(() => {
    if (!currentDashboard.live_class.waiting_room_enabled) {
      return "In classroom";
    }
    if (currentDashboard.live_class.join_status === "approved") {
      return "Approved";
    }
    if (currentDashboard.live_class.join_status === "pending") {
      return "Waiting for approval";
    }
    if (currentDashboard.live_class.join_status === "denied") {
      return "Ask to join again";
    }
    return "Ask to join class";
  }, [currentDashboard.live_class.join_status, currentDashboard.live_class.waiting_room_enabled, hasPaid]);
  const attendStatusLabel = useMemo(() => {
    if (!currentDashboard.live_class.waiting_room_enabled) {
      return currentDashboard.live_class.is_live ? "Live now" : "Scheduled";
    }
    if (currentDashboard.live_class.join_status === "approved") {
      return "Approved to enter";
    }
    if (currentDashboard.live_class.join_status === "pending") {
      return "Waiting for teacher approval";
    }
    if (currentDashboard.live_class.join_status === "denied") {
      return "Request denied";
    }
    return "Request needed";
  }, [
    currentDashboard.live_class.is_live,
    currentDashboard.live_class.join_status,
    currentDashboard.live_class.waiting_room_enabled,
  ]);
  const attendStatusHelp = useMemo(() => {
    if (!currentDashboard.live_class.waiting_room_enabled) {
      return "Tap Join class to enter your lesson.";
    }
    if (currentDashboard.live_class.join_status === "approved") {
      return "You are approved. Tap Join class to enter.";
    }
    if (currentDashboard.live_class.join_status === "pending") {
      return "Your request is pending. The teacher will let you in.";
    }
    if (currentDashboard.live_class.join_status === "denied") {
      return "Ask to join again when the teacher is ready.";
    }
    return "Ask to join class and wait for approval.";
  }, [currentDashboard.live_class.join_status, currentDashboard.live_class.waiting_room_enabled]);
  const canEnterRoom = hasPaid && currentDashboard.live_class.can_join_room;
  const waitingRoomBlocked = hasPaid && currentDashboard.live_class.waiting_room_enabled && !canEnterRoom;
  const todaysClasses = useMemo(() => {
    const today = new Date();
    return [...currentDashboard.courses]
      .filter((course) => {
        if (!course.starts_at) {
          return true;
        }
        const startsAt = new Date(course.starts_at);
        return startsAt.toDateString() === today.toDateString();
      })
      .sort((a, b) => {
        if (!a.starts_at || !b.starts_at) {
          return 0;
        }
        return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
      });
  }, [currentDashboard.courses]);
  const nowTimeLabel = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const teacherSpotlightActive = currentDashboard.room_state.spotlight_mode === "teacher";
  const contentSpotlightActive = currentDashboard.room_state.spotlight_mode === "content";

  useEffect(() => {
    if (!hasPaid || !broadcastOnlyClassroom) {
      setBroadcastPlaybackState("idle");
      return;
    }
    if (!broadcastEmbedUrl || !broadcastEmbedUrl.includes("youtube.com/embed/")) {
      setBroadcastPlaybackState("offline");
      return;
    }
    setBroadcastPlaybackState("loading");
    const timeout = window.setTimeout(() => {
      setBroadcastPlaybackState((current) => (current === "loading" ? "offline" : current));
    }, 12000);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [hasPaid, broadcastOnlyClassroom, broadcastEmbedUrl]);
  const participantNames = useMemo(() => {
    if (currentDashboard.room_state.breakout_enabled && currentDashboard.breakout_room) {
      const names = new Set(currentDashboard.breakout_room.member_names);
      const coach = currentDashboard.courses[0]?.coach;
      if (currentDashboard.breakout_room.teacher_present && coach) {
        names.add(coach);
      }
      names.add(currentUsername);
      return Array.from(names).slice(0, 8);
    }
    const names = new Set<string>();
    const coach = currentDashboard.courses[0]?.coach;
    if (coach) {
      names.add(coach);
    }
    names.add(currentUsername);
    currentDashboard.messages.forEach((message) => {
      names.add(message.sender);
    });

    return Array.from(names).slice(0, 8);
  }, [currentDashboard, currentUsername]);
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
  const chatMessagesByRecentTime = useMemo(() => {
    const parseMessageTime = (value: string) => {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? null : parsed;
    };

    return [...currentDashboard.messages].sort((left, right) => {
      const leftTime = parseMessageTime(left.time);
      const rightTime = parseMessageTime(right.time);

      if (leftTime !== null && rightTime !== null && leftTime !== rightTime) {
        return rightTime - leftTime;
      }
      if (leftTime !== null && rightTime === null) {
        return -1;
      }
      if (leftTime === null && rightTime !== null) {
        return 1;
      }
      return right.id - left.id;
    });
  }, [currentDashboard.messages]);
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
  const clearLiveScreen = useCallback(() => {
    screenPeerConnectionRef.current?.close();
    screenPeerConnectionRef.current = null;
    remoteScreenStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteScreenStreamRef.current = null;
    if (remoteScreenVideoRef.current) {
      remoteScreenVideoRef.current.srcObject = null;
    }
    setLiveScreenReady(false);
  }, []);

  const clearLiveCamera = useCallback(() => {
    cameraPeerConnectionRef.current?.close();
    cameraPeerConnectionRef.current = null;
    remoteCameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteCameraStreamRef.current = null;
    if (remoteCameraVideoRef.current) {
      remoteCameraVideoRef.current.srcObject = null;
    }
    setLiveCameraReady(false);
  }, []);

  const clearLiveAudio = useCallback(() => {
    audioPeerConnectionRef.current?.close();
    audioPeerConnectionRef.current = null;
    remoteAudioStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteAudioStreamRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    setLiveAudioReady(false);
  }, []);

  const ensureAudioPeerConnection = useCallback(() => {
    if (audioPeerConnectionRef.current) {
      return audioPeerConnectionRef.current;
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: getIceServers(),
    });
    const remoteStream = new MediaStream();
    remoteAudioStreamRef.current = remoteStream;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
    }

    peerConnection.ontrack = (event) => {
      const stream = remoteAudioStreamRef.current ?? new MediaStream();
      remoteAudioStreamRef.current = stream;
      if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== stream) {
        remoteAudioRef.current.srcObject = stream;
      }

      event.streams[0]?.getTracks().forEach((track) => {
        if (!stream.getTracks().some((existingTrack) => existingTrack.id === track.id)) {
          stream.addTrack(track);
        }
      });
      setLiveAudioReady(true);
      const playPromise = remoteAudioRef.current?.play();
      void playPromise?.catch(() => undefined);
    };

    peerConnection.onconnectionstatechange = () => {
      if (["closed", "disconnected", "failed"].includes(peerConnection.connectionState)) {
        clearLiveAudio();
      }
    };

    audioPeerConnectionRef.current = peerConnection;
    return peerConnection;
  }, [clearLiveAudio]);

  const ensureCameraPeerConnection = useCallback(() => {
    if (cameraPeerConnectionRef.current) {
      return cameraPeerConnectionRef.current;
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: getIceServers(),
    });
    const remoteStream = new MediaStream();
    remoteCameraStreamRef.current = remoteStream;
    if (remoteCameraVideoRef.current) {
      remoteCameraVideoRef.current.srcObject = remoteStream;
    }

    peerConnection.ontrack = (event) => {
      const stream = remoteCameraStreamRef.current ?? new MediaStream();
      remoteCameraStreamRef.current = stream;
      if (remoteCameraVideoRef.current && remoteCameraVideoRef.current.srcObject !== stream) {
        remoteCameraVideoRef.current.srcObject = stream;
      }

      event.streams[0]?.getTracks().forEach((track) => {
        if (!stream.getTracks().some((existingTrack) => existingTrack.id === track.id)) {
          stream.addTrack(track);
        }
      });
      setLiveCameraReady(true);
    };

    peerConnection.onconnectionstatechange = () => {
      if (["closed", "disconnected", "failed"].includes(peerConnection.connectionState)) {
        clearLiveCamera();
      }
    };

    cameraPeerConnectionRef.current = peerConnection;
    return peerConnection;
  }, [clearLiveCamera]);

  const ensureScreenPeerConnection = useCallback(() => {
    if (screenPeerConnectionRef.current) {
      return screenPeerConnectionRef.current;
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: getIceServers(),
    });
    const remoteStream = new MediaStream();
    remoteScreenStreamRef.current = remoteStream;
    if (remoteScreenVideoRef.current) {
      remoteScreenVideoRef.current.srcObject = remoteStream;
    }

    peerConnection.ontrack = (event) => {
      const stream = remoteScreenStreamRef.current ?? new MediaStream();
      remoteScreenStreamRef.current = stream;
      if (remoteScreenVideoRef.current && remoteScreenVideoRef.current.srcObject !== stream) {
        remoteScreenVideoRef.current.srcObject = stream;
      }

      event.streams[0]?.getTracks().forEach((track) => {
        if (!stream.getTracks().some((existingTrack) => existingTrack.id === track.id)) {
          stream.addTrack(track);
        }
      });
      setLiveScreenReady(true);
    };

    peerConnection.onconnectionstatechange = () => {
      if (["closed", "disconnected", "failed"].includes(peerConnection.connectionState)) {
        clearLiveScreen();
      }
    };

    screenPeerConnectionRef.current = peerConnection;
    return peerConnection;
  }, [clearLiveScreen]);
  const refreshDashboard = useCallback(async () => {
    try {
      const refreshedDashboard = await getStudentDashboard();
      setCurrentDashboard(refreshedDashboard);
    } catch {
      // Keep the current classroom state if the refresh misses.
    }
  }, []);

  const realtimeStatus = useClassroomRealtime<StudentRealtimeSnapshot | StudentRealtimeEvent>({
    roomCode: currentDashboard.live_class.room_code || null,
    username: currentUsername,
    role: "student",
    accessToken,
    onMessage: (message) => {
      if (message.type === "student_snapshot") {
        setCurrentDashboard(message.dashboard);
        return;
      }

      if (message.event === "refresh_required") {
        void refreshDashboard();
        return;
      }

      if (message.event === "room_state_updated") {
        setCurrentDashboard((state) => ({
          ...state,
          room_state: message.room_state,
        }));
        return;
      }

      if (message.event === "breakout_broadcast_updated") {
        setCurrentDashboard((state) => ({
          ...state,
          breakout_broadcast: message.breakout_broadcast,
        }));
        return;
      }

      if (message.event === "message_created") {
        setCurrentDashboard((state) => ({
          ...state,
          messages: [...state.messages, message.message].slice(-10),
        }));
        return;
      }

      if (message.event === "poll_updated") {
        setCurrentDashboard((state) => ({
          ...state,
          poll: message.poll,
        }));
      }
    },
  });
  const { status: signalingStatus, sendMessage: sendSignalMessage } = useClassroomSignaling({
    roomCode: currentDashboard.live_class.room_code || null,
    username: currentUsername,
    role: "student",
    accessToken,
    enabled: Boolean(currentDashboard.live_class.room_code) && !broadcastOnlyClassroom,
    onMessage: (message: ClassroomSignalMessage) => {
      if (message.source_role !== "teacher") {
        return;
      }

      if (message.payload.kind === "removed_from_room") {
        clearLiveCamera();
        clearLiveAudio();
        clearLiveScreen();
        stopStudentMicPublishing();
        setTeacherApprovedSpeaking(false);
        setRemovedFromRoom(true);
        addNotification({
          id: `removed-from-room-${Date.now()}`,
          title: "Removed from room",
          message: `Your access to ${message.payload.session_title ?? "this classroom"} was ended by the teacher.`,
          tone: "warning",
        });
        return;
      }

      if (message.payload.kind === "raise_hand_resolved") {
        setHandRaised(false);
        addNotification({
          id: `raise-hand-resolved-${Date.now()}`,
          title: "Teacher responded",
          message: "Your raised hand was resolved in the room.",
          tone: "success",
        });
        return;
      }

      if (message.payload.kind === "speak_permission_granted") {
        setTeacherApprovedSpeaking(true);
        addNotification({
          id: `speak-granted-${Date.now()}`,
          title: "Speaking access enabled",
          message: "Teacher approved your request. Your microphone is now live.",
          tone: "success",
        });
        void (async () => {
          try {
            stopStudentMicPublishing();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            studentMicStreamRef.current = stream;
            const peerConnection = new RTCPeerConnection({
              iceServers: getIceServers(),
            });
            studentSpeakerPeerConnectionRef.current = peerConnection;

            stream.getAudioTracks().forEach((track) => {
              peerConnection.addTrack(track, stream);
            });

            peerConnection.onicecandidate = (event) => {
              if (!event.candidate) {
                return;
              }
              sendSignalMessage({
                type: "signal",
                target_role: "teacher",
                payload: {
                  kind: "speaker_ice_candidate",
                  candidate: event.candidate.toJSON(),
                },
              });
            };

            peerConnection.onconnectionstatechange = () => {
              if (["closed", "disconnected", "failed"].includes(peerConnection.connectionState)) {
                stopStudentMicPublishing();
              }
            };

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            sendSignalMessage({
              type: "signal",
              target_role: "teacher",
              payload: {
                kind: "speaker_offer",
                description: offer,
              },
            });
            setStudentMicLive(true);
            setHandRaised(false);
          } catch {
            stopStudentMicPublishing();
            setTeacherApprovedSpeaking(false);
            addNotification({
              id: `speak-granted-error-${Date.now()}`,
              title: "Microphone unavailable",
              message: "Please allow microphone access, then raise your hand again.",
              tone: "warning",
            });
          }
        })();
        return;
      }

      if (message.payload.kind === "speak_permission_revoked") {
        setTeacherApprovedSpeaking(false);
        stopStudentMicPublishing();
        addNotification({
          id: `speak-revoked-${Date.now()}`,
          title: "Speaking access ended",
          message: message.payload.reason ?? "Teacher muted your microphone.",
          tone: "info",
        });
        return;
      }

      if (message.payload.kind === "speaker_answer") {
        const peerConnection = studentSpeakerPeerConnectionRef.current;
        if (!peerConnection) {
          return;
        }
        void peerConnection.setRemoteDescription(message.payload.description).catch(() => undefined);
        return;
      }

      if (message.payload.kind === "speaker_ice_candidate") {
        const peerConnection = studentSpeakerPeerConnectionRef.current;
        if (!peerConnection) {
          return;
        }
        void peerConnection.addIceCandidate(message.payload.candidate).catch(() => undefined);
        return;
      }

      if (message.payload.kind === "offer") {
        const { description, media } = message.payload;
        void (async () => {
          if (media === "screen") {
            clearLiveScreen();
          } else if (media === "audio") {
            clearLiveAudio();
          } else {
            clearLiveCamera();
          }
          const peerConnection =
            media === "screen"
              ? ensureScreenPeerConnection()
              : media === "audio"
                ? ensureAudioPeerConnection()
                : ensureCameraPeerConnection();
          peerConnection.onicecandidate = (event) => {
            if (!event.candidate) {
              return;
            }

            sendSignalMessage({
              type: "signal",
              target_role: "teacher",
              payload: {
                kind: "ice_candidate",
                media,
                candidate: event.candidate.toJSON(),
              },
            });
          };

          try {
            await peerConnection.setRemoteDescription(description);
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            sendSignalMessage({
              type: "signal",
              target_role: "teacher",
              payload: {
                kind: "answer",
                media,
                description: answer,
              },
            });
          } catch {
            if (media === "screen") {
              clearLiveScreen();
            } else if (media === "audio") {
              clearLiveAudio();
            } else {
              clearLiveCamera();
            }
          }
        })();
        return;
      }

      if (message.payload.kind === "ice_candidate") {
        const peerConnection =
          message.payload.media === "screen"
            ? screenPeerConnectionRef.current
            : message.payload.media === "audio"
              ? audioPeerConnectionRef.current
              : cameraPeerConnectionRef.current;
        if (!peerConnection) {
          return;
        }

        void peerConnection.addIceCandidate(message.payload.candidate).catch(() => undefined);
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

  const studentDockBtn =
    "group relative inline-flex h-10 min-w-[2.8rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 text-[9px] font-semibold leading-tight text-white transition-all duration-150 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-lg hover:ring-2 hover:ring-white/45 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-50 sm:h-12 sm:min-w-[3.3rem] sm:px-2 sm:text-[10px]";
  const studentDockStatusChip =
    "relative inline-flex h-10 min-w-[2.8rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 text-[9px] font-semibold leading-tight text-white sm:h-12 sm:min-w-[3.3rem] sm:px-2 sm:text-[10px]";
  const studentDockLabelBase =
    "pointer-events-none absolute left-1/2 z-[80] -translate-x-1/2 whitespace-nowrap rounded-md border border-white/20 bg-slate-900/95 px-2 py-1 text-[10px] font-semibold tracking-[0.01em] text-white shadow-2xl transition-all duration-150";
  const studentDockBtnOn = "bg-emerald-600/95 shadow-sm shadow-emerald-950/35 hover:bg-emerald-500";
  const studentDockBtnOff = "bg-slate-700/95 hover:bg-slate-600/95";
  const studentDockBtnAccent = "bg-blue-600/95 shadow-sm shadow-blue-950/35 hover:bg-blue-500";
  const STUDENT_TOOLBAR_HIDE_MS = 4500;
  const bumpStudentToolbarVisibility = useCallback(() => {
    if (!simpleViewEnabled) {
      return;
    }
    setSimpleStudentToolbarVisible(true);
    if (simpleStudentToolbarPinned || showSidePanel) {
      if (studentToolbarHideTimerRef.current) {
        clearTimeout(studentToolbarHideTimerRef.current);
        studentToolbarHideTimerRef.current = null;
      }
      return;
    }
    if (studentToolbarHideTimerRef.current) {
      clearTimeout(studentToolbarHideTimerRef.current);
    }
    studentToolbarHideTimerRef.current = setTimeout(() => {
      setSimpleStudentToolbarVisible(false);
      studentToolbarHideTimerRef.current = null;
    }, STUDENT_TOOLBAR_HIDE_MS);
  }, [simpleViewEnabled, simpleStudentToolbarPinned, showSidePanel]);
  const getStudentDockLabelClass = (label: string) =>
    `${studentDockLabelBase} ${
      hoveredStudentDockControl === label ? "-top-8 opacity-100" : "-top-7 translate-y-1 opacity-0"
    }`;
  const studentDockHoverHandlers = (label: string) => ({
    onMouseEnter: () => setHoveredStudentDockControl(label),
    onMouseLeave: () => setHoveredStudentDockControl((current) => (current === label ? null : current)),
    onFocus: () => setHoveredStudentDockControl(label),
    onBlur: () => setHoveredStudentDockControl((current) => (current === label ? null : current)),
  });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!simpleViewEnabled) {
      setSimpleStudentToolbarVisible(true);
      if (studentToolbarHideTimerRef.current) {
        clearTimeout(studentToolbarHideTimerRef.current);
        studentToolbarHideTimerRef.current = null;
      }
      return;
    }
    const onActivity = () => bumpStudentToolbarVisibility();
    window.addEventListener("mousemove", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    bumpStudentToolbarVisibility();
    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [simpleViewEnabled, bumpStudentToolbarVisibility]);

  useEffect(() => {
    if (!simpleViewEnabled) {
      return;
    }
    bumpStudentToolbarVisibility();
  }, [simpleStudentToolbarPinned, showSidePanel, simpleViewEnabled, bumpStudentToolbarVisibility]);

  useEffect(() => {
    setCurrentDashboard(dashboard);
  }, [dashboard]);

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
      id: `student-breakout-warning-${endsAt}`,
      title: "1 minute left in your breakout",
      message: "Wrap up your group discussion now. You will return to the main room automatically.",
      tone: "info",
    });
  }, [
    addNotification,
    breakoutTimerNow,
    currentDashboard.room_state.breakout_enabled,
    currentDashboard.room_state.breakout_timer_ends_at,
  ]);

  useEffect(() => {
    if (remoteCameraVideoRef.current && remoteCameraStreamRef.current) {
      remoteCameraVideoRef.current.srcObject = remoteCameraStreamRef.current;
    }
  }, [liveCameraReady]);

  useEffect(() => {
    if (remoteScreenVideoRef.current && remoteScreenStreamRef.current) {
      remoteScreenVideoRef.current.srcObject = remoteScreenStreamRef.current;
    }
  }, [liveScreenReady]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteAudioStreamRef.current) {
      remoteAudioRef.current.srcObject = remoteAudioStreamRef.current;
      const playPromise = remoteAudioRef.current.play();
      void playPromise.catch(() => undefined);
    }
  }, [liveAudioReady]);

  useEffect(() => {
    if (!hasPaid || !currentDashboard.live_class.waiting_room_enabled) {
      lastJoinStatusRef.current = currentDashboard.live_class.join_status;
      return;
    }

    if (lastJoinStatusRef.current === currentDashboard.live_class.join_status) {
      return;
    }

    if (currentDashboard.live_class.join_status === "approved") {
      addNotification({
        id: `join-approved-${Date.now()}`,
        title: "Approved to join",
        message: "The teacher has let you into the live classroom.",
        tone: "success",
      });
    } else if (currentDashboard.live_class.join_status === "denied") {
      addNotification({
        id: `join-denied-${Date.now()}`,
        title: "Join request denied",
        message: "You can ask to join again when the teacher is ready.",
        tone: "warning",
      });
    }
    lastJoinStatusRef.current = currentDashboard.live_class.join_status;
  }, [
    addNotification,
    currentDashboard.live_class.join_status,
    currentDashboard.live_class.waiting_room_enabled,
    hasPaid,
  ]);

  useEffect(() => {
    return () => {
      clearLiveCamera();
      clearLiveAudio();
      clearLiveScreen();
      stopStudentMicPublishing();
    };
  }, [clearLiveAudio, clearLiveCamera, clearLiveScreen, stopStudentMicPublishing]);

  useEffect(() => {
    if (chatCooldownSeconds <= 0) {
      return;
    }
    const timerId = window.setInterval(() => {
      setChatCooldownSeconds((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [chatCooldownSeconds]);

  useEffect(() => {
    if (!broadcastOnlyClassroom) {
      return;
    }

    clearLiveCamera();
    clearLiveAudio();
    clearLiveScreen();
    stopStudentMicPublishing();
    setTeacherApprovedSpeaking(false);
  }, [broadcastOnlyClassroom, clearLiveAudio, clearLiveCamera, clearLiveScreen, stopStudentMicPublishing]);

  useEffect(() => {
    if (
      broadcastOnlyClassroom ||
      !hasPaid ||
      removedFromRoom ||
      signalingStatus !== "connected" ||
      currentDashboard.room_state.stage_mode !== "screenshare" ||
      !currentDashboard.room_state.screen_share_enabled
    ) {
      if (!currentDashboard.room_state.screen_share_enabled || currentDashboard.room_state.stage_mode !== "screenshare") {
        clearLiveScreen();
      }
      return;
    }

    sendSignalMessage({
      type: "signal",
      target_role: "teacher",
      payload: {
        kind: "viewer_ready",
        media: "screen",
      },
    });
  }, [
    broadcastOnlyClassroom,
    clearLiveScreen,
    currentDashboard.room_state.screen_share_enabled,
    currentDashboard.room_state.stage_mode,
    hasPaid,
    removedFromRoom,
    sendSignalMessage,
    signalingStatus,
  ]);

  useEffect(() => {
    if (
      broadcastOnlyClassroom ||
      !hasPaid ||
      removedFromRoom ||
      signalingStatus !== "connected" ||
      !currentDashboard.room_state.teacher_camera_enabled
    ) {
      if (!currentDashboard.room_state.teacher_camera_enabled) {
        clearLiveCamera();
      }
      return;
    }

    sendSignalMessage({
      type: "signal",
      target_role: "teacher",
      payload: {
        kind: "viewer_ready",
        media: "camera",
      },
    });
  }, [
    broadcastOnlyClassroom,
    clearLiveCamera,
    currentDashboard.room_state.teacher_camera_enabled,
    hasPaid,
    removedFromRoom,
    sendSignalMessage,
    signalingStatus,
  ]);

  useEffect(() => {
    if (
      broadcastOnlyClassroom ||
      !hasPaid ||
      removedFromRoom ||
      signalingStatus !== "connected" ||
      !currentDashboard.room_state.teacher_mic_enabled
    ) {
      if (!currentDashboard.room_state.teacher_mic_enabled) {
        clearLiveAudio();
      }
      return;
    }

    sendSignalMessage({
      type: "signal",
      target_role: "teacher",
      payload: {
        kind: "viewer_ready",
        media: "audio",
      },
    });
  }, [
    broadcastOnlyClassroom,
    clearLiveAudio,
    currentDashboard.room_state.teacher_mic_enabled,
    hasPaid,
    removedFromRoom,
    sendSignalMessage,
    signalingStatus,
  ]);

  usePollingRefresh(
    async () => {
      if (removedFromRoom) {
        return;
      }

      if (submittingPoll !== null || submittingQuiz !== null) {
        return;
      }

      await refreshDashboard();
    },
    15000,
    realtimeStatus !== "connected" && !removedFromRoom,
    5000,
  );

  const handlePollVote = async (optionId: number) => {
    setSubmittingPoll(optionId);
    try {
      const response = await submitStudentPollVote({ option_id: optionId });
      setCurrentDashboard((state) => ({
        ...state,
        poll: response.poll,
      }));
      addNotification({
        id: `poll-vote-${Date.now()}`,
        title: "Poll vote submitted",
        message: "Your response was recorded successfully.",
        tone: "success",
      });
    } catch {
      addNotification({
        id: `poll-vote-error-${Date.now()}`,
        title: "Poll vote failed",
        message: "We could not submit your vote right now.",
        tone: "warning",
      });
    } finally {
      setSubmittingPoll(null);
    }
  };

  const handleQuizSubmit = async (choiceId: number) => {
    setSubmittingQuiz(choiceId);
    try {
      const response = await submitStudentQuizAnswer({ choice_id: choiceId });
      setCurrentDashboard((state) => ({
        ...state,
        quiz: response.quiz,
      }));
      addNotification({
        id: `quiz-submit-${Date.now()}`,
        title: "Quiz answer submitted",
        message: "Your answer was saved for this live check-in.",
        tone: "success",
      });
    } catch {
      addNotification({
        id: `quiz-submit-error-${Date.now()}`,
        title: "Quiz submission failed",
        message: "We could not save your answer right now.",
        tone: "warning",
      });
    } finally {
      setSubmittingQuiz(null);
    }
  };

  const handleRaiseHand = async () => {
    if (!currentDashboard.room_state.student_raise_hand_enabled) {
      addNotification({
        id: `raise-hand-disabled-${Date.now()}`,
        title: "Hand raise disabled",
        message: "The teacher has temporarily turned off hand raising in this room.",
        tone: "info",
      });
      return;
    }

    if (handRaised) {
      addNotification({
        id: `raise-hand-active-${Date.now()}`,
        title: "Hand already raised",
        message: "Wait for the teacher to respond before raising again.",
        tone: "info",
      });
      return;
    }

    if (teacherApprovedSpeaking) {
      addNotification({
        id: `speak-live-${Date.now()}`,
        title: "You're already live",
        message: "Your microphone is currently enabled by the teacher.",
        tone: "info",
      });
      return;
    }

    setRaisingHand(true);
    try {
      const response = await submitStudentRaiseHand({
        reason: "Student wants to speak",
      });
      setHandRaised(true);
      sendSignalMessage({
        type: "signal",
        target_role: "teacher",
        payload: {
          kind: "raise_hand",
          reason: response.request.reason,
          request_id: response.request.id,
        },
      });
      addNotification({
        id: `raise-hand-sent-${Date.now()}`,
        title: "Hand raised",
        message: "The teacher can now see your request.",
        tone: "success",
      });
    } catch {
      addNotification({
        id: `raise-hand-error-${Date.now()}`,
        title: "Raise hand failed",
        message: "We could not send your request right now.",
        tone: "warning",
      });
    } finally {
      setRaisingHand(false);
    }
  };

  const handleJoinRequest = async () => {
    if (!currentDashboard.live_class.waiting_room_enabled || currentDashboard.live_class.can_join_room) {
      return;
    }

    setRequestingJoin(true);
    try {
      await submitStudentJoinRequest();
      setCurrentDashboard((state) => ({
        ...state,
        live_class: {
          ...state.live_class,
          join_status: "pending",
          can_join_room: false,
        },
      }));
      addNotification({
        id: `join-request-${Date.now()}`,
        title: "Join request sent",
        message: "Waiting for the teacher to approve your entry.",
        tone: "info",
      });
    } catch {
      addNotification({
        id: `join-request-error-${Date.now()}`,
        title: "Join request failed",
        message: "We could not send your waiting-room request right now.",
        tone: "warning",
      });
    } finally {
      setRequestingJoin(false);
    }
  };

  const handleSendReaction = (emoji: string) => {
    const sent = sendSignalMessage({
      type: "signal",
      target_role: "teacher",
      payload: {
        kind: "reaction",
        emoji,
      },
    });

    if (!sent) {
      addNotification({
        id: `reaction-error-${Date.now()}`,
        title: "Reaction not sent",
        message: "Realtime connection is still reconnecting.",
        tone: "warning",
      });
    }
  };

  const handleEnrollByRoomCode = async () => {
    const code = joinRoomCodeDraft.trim();
    if (!code) {
      addNotification({
        id: `join-code-empty-${Date.now()}`,
        title: "Room code required",
        message: "Enter the room code your teacher shared (for example analytics-room).",
        tone: "info",
      });
      return;
    }
    setJoinRoomSubmitting(true);
    try {
      await submitStudentEnrollByRoomCode({ room_code: code });
      const next = await getStudentDashboard();
      setCurrentDashboard(next);
      setJoinRoomCodeDraft("");
      addNotification({
        id: `join-code-ok-${Date.now()}`,
        title: "Class joined",
        message: "You are enrolled. The dashboard updates to your active session.",
        tone: "info",
      });
    } catch (error) {
      addNotification({
        id: `join-code-err-${Date.now()}`,
        title: "Could not join",
        message: error instanceof Error ? error.message : "Try again in a moment.",
        tone: "warning",
      });
    } finally {
      setJoinRoomSubmitting(false);
    }
  };

  const handleLeaveClassroom = () => {
    clearLiveCamera();
    clearLiveAudio();
    clearLiveScreen();
    addNotification({
      id: `left-classroom-${Date.now()}`,
      title: "You left the class",
      message: "You are now on your student dashboard.",
      tone: "info",
    });
    window.location.href = "/student/home";
  };

  const handleSendChatMessage = async () => {
    const nextMessage = chatDraft.trim();
    if (!nextMessage) {
      return;
    }

    if (!currentDashboard.room_state.student_chat_enabled) {
      addNotification({
        id: `chat-disabled-${Date.now()}`,
        title: "Chat disabled",
        message: "The teacher has temporarily turned off student chat in this room.",
        tone: "info",
      });
      return;
    }

    if (chatCooldownSeconds > 0) {
      addNotification({
        id: `chat-cooldown-${Date.now()}`,
        title: "Slow mode cooldown",
        message: `Please wait ${chatCooldownSeconds}s before sending another message.`,
        tone: "info",
      });
      return;
    }

    setSendingChat(true);
    try {
      const response = await submitStudentChatMessage({
        message: nextMessage,
      });
      if (response.qa_queued) {
        addNotification({
          id: `chat-qa-${Date.now()}`,
          title: "Sent to moderator",
          message: "Your question is in the instructor queue. It will appear if they publish it.",
          tone: "info",
        });
      } else {
        setCurrentDashboard((state) => ({
          ...state,
          messages: state.messages.some((message) => message.id === response.chat_message.id)
            ? state.messages
            : [...state.messages, response.chat_message],
        }));
      }
      setChatDraft("");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "We could not send your chat message right now.";
      const retryAfterSeconds =
        error instanceof ApiError && typeof error.retryAfterSeconds === "number"
          ? error.retryAfterSeconds
          : null;
      if (retryAfterSeconds !== null && retryAfterSeconds > 0) {
        setChatCooldownSeconds(retryAfterSeconds);
      } else {
        const throttleMatch = errorMessage.match(/Expected available in\s+([0-9.]+)\s+second/i);
        if (throttleMatch) {
          const seconds = Math.max(1, Math.ceil(Number(throttleMatch[1])));
          if (Number.isFinite(seconds)) {
            setChatCooldownSeconds(seconds);
          }
        }
      }
      addNotification({
        id: `chat-send-error-${Date.now()}`,
        title: "Message not sent",
        message: errorMessage,
        tone: "warning",
      });
    } finally {
      setSendingChat(false);
    }
  };

  if (removedFromRoom) {
    return (
      <section className="grid min-h-[70vh] place-items-center">
        <div className="surface-card w-full max-w-xl p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
            <PhoneOff className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-[var(--text)]">Removed from classroom</h2>
          <p className="mt-3 text-sm text-[var(--subtext)]">
            The teacher ended your access to this live room. Refresh the page or join another assigned session
            when you are invited back.
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      <div
        className={`student-dashboard-modern grid gap-4 sm:gap-6 ${
          simpleViewEnabled && !showSidePanel ? "" : "xl:grid-cols-[2.2fr_0.78fr]"
        } ${simpleViewEnabled ? "pb-[5.4rem] sm:pb-[4.75rem]" : ""}`}
      >
        <section className="space-y-5">
          <div className="surface-card rounded-2xl border border-[var(--border)]/70 bg-[var(--card)]/95 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--secondary)] sm:text-xs">
                  Attend class
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--text)] sm:text-xl">
                  {currentDashboard.live_class.session_title}
                </h2>
                <p className="mt-1 text-xs text-[var(--subtext)] sm:text-sm">{attendStatusHelp}</p>
              </div>
              <span className="rounded-full border border-[var(--border)] bg-[var(--background-soft)] px-3 py-1 text-xs font-semibold text-[var(--text)]">
                {attendStatusLabel}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleJoinRequest()}
                disabled={
                  requestingJoin ||
                  (hasPaid &&
                    currentDashboard.live_class.waiting_room_enabled &&
                    currentDashboard.live_class.join_status === "pending")
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PlayCircle className="h-4 w-4" />
                {requestingJoin ? "Sending request..." : joinLabel}
              </button>
              <span className="text-xs text-[var(--subtext)]">Room code: {currentDashboard.live_class.room_code}</span>
            </div>
          </div>
          <div className="surface-card rounded-2xl border border-[var(--border)]/70 bg-[var(--card)]/95 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[var(--text)] sm:text-base">Today&apos;s classes</h3>
              <div className="flex items-center gap-1.5">
                <span className="rounded-full border border-[var(--border)] bg-[var(--background-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--subtext)] sm:text-xs">
                  Now: {nowTimeLabel}
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--background-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--subtext)] sm:text-xs">
                  {todaysClasses.length} scheduled
                </span>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {todaysClasses.length ? (
                todaysClasses.map((course, index) => {
                  const courseStatus =
                    course.join_status === "pending"
                      ? "Waiting approval"
                      : course.join_status === "approved"
                        ? "Approved"
                        : course.join_status === "denied"
                          ? "Denied"
                          : course.status;
                  const isCurrentClass = course.title === currentDashboard.live_class.course_title;
                  const statusToneClass =
                    courseStatus === "Waiting approval"
                      ? "border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      : courseStatus === "Approved" || courseStatus === "Live"
                        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : courseStatus === "Denied"
                          ? "border-rose-400/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                          : "border-[var(--border)] bg-[var(--card)] text-[var(--text)]";
                  return (
                    <div
                      key={`${course.session_id ?? course.title}-${index}`}
                      className={`rounded-xl border px-3 py-2.5 ${
                        isCurrentClass
                          ? "border-[var(--primary)]/40 bg-[var(--primary)]/8"
                          : "border-[var(--border)] bg-[var(--background-soft)]/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--text)]">{course.title}</p>
                          {isCurrentClass ? (
                            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--primary)]">
                              Current class
                            </p>
                          ) : null}
                        </div>
                        <span className="text-xs font-medium text-[var(--subtext)]">{course.time}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-[var(--subtext)]">{course.coach}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusToneClass}`}>
                          {courseStatus}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-xl border border-[var(--border)] bg-[var(--background-soft)]/60 px-3 py-2 text-xs text-[var(--subtext)]">
                  No classes scheduled for today.
                </p>
              )}
            </div>
          </div>
          <details className="surface-card rounded-2xl border border-[var(--border)]/70 bg-[var(--card)]/90 p-3 sm:p-4">
            <summary className="cursor-pointer list-none text-xs font-semibold text-[var(--primary)] marker:content-none [&::-webkit-details-marker]:hidden">
              Have a room code? Join another class
            </summary>
            <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-[11px] text-[var(--subtext)] sm:text-sm">
                  Enter the code from your teacher to add that class.
                </p>
                <input
                  type="text"
                  value={joinRoomCodeDraft}
                  onChange={(event) => setJoinRoomCodeDraft(event.target.value)}
                  placeholder="e.g. analytics-room"
                  className="w-full rounded-xl border border-[var(--border)] bg-white/90 px-3 py-2 text-sm text-[var(--text)] shadow-inner outline-none ring-0 placeholder:text-[var(--subtext)] focus:border-[var(--primary)] dark:bg-slate-950/40"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <button
                type="button"
                onClick={() => void handleEnrollByRoomCode()}
                disabled={joinRoomSubmitting}
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                {joinRoomSubmitting ? "Joining…" : "Join class"}
              </button>
            </div>
          </details>
          <div className="surface-card overflow-hidden border border-[var(--border)]/70 bg-gradient-to-br from-white via-white to-[var(--background-soft)] p-4 shadow-[0_18px_42px_rgba(15,23,42,0.08)] sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-2.5 py-1 text-[10px] font-semibold tracking-[0.03em] text-white sm:px-3 sm:text-xs">
                  {currentDashboard.live_class.is_live ? "LIVE" : "Scheduled"}
                </span>
                <span className="rounded-full border border-[var(--border)] bg-white/80 px-2.5 py-1 text-[10px] font-medium text-[var(--subtext)] shadow-sm sm:px-3 sm:text-xs">
                  {currentDashboard.live_class.course_title}
                </span>
                <span className="rounded-full border border-[var(--border)] bg-white/80 px-2.5 py-1 text-[10px] font-medium text-[var(--subtext)] shadow-sm sm:px-3 sm:text-xs">
                  {syncBadgeLabel}
                </span>
              </div>
              <div
                className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 shadow-sm dark:text-emerald-300 sm:px-3 sm:text-xs"
              >
                Access open
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--secondary)] sm:text-xs">
                  Student classroom overview
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-[var(--text)] sm:text-3xl">
                  {currentDashboard.live_class.session_title}
                </h2>
                <p className="max-w-3xl text-xs text-[var(--subtext)] sm:text-base">
                  Everything you need for this lesson is here: live stage, moderated chat, quick
                  activities, and teacher-guided speaking controls.
                </p>
                {currentDashboard.live_class.program_title ? (
                  <p className="text-xs font-medium text-[var(--primary)] sm:text-sm">
                    Program: {currentDashboard.live_class.program_title}
                    {currentDashboard.live_class.program_window
                      ? ` · ${currentDashboard.live_class.program_window}`
                      : null}
                  </p>
                ) : null}
                {currentDashboard.session_resources.length > 0 ? (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]/60 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--subtext)]">
                      Class materials
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {currentDashboard.session_resources.map((resource) => (
                        <li key={resource.id}>
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                          >
                            {resource.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--subtext)] sm:gap-2 sm:text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-white/80 px-2 py-1 shadow-sm">
                    <Signal className="h-3.5 w-3.5 text-emerald-500" />
                    Realtime sync active
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-white/80 px-2 py-1 shadow-sm">
                    <UsersRound className="h-3.5 w-3.5 text-[var(--primary)]" />
                    {currentDashboard.live_class.expected_participants} expected learners
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-white/80 px-2 py-1 shadow-sm">
                    <MessageSquareText className="h-3.5 w-3.5 text-amber-600" />
                    {currentDashboard.messages.length} chat updates
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleJoinRequest()}
                disabled={requestingJoin || (hasPaid && currentDashboard.live_class.waiting_room_enabled && currentDashboard.live_class.join_status === "pending")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-blue-700 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.3)] transition hover:brightness-105 sm:px-5 sm:py-3 sm:text-sm"
              >
                <PlayCircle className="h-4 w-4" />
                {requestingJoin ? "Sending request..." : joinLabel}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/80 px-2.5 py-2 text-[10px] text-[var(--subtext)] sm:min-w-[8.2rem] sm:text-xs">
                <p className="font-semibold text-[var(--text)]">{currentDashboard.live_class.delivery_mode === "broadcast" ? "Broadcast mode" : "Interactive mode"}</p>
                <p className="mt-0.5">Delivery</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/80 px-2.5 py-2 text-[10px] text-[var(--subtext)] sm:min-w-[8.2rem] sm:text-xs">
                <p className="font-semibold text-[var(--text)]">{currentDashboard.live_class.expected_participants}</p>
                <p className="mt-0.5">Expected learners</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/80 px-2.5 py-2 text-[10px] text-[var(--subtext)] sm:min-w-[8.2rem] sm:text-xs">
                <p className="font-semibold text-[var(--text)]">
                  {currentDashboard.live_class.waiting_room_enabled
                    ? currentDashboard.live_class.join_status === "approved"
                      ? "Approved"
                      : currentDashboard.live_class.join_status === "pending"
                        ? "Pending"
                        : "Request needed"
                    : "Open access"}
                </p>
                <p className="mt-0.5">Entry status</p>
              </div>
              <button
                type="button"
                onClick={() => setSimpleViewEnabled((current) => !current)}
                className="rounded-full border border-[var(--border)] bg-[var(--background-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text)] transition hover:opacity-90 sm:px-3 sm:text-xs"
              >
                {simpleViewEnabled ? "Simple view" : "Detailed view"}
              </button>
              {simpleViewEnabled ? (
                <span className="col-span-2 text-[11px] text-[var(--subtext)] sm:col-auto sm:text-xs">
                  Focus mode keeps the class screen large. Open tools only when needed.
                </span>
              ) : null}
            </div>

            <div
              className={`mt-5 grid gap-4 ${
                simpleViewEnabled && !showSidePanel ? "lg:grid-cols-1" : "lg:grid-cols-[1.65fr_0.35fr]"
              }`}
            >
              <div className="student-stage-shell rounded-[24px] border border-white/10 bg-slate-950 p-2.5 text-white shadow-2xl sm:rounded-[28px] sm:p-3">
                <div className="mb-2 flex items-center justify-between gap-2 rounded-2xl bg-white/5 px-3 py-2 sm:mb-3 sm:gap-3 sm:px-4 sm:py-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold sm:text-sm">{currentDashboard.live_class.course_title}</p>
                    <p className="truncate text-[10px] text-slate-300 sm:text-xs">{currentDashboard.live_class.room_code}</p>
                  </div>
                  <div className="hidden items-center gap-2 text-xs text-slate-300 sm:flex">
                    <Signal className="h-4 w-4 text-emerald-400" />
                    Stable room
                    <span className="rounded-full bg-white/10 px-2.5 py-1 capitalize text-white">
                      {currentDashboard.room_state.stage_mode}
                    </span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-white">
                      {currentDashboard.room_state.teacher_camera_enabled ? "Camera on" : "Camera off"}
                    </span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-white">
                      {currentDashboard.room_state.teacher_mic_enabled ? "Mic on" : "Mic muted"}
                    </span>
                    {!currentDashboard.room_state.student_chat_enabled ? (
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-white">Chat off</span>
                    ) : null}
                    {currentDashboard.room_state.chat_slow_mode ? (
                      <span className="rounded-full bg-amber-400/90 px-2.5 py-1 font-semibold text-slate-950">
                        Slow chat
                      </span>
                    ) : null}
                    {!currentDashboard.room_state.student_raise_hand_enabled ? (
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-white">Hands off</span>
                    ) : null}
                    {currentDashboard.live_class.waiting_room_enabled ? (
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-white">
                        {currentDashboard.live_class.join_status === "approved"
                          ? "Admitted"
                          : currentDashboard.live_class.join_status === "pending"
                            ? "Waiting room"
                            : "Approval needed"}
                      </span>
                    ) : null}
                    {currentDashboard.room_state.spotlight_mode !== "off" ? (
                      <span className="rounded-full bg-amber-400/90 px-2.5 py-1 font-semibold text-slate-950">
                        Spotlight {currentDashboard.room_state.spotlight_mode}
                      </span>
                    ) : null}
                    {currentDashboard.room_state.breakout_enabled ? (
                      <span className="rounded-full bg-emerald-500/80 px-2.5 py-1 text-white">
                        {currentDashboard.breakout_room?.name ?? "Breakout pending"}
                      </span>
                    ) : null}
                    {breakoutTimerLabel ? (
                      <span
                        className={`rounded-full px-2.5 py-1 font-semibold ${
                          breakoutTimerWarningActive ? "bg-amber-400/90 text-slate-950" : "bg-sky-400/85 text-slate-950"
                        }`}
                      >
                        {breakoutTimerWarningActive ? `Breakout ending in ${breakoutTimerLabel}` : `Breakout timer ${breakoutTimerLabel}`}
                      </span>
                    ) : null}
                    {currentDashboard.breakout_room?.teacher_present ? (
                      <span className="rounded-full bg-emerald-300/90 px-2.5 py-1 font-semibold text-slate-950">
                        Teacher here
                      </span>
                    ) : null}
                    {currentDashboard.room_state.recording_status !== "idle" ? (
                      <span className="rounded-full bg-rose-500/85 px-2.5 py-1 text-white">
                        {currentDashboard.room_state.recording_status === "paused" ? "Recording paused" : "Recording"}
                      </span>
                    ) : null}
                    {currentDashboard.room_state.screen_share_enabled ? (
                      <span className="rounded-full bg-[#4285f4]/80 px-2.5 py-1 text-white">
                        Presenting
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-200 sm:hidden">
                    <span className="rounded-full bg-white/10 px-2 py-1 capitalize text-white">
                      {currentDashboard.room_state.stage_mode}
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-white">
                      {currentDashboard.room_state.teacher_mic_enabled ? "Mic on" : "Mic off"}
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-white">
                      {currentDashboard.room_state.teacher_camera_enabled ? "Cam on" : "Cam off"}
                    </span>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black">
                  <div className="aspect-video w-full">
                    {waitingRoomBlocked ? (
                      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-white">
                        <div className="rounded-full bg-white/10 p-4">
                          <UsersRound className="h-8 w-8" />
                        </div>
                        <div>
                          <p className="text-xl font-semibold">
                            {currentDashboard.live_class.join_status === "pending"
                              ? "Waiting for teacher approval"
                              : currentDashboard.live_class.join_status === "denied"
                                ? "Join request denied"
                                : "Join the waiting room"}
                          </p>
                          <p className="mt-2 text-sm text-slate-300">
                            {currentDashboard.live_class.join_status === "pending"
                              ? "Stay on this page. You will enter as soon as the teacher approves."
                              : currentDashboard.live_class.join_status === "denied"
                                ? "Ask to join again when the teacher is ready to let you in."
                                : "Send a request and wait for the teacher to admit you."}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleJoinRequest()}
                          disabled={requestingJoin || currentDashboard.live_class.join_status === "pending"}
                          className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {requestingJoin
                            ? "Sending request..."
                            : currentDashboard.live_class.join_status === "denied"
                              ? "Request again"
                              : currentDashboard.live_class.join_status === "pending"
                                ? "Waiting for approval"
                                : "Ask to join"}
                        </button>
                      </div>
                    ) : hasPaid && currentDashboard.live_class.broadcast_only ? (
                      <div className="relative h-full w-full">
                        <iframe
                          className="h-full w-full"
                          src={broadcastEmbedUrl}
                          title="ElimuPawa Classroom Live Session"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          onLoad={() => setBroadcastPlaybackState("live")}
                        />
                        <div className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[#4285f4]/90 px-2.5 py-1 text-[10px] font-semibold text-white sm:px-3 sm:text-xs">
                          {broadcastPlaybackState === "loading" ? (
                            <span className="relative inline-flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                            </span>
                          ) : null}
                          <span>
                            {broadcastPlaybackState === "live"
                              ? "Broadcast lecture live"
                              : broadcastPlaybackState === "loading"
                                ? "Connecting to stream..."
                                : "Stream not live yet"}
                          </span>
                        </div>
                        {broadcastPlaybackState !== "live" ? (
                          <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-xl border border-white/20 bg-black/65 px-3 py-2 text-xs text-white shadow-lg backdrop-blur">
                            {broadcastPlaybackState === "loading"
                              ? "Teacher is starting the stream. Please wait a moment..."
                              : "Stream is not available yet. Wait a bit, then refresh this page."}
                          </div>
                        ) : null}
                      </div>
                    ) : hasPaid && currentDashboard.room_state.stage_mode === "whiteboard" ? (
                      <div className="relative h-full w-full">
                        <WhiteboardStage whiteboard={currentDashboard.whiteboard} />
                        {contentSpotlightActive ? (
                          <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-amber-400/90 px-2.5 py-1 text-[10px] font-semibold text-slate-950 sm:px-3 sm:text-xs">
                            Stage spotlight live
                          </div>
                        ) : null}
                      </div>
                    ) : hasPaid && currentDashboard.room_state.stage_mode === "camera" ? (
                      <div className="relative h-full w-full">
                        {liveCameraReady ? (
                          <video
                            ref={remoteCameraVideoRef}
                            className={`h-full w-full bg-black ${teacherSpotlightActive ? "object-cover" : "object-cover"}`}
                            autoPlay
                            playsInline
                          />
                        ) : (
                          <iframe
                            className="h-full w-full"
                            src={broadcastEmbedUrl}
                            title="ElimuPawa Classroom Live Session"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            onLoad={() => setBroadcastPlaybackState("live")}
                          />
                        )}
                        <div
                          className={`pointer-events-none absolute left-4 top-4 rounded-full px-2.5 py-1 text-[10px] font-semibold sm:px-3 sm:text-xs ${
                            teacherSpotlightActive ? "bg-amber-400/90 text-slate-950" : "bg-black/60 text-white"
                          }`}
                        >
                          {teacherSpotlightActive
                            ? liveCameraReady
                              ? "Teacher spotlight live"
                              : "Connecting teacher spotlight"
                            : liveCameraReady
                              ? "Teacher camera live"
                              : "Connecting to teacher camera"}
                        </div>
                      </div>
                    ) : hasPaid && currentDashboard.room_state.stage_mode === "screenshare" ? (
                      <div className="relative h-full w-full">
                        {liveScreenReady ? (
                          <video
                            ref={remoteScreenVideoRef}
                            className="h-full w-full bg-black object-contain"
                            autoPlay
                            playsInline
                          />
                        ) : (
                          <iframe
                            className="h-full w-full"
                            src={broadcastEmbedUrl}
                            title="ElimuPawa Classroom Live Session"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            onLoad={() => setBroadcastPlaybackState("live")}
                          />
                        )}
                        <div
                          className={`pointer-events-none absolute left-4 top-4 rounded-full px-2.5 py-1 text-[10px] font-semibold sm:px-3 sm:text-xs ${
                            contentSpotlightActive ? "bg-amber-400/90 text-slate-950" : "bg-[#4285f4]/85 text-white"
                          }`}
                        >
                          {contentSpotlightActive
                            ? liveScreenReady
                              ? "Stage spotlight live"
                              : "Connecting stage spotlight"
                            : liveScreenReady
                              ? "Teacher is presenting live"
                              : "Connecting to teacher presentation"}
                        </div>
                        {teacherApprovedSpeaking ? (
                          <div className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold text-emerald-100 shadow-[0_8px_24px_rgba(16,185,129,0.28)] sm:px-3 sm:text-xs">
                            <span className="relative inline-flex h-2.5 w-2.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300/70" />
                              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-200" />
                            </span>
                            <span>
                              {studentMicLive ? "Mic Live (Approved by Teacher)" : "Mic Connecting (Approved by Teacher)"}
                            </span>
                          </div>
                        ) : null}
                        {liveCameraReady ? (
                          <div
                            className={`absolute bottom-4 right-4 overflow-hidden rounded-2xl border bg-slate-950 shadow-2xl ${
                              teacherSpotlightActive
                                ? "border-amber-300/80 ring-2 ring-amber-300/60"
                                : "border-white/15"
                            }`}
                          >
                            <video
                              ref={remoteCameraVideoRef}
                              className={`${teacherSpotlightActive ? "h-32 w-52" : "h-24 w-36"} object-cover`}
                              autoPlay
                              playsInline
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : hasPaid ? (
                      <iframe
                        className="h-full w-full"
                        src={broadcastEmbedUrl}
                        title="ElimuPawa Classroom Live Session"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        onLoad={() => setBroadcastPlaybackState("live")}
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                        <div className="rounded-full bg-white/10 p-4">
                          <Lock className="h-8 w-8" />
                        </div>
                        <div>
                          <p className="text-xl font-semibold">Session locked</p>
                          <p className="mt-2 text-sm text-slate-300">
                            Your teacher has not opened this session yet. Please wait for class to begin.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {simpleViewEnabled ? (
                  <div
                    className="fixed inset-x-0 bottom-0 z-[48] h-12 bg-transparent"
                    aria-hidden
                    onMouseEnter={() => bumpStudentToolbarVisibility()}
                  />
                ) : null}
                <div
                  className={`teacher-meeting-dock jitsi-teacher-toolbar jitsi-teacher-toolbar--float flex flex-wrap items-center justify-center gap-1 overflow-visible px-2 py-1.5 sm:gap-2 sm:px-3.5 sm:py-2 ${
                    simpleViewEnabled
                      ? `fixed bottom-2 left-1/2 z-50 w-[calc(100vw-0.75rem)] max-w-[42rem] -translate-x-1/2 transition-all duration-300 ease-out sm:w-auto ${
                          simpleStudentToolbarVisible
                            ? "translate-y-0 opacity-100"
                            : "pointer-events-none translate-y-[110%] opacity-0"
                        }`
                      : "mt-4"
                  }`}
                  onMouseEnter={() => bumpStudentToolbarVisibility()}
                >
                  <div
                    role="status"
                    aria-label={currentDashboard.room_state.teacher_camera_enabled ? "Teacher camera is on" : "Teacher camera is off"}
                    title={currentDashboard.room_state.teacher_camera_enabled ? "Teacher camera status: on" : "Teacher camera status: off"}
                    className={`${studentDockStatusChip} ${currentDashboard.room_state.teacher_camera_enabled ? studentDockBtnOn : studentDockBtnOff}`}
                    {...studentDockHoverHandlers(
                      currentDashboard.room_state.teacher_camera_enabled
                        ? "Teacher camera status: on"
                        : "Teacher camera status: off",
                    )}
                  >
                    {currentDashboard.room_state.teacher_camera_enabled ? (
                      <Video className="h-[18px] w-[18px]" />
                    ) : (
                      <Video className="h-[18px] w-[18px]" />
                    )}
                    <span
                      className={getStudentDockLabelClass(
                        currentDashboard.room_state.teacher_camera_enabled
                          ? "Teacher camera status: on"
                          : "Teacher camera status: off",
                      )}
                    >
                      {currentDashboard.room_state.teacher_camera_enabled ? "Teacher camera status: on" : "Teacher camera status: off"}
                    </span>
                  </div>
                  <div
                    role="status"
                    aria-label={
                      currentDashboard.room_state.teacher_mic_enabled
                        ? "Teacher microphone is on"
                        : "Teacher microphone is muted"
                    }
                    title={
                      currentDashboard.room_state.teacher_mic_enabled
                        ? "Teacher microphone status: on"
                        : "Teacher microphone status: muted"
                    }
                    className={`${studentDockStatusChip} ${currentDashboard.room_state.teacher_mic_enabled ? studentDockBtnOn : studentDockBtnOff}`}
                    {...studentDockHoverHandlers(
                      currentDashboard.room_state.teacher_mic_enabled
                        ? "Teacher microphone status: on"
                        : "Teacher microphone status: muted",
                    )}
                  >
                    {currentDashboard.room_state.teacher_mic_enabled ? (
                      <Mic className="h-[18px] w-[18px]" />
                    ) : (
                      <MicOff className="h-[18px] w-[18px]" />
                    )}
                    <span
                      className={getStudentDockLabelClass(
                        currentDashboard.room_state.teacher_mic_enabled
                          ? "Teacher microphone status: on"
                          : "Teacher microphone status: muted",
                      )}
                    >
                      {currentDashboard.room_state.teacher_mic_enabled
                        ? "Teacher microphone status: on"
                        : "Teacher microphone status: muted"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRaiseHand()}
                    disabled={
                      teacherApprovedSpeaking ||
                      raisingHand ||
                      !currentDashboard.room_state.student_raise_hand_enabled ||
                      waitingRoomBlocked
                    }
                    title={
                      teacherApprovedSpeaking
                        ? studentMicLive
                          ? "Teacher approved: your microphone is live"
                          : "Teacher approved: connecting your microphone"
                        : !currentDashboard.room_state.student_raise_hand_enabled
                        ? "Raised hands are disabled"
                        : raisingHand
                          ? "Sending raised hand request"
                          : handRaised
                            ? "Hand already raised"
                            : "Raise your hand"
                    }
                    className={`${studentDockBtn} ${
                      currentDashboard.room_state.student_raise_hand_enabled
                        ? studentDockBtnOn
                        : studentDockBtnOff
                    }`}
                    {...studentDockHoverHandlers(
                      teacherApprovedSpeaking
                        ? studentMicLive
                          ? "Teacher approved: your microphone is live"
                          : "Teacher approved: connecting your microphone"
                        : !currentDashboard.room_state.student_raise_hand_enabled
                        ? "Raised hands are disabled"
                        : raisingHand
                          ? "Sending raised hand request"
                          : handRaised
                            ? "Hand already raised"
                            : "Raise your hand",
                    )}
                  >
                    <Hand className="h-[18px] w-[18px]" />
                    <span
                      className={getStudentDockLabelClass(
                        teacherApprovedSpeaking
                          ? studentMicLive
                            ? "Teacher approved: your microphone is live"
                            : "Teacher approved: connecting your microphone"
                          : !currentDashboard.room_state.student_raise_hand_enabled
                          ? "Raised hands are disabled"
                          : raisingHand
                            ? "Sending raised hand request"
                            : handRaised
                              ? "Hand already raised"
                              : "Raise your hand",
                      )}
                    >
                      {teacherApprovedSpeaking
                        ? studentMicLive
                          ? "Teacher approved: your microphone is live"
                          : "Teacher approved: connecting your microphone"
                        : !currentDashboard.room_state.student_raise_hand_enabled
                        ? "Raised hands are disabled"
                        : raisingHand
                          ? "Sending raised hand request"
                          : handRaised
                            ? "Hand already raised"
                            : "Raise your hand"}
                    </span>
                  </button>
                  {["👏", "👍", "❤️"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSendReaction(emoji)}
                      disabled={waitingRoomBlocked}
                      title={`Send ${emoji} reaction`}
                      className={`${studentDockBtn} ${studentDockBtnOff} h-12 min-w-[3rem] text-lg`}
                      aria-label={`Send ${emoji} reaction`}
                      {...studentDockHoverHandlers(`Send ${emoji} reaction`)}
                    >
                      {emoji}
                      <span className={getStudentDockLabelClass(`Send ${emoji} reaction`)}>
                        {`Send ${emoji} reaction`}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setActivePanel("chat");
                      setShowSidePanel(true);
                    }}
                    title="Open class tools"
                    className={`${studentDockBtn} ${studentDockBtnAccent}`}
                    {...studentDockHoverHandlers("Open class tools")}
                  >
                    <LayoutPanelLeft className="h-[18px] w-[18px]" />
                    <span className={getStudentDockLabelClass("Open class tools")}>Open class tools</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimpleStudentToolbarPinned((current) => !current);
                      bumpStudentToolbarVisibility();
                    }}
                    title={simpleStudentToolbarPinned ? "Unpin toolbar" : "Pin toolbar"}
                    aria-pressed={simpleStudentToolbarPinned}
                    className={`${studentDockBtn} ${simpleStudentToolbarPinned ? studentDockBtnAccent : studentDockBtnOff}`}
                    {...studentDockHoverHandlers(simpleStudentToolbarPinned ? "Unpin toolbar" : "Pin toolbar")}
                  >
                    {simpleStudentToolbarPinned ? <Pin className="h-[18px] w-[18px]" /> : <PinOff className="h-[18px] w-[18px]" />}
                    <span className={getStudentDockLabelClass(simpleStudentToolbarPinned ? "Unpin toolbar" : "Pin toolbar")}>
                      {simpleStudentToolbarPinned ? "Unpin toolbar" : "Pin toolbar"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLeaveConfirm(true)}
                    title="Leave class"
                    className="group relative inline-flex h-12 min-w-[4.4rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl bg-rose-600 shadow-sm shadow-rose-950/35 px-3 text-[10px] font-semibold leading-tight text-white transition hover:-translate-y-0.5 hover:scale-[1.03] hover:bg-rose-500 hover:shadow-lg hover:ring-2 hover:ring-white/45 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    {...studentDockHoverHandlers("Leave class")}
                  >
                    <PhoneOff className="h-[18px] w-[18px]" />
                    <span className={getStudentDockLabelClass("Leave class")}>Leave class</span>
                  </button>
                </div>
                {currentDashboard.room_state.breakout_enabled ? (
                  <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/8 p-4 text-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {currentDashboard.breakout_room?.name ?? "Breakout assignment in progress"}
                        </p>
                        <p className="mt-1 text-sm text-slate-300">
                          {currentDashboard.breakout_room
                            ? "Your chat is currently shared with this small group and the teacher."
                            : "The teacher is setting up your breakout room. Stay in the meeting."}
                        </p>
                        {currentDashboard.breakout_room?.teacher_present ? (
                          <p className="mt-2 text-sm font-medium text-emerald-200">
                            The teacher is currently inside this breakout room with your group.
                          </p>
                        ) : null}
                        {breakoutTimerLabel ? (
                          <p
                            className={`mt-2 text-sm font-medium ${
                              breakoutTimerWarningActive ? "text-amber-200" : "text-sky-200"
                            }`}
                          >
                            {breakoutTimerWarningActive
                              ? `Final minute: your breakout closes in ${breakoutTimerLabel}.`
                              : `Breakout timer: ${breakoutTimerLabel}`}
                          </p>
                        ) : null}
                      </div>
                      <UsersRound className="h-5 w-5 text-emerald-300" />
                    </div>
                  </div>
                ) : null}
                {currentDashboard.breakout_broadcast ? (
                  <div className="mt-4 rounded-2xl border border-blue-400/25 bg-blue-500/10 p-4 text-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Teacher message for all breakout rooms</p>
                        <p className="mt-1 text-sm text-slate-200">{currentDashboard.breakout_broadcast.message}</p>
                      </div>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                        {currentDashboard.breakout_broadcast.sent_at}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

            </div>
          </div>
        </section>

        {!simpleViewEnabled || showSidePanel ? (
        <>
        {simpleViewEnabled ? (
          <button
            type="button"
            aria-label="Close class tools"
            onClick={() => setShowSidePanel(false)}
            className="fixed inset-0 z-[58] bg-black/55 backdrop-blur-[1px] xl:hidden"
          />
        ) : null}
        <aside className={`student-right-panel space-y-4 ${
          simpleViewEnabled
            ? "fixed inset-x-2 bottom-[5.1rem] top-16 z-[60] overflow-y-auto rounded-[24px] border border-white/10 bg-[var(--card)] p-2 shadow-[0_20px_45px_rgba(0,0,0,0.35)]"
            : ""
        } xl:sticky xl:top-4 xl:max-h-[calc(100vh-1.5rem)] xl:overflow-y-auto xl:rounded-none xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none xl:pr-1`}>
          <div className="surface-card p-3">
              {simpleViewEnabled ? (
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold text-[var(--text)] sm:text-sm">Class tools</p>
                  <button
                    type="button"
                    onClick={() => setShowSidePanel(false)}
                    className="rounded-xl border border-[var(--border)] px-2.5 py-1 text-[10px] font-semibold text-[var(--subtext)] transition hover:bg-[var(--background-soft)] sm:px-3 sm:text-xs"
                  >
                    Close
                  </button>
                </div>
              ) : null}
              <div className="grid grid-cols-3 gap-2">
              {[
                { id: "chat", label: "Chat", icon: MessageSquareText },
                { id: "people", label: "People", icon: UsersRound },
                { id: "activities", label: "Activities", icon: BadgeHelp },
              ].map((item) => {
                const Icon = item.icon;
                const active = activePanel === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActivePanel(item.id as "chat" | "people" | "activities")}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl px-2.5 py-2.5 text-[11px] font-semibold transition sm:gap-2 sm:px-3 sm:py-3 sm:text-xs ${
                      active
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--background-soft)] text-[var(--subtext)] hover:text-[var(--text)]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {activePanel === "chat" ? (
            <div className="surface-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold sm:text-base">
                    {currentDashboard.room_state.breakout_enabled && currentDashboard.breakout_room
                      ? `${currentDashboard.breakout_room.name} chat`
                      : "Meeting chat"}
                  </p>
                  <p className="text-xs text-[var(--subtext)]">
                    {currentDashboard.room_state.breakout_enabled
                      ? "Messages stay scoped to your breakout group and the teacher."
                      : currentDashboard.room_state.chat_moderation_mode === "qa_queue"
                        ? "Questions go to the instructor first; published items appear here for everyone."
                        : "Highlights from the live room"}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--background-soft)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--subtext)]">
                  {currentDashboard.messages.length} messages
                </span>
              </div>
              {!currentDashboard.room_state.breakout_enabled &&
              currentDashboard.room_state.chat_moderation_mode === "qa_queue" ? (
                <div className="mb-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-50">
                  Moderated Q&amp;A is on: your messages are reviewed before they show in the class feed.
                </div>
              ) : null}
              {currentDashboard.room_state.chat_slow_mode ? (
                <div className="mb-2 rounded-xl border border-sky-400/25 bg-sky-500/10 px-3 py-2 text-xs text-sky-900 dark:text-sky-100">
                  Slow chat is active: send concise messages and wait a little before sending again.
                </div>
              ) : null}
              {chatCooldownSeconds > 0 ? (
                <div className="mb-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-50">
                  Slow mode cooldown: you can send your next message in {chatCooldownSeconds}s.
                </div>
              ) : null}
              <div className="max-h-[620px] space-y-1.5 overflow-y-auto pr-1 max-[360px]:space-y-1">
                {chatMessagesByRecentTime.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-xl px-2.5 py-2 max-[360px]:px-2 max-[360px]:py-1.5 ${
                      message.role === "teacher"
                        ? "bg-blue-50 text-blue-950 dark:bg-blue-500/12 dark:text-blue-50"
                        : "bg-[var(--background-soft)] text-[var(--text)]"
                    }`}
                  >
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold leading-4 max-[360px]:text-[10px] max-[360px]:leading-3.5">
                        {message.sender}
                      </p>
                      <span className="text-[10px] leading-4 opacity-70 max-[360px]:text-[9px] max-[360px]:leading-3.5">
                        {message.time}
                      </span>
                    </div>
                    <p className="text-xs leading-4 opacity-90 max-[360px]:text-[10px] max-[360px]:leading-3.5">
                      {message.message}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2 max-[360px]:mt-2 max-[360px]:gap-1.5">
                <input
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                  disabled={!currentDashboard.room_state.student_chat_enabled || sendingChat}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSendChatMessage();
                    }
                  }}
                  placeholder={
                    waitingRoomBlocked
                      ? "Wait for teacher approval to join the room"
                      : currentDashboard.room_state.student_chat_enabled
                        ? currentDashboard.room_state.breakout_enabled
                          ? "Send a message to your breakout"
                          : currentDashboard.room_state.chat_moderation_mode === "qa_queue"
                            ? "Ask the instructor (held for review)"
                            : currentDashboard.room_state.chat_slow_mode
                              ? chatCooldownSeconds > 0
                                ? `Wait ${chatCooldownSeconds}s before sending`
                                : "Slow mode is on - send one concise message"
                            : "Send a message to the room"
                        : "Student chat is turned off"
                  }
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--text)] outline-none transition focus:border-blue-400 max-[360px]:px-2.5 max-[360px]:py-1.5 max-[360px]:text-[10px]"
                />
                <button
                  type="button"
                  onClick={() => void handleSendChatMessage()}
                  disabled={
                    sendingChat ||
                    chatCooldownSeconds > 0 ||
                    !chatDraft.trim() ||
                    !currentDashboard.room_state.student_chat_enabled ||
                    waitingRoomBlocked
                  }
                  className="rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 max-[360px]:px-2.5 max-[360px]:py-1.5 max-[360px]:text-[10px]"
                >
                  {sendingChat ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          ) : null}

          {activePanel === "people" ? (
            <div className="surface-card p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold sm:text-lg">People</p>
                  <p className="text-xs text-[var(--subtext)] sm:text-sm">
                    {currentDashboard.room_state.breakout_enabled && currentDashboard.breakout_room
                      ? `Everyone in ${currentDashboard.breakout_room.name}`
                      : "Everyone currently visible in the room"}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--background-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--secondary)] sm:px-3 sm:text-xs">
                  {participantNames.length} in room
                </span>
              </div>
              <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
                {participantNames.map((name) => (
                  <div key={name} className="surface-muted flex items-center justify-between p-3 sm:p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--background-soft)] text-xs font-bold text-[var(--primary)] sm:h-10 sm:w-10 sm:text-sm">
                        {name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[var(--text)] sm:text-sm">{name}</p>
                        <p className="text-xs text-[var(--subtext)]">
                          {name === currentUsername ? "You" : "In call"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activePanel === "activities" ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="surface-card p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-base font-semibold sm:text-lg">Poll</p>
                    <p className="text-xs text-[var(--subtext)] sm:text-sm">Vote without leaving the meeting</p>
                  </div>
                  <span className="rounded-full bg-[var(--background-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--secondary)] sm:px-3 sm:text-xs">
                    {currentDashboard.poll.response_count} responses
                  </span>
                </div>
                <p className="text-xs font-medium text-[var(--text)] sm:text-sm">{currentDashboard.poll.question}</p>
                <div className="mt-4 space-y-4">
                  {currentDashboard.poll.options.map((option) => {
                    const isSelected = currentDashboard.poll.selected_option_id === option.id;

                    return (
                      <button
                        type="button"
                        key={option.id ?? option.label}
                        onClick={() => (option.id ? handlePollVote(option.id) : null)}
                        disabled={!option.id || submittingPoll === option.id}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          isSelected
                            ? "border-blue-400 bg-blue-50/70 dark:bg-blue-500/10"
                            : "border-[var(--border)] bg-[var(--card)] hover:border-blue-300"
                        } disabled:cursor-not-allowed disabled:opacity-70`}
                      >
                        <div className="mb-2 flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-[var(--subtext)]">{option.label}</span>
                          <span className="font-semibold text-[var(--text)]">{option.value}%</span>
                        </div>
                        <div className="h-3 rounded-full bg-[var(--background-soft)]">
                          <div
                            className="h-3 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]"
                            style={{ width: `${option.value}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="surface-card p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-base font-semibold sm:text-lg">Quiz</p>
                    <p className="text-xs text-[var(--subtext)] sm:text-sm">Quick check-ins during the session</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300 sm:px-3 sm:text-xs">
                    {currentDashboard.quiz.submitted ? "Submitted" : "Ready"}
                  </span>
                </div>
                <div className="surface-muted space-y-3 p-4">
                  <p className="text-xs font-medium text-[var(--text)] sm:text-sm">
                    {currentDashboard.quiz.question}
                  </p>
                  {currentDashboard.quiz.choices.map((choice) => {
                    const isSelected = currentDashboard.quiz.selected_choice_id === choice.id;

                    return (
                      <button
                        type="button"
                        key={choice.id ?? choice.label}
                        onClick={() => (choice.id ? handleQuizSubmit(choice.id) : null)}
                        disabled={!choice.id || submittingQuiz === choice.id}
                        className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left text-xs transition sm:px-4 sm:py-3 sm:text-sm ${
                          isSelected
                            ? "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-500/10"
                            : "border-[var(--border)] bg-[var(--card)] hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-slate-800"
                        } disabled:cursor-not-allowed disabled:opacity-70`}
                      >
                        <span>{choice.label}</span>
                        <CircleCheckBig
                          className={`h-4 w-4 ${isSelected ? "text-emerald-600 dark:text-emerald-300" : "text-[var(--subtext)]"}`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

        </aside>
        </>
        ) : null}
      </div>

      <div
        className={`pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 transition-all duration-300 ${
          simpleViewEnabled ? (simpleStudentToolbarVisible ? "bottom-24" : "bottom-6") : "bottom-6"
        }`}
      >
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] px-3 py-1.5 shadow-lg backdrop-blur-md">
          {currentDashboard.engagement_stats.slice(0, 2).map((item) => (
            <div
              key={item.label}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background-soft)] px-3 py-1 text-xs"
            >
              <span className="font-semibold text-[var(--text)]">{item.label}</span>
              <span className="font-medium text-[var(--subtext)]">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {showLeaveConfirm ? (
        <div className="fade-in fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-4 backdrop-blur-sm sm:items-center">
          <div className="surface-card w-full max-w-md p-5 sm:p-6">
            <h3 className="text-xl font-bold text-[var(--text)]">Proceed to leave the classroom?</h3>
            <p className="mt-2 text-sm text-[var(--subtext)]">
              You can rejoin later from this page using the Rejoin class button.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--subtext)] transition hover:bg-[var(--background-soft)]"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveConfirm(false);
                  handleLeaveClassroom();
                }}
                className="flex-1 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-400"
              >
                Proceed and leave
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
