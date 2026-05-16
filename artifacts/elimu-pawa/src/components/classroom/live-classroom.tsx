
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeHelp,
  CircleCheckBig,
  Hand,
  Lock,
  MessageSquareText,
  Mic,
  MicOff,
  PhoneOff,
  PlayCircle,
  Signal,
  UsersRound,
  Video,
  VideoOff,
  X,
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
  currentUserFullName,
  accessToken,
}: {
  dashboard: StudentDashboardData;
  currentUsername: string;
  currentUserFullName?: string;
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
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/15 text-rose-400">
            <PhoneOff className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-white">Removed from classroom</h2>
          <p className="mt-3 text-sm text-slate-400">
            The teacher ended your access to this live room. Refresh or join another session when invited back.
          </p>
          <button
            type="button"
            onClick={() => { window.location.href = "/student/home"; }}
            className="mt-6 rounded-2xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Full-screen meeting container */}
      <div className="fixed inset-0 flex flex-col bg-slate-950 text-white">

        {/* ── TOP BAR ── */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/8 bg-slate-900/80 px-4 backdrop-blur-sm sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            {currentDashboard.live_class.is_live ? (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-rose-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                LIVE
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-slate-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                SCHED
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{currentDashboard.live_class.course_title}</p>
              <p className="text-[10px] leading-tight text-slate-400">{currentDashboard.live_class.room_code}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1 text-xs text-slate-300 sm:inline-flex">
              <Signal className="h-3 w-3 text-emerald-400" />
              {syncBadgeLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1 text-xs text-slate-300">
              <UsersRound className="h-3 w-3" />
              {participantNames.length}
            </span>
            <span className="hidden rounded-full bg-white/8 px-2.5 py-1 text-xs text-slate-300 sm:block">{nowTimeLabel}</span>
            {currentUserFullName ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold">
                {currentUserFullName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
              </div>
            ) : null}
          </div>
        </header>

        {/* ── MAIN AREA: stage + optional side panel ── */}
        <div className="relative flex min-h-0 flex-1">

          {/* Stage column */}
          <div className="flex min-w-0 flex-1 flex-col">

            {/* Video / content area */}
            <div className="relative min-h-0 flex-1 bg-black">

              {waitingRoomBlocked ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
                  <div className="rounded-full bg-white/10 p-5">
                    <UsersRound className="h-10 w-10 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-white">
                      {currentDashboard.live_class.join_status === "pending"
                        ? "Waiting for approval"
                        : currentDashboard.live_class.join_status === "denied"
                          ? "Join request denied"
                          : "Waiting room"}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      {currentDashboard.live_class.join_status === "pending"
                        ? "Stay on this page — you'll enter as soon as the teacher approves."
                        : currentDashboard.live_class.join_status === "denied"
                          ? "Ask to join again when the teacher is ready."
                          : "Send a join request and wait for the teacher to admit you."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleJoinRequest()}
                    disabled={requestingJoin || currentDashboard.live_class.join_status === "pending"}
                    className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {requestingJoin
                      ? "Sending..."
                      : currentDashboard.live_class.join_status === "denied"
                        ? "Request again"
                        : currentDashboard.live_class.join_status === "pending"
                          ? "Waiting for teacher..."
                          : "Ask to join"}
                  </button>
                </div>

              ) : hasPaid && currentDashboard.live_class.broadcast_only ? (
                <div className="absolute inset-0">
                  <iframe
                    className="h-full w-full"
                    src={broadcastEmbedUrl}
                    title="ElimuPawa Classroom Live"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onLoad={() => setBroadcastPlaybackState("live")}
                  />
                  <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-[#4285f4]/90 px-3 py-1 text-xs font-semibold text-white">
                    {broadcastPlaybackState === "loading" ? (
                      <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" />
                    ) : null}
                    {broadcastPlaybackState === "live" ? "Broadcast live" : broadcastPlaybackState === "loading" ? "Connecting..." : "Stream not live yet"}
                  </div>
                </div>

              ) : hasPaid && currentDashboard.room_state.stage_mode === "whiteboard" ? (
                <div className="absolute inset-0">
                  <WhiteboardStage whiteboard={currentDashboard.whiteboard} />
                  {contentSpotlightActive ? (
                    <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-amber-400/90 px-3 py-1 text-xs font-semibold text-slate-950">
                      Stage spotlight
                    </div>
                  ) : null}
                </div>

              ) : hasPaid && currentDashboard.room_state.stage_mode === "screenshare" ? (
                <div className="absolute inset-0">
                  {liveScreenReady ? (
                    <video ref={remoteScreenVideoRef} className="h-full w-full bg-black object-contain" autoPlay playsInline />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3">
                      <div className="rounded-full bg-white/10 p-5">
                        <Video className="h-10 w-10 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-400">Connecting to teacher screen...</p>
                    </div>
                  )}
                  <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-[#4285f4]/85 px-3 py-1 text-xs font-semibold text-white">
                    {liveScreenReady ? "Teacher presenting" : "Connecting..."}
                  </div>
                  {liveCameraReady ? (
                    <div className={`absolute bottom-4 right-4 overflow-hidden rounded-xl border bg-slate-950 shadow-2xl ${teacherSpotlightActive ? "border-amber-300/80 ring-2 ring-amber-300/60" : "border-white/15"}`}>
                      <video
                        ref={remoteCameraVideoRef}
                        className={`${teacherSpotlightActive ? "h-28 w-44 sm:h-32 sm:w-52" : "h-20 w-32 sm:h-24 sm:w-36"} object-cover`}
                        autoPlay
                        playsInline
                      />
                    </div>
                  ) : null}
                  {teacherApprovedSpeaking ? (
                    <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300/70" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-200" />
                      </span>
                      {studentMicLive ? "Mic live" : "Mic connecting"}
                    </div>
                  ) : null}
                </div>

              ) : hasPaid && currentDashboard.room_state.stage_mode === "camera" ? (
                <div className="absolute inset-0">
                  {liveCameraReady ? (
                    <video ref={remoteCameraVideoRef} className="h-full w-full bg-black object-cover" autoPlay playsInline />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3">
                      <div className="rounded-full bg-white/10 p-5">
                        <Video className="h-10 w-10 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-400">Connecting teacher camera...</p>
                    </div>
                  )}
                  <div className={`pointer-events-none absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold ${teacherSpotlightActive ? "bg-amber-400/90 text-slate-950" : "bg-black/60 text-white"}`}>
                    {teacherSpotlightActive
                      ? liveCameraReady ? "Teacher spotlight" : "Connecting spotlight"
                      : liveCameraReady ? "Teacher camera" : "Connecting..."}
                  </div>
                  {teacherApprovedSpeaking ? (
                    <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300/70" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-200" />
                      </span>
                      {studentMicLive ? "Mic live" : "Mic connecting"}
                    </div>
                  ) : null}
                </div>

              ) : hasPaid ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
                  <div className="rounded-full bg-white/8 p-5">
                    <PlayCircle className="h-10 w-10 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">{currentDashboard.live_class.session_title}</p>
                    <p className="mt-1 text-sm text-slate-400">Waiting for the session to begin...</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleJoinRequest()}
                    disabled={requestingJoin || (currentDashboard.live_class.waiting_room_enabled && currentDashboard.live_class.join_status === "pending")}
                    className="rounded-2xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
                  >
                    {requestingJoin ? "Joining..." : joinLabel}
                  </button>
                </div>

              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
                  <div className="rounded-full bg-white/8 p-5">
                    <Lock className="h-10 w-10 text-slate-400" />
                  </div>
                  <p className="text-xl font-semibold text-white">Session locked</p>
                  <p className="text-sm text-slate-400">Waiting for your teacher to open the class.</p>
                </div>
              )}

              {/* Status overlay chips — top-right */}
              <div className="pointer-events-none absolute right-4 top-4 flex flex-col items-end gap-1.5">
                {currentDashboard.room_state.breakout_enabled ? (
                  <span className="rounded-full bg-emerald-500/80 px-2.5 py-1 text-xs font-semibold text-white shadow-lg">
                    {currentDashboard.breakout_room?.name ?? "Breakout"}
                  </span>
                ) : null}
                {currentDashboard.room_state.recording_status !== "idle" ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-rose-500/90 px-2.5 py-1 text-xs font-semibold text-white shadow-lg">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    {currentDashboard.room_state.recording_status === "paused" ? "REC paused" : "REC"}
                  </span>
                ) : null}
                {breakoutTimerLabel ? (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold shadow-lg ${breakoutTimerWarningActive ? "bg-amber-400/90 text-slate-950" : "bg-sky-500/80 text-white"}`}>
                    {breakoutTimerWarningActive ? `Ends in ${breakoutTimerLabel}` : `Timer ${breakoutTimerLabel}`}
                  </span>
                ) : null}
              </div>

              {/* Breakout room info banner */}
              {currentDashboard.room_state.breakout_enabled ? (
                <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-emerald-400/20 bg-emerald-900/70 px-4 py-3 text-white backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{currentDashboard.breakout_room?.name ?? "Breakout in progress"}</p>
                      <p className="mt-0.5 text-xs text-emerald-200">
                        {currentDashboard.breakout_room
                          ? "Your chat is scoped to this group and the teacher."
                          : "The teacher is setting up your breakout room."}
                      </p>
                      {currentDashboard.breakout_room?.teacher_present ? (
                        <p className="mt-1 text-xs font-medium text-emerald-300">Teacher is in this room with you.</p>
                      ) : null}
                    </div>
                    <UsersRound className="h-5 w-5 shrink-0 text-emerald-300" />
                  </div>
                </div>
              ) : null}

              {/* Breakout broadcast message */}
              {currentDashboard.breakout_broadcast ? (
                <div className="absolute inset-x-4 bottom-20 rounded-2xl border border-blue-400/25 bg-blue-900/70 px-4 py-3 text-white backdrop-blur-sm">
                  <p className="text-xs font-semibold text-blue-200">Teacher message to all breakout rooms</p>
                  <p className="mt-1 text-sm text-slate-200">{currentDashboard.breakout_broadcast.message}</p>
                </div>
              ) : null}
            </div>

            {/* ── PARTICIPANT TILE STRIP ── */}
            <div className="flex shrink-0 items-center gap-2 overflow-x-auto bg-slate-900/60 px-3 py-2.5">
              {participantNames.map((name) => {
                const isYou = name === currentUsername;
                const isTeacher = currentDashboard.courses[0]?.coach === name;
                const tileInitial = name.slice(0, 1).toUpperCase();
                return (
                  <div
                    key={name}
                    className={`relative flex shrink-0 flex-col items-center gap-1 rounded-xl border p-1.5 w-[3.75rem] transition ${
                      isTeacher
                        ? "border-blue-400/50 bg-slate-800"
                        : isYou
                          ? "border-emerald-400/40 bg-slate-800"
                          : "border-white/8 bg-slate-800/70"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${
                        isTeacher ? "bg-blue-600 text-white" : isYou ? "bg-emerald-600 text-white" : "bg-slate-600 text-slate-200"
                      }`}
                    >
                      {tileInitial}
                    </div>
                    <p className="w-full truncate text-center text-[9px] leading-tight text-slate-300">
                      {isYou ? "You" : (name.includes(".") ? name.split(".")[0] : name)}
                    </p>
                    {isTeacher ? (
                      <span className="absolute -right-1 -top-1.5 rounded-full bg-blue-500 px-1 text-[8px] font-bold leading-4 text-white">T</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── SIDE PANEL (chat / people / activities) ── */}
          {showSidePanel ? (
            <>
              {/* Mobile backdrop */}
              <button
                type="button"
                aria-label="Close panel"
                onClick={() => setShowSidePanel(false)}
                className="absolute inset-0 z-10 bg-black/50 xl:hidden"
              />
              <aside className="absolute right-0 top-0 z-20 flex h-full w-80 flex-col border-l border-white/8 bg-slate-900 xl:relative xl:inset-auto xl:z-auto">
                {/* Tab bar */}
                <div className="flex shrink-0 border-b border-white/8">
                  {([
                    { id: "chat", label: "Chat", icon: MessageSquareText },
                    { id: "people", label: "People", icon: UsersRound },
                    { id: "activities", label: "Activities", icon: BadgeHelp },
                  ] as const).map((item) => {
                    const Icon = item.icon;
                    const active = activePanel === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActivePanel(item.id)}
                        className={`flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-semibold transition ${
                          active ? "border-b-2 border-blue-400 text-blue-300" : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setShowSidePanel(false)}
                    aria-label="Close panel"
                    className="px-3 text-slate-500 transition hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Chat panel */}
                {activePanel === "chat" ? (
                  <div className="flex min-h-0 flex-1 flex-col p-3">
                    {currentDashboard.room_state.chat_moderation_mode === "qa_queue" ? (
                      <div className="mb-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                        Moderated Q&amp;A: messages are reviewed before appearing.
                      </div>
                    ) : null}
                    {chatCooldownSeconds > 0 ? (
                      <div className="mb-2 rounded-xl bg-amber-500/15 px-3 py-2 text-xs text-amber-200">
                        Slow mode: wait {chatCooldownSeconds}s before sending.
                      </div>
                    ) : null}
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
                      {chatMessagesByRecentTime.map((message) => (
                        <div
                          key={message.id}
                          className={`rounded-xl px-3 py-2 ${
                            message.role === "teacher"
                              ? "border border-blue-400/25 bg-blue-500/12"
                              : "bg-white/5"
                          }`}
                        >
                          <div className="mb-0.5 flex items-center justify-between gap-2">
                            <p className={`text-[11px] font-semibold ${message.role === "teacher" ? "text-blue-300" : "text-slate-200"}`}>
                              {message.sender}
                            </p>
                            <span className="text-[10px] text-slate-500">{message.time}</span>
                          </div>
                          <p className="text-xs leading-4 text-slate-300">{message.message}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex shrink-0 gap-2">
                      <input
                        value={chatDraft}
                        onChange={(e) => setChatDraft(e.target.value)}
                        disabled={!currentDashboard.room_state.student_chat_enabled || sendingChat}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void handleSendChatMessage();
                          }
                        }}
                        placeholder={
                          waitingRoomBlocked
                            ? "Wait for teacher approval"
                            : currentDashboard.room_state.student_chat_enabled
                              ? "Send a message..."
                              : "Chat is turned off"
                        }
                        className="flex-1 rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-400"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSendChatMessage()}
                        disabled={sendingChat || chatCooldownSeconds > 0 || !chatDraft.trim() || !currentDashboard.room_state.student_chat_enabled || waitingRoomBlocked}
                        className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
                      >
                        {sendingChat ? "..." : "Send"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* People panel */}
                {activePanel === "people" ? (
                  <div className="flex-1 overflow-y-auto p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-200">In this room</p>
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-slate-300">{participantNames.length}</span>
                    </div>
                    <div className="space-y-2">
                      {participantNames.map((name) => {
                        const isYou = name === currentUsername;
                        const isTeacher = currentDashboard.courses[0]?.coach === name;
                        return (
                          <div key={name} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isTeacher ? "bg-blue-600 text-white" : isYou ? "bg-emerald-600 text-white" : "bg-slate-600 text-slate-200"}`}>
                              {name.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-200">{name}</p>
                              <p className="text-xs text-slate-500">{isYou ? "You" : isTeacher ? "Teacher" : "Student"}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Activities panel */}
                {activePanel === "activities" ? (
                  <div className="flex-1 space-y-4 overflow-y-auto p-3">
                    {/* Poll */}
                    <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-200">Poll</p>
                        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-slate-400">{currentDashboard.poll.response_count} votes</span>
                      </div>
                      <p className="mb-3 text-xs text-slate-300">{currentDashboard.poll.question}</p>
                      <div className="space-y-2">
                        {currentDashboard.poll.options.map((option) => {
                          const isSelected = currentDashboard.poll.selected_option_id === option.id;
                          return (
                            <button
                              type="button"
                              key={option.id ?? option.label}
                              onClick={() => (option.id ? handlePollVote(option.id) : null)}
                              disabled={!option.id || submittingPoll === option.id}
                              className={`w-full rounded-xl border p-3 text-left transition ${
                                isSelected ? "border-blue-400 bg-blue-500/15" : "border-white/10 bg-white/5 hover:border-blue-400/50"
                              } disabled:opacity-60`}
                            >
                              <div className="mb-1.5 flex items-center justify-between text-xs">
                                <span className="text-slate-300">{option.label}</span>
                                <span className="font-semibold text-white">{option.value}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/10">
                                <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-400" style={{ width: `${option.value}%` }} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quiz */}
                    <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-200">Quiz</p>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${currentDashboard.quiz.submitted ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-slate-400"}`}>
                          {currentDashboard.quiz.submitted ? "Submitted" : "Open"}
                        </span>
                      </div>
                      <p className="mb-3 text-xs text-slate-300">{currentDashboard.quiz.question}</p>
                      <div className="space-y-2">
                        {currentDashboard.quiz.choices.map((choice) => {
                          const isSelected = currentDashboard.quiz.selected_choice_id === choice.id;
                          return (
                            <button
                              type="button"
                              key={choice.id ?? choice.label}
                              onClick={() => (choice.id ? handleQuizSubmit(choice.id) : null)}
                              disabled={!choice.id || submittingQuiz === choice.id}
                              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                                isSelected ? "border-emerald-400 bg-emerald-500/15" : "border-white/10 bg-white/5 hover:border-blue-400/50"
                              } disabled:opacity-60`}
                            >
                              <span className="text-slate-300">{choice.label}</span>
                              <CircleCheckBig className={`h-4 w-4 shrink-0 ${isSelected ? "text-emerald-400" : "text-slate-600"}`} />
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

        {/* ── BOTTOM TOOLBAR ── */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-white/8 bg-slate-900/90 px-3 py-2.5 backdrop-blur-sm sm:px-5">
          {/* Left: session label */}
          <div className="hidden min-w-0 sm:block">
            <p className="max-w-[180px] truncate text-xs text-slate-400">{currentDashboard.live_class.session_title}</p>
          </div>

          {/* Center: action buttons */}
          <div className="flex flex-1 items-center justify-center gap-1.5 sm:flex-none sm:gap-2">

            {/* Teacher mic status indicator (read-only) */}
            <div
              title={currentDashboard.room_state.teacher_mic_enabled ? "Teacher mic on" : "Teacher mic off"}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                currentDashboard.room_state.teacher_mic_enabled ? "bg-emerald-600/70 text-white" : "bg-slate-700/80 text-slate-400"
              }`}
            >
              {currentDashboard.room_state.teacher_mic_enabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </div>

            {/* Teacher camera status indicator (read-only) */}
            <div
              title={currentDashboard.room_state.teacher_camera_enabled ? "Teacher camera on" : "Teacher camera off"}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                currentDashboard.room_state.teacher_camera_enabled ? "bg-emerald-600/70 text-white" : "bg-slate-700/80 text-slate-400"
              }`}
            >
              {currentDashboard.room_state.teacher_camera_enabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </div>

            {/* Raise hand */}
            <button
              type="button"
              onClick={() => void handleRaiseHand()}
              disabled={teacherApprovedSpeaking || raisingHand || !currentDashboard.room_state.student_raise_hand_enabled || waitingRoomBlocked}
              title={handRaised ? "Hand raised — waiting for teacher" : "Raise your hand"}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 ${
                handRaised || teacherApprovedSpeaking ? "bg-amber-500 shadow-lg shadow-amber-900/50" : "bg-slate-700 hover:bg-slate-600"
              }`}
            >
              <Hand className="h-4 w-4" />
            </button>

            {/* Reactions */}
            {(["👏", "👍", "❤️"] as const).map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSendReaction(emoji)}
                disabled={waitingRoomBlocked}
                title={`React ${emoji}`}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-base transition hover:scale-105 hover:bg-slate-600 disabled:opacity-50"
              >
                {emoji}
              </button>
            ))}

            {/* Chat toggle */}
            <button
              type="button"
              onClick={() => { setActivePanel("chat"); setShowSidePanel((v) => !v); }}
              title="Chat"
              className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:scale-105 ${showSidePanel && activePanel === "chat" ? "bg-blue-600 shadow-lg shadow-blue-900/50" : "bg-slate-700 hover:bg-slate-600"}`}
            >
              <MessageSquareText className="h-4 w-4" />
            </button>

            {/* People toggle */}
            <button
              type="button"
              onClick={() => { setActivePanel("people"); setShowSidePanel((v) => !v); }}
              title="Participants"
              className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:scale-105 ${showSidePanel && activePanel === "people" ? "bg-blue-600 shadow-lg shadow-blue-900/50" : "bg-slate-700 hover:bg-slate-600"}`}
            >
              <UsersRound className="h-4 w-4" />
            </button>

            {/* Activities toggle */}
            <button
              type="button"
              onClick={() => { setActivePanel("activities"); setShowSidePanel((v) => !v); }}
              title="Activities"
              className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:scale-105 ${showSidePanel && activePanel === "activities" ? "bg-blue-600 shadow-lg shadow-blue-900/50" : "bg-slate-700 hover:bg-slate-600"}`}
            >
              <BadgeHelp className="h-4 w-4" />
            </button>

            {/* Leave */}
            <button
              type="button"
              onClick={() => setShowLeaveConfirm(true)}
              title="Leave class"
              className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-rose-600 px-4 text-sm font-semibold text-white transition hover:scale-105 hover:bg-rose-500 sm:px-5"
            >
              <PhoneOff className="h-4 w-4" />
              <span className="hidden text-xs sm:inline">Leave</span>
            </button>
          </div>

          {/* Right: join/access status */}
          <div className="hidden items-center justify-end sm:flex">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${canEnterRoom ? "bg-emerald-500/20 text-emerald-300" : "bg-white/8 text-slate-400"}`}>
              {attendStatusLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ── LEAVE CONFIRM MODAL ── */}
      {showLeaveConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Leave classroom?</h3>
            <p className="mt-2 text-sm text-slate-400">You can rejoin later from the student dashboard.</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 rounded-xl border border-white/15 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/8"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={() => { setShowLeaveConfirm(false); handleLeaveClassroom(); }}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
