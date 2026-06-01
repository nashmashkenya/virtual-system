import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
  submitStudentJoinRequest,
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
  const [raisingHand, setRaisingHand] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [teacherApprovedSpeaking, setTeacherApprovedSpeaking] = useState(false);
  const [studentMicLive, setStudentMicLive] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [activePanel, setActivePanel] = useState<"chat" | "people">("chat");
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [dataSaverEnabled, setDataSaverEnabled] = useState(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [screenActive, setScreenActive] = useState(false);
  const [audioActive, setAudioActive] = useState(false);

  // WebRTC Stream Refs
  const remoteCameraVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const remoteCameraVideoRef = useCallback((node: HTMLVideoElement | null) => {
    remoteCameraVideoElementRef.current = node;
    if (node) {
      node.srcObject = remoteCameraStreamRef.current;
    }
  }, []);
  const remoteCameraStreamRef = useRef<MediaStream | null>(null);
  const cameraPeerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioStreamRef = useRef<MediaStream | null>(null);
  const audioPeerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const remoteScreenVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const remoteScreenVideoRef = useCallback((node: HTMLVideoElement | null) => {
    remoteScreenVideoElementRef.current = node;
    if (node) {
      node.srcObject = remoteScreenStreamRef.current;
    }
  }, []);
  const remoteScreenStreamRef = useRef<MediaStream | null>(null);
  const screenPeerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const studentMicStreamRef = useRef<MediaStream | null>(null);
  const studentSpeakerPeerConnectionRef = useRef<RTCPeerConnection | null>(null);

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
    setIsMicMuted(false);
  }, [closeStudentSpeakerPeer]);

  const toggleStudentMicMute = useCallback(() => {
    if (studentMicStreamRef.current) {
      const nextMuted = !isMicMuted;
      studentMicStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
      setIsMicMuted(nextMuted);
    }
  }, [isMicMuted]);

  // Clean WebRTC helpers
  const clearLiveCamera = useCallback(() => {
    cameraPeerConnectionRef.current?.close();
    cameraPeerConnectionRef.current = null;
    remoteCameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteCameraStreamRef.current = null;
    if (remoteCameraVideoElementRef.current) {
      remoteCameraVideoElementRef.current.srcObject = null;
    }
    setStudentMicLive(false);
    setCameraActive(false);
  }, []);

  const clearLiveAudio = useCallback(() => {
    audioPeerConnectionRef.current?.close();
    audioPeerConnectionRef.current = null;
    remoteAudioStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteAudioStreamRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    setAudioActive(false);
  }, []);

  const clearLiveScreen = useCallback(() => {
    screenPeerConnectionRef.current?.close();
    screenPeerConnectionRef.current = null;
    remoteScreenStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteScreenStreamRef.current = null;
    if (remoteScreenVideoElementRef.current) {
      remoteScreenVideoElementRef.current.srcObject = null;
    }
    setScreenActive(false);
  }, []);

  const ensureAudioPeerConnection = useCallback(() => {
    if (audioPeerConnectionRef.current) {
      return audioPeerConnectionRef.current;
    }
    const peerConnection = new RTCPeerConnection({ iceServers: getIceServers() });
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
        if (!stream.getTracks().some((et) => et.id === track.id)) {
          stream.addTrack(track);
        }
      });
      const playPromise = remoteAudioRef.current?.play();
      void playPromise?.catch(() => undefined);
      setAudioActive(true);
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
    const peerConnection = new RTCPeerConnection({ iceServers: getIceServers() });
    const remoteStream = new MediaStream();
    remoteCameraStreamRef.current = remoteStream;
    if (remoteCameraVideoElementRef.current) {
      remoteCameraVideoElementRef.current.srcObject = remoteStream;
    }

    peerConnection.ontrack = (event) => {
      const stream = remoteCameraStreamRef.current ?? new MediaStream();
      remoteCameraStreamRef.current = stream;
      if (remoteCameraVideoElementRef.current && remoteCameraVideoElementRef.current.srcObject !== stream) {
        remoteCameraVideoElementRef.current.srcObject = stream;
      }
      event.streams[0]?.getTracks().forEach((track) => {
        if (!stream.getTracks().some((et) => et.id === track.id)) {
          stream.addTrack(track);
        }
      });
      setCameraActive(true);
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
    const peerConnection = new RTCPeerConnection({ iceServers: getIceServers() });
    const remoteStream = new MediaStream();
    remoteScreenStreamRef.current = remoteStream;
    if (remoteScreenVideoElementRef.current) {
      remoteScreenVideoElementRef.current.srcObject = remoteStream;
    }

    peerConnection.ontrack = (event) => {
      const stream = remoteScreenStreamRef.current ?? new MediaStream();
      remoteScreenStreamRef.current = stream;
      if (remoteScreenVideoElementRef.current && remoteScreenVideoElementRef.current.srcObject !== stream) {
        remoteScreenVideoElementRef.current.srcObject = stream;
      }
      event.streams[0]?.getTracks().forEach((track) => {
        if (!stream.getTracks().some((et) => et.id === track.id)) {
          stream.addTrack(track);
        }
      });
      setScreenActive(true);
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
      // Keep state if request fails
    }
  }, []);

  // Sync / Signalling Hooks
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
        setCurrentDashboard((state) => ({ ...state, room_state: message.room_state }));
        return;
      }
      if (message.event === "message_created") {
        setCurrentDashboard((state) => ({
          ...state,
          messages: [...state.messages, message.message].slice(-10),
        }));
        return;
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
      if (message.source_role !== "teacher") return;

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
          message: "Your raised hand was resolved.",
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
            const peerConnection = new RTCPeerConnection({ iceServers: getIceServers() });
            studentSpeakerPeerConnectionRef.current = peerConnection;

            stream.getAudioTracks().forEach((track) => peerConnection.addTrack(track, stream));

            peerConnection.onicecandidate = (event) => {
              if (!event.candidate) return;
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
              payload: { kind: "speaker_offer", description: offer },
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
        if (peerConnection) {
          void peerConnection.setRemoteDescription(message.payload.description).catch(() => undefined);
        }
        return;
      }

      if (message.payload.kind === "speaker_ice_candidate") {
        const peerConnection = studentSpeakerPeerConnectionRef.current;
        if (peerConnection) {
          void peerConnection.addIceCandidate(message.payload.candidate).catch(() => undefined);
        }
        return;
      }

      if (message.payload.kind === "offer") {
        const { description, media } = message.payload;
        void (async () => {
          if (media === "screen") clearLiveScreen();
          else if (media === "audio") clearLiveAudio();
          else clearLiveCamera();

          const peerConnection =
            media === "screen"
              ? ensureScreenPeerConnection()
              : media === "audio"
                ? ensureAudioPeerConnection()
                : ensureCameraPeerConnection();

          peerConnection.onicecandidate = (event) => {
            if (!event.candidate) return;
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
              payload: { kind: "answer", media, description: answer },
            });
          } catch {
            if (media === "screen") clearLiveScreen();
            else if (media === "audio") clearLiveAudio();
            else clearLiveCamera();
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
        if (peerConnection) {
          void peerConnection.addIceCandidate(message.payload.candidate).catch(() => undefined);
        }
      }
    },
  });

  const syncBadgeLabel = !isHydrated
    ? "Live sync"
    : realtimeStatus === "connected"
      ? "Realtime sync on"
      : realtimeStatus === "connecting"
        ? "Connecting live sync"
        : "Live sync reconnecting";

  // Participant computation
  const participantNames = useMemo(() => {
    const names = new Set<string>();
    const coach = currentDashboard.courses[0]?.coach;
    if (coach) names.add(coach);
    names.add(currentUsername);
    currentDashboard.messages.forEach((msg) => names.add(msg.sender));
    return Array.from(names).slice(0, 8);
  }, [currentDashboard, currentUsername]);

  const canEnterRoom = currentDashboard.live_class.can_join_room;
  const waitingRoomBlocked = currentDashboard.live_class.waiting_room_enabled && !canEnterRoom;

  const joinLabel = useMemo(() => {
    if (!currentDashboard.live_class.waiting_room_enabled) return "In classroom";
    if (currentDashboard.live_class.join_status === "approved") return "Approved";
    if (currentDashboard.live_class.join_status === "pending") return "Waiting for approval";
    if (currentDashboard.live_class.join_status === "denied") return "Ask to join again";
    return "Ask to join class";
  }, [currentDashboard.live_class.join_status, currentDashboard.live_class.waiting_room_enabled]);

  const nowTimeLabel = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const teacherSpotlightActive = currentDashboard.room_state.spotlight_mode === "teacher";

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    return () => {
      clearLiveCamera();
      clearLiveAudio();
      clearLiveScreen();
      stopStudentMicPublishing();
    };
  }, [clearLiveAudio, clearLiveCamera, clearLiveScreen, stopStudentMicPublishing]);

  useEffect(() => {
    if (chatCooldownSeconds <= 0) return;
    const timerId = window.setInterval(() => {
      setChatCooldownSeconds((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [chatCooldownSeconds]);

  // Video and audio dynamic subscription based on teacher flags and data saver state
  useEffect(() => {
    if (broadcastOnlyClassroom) return;
    if (screenActive) return;
    if (
      dataSaverEnabled ||
      removedFromRoom ||
      signalingStatus !== "connected" ||
      currentDashboard.room_state.stage_mode !== "screenshare" ||
      !currentDashboard.room_state.screen_share_enabled
    ) {
      clearLiveScreen();
      return;
    }
    sendSignalMessage({
      type: "signal",
      target_role: "teacher",
      payload: { kind: "viewer_ready", media: "screen" },
    });
  }, [
    broadcastOnlyClassroom,
    clearLiveScreen,
    currentDashboard.room_state.screen_share_enabled,
    currentDashboard.room_state.stage_mode,
    removedFromRoom,
    sendSignalMessage,
    signalingStatus,
    dataSaverEnabled,
    screenActive,
  ]);

  useEffect(() => {
    if (broadcastOnlyClassroom) return;
    if (cameraActive) return;
    if (
      dataSaverEnabled ||
      removedFromRoom ||
      signalingStatus !== "connected" ||
      !currentDashboard.room_state.teacher_camera_enabled
    ) {
      clearLiveCamera();
      return;
    }
    sendSignalMessage({
      type: "signal",
      target_role: "teacher",
      payload: { kind: "viewer_ready", media: "camera" },
    });
  }, [
    broadcastOnlyClassroom,
    clearLiveCamera,
    currentDashboard.room_state.teacher_camera_enabled,
    removedFromRoom,
    sendSignalMessage,
    signalingStatus,
    dataSaverEnabled,
    cameraActive,
  ]);

  useEffect(() => {
    if (broadcastOnlyClassroom) return;
    if (audioActive) return;
    if (
      removedFromRoom ||
      signalingStatus !== "connected" ||
      !currentDashboard.room_state.teacher_mic_enabled
    ) {
      clearLiveAudio();
      return;
    }
    sendSignalMessage({
      type: "signal",
      target_role: "teacher",
      payload: { kind: "viewer_ready", media: "audio" },
    });
  }, [
    broadcastOnlyClassroom,
    clearLiveAudio,
    currentDashboard.room_state.teacher_mic_enabled,
    removedFromRoom,
    sendSignalMessage,
    signalingStatus,
    audioActive,
  ]);

  usePollingRefresh(
    async () => {
      if (!removedFromRoom) await refreshDashboard();
    },
    15000,
    realtimeStatus !== "connected" && !removedFromRoom,
    5000,
  );

  const handleRaiseHand = async () => {
    if (!currentDashboard.room_state.student_raise_hand_enabled) {
      addNotification({
        id: `raise-hand-disabled-${Date.now()}`,
        title: "Hand raise disabled",
        message: "The teacher has turned off hand raising.",
        tone: "info",
      });
      return;
    }
    if (handRaised) {
      addNotification({
        id: `raise-hand-active-${Date.now()}`,
        title: "Hand already raised",
        message: "Wait for the teacher to respond.",
        tone: "info",
      });
      return;
    }
    if (teacherApprovedSpeaking) return;

    setRaisingHand(true);
    try {
      const response = await submitStudentRaiseHand({ reason: "Student wants to speak" });
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
    if (!currentDashboard.live_class.waiting_room_enabled || currentDashboard.live_class.can_join_room) return;
    setRequestingJoin(true);
    try {
      await submitStudentJoinRequest();
      setCurrentDashboard((state) => ({
        ...state,
        live_class: { ...state.live_class, join_status: "pending", can_join_room: false },
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
        message: "We could not send your request right now.",
        tone: "warning",
      });
    } finally {
      setRequestingJoin(false);
    }
  };

  const handleLeaveClassroom = () => {
    clearLiveCamera();
    clearLiveAudio();
    clearLiveScreen();
    addNotification({
      id: `left-classroom-${Date.now()}`,
      title: "You left the class",
      message: "You have returned to your student dashboard.",
      tone: "info",
    });
    window.location.href = "/student/home";
  };

  const handleSendChatMessage = async () => {
    const nextMessage = chatDraft.trim();
    if (!nextMessage) return;

    if (!currentDashboard.room_state.student_chat_enabled) {
      addNotification({
        id: `chat-disabled-${Date.now()}`,
        title: "Chat disabled",
        message: "The teacher has turned off chat.",
        tone: "info",
      });
      return;
    }
    if (chatCooldownSeconds > 0) {
      addNotification({
        id: `chat-cooldown-${Date.now()}`,
        title: "Slow mode active",
        message: `Please wait ${chatCooldownSeconds}s.`,
        tone: "info",
      });
      return;
    }

    setSendingChat(true);
    try {
      const response = await submitStudentChatMessage({ message: nextMessage });
      if (response.qa_queued) {
        addNotification({
          id: `chat-qa-${Date.now()}`,
          title: "Sent to moderator",
          message: "Your question was queued for moderator approval.",
          tone: "info",
        });
      } else {
        setCurrentDashboard((state) => ({
          ...state,
          messages: state.messages.some((m) => m.id === response.chat_message.id)
            ? state.messages
            : [...state.messages, response.chat_message],
        }));
      }
      setChatDraft("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Could not send message.";
      const retryAfterSeconds =
        error instanceof ApiError && typeof error.retryAfterSeconds === "number"
          ? error.retryAfterSeconds
          : null;
      if (retryAfterSeconds !== null && retryAfterSeconds > 0) {
        setChatCooldownSeconds(retryAfterSeconds);
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
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950 font-sans">
        <div className="mx-4 w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 backdrop-blur-md p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/15 text-rose-400">
            <PhoneOff className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-2xl font-extrabold text-white tracking-tight">Removed from classroom</h2>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            The teacher has ended your session. You can return to your dashboard or join another active class.
          </p>
          <button
            type="button"
            onClick={() => { window.location.href = "/student/home"; }}
            className="mt-8 w-full rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-500/20"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const chatMessagesByRecentTime = [...currentDashboard.messages].sort((a, b) => {
    const aTime = Date.parse(a.time);
    const bTime = Date.parse(b.time);
    if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
      return bTime - aTime;
    }
    return b.id - a.id;
  });

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Viewport container */}
      <div className="fixed inset-0 flex flex-col bg-slate-950 text-white font-sans overflow-hidden select-none">
        
        {/* Top Info Bar Overlay */}
        <div className="absolute top-4 left-4 right-4 z-40 pointer-events-none flex items-start justify-between gap-3">
          
          {/* Left panel: Room context info */}
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-slate-900/80 backdrop-blur-md px-4 py-2.5 border border-white/10 shadow-xl shadow-black/40">
            {currentDashboard.live_class.status === "Live" ? (
              <span className="flex items-center gap-1.5 rounded-full bg-rose-600 px-2.5 py-0.5 text-[9px] font-extrabold tracking-wider text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                LIVE
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 px-2.5 py-0.5 text-[9px] font-extrabold tracking-wider text-blue-400">
                SCHEDULED
              </span>
            )}
            
            <div className="min-w-0 border-l border-white/10 pl-3">
              <p className="truncate text-xs font-bold leading-tight text-slate-100">{currentDashboard.live_class.course_title}</p>
              <p className="text-[10px] text-slate-400 font-medium">{currentDashboard.live_class.room_code}</p>
            </div>
          </div>

          {/* Right panel: Controls & sync indicators */}
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-slate-900/80 backdrop-blur-md px-4 py-2.5 border border-white/10 shadow-xl shadow-black/40">
            <span className={`hidden md:inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition-colors ${
              realtimeStatus === "connected"
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                : "bg-amber-500/10 border-amber-500/25 text-amber-300 animate-pulse"
            }`}>
              <Signal className="h-3 w-3" />
              {syncBadgeLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
              <UsersRound className="h-3.5 w-3.5" />
              {participantNames.length}
            </span>
            <span className="hidden sm:inline-block rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-slate-400 font-semibold">{nowTimeLabel}</span>
          </div>
        </div>

        {/* Main Stage (100% full-screen canvas) */}
        <div className="relative flex-1 bg-black">
          {waitingRoomBlocked ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center bg-slate-950">
              <div className="rounded-full bg-white/5 p-6 border border-white/10">
                <UsersRound className="h-10 w-10 text-slate-300" />
              </div>
              <div>
                <p className="text-xl font-bold text-white tracking-tight">
                  {currentDashboard.live_class.join_status === "pending"
                    ? "Waiting Room"
                    : currentDashboard.live_class.join_status === "denied"
                      ? "Access Denied"
                      : "Waiting Room"}
                </p>
                <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {currentDashboard.live_class.join_status === "pending"
                    ? "The instructor has been notified of your request. You'll enter immediately upon approval."
                    : currentDashboard.live_class.join_status === "denied"
                      ? "Your request to join was not approved. You can ask to join again when the instructor is ready."
                      : "Send a request to join this active classroom session."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleJoinRequest()}
                disabled={requestingJoin || currentDashboard.live_class.join_status === "pending"}
                className="mt-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100 disabled:opacity-60 shadow-lg shadow-white/10 active:scale-95"
              >
                {requestingJoin
                  ? "Sending Request..."
                  : currentDashboard.live_class.join_status === "denied"
                    ? "Request Again"
                    : currentDashboard.live_class.join_status === "pending"
                      ? "Waiting for Instructor..."
                      : "Request to Join"}
              </button>
            </div>

          ) : dataSaverEnabled && currentDashboard.room_state.stage_mode !== "whiteboard" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center bg-slate-950">
              <div className="rounded-full bg-emerald-500/10 p-6 border border-emerald-500/20">
                <VideoOff className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">Data Saver Active</p>
                <p className="mt-1.5 text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
                  The classroom video stream is suspended to conserve bandwidth. Audio and whiteboard feeds remain fully active.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDataSaverEnabled(false)}
                className="mt-2 rounded-2xl bg-white/10 px-5 py-2.5 text-xs font-bold text-white border border-white/20 transition hover:bg-white/20 active:scale-95"
              >
                Resume Video
              </button>
            </div>

          ) : broadcastOnlyClassroom ? (
            <div className="absolute inset-0">
              <iframe
                className="h-full w-full border-none"
                src={broadcastEmbedUrl}
                title="ElimuPawa Stream Broadcast"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

          ) : currentDashboard.room_state.stage_mode === "whiteboard" ? (
            <div className="absolute inset-0">
              <WhiteboardStage whiteboard={currentDashboard.whiteboard} />
            </div>

          ) : currentDashboard.room_state.stage_mode === "screenshare" ? (
            <div className="absolute inset-0 bg-slate-950">
              <video
                ref={remoteScreenVideoRef}
                className={`h-full w-full object-contain ${screenActive ? "block" : "hidden"}`}
                autoPlay
                playsInline
              />
              {!screenActive && (
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <div className="rounded-full bg-white/5 p-6 border border-white/10 animate-pulse">
                    <Video className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-400">Connecting to presentation feed...</p>
                </div>
              )}
              {/* Teacher picture-in-picture camera */}
              <div className={`absolute bottom-4 right-4 overflow-hidden rounded-2xl border bg-slate-950 shadow-2xl transition-all duration-300 ${
                cameraActive ? "block" : "hidden"
              } ${
                teacherSpotlightActive ? "border-amber-400/80 ring-2 ring-amber-400/40" : "border-white/15"
              }`}>
                <video
                  ref={remoteCameraVideoRef}
                  className={`${teacherSpotlightActive ? "h-28 w-48 sm:h-36 sm:w-60" : "h-20 w-32 sm:h-24 sm:w-40"} object-cover`}
                  autoPlay
                  playsInline
                />
              </div>
            </div>

          ) : currentDashboard.room_state.stage_mode === "camera" ? (
            <div className="absolute inset-0 bg-slate-950">
              <video
                ref={remoteCameraVideoRef}
                className={`h-full w-full object-cover ${cameraActive ? "block" : "hidden"}`}
                autoPlay
                playsInline
              />
              {!cameraActive && (
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <div className="rounded-full bg-white/5 p-6 border border-white/10 animate-pulse">
                    <Video className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-400">Connecting to teacher's video...</p>
                </div>
              )}
            </div>

          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="rounded-full bg-white/5 p-6 border border-white/10">
                <PlayCircle className="h-8 w-8 text-slate-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{currentDashboard.live_class.session_title}</p>
                <p className="mt-1 text-sm text-slate-400 leading-relaxed">Waiting for the live streaming to begin.</p>
              </div>
              <button
                type="button"
                onClick={() => void handleJoinRequest()}
                disabled={requestingJoin || (currentDashboard.live_class.waiting_room_enabled && currentDashboard.live_class.join_status === "pending")}
                className="mt-2 rounded-2xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95"
              >
                {requestingJoin ? "Joining..." : joinLabel}
              </button>
            </div>
          )}

          {/* Micro indicator for Speaking State */}
          {teacherApprovedSpeaking && !waitingRoomBlocked ? (
            <div className="absolute right-4 top-24 flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3.5 py-1.5 text-xs font-bold text-emerald-200 backdrop-blur-sm z-30">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
              </span>
              {studentMicLive ? (isMicMuted ? "Mic Muted" : "Mic Live") : "Mic Connecting..."}
            </div>
          ) : null}
        </div>

        {/* Slide-out Overlay Right Panel (drawer) */}
        {showSidePanel ? (
          <>
            {/* Click-away backdrop overlay for smaller viewports */}
            <button
              type="button"
              onClick={() => setShowSidePanel(false)}
              className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden focus:outline-none"
            />
            <aside className="absolute right-4 top-4 bottom-24 z-50 flex w-96 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-md animate-slide-in">
              
              {/* Tab Header bar */}
              <div className="flex items-center shrink-0 border-b border-white/5 bg-slate-900/40">
                <button
                  type="button"
                  onClick={() => setActivePanel("chat")}
                  className={`flex-1 py-4 text-xs font-bold tracking-wide transition-all border-b-2 ${
                    activePanel === "chat"
                      ? "border-blue-500 text-blue-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  CHAT
                </button>
                <button
                  type="button"
                  onClick={() => setActivePanel("people")}
                  className={`flex-1 py-4 text-xs font-bold tracking-wide transition-all border-b-2 ${
                    activePanel === "people"
                      ? "border-blue-500 text-blue-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  PEOPLE ({participantNames.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShowSidePanel(false)}
                  className="px-4 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Chat View */}
              {activePanel === "chat" ? (
                <div className="flex min-h-0 flex-1 flex-col p-4">
                  {currentDashboard.room_state.chat_moderation_mode === "qa_queue" ? (
                    <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-2 text-[10px] font-bold text-amber-300 tracking-wide">
                      MODERATED Q&amp;A: Messages require approval before going live.
                    </div>
                  ) : null}
                  
                  {chatCooldownSeconds > 0 ? (
                    <div className="mb-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 text-xs font-bold text-amber-300">
                      Slow mode active: Please wait {chatCooldownSeconds}s.
                    </div>
                  ) : null}

                  {/* Messages container */}
                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                    {chatMessagesByRecentTime.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                        <MessageSquareText className="h-8 w-8 opacity-40" />
                        <p className="text-xs font-semibold">No messages yet</p>
                      </div>
                    ) : (
                      chatMessagesByRecentTime.map((message) => (
                        <div
                          key={message.id}
                          className={`rounded-2xl px-4 py-3 transition-all ${
                            message.role === "teacher"
                              ? "border border-blue-500/20 bg-blue-500/5"
                              : "bg-white/5 border border-white/5"
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <span className={`text-xs font-extrabold ${message.role === "teacher" ? "text-blue-400" : "text-slate-200"}`}>
                              {message.sender}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">{message.time}</span>
                          </div>
                          <p className="text-xs leading-relaxed text-slate-300">{message.message}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Input container */}
                  <div className="mt-4 flex gap-2 shrink-0 border-t border-white/5 pt-4">
                    <input
                      value={chatDraft}
                      onChange={(e) => setChatDraft(e.target.value)}
                      disabled={!currentDashboard.room_state.student_chat_enabled || sendingChat || waitingRoomBlocked}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleSendChatMessage();
                        }
                      }}
                      placeholder={
                        waitingRoomBlocked
                          ? "Waiting room..."
                          : currentDashboard.room_state.student_chat_enabled
                            ? "Type your message..."
                            : "Chat disabled"
                      }
                      className="flex-1 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSendChatMessage()}
                      disabled={sendingChat || chatCooldownSeconds > 0 || !chatDraft.trim() || !currentDashboard.room_state.student_chat_enabled || waitingRoomBlocked}
                      className="rounded-2xl bg-blue-600 px-5 py-3 text-xs font-bold text-white hover:bg-blue-500 transition-colors disabled:opacity-50 active:scale-95 shrink-0 shadow-lg shadow-blue-500/20"
                    >
                      {sendingChat ? "..." : "Send"}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* People View */}
              {activePanel === "people" ? (
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-2">
                    {participantNames.map((name) => {
                      const isYou = name === currentUsername;
                      const isTeacher = currentDashboard.courses[0]?.coach === name;
                      return (
                        <div key={name} className="flex items-center gap-3.5 rounded-2xl bg-white/5 border border-white/5 px-4 py-3 hover:bg-white/8 transition-colors">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${
                            isTeacher
                              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                              : isYou
                                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                                : "bg-slate-800 text-slate-200 border border-white/5"
                          }`}>
                            {name.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-100">{name}</p>
                            <p className="text-[10px] text-slate-500 font-semibold tracking-wide">
                              {isYou ? "YOU" : isTeacher ? "INSTRUCTOR" : "STUDENT"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </aside>
          </>
        ) : null}

        {/* Centered Floating 4-Button Jitsi Media Dock */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center justify-center gap-3.5 rounded-full border border-white/10 bg-slate-950/85 px-5 py-3 backdrop-blur-xl shadow-[0_16px_48px_rgba(0,0,0,0.8)]">
          
          {/* 1. Microphone / Speaking permission Request Button */}
          {!broadcastOnlyClassroom ? (
            teacherApprovedSpeaking ? (
              <button
                type="button"
                onClick={toggleStudentMicMute}
                disabled={waitingRoomBlocked}
                title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition hover:scale-105 active:scale-95 shadow-md ${
                  isMicMuted ? "bg-rose-600 hover:bg-rose-500 animate-pulse" : "bg-slate-800 hover:bg-slate-700"
                }`}
              >
                {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleRaiseHand()}
                disabled={raisingHand || !currentDashboard.room_state.student_raise_hand_enabled || waitingRoomBlocked}
                title={handRaised ? "Speaking permission pending" : "Speak requested - Raise Hand"}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:scale-105 active:scale-95 shadow-md ${
                  handRaised
                    ? "bg-amber-500 text-white animate-pulse"
                    : "bg-slate-900 border border-white/10 text-slate-400 hover:text-slate-300"
                }`}
              >
                {handRaised ? <Hand className="h-5 w-5" /> : <MicOff className="h-5 w-5 opacity-40" />}
              </button>
            )
          ) : null}

          {/* 2. Video Mute / Data Saver Control */}
          {!broadcastOnlyClassroom ? (
            <button
              type="button"
              onClick={() => setDataSaverEnabled((v) => !v)}
              disabled={waitingRoomBlocked}
              title={dataSaverEnabled ? "Resume Video Feed" : "Suspend Video (Save Data)"}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition hover:scale-105 active:scale-95 shadow-md ${
                dataSaverEnabled ? "bg-rose-600 hover:bg-rose-500 animate-pulse" : "bg-slate-800 hover:bg-slate-700"
              }`}
            >
              {dataSaverEnabled ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </button>
          ) : null}

          {/* 3. Slide-out Chat / Participant Sidebar Toggle */}
          <button
            type="button"
            onClick={() => {
              if (showSidePanel) {
                setShowSidePanel(false);
              } else {
                setActivePanel("chat");
                setShowSidePanel(true);
              }
            }}
            title="Toggle Messaging Panel"
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition hover:scale-105 active:scale-95 shadow-md ${
              showSidePanel ? "bg-blue-600 hover:bg-blue-500" : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            <MessageSquareText className="h-5 w-5" />
          </button>

          {/* 4. Hangup / Exit Classroom Button */}
          <button
            type="button"
            onClick={() => setShowLeaveConfirm(true)}
            title="Exit Classroom"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white transition hover:scale-110 active:scale-95 shadow-lg shadow-rose-950/40 hover:bg-rose-500"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      {showLeaveConfirm ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs font-sans">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl animate-scale-up">
            <h3 className="text-lg font-bold text-white tracking-tight">Exit Classroom?</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              You are about to exit the live room. You can rejoin at any time from your student home.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 rounded-2xl border border-white/15 py-3 text-xs font-bold text-slate-300 hover:bg-white/5 active:scale-95 transition-all"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveConfirm(false);
                  handleLeaveClassroom();
                }}
                className="flex-1 rounded-2xl bg-rose-600 py-3 text-xs font-bold text-white hover:bg-rose-500 active:scale-95 transition-all shadow-lg shadow-rose-500/20"
              >
                EXIT CLASS
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
