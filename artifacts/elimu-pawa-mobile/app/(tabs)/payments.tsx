import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
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

import { useColors } from "@/hooks/useColors";
import { getPaymentSummary } from "@/lib/api";
import type { PaymentEntry, PaymentSummaryData } from "@/lib/types";

function StatusChip({ status, colors }: { status: string; colors: ReturnType<typeof useColors> }) {
  const cfg: Record<string, { bg: string; fg: string; icon: any }> = {
    paid: { bg: colors.success + "22", fg: colors.success, icon: "checkmark-circle" },
    pending: { bg: colors.warning + "22", fg: colors.warning, icon: "time" },
    failed: { bg: colors.destructive + "22", fg: colors.destructive, icon: "close-circle" },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <Ionicons name={c.icon} size={12} color={c.fg} />
      <Text style={[styles.chipText, { color: c.fg, fontFamily: "Inter_500Medium" }]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
    </View>
  );
}

function PaymentRow({ entry, colors }: { entry: PaymentEntry; colors: ReturnType<typeof useColors> }) {
  const initials = entry.student_name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <View style={[styles.paymentRow, { backgroundColor: colors.card }]}>
      <View style={[styles.paymentAvatar, { backgroundColor: colors.muted }]}>
        <Text style={[styles.paymentAvatarText, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>{initials}</Text>
      </View>
      <View style={styles.paymentInfo}>
        <Text style={[styles.paymentName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>{entry.student_name}</Text>
        <Text style={[styles.paymentCourse, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>{entry.course}</Text>
        <Text style={[styles.paymentDate, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{entry.date}</Text>
      </View>
      <View style={styles.paymentRight}>
        <Text style={[styles.paymentAmount, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{entry.amount}</Text>
        <StatusChip status={entry.status} colors={colors} />
      </View>
    </View>
  );
}

export default function PaymentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<PaymentSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 90);

  const load = useCallback(async () => {
    try { setData(await getPaymentSummary()); } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  const summaryCards = [
    { label: "Total Revenue", value: data?.total_revenue ?? "—", icon: "trending-up", color: colors.success },
    { label: "Pending", value: data?.pending_amount ?? "—", icon: "time-outline", color: colors.warning },
    { label: "Paid", value: String(data?.paid_count ?? 0), icon: "checkmark-done", color: colors.primary },
    { label: "Pending", value: String(data?.pending_count ?? 0), icon: "hourglass-outline", color: colors.warning },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Payments</Text>
        <Pressable onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} style={[styles.exportBtn, { backgroundColor: colors.muted }]}>
          <Ionicons name="download-outline" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <FlatList
        data={data?.entries ?? []}
        keyExtractor={(e) => String(e.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: botPad, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View>
            <View style={styles.statsGrid}>
              {summaryCards.map((s, i) => (
                <View key={i} style={[styles.summaryCard, { backgroundColor: colors.card }]}>
                  <Ionicons name={s.icon as any} size={22} color={s.color} />
                  <Text style={[styles.summaryValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{s.value}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{s.label}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.mpesaInner, { backgroundColor: colors.primary + "11" }]}>
              <MaterialCommunityIcons name="cellphone" size={28} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.mpesaTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>M-Pesa Checkout</Text>
                <Text style={[styles.mpesaSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Students pay via mobile money</Text>
              </View>
              <View style={[styles.mpesaBadge, { backgroundColor: colors.success + "22" }]}>
                <Text style={[styles.mpesaBadgeText, { color: colors.success, fontFamily: "Inter_600SemiBold" }]}>Active</Text>
              </View>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Recent transactions</Text>
          </View>
        )}
        renderItem={({ item }) => <PaymentRow entry={item} colors={colors} />}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>No transactions yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22 },
  exportBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
  summaryCard: { width: "47.5%", borderRadius: 16, padding: 16, gap: 4 },
  summaryValue: { fontSize: 20, marginTop: 6 },
  summaryLabel: { fontSize: 11 },
  mpesaInner: { borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14 },
  mpesaTitle: { fontSize: 14 },
  mpesaSub: { fontSize: 12, marginTop: 2 },
  mpesaBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  mpesaBadgeText: { fontSize: 11 },
  sectionTitle: { fontSize: 18, marginTop: 20, marginBottom: 12 },
  paymentRow: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 14, gap: 12 },
  paymentAvatar: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  paymentAvatarText: { fontSize: 14 },
  paymentInfo: { flex: 1 },
  paymentName: { fontSize: 14 },
  paymentCourse: { fontSize: 12, marginTop: 2 },
  paymentDate: { fontSize: 11, marginTop: 3 },
  paymentRight: { alignItems: "flex-end", gap: 6 },
  paymentAmount: { fontSize: 14 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  chipText: { fontSize: 11 },
  empty: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14 },
});
