import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getStudentDashboard, type Lesson } from "@/lib/api";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-KE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
}

function getCountdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Live now";
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `Starts in ${hrs}h ${mins % 60}m`;
  return `Starts in ${mins} min`;
}

function isNow(iso: string, durationMins: number) {
  const start = new Date(iso).getTime();
  const end = start + durationMins * 60000;
  const now = Date.now();
  return now >= start - 5 * 60000 && now < end;
}

export default function ClassroomScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, student, isLoading: authLoading } = useAuth();

  const [handRaised, setHandRaised] = useState(false);
  const [micMuted, setMicMuted] = useState(true);
  const [camOff, setCamOff] = useState(true);

  const styles = makeStyles(colors, topPad, bottomPad);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", token],
    queryFn: () => getStudentDashboard(token!),
    enabled: !!token,
    retry: 1,
  });

  const lesson: Lesson | undefined = data?.lessons.find(
    (l) => String(l.lesson_id) === id
  );

  const handleRaiseHand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHandRaised((v) => !v);
  };

  if (!authLoading && !student) {
    return <Redirect href="/sign-in" />;
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading classroom…</Text>
      </View>
    );
  }

  if (isError || !lesson) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
        <Text style={styles.errorTitle}>Lesson not found</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const live = isNow(lesson.scheduled_at, lesson.duration_minutes);
  const countdown = getCountdown(lesson.scheduled_at);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backCircle, pressed && { opacity: 0.7 }]}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>{lesson.subject}</Text>
        <View style={[styles.liveBadge, { backgroundColor: live ? colors.success : colors.muted }]}>
          {live && <View style={styles.liveDot} />}
          <Text style={[styles.liveText, { color: live ? "#fff" : colors.mutedForeground }]}>
            {live ? "LIVE" : "SCHEDULED"}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.videoPlaceholder}>
          {live ? (
            <>
              <Ionicons name="videocam" size={48} color="rgba(255,255,255,0.7)" />
              <Text style={styles.videoLabel}>Live lesson in progress</Text>
              <Text style={styles.videoSub}>Connect via your school's video link</Text>
            </>
          ) : (
            <>
              <Ionicons name="time-outline" size={48} color="rgba(255,255,255,0.6)" />
              <Text style={styles.videoLabel}>{countdown}</Text>
              <Text style={styles.videoSub}>
                {formatTime(lesson.scheduled_at)} on {formatDate(lesson.scheduled_at)}
              </Text>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.lessonTitle}>{lesson.lesson_title}</Text>
          <View style={styles.infoGrid}>
            <InfoRow icon="person-outline" label="Teacher" value={lesson.teacher_name} colors={colors} />
            <InfoRow icon="book-outline" label="Subject" value={lesson.subject} colors={colors} />
            <InfoRow icon="people-outline" label="Class" value={lesson.class_level} colors={colors} />
            <InfoRow icon="time-outline" label="Duration" value={`${lesson.duration_minutes} minutes`} colors={colors} />
            <InfoRow icon="calendar-outline" label="Date" value={formatDate(lesson.scheduled_at)} colors={colors} />
            <InfoRow icon="alarm-outline" label="Time" value={formatTime(lesson.scheduled_at)} colors={colors} />
          </View>
        </View>

        {live && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Classroom controls</Text>
            <View style={styles.controlsRow}>
              <ControlBtn
                icon={micMuted ? "mic-off" : "mic"}
                label={micMuted ? "Unmute" : "Mute"}
                active={!micMuted}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setMicMuted((v) => !v);
                }}
                colors={colors}
              />
              <ControlBtn
                icon={camOff ? "video-off" : "video"}
                label={camOff ? "Camera on" : "Camera off"}
                active={!camOff}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCamOff((v) => !v);
                }}
                colors={colors}
              />
              <ControlBtn
                icon="hand-wave"
                label={handRaised ? "Lower hand" : "Raise hand"}
                active={handRaised}
                onPress={handleRaiseHand}
                colors={colors}
                isMCI
              />
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Need help?</Text>
          <Text style={styles.helpText}>
            If you're having trouble joining, contact your teacher or school administrator.
            Make sure you have a stable internet connection.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={infoStyles.row}>
      <View style={infoStyles.iconWrap}>
        <Ionicons name={icon} size={15} color={colors.mutedForeground} />
      </View>
      <View style={infoStyles.textWrap}>
        <Text style={[infoStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[infoStyles.value, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 8 },
  iconWrap: { width: 28, alignItems: "center", marginTop: 1 },
  textWrap: { flex: 1 },
  label: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  value: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 2 },
});

function ControlBtn({
  icon,
  label,
  active,
  onPress,
  colors,
  isMCI,
}: {
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  isMCI?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        ctrlStyles.btn,
        { backgroundColor: active ? `${colors.primary}22` : colors.muted },
        pressed && { opacity: 0.7 },
      ]}
      onPress={onPress}
    >
      {isMCI ? (
        <MaterialCommunityIcons
          name={icon as React.ComponentProps<typeof MaterialCommunityIcons>["name"]}
          size={22}
          color={active ? colors.primary : colors.mutedForeground}
        />
      ) : (
        <Feather
          name={icon as React.ComponentProps<typeof Feather>["name"]}
          size={22}
          color={active ? colors.primary : colors.mutedForeground}
        />
      )}
      <Text style={[ctrlStyles.label, { color: active ? colors.primary : colors.mutedForeground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const ctrlStyles = StyleSheet.create({
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
  },
  label: { fontSize: 12, fontFamily: "Inter_500Medium" },
});

function makeStyles(
  colors: ReturnType<typeof useColors>,
  topPad: number,
  bottomPad: number
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: topPad + 12,
      paddingHorizontal: 20,
      paddingBottom: 16,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    topTitle: {
      flex: 1,
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    liveBadge: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
      gap: 5,
    },
    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: "#fff",
    },
    liveText: {
      fontSize: 11,
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.5,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: bottomPad + 24,
      gap: 16,
    },
    videoPlaceholder: {
      height: 200,
      borderRadius: colors.radius,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      overflow: "hidden",
    },
    videoLabel: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: "#ffffff",
    },
    videoSub: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: "rgba(255,255,255,0.75)",
      textAlign: "center",
      paddingHorizontal: 20,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    lessonTitle: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      lineHeight: 26,
    },
    infoGrid: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 4,
    },
    sectionLabel: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    controlsRow: {
      flexDirection: "row",
      gap: 10,
    },
    helpText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      lineHeight: 20,
    },
    center: {
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      padding: 40,
    },
    loadingText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    errorTitle: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    backBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 28,
      paddingVertical: 12,
    },
    backBtnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
  });
}
