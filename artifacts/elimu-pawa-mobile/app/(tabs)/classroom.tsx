import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getStudentDashboard, getTeacherDashboard } from "@/lib/api";
import type { ClassroomMessage, StudentDashboardData, TeacherDashboardData } from "@/lib/types";

function PollBar({ label, value, voted, colors }: { label: string; value: number; voted: boolean; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.pollOption}>
      <Text style={[styles.pollLabel, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{label}</Text>
      <View style={[styles.pollTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.pollFill, { width: `${value}%` as any, backgroundColor: voted ? colors.primary : colors.primary + "66" }]} />
      </View>
      <Text style={[styles.pollPct, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{value}%</Text>
    </View>
  );
}

function MessageRow({ msg, colors }: { msg: ClassroomMessage; colors: ReturnType<typeof useColors> }) {
  const isTeacher = msg.role === "teacher";
  return (
    <View style={[styles.msgRow, isTeacher && styles.msgRowTeacher]}>
      <View style={[styles.msgBubble, { backgroundColor: isTeacher ? colors.primary : colors.card, alignSelf: isTeacher ? "flex-start" : "flex-end" }]}>
        <Text style={[styles.msgSender, { color: isTeacher ? colors.primaryForeground + "bb" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{msg.sender}</Text>
        <Text style={[styles.msgText, { color: isTeacher ? colors.primaryForeground : colors.foreground, fontFamily: "Inter_400Regular" }]}>{msg.message}</Text>
        <Text style={[styles.msgTime, { color: isTeacher ? colors.primaryForeground + "77" : colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{msg.time}</Text>
      </View>
    </View>
  );
}

export default function ClassroomScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  const [data, setData] = useState<StudentDashboardData | TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [localMessages, setLocalMessages] = useState<ClassroomMessage[]>([]);
  const [voted, setVoted] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const load = useCallback(async () => {
    try {
      if (isTeacher) {
        setData(await getTeacherDashboard());
      } else {
        const d = await getStudentDashboard();
        setData(d);
        setLocalMessages(d.messages ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [isTeacher]);

  useEffect(() => { load(); }, [load]);

  const handleSend = () => {
    if (!message.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMsg: ClassroomMessage = {
      id: Date.now(),
      sender: user?.full_name ?? "Me",
      role: isTeacher ? "teacher" : "student",
      message: message.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setLocalMessages((prev) => [...prev, newMsg]);
    setMessage("");
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  const studentData = !isTeacher ? (data as StudentDashboardData) : null;
  const teacherData = isTeacher ? (data as TeacherDashboardData) : null;
  const liveClass = studentData?.live_class;
  const poll = studentData?.poll;
  const liveSession = teacherData?.sessions?.find((s) => s.is_live || s.status === "live") ?? teacherData?.sessions?.[0];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={botPad}
    >
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {isTeacher ? "Teacher Room" : "Live Classroom"}
          </Text>
          {(liveClass?.is_live || liveSession?.is_live) && (
            <View style={styles.liveChip}>
              <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.liveText, { color: colors.success, fontFamily: "Inter_600SemiBold" }]}>LIVE</Text>
            </View>
          )}
        </View>
        {!isTeacher && liveClass?.youtube_embed_url && (
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); Linking.openURL(liveClass.youtube_embed_url); }}
            style={[styles.watchBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="play" size={14} color={colors.primaryForeground} />
            <Text style={[styles.watchBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>Watch</Text>
          </Pressable>
        )}
      </View>

      {!isTeacher && liveClass && (
        <View style={[styles.classInfoBanner, { backgroundColor: (colors as any).backgroundSoft ?? colors.card }]}>
          <Text style={[styles.classInfoTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>{liveClass.course_title}</Text>
          <Text style={[styles.classInfoSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>{liveClass.session_title}</Text>
        </View>
      )}

      {isTeacher && liveSession && (
        <View style={[styles.classInfoBanner, { backgroundColor: (colors as any).backgroundSoft ?? colors.card }]}>
          <Text style={[styles.classInfoTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>{liveSession.title}</Text>
          <Text style={[styles.classInfoSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{liveSession.enrolled_count} students · Room: {liveSession.room_code}</Text>
          <View style={styles.teacherControls}>
            {["Camera", "Mic", "End class"].map((action) => (
              <Pressable
                key={action}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                style={[styles.controlBtn, { backgroundColor: action === "End class" ? colors.destructive + "22" : colors.muted }]}
              >
                <Text style={[styles.controlBtnText, { color: action === "End class" ? colors.destructive : colors.foreground, fontFamily: "Inter_500Medium" }]}>{action}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {!isTeacher && poll && (
        <View style={[styles.pollCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.pollTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{poll.question}</Text>
          {poll.options.map((opt) => (
            <Pressable key={opt.label} onPress={() => { if (!voted) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setVoted(true); } }} disabled={voted}>
              <PollBar label={opt.label} value={opt.value} voted={voted} colors={colors} />
            </Pressable>
          ))}
          {!voted && <Text style={[styles.pollHint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Tap an option to vote</Text>}
        </View>
      )}

      <Text style={[styles.chatSectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", paddingHorizontal: 16 }]}>CHAT</Text>

      <FlatList
        ref={flatRef}
        data={localMessages}
        keyExtractor={(m) => String(m.id)}
        renderItem={({ item }) => <MessageRow msg={item} colors={colors} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Ionicons name="chatbubble-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyChatText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>No messages yet</Text>
          </View>
        }
      />

      <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: botPad + 8 }]}>
        <TextInput
          style={[styles.chatInput, { color: colors.foreground, backgroundColor: colors.background, fontFamily: "Inter_400Regular" }]}
          placeholder="Send a message..."
          placeholderTextColor={colors.mutedForeground}
          value={message}
          onChangeText={setMessage}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        {!isTeacher && (
          <Pressable onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} style={[styles.actionBtn, { backgroundColor: colors.muted }]}>
            <Ionicons name="hand-right-outline" size={20} color={colors.mutedForeground} />
          </Pressable>
        )}
        <Pressable onPress={handleSend} style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: message.trim() ? 1 : 0.5 }]}>
          <Ionicons name="send" size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20 },
  liveChip: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 11, letterSpacing: 1 },
  watchBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  watchBtnText: { fontSize: 13 },
  classInfoBanner: { paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 16, marginTop: 12, borderRadius: 16 },
  classInfoTitle: { fontSize: 15 },
  classInfoSub: { fontSize: 12, marginTop: 3 },
  teacherControls: { flexDirection: "row", gap: 8, marginTop: 10 },
  controlBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  controlBtnText: { fontSize: 12 },
  pollCard: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 14 },
  pollTitle: { fontSize: 14, marginBottom: 10 },
  pollOption: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  pollLabel: { width: 130, fontSize: 12 },
  pollTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  pollFill: { height: 6, borderRadius: 3 },
  pollPct: { width: 32, fontSize: 11, textAlign: "right" },
  pollHint: { fontSize: 11, textAlign: "center", marginTop: 4 },
  chatSectionTitle: { fontSize: 11, letterSpacing: 1, marginTop: 14, marginBottom: 8 },
  msgRow: { marginBottom: 10, alignItems: "flex-end" },
  msgRowTeacher: { alignItems: "flex-start" },
  msgBubble: { maxWidth: "80%", borderRadius: 14, padding: 12 },
  msgSender: { fontSize: 11, marginBottom: 3 },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTime: { fontSize: 10, marginTop: 4, textAlign: "right" },
  emptyChat: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyChatText: { fontSize: 14 },
  inputBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, gap: 8 },
  chatInput: { flex: 1, height: 44, borderRadius: 14, paddingHorizontal: 14, fontSize: 14 },
  actionBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sendBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
