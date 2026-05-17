import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect, router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getStudentDashboard, studentLogout, type Lesson } from "@/lib/api";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
}

function isUpcoming(iso: string) {
  return new Date(iso) > new Date();
}

function LessonCard({ lesson, onPress }: { lesson: Lesson; onPress: () => void }) {
  const colors = useColors();
  const upcoming = isUpcoming(lesson.scheduled_at);
  const styles = cardStyles(colors);
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      onPress={onPress}
      testID={`lesson-${lesson.lesson_id}`}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.dot, { backgroundColor: upcoming ? colors.success : colors.mutedForeground }]} />
        <Text style={styles.subject}>{lesson.subject}</Text>
        <View style={[styles.badge, { backgroundColor: upcoming ? `${colors.success}22` : `${colors.mutedForeground}22` }]}>
          <Text style={[styles.badgeText, { color: upcoming ? colors.success : colors.mutedForeground }]}>
            {upcoming ? "Upcoming" : "Past"}
          </Text>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>{lesson.lesson_title}</Text>
      <View style={styles.meta}>
        <View style={styles.metaRow}>
          <Ionicons name="person-outline" size={13} color={colors.mutedForeground} />
          <Text style={styles.metaText}>{lesson.teacher_name}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color={colors.mutedForeground} />
          <Text style={styles.metaText}>{formatDate(lesson.scheduled_at)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
          <Text style={styles.metaText}>{formatTime(lesson.scheduled_at)} · {lesson.duration_minutes} min</Text>
        </View>
      </View>
      {upcoming && (
        <View style={[styles.joinBtn, { backgroundColor: colors.primary }]}>
          <Feather name="video" size={14} color="#fff" />
          <Text style={styles.joinText}>Join lesson</Text>
        </View>
      )}
    </Pressable>
  );
}

function cardStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      padding: 18,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    subject: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      flex: 1,
    },
    badge: {
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgeText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
    },
    title: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      lineHeight: 22,
    },
    meta: {
      gap: 5,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    metaText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    joinBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 10,
      paddingVertical: 11,
      marginTop: 2,
    },
    joinText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
  });
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { student, token, clearAuth, isLoading: authLoading } = useAuth();

  if (!authLoading && !student) {
    return <Redirect href="/sign-in" />;
  }

  const styles = makeStyles(colors, topPad, bottomPad);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["dashboard", token],
    queryFn: () => getStudentDashboard(token!),
    enabled: !!token,
    retry: 1,
  });

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (token) await studentLogout(token);
    } catch {
    }
    await clearAuth();
    router.replace("/");
  };

  const handleLesson = (lesson: Lesson) => {
    if (isUpcoming(lesson.scheduled_at)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/classroom/${lesson.lesson_id}`);
    }
  };

  const lessons: Lesson[] = data?.lessons ?? [];
  const upcoming = lessons.filter((l) => isUpcoming(l.scheduled_at));
  const past = lessons.filter((l) => !isUpcoming(l.scheduled_at));

  const listData: Array<{ type: "header"; label: string } | { type: "lesson"; lesson: Lesson }> = [
    ...(upcoming.length > 0 ? [{ type: "header" as const, label: "Upcoming" }] : []),
    ...upcoming.map((l) => ({ type: "lesson" as const, lesson: l })),
    ...(past.length > 0 ? [{ type: "header" as const, label: "Past lessons" }] : []),
    ...past.map((l) => ({ type: "lesson" as const, lesson: l })),
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>
            Hi, {student?.first_name ?? data?.student.first_name ?? "Student"}
          </Text>
          <Text style={styles.greetingClass}>
            {student?.class_level ?? data?.student.class_level ?? ""}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]}
          onPress={handleLogout}
          testID="logout-btn"
        >
          <Feather name="log-out" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading your lessons…</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorTitle}>Could not load dashboard</Text>
          <Text style={styles.errorSub}>Check your connection and try again.</Text>
          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.75 }]}
            onPress={() => refetch()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, i) =>
            item.type === "header" ? `hdr-${item.label}` : `lesson-${item.lesson.lesson_id}-${i}`
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!listData.length}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="book-outline" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>No lessons yet</Text>
              <Text style={styles.emptySub}>
                Your teacher will approve your access to upcoming lessons.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.type === "header") {
              return <Text style={styles.sectionHeader}>{item.label}</Text>;
            }
            return (
              <LessonCard
                lesson={item.lesson}
                onPress={() => handleLesson(item.lesson)}
              />
            );
          }}
        />
      )}
    </View>
  );
}

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
      justifyContent: "space-between",
      paddingTop: topPad + 16,
      paddingHorizontal: 24,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    greeting: { gap: 2 },
    greetingText: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    greetingClass: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    logoutBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    listContent: {
      padding: 24,
      paddingBottom: bottomPad + 24,
    },
    sectionHeader: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 12,
      marginTop: 8,
    },
    center: {
      flex: 1,
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
    errorSub: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
    },
    retryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 28,
      paddingVertical: 12,
      marginTop: 8,
    },
    retryText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
    empty: {
      alignItems: "center",
      gap: 12,
      marginTop: 60,
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    emptySub: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 21,
    },
  });
}
