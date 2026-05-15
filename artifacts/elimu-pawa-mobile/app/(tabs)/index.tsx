import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getStudentDashboard, getTeacherDashboard } from "@/lib/api";
import type { CourseCard, StudentDashboardData, TeacherDashboardData } from "@/lib/types";

function StatusBadge({ status, colors }: { status: string; colors: ReturnType<typeof useColors> }) {
  const isLive = status.toLowerCase().includes("live");
  const isPaid = status.toLowerCase() === "paid";
  return (
    <View style={[styles.badge, { backgroundColor: isLive ? colors.success + "22" : isPaid ? colors.primary + "22" : colors.muted }]}>
      {isLive && <View style={[styles.liveDot, { backgroundColor: colors.success }]} />}
      <Text style={[styles.badgeText, { color: isLive ? colors.success : isPaid ? colors.primary : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
        {status}
      </Text>
    </View>
  );
}

function ProgressBar({ value, colors }: { value: number; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
      <View style={[styles.progressFill, { width: `${value}%` as any, backgroundColor: colors.primary }]} />
    </View>
  );
}

function CourseCardItem({ course, colors, onPress }: { course: CourseCard; colors: ReturnType<typeof useColors>; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.courseCard, { backgroundColor: colors.card, opacity: pressed ? 0.9 : 1 }]}>
      <View style={styles.courseTop}>
        <View style={styles.courseInfo}>
          <Text style={[styles.courseTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>{course.title}</Text>
          <Text style={[styles.courseCoach, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{course.coach}</Text>
        </View>
        <StatusBadge status={course.status} colors={colors} />
      </View>
      <View style={styles.courseMeta}>
        <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
        <Text style={[styles.courseTime, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{course.time}</Text>
      </View>
      <View style={styles.progressRow}>
        <ProgressBar value={course.progress} colors={colors} />
        <Text style={[styles.progressText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{course.progress}%</Text>
      </View>
    </Pressable>
  );
}

function SessionCard({ session, colors, onPress }: { session: any; colors: ReturnType<typeof useColors>; onPress: () => void }) {
  const isLive = session.is_live || session.status === "live";
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.courseCard, { backgroundColor: colors.card, opacity: pressed ? 0.9 : 1 }]}>
      <View style={styles.courseTop}>
        <View style={styles.courseInfo}>
          <Text style={[styles.courseTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>{session.title}</Text>
          <Text style={[styles.courseCoach, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{session.enrolled_count} enrolled · {session.delivery_mode}</Text>
        </View>
        <StatusBadge status={isLive ? "Live now" : "Scheduled"} colors={colors} />
      </View>
      <View style={styles.courseMeta}>
        <Ionicons name="key-outline" size={13} color={colors.mutedForeground} />
        <Text style={[styles.courseTime, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{session.room_code}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  const [studentData, setStudentData] = useState<StudentDashboardData | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      if (isTeacher) {
        const d = await getTeacherDashboard();
        setTeacherData(d);
      } else {
        const d = await getStudentDashboard();
        setStudentData(d);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isTeacher]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const initials = user?.full_name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 80);

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Good day,</Text>
          <Text style={[styles.name, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{user?.full_name ?? "Learner"}</Text>
        </View>
        <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>{initials}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: botPad, paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {isTeacher && teacherData ? (
          <>
            <View style={styles.statsRow}>
              {[
                { label: "Students", value: String(teacherData.total_students), icon: "people-outline" },
                { label: "Sessions", value: String(teacherData.total_sessions), icon: "layers-outline" },
              ].map((s) => (
                <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card }]}>
                  <Ionicons name={s.icon as any} size={20} color={colors.primary} />
                  <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{s.label}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Your sessions</Text>
            {teacherData.sessions.map((s) => (
              <SessionCard key={s.id} session={s} colors={colors} onPress={() => { Haptics.selectionAsync(); router.push("/(tabs)/classroom"); }} />
            ))}
          </>
        ) : studentData ? (
          <>
            <View style={styles.statsRow}>
              {studentData.engagement.map((e) => (
                <View key={e.label} style={[styles.statCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.statValue, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{e.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{e.label}</Text>
                </View>
              ))}
            </View>

            {studentData.live_class.is_live && (
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/(tabs)/classroom"); }}
                style={({ pressed }) => [styles.liveCard, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
              >
                <View style={styles.liveRow}>
                  <View style={styles.livePulse}><View style={[styles.liveDotLarge, { backgroundColor: colors.primaryForeground }]} /></View>
                  <Text style={[styles.liveLabel, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>Live now</Text>
                </View>
                <Text style={[styles.liveTitle, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>{studentData.live_class.course_title}</Text>
                <Text style={[styles.liveSub, { color: colors.primaryForeground + "cc", fontFamily: "Inter_400Regular" }]}>Tap to join →</Text>
              </Pressable>
            )}

            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Your courses</Text>
            {studentData.courses.map((course, i) => (
              <CourseCardItem key={i} course={course} colors={colors} onPress={() => { Haptics.selectionAsync(); router.push("/(tabs)/classroom"); }} />
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  greeting: { fontSize: 13 },
  name: { fontSize: 22, marginTop: 2 },
  avatarCircle: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 20, marginBottom: 4 },
  statCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: "center", gap: 4 },
  statValue: { fontSize: 22 },
  statLabel: { fontSize: 11, textAlign: "center" },
  sectionTitle: { fontSize: 18, marginTop: 24, marginBottom: 12 },
  courseCard: { borderRadius: 18, padding: 16, marginBottom: 12 },
  courseTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  courseInfo: { flex: 1 },
  courseTitle: { fontSize: 15 },
  courseCoach: { fontSize: 12, marginTop: 3 },
  courseMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10 },
  courseTime: { fontSize: 12 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  progressTrack: { flex: 1, height: 5, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 5, borderRadius: 3 },
  progressText: { fontSize: 11, width: 32, textAlign: "right" },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveCard: { borderRadius: 20, padding: 20, marginTop: 16, marginBottom: 4 },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  livePulse: { width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  liveDotLarge: { width: 8, height: 8, borderRadius: 4 },
  liveLabel: { fontSize: 12, letterSpacing: 0.5 },
  liveTitle: { fontSize: 18 },
  liveSub: { fontSize: 13, marginTop: 6 },
});
