import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

type SettingRowProps = {
  icon: string;
  label: string;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  colors: ReturnType<typeof useColors>;
  danger?: boolean;
};

function SettingRow({ icon, label, value, toggle, toggleValue, onToggle, onPress, colors, danger }: SettingRowProps) {
  return (
    <Pressable onPress={onPress} disabled={!onPress && !toggle} style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.settingIcon, { backgroundColor: danger ? colors.destructive + "18" : colors.muted }]}>
        <Ionicons name={icon as any} size={18} color={danger ? colors.destructive : colors.primary} />
      </View>
      <Text style={[styles.settingLabel, { color: danger ? colors.destructive : colors.foreground, fontFamily: "Inter_500Medium", flex: 1 }]}>{label}</Text>
      {toggle ? (
        <Switch value={toggleValue} onValueChange={onToggle} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.primaryForeground} />
      ) : value ? (
        <Text style={[styles.settingValue, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{value}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      ) : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const colorScheme = useColorScheme();
  const [darkMode, setDarkMode] = useState(colorScheme === "dark");
  const [notifications, setNotifications] = useState(true);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 90);

  const initials = user?.full_name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS === "web") {
      logout();
    } else {
      Alert.alert("Sign out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: logout },
      ]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: botPad, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: colors.primary }]}>
          <View style={[styles.profileAvatar, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.profileAvatarText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>{user?.full_name ?? "Unknown User"}</Text>
            <Text style={[styles.profileEmail, { color: colors.primaryForeground + "bb", fontFamily: "Inter_400Regular" }]}>{user?.email ?? ""}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: colors.primaryForeground + "22" }]}>
            <Text style={[styles.roleBadgeText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
              {(user?.role ?? "student").charAt(0).toUpperCase() + (user?.role ?? "student").slice(1)}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>APPEARANCE</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
          <SettingRow icon="moon-outline" label="Dark mode" toggle toggleValue={darkMode} onToggle={(v) => { Haptics.selectionAsync(); setDarkMode(v); }} colors={colors} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>NOTIFICATIONS</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
          <SettingRow icon="notifications-outline" label="Class alerts" toggle toggleValue={notifications} onToggle={(v) => { Haptics.selectionAsync(); setNotifications(v); }} colors={colors} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow icon="chatbubble-outline" label="Chat messages" toggle toggleValue={true} onToggle={() => {}} colors={colors} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>ACCOUNT</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
          <SettingRow icon="person-outline" label="Username" value={user?.username ?? "—"} colors={colors} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow icon="school-outline" label="Role" value={user?.role ?? "student"} colors={colors} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow icon="mail-outline" label="Email" value={user?.email ? user.email.split("@")[0] + "…" : "—"} colors={colors} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>APP</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
          <SettingRow icon="shield-checkmark-outline" label="Privacy policy" onPress={() => Haptics.selectionAsync()} colors={colors} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow icon="document-text-outline" label="Terms of service" onPress={() => Haptics.selectionAsync()} colors={colors} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow icon="information-circle-outline" label="Version 1.0.0" colors={colors} />
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutBtn, { backgroundColor: colors.destructive + "14", opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive, fontFamily: "Inter_600SemiBold" }]}>Sign out</Text>
        </Pressable>

        <Text style={[styles.footer, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>ElimuPawa · Your class, one tap away</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22 },
  profileCard: { borderRadius: 20, padding: 18, flexDirection: "row", alignItems: "center", gap: 14, marginTop: 20, marginBottom: 24 },
  profileAvatar: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  profileAvatarText: { fontSize: 18 },
  profileName: { fontSize: 16 },
  profileEmail: { fontSize: 12, marginTop: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  roleBadgeText: { fontSize: 12 },
  sectionLabel: { fontSize: 11, letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  settingsGroup: { borderRadius: 18, overflow: "hidden", marginBottom: 20 },
  settingRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  settingIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingLabel: { fontSize: 15 },
  settingValue: { fontSize: 14 },
  rowDivider: { height: 1, marginLeft: 62 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 16, paddingVertical: 15, marginTop: 4, marginBottom: 16 },
  logoutText: { fontSize: 16 },
  footer: { textAlign: "center", fontSize: 12, marginBottom: 8 },
});
