import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
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
import { mockDemoUsers } from "@/lib/api";
import type { DemoUser } from "@/lib/types";

function RoleBadge({ role, colors }: { role: string; colors: ReturnType<typeof useColors> }) {
  const isTeacher = role === "teacher" || role === "admin";
  return (
    <View style={[styles.badge, { backgroundColor: isTeacher ? colors.accent + "22" : colors.primary + "22" }]}>
      <Text style={[styles.badgeText, { color: isTeacher ? colors.accent : colors.primary, fontFamily: "Inter_500Medium" }]}>
        {isTeacher ? "Teacher" : "Student"}
      </Text>
    </View>
  );
}

function UserCard({ user, selected, onPress, colors }: { user: DemoUser; selected: boolean; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  const initials = user.full_name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.userCard, { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border, borderWidth: selected ? 2 : 1, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={[styles.avatar, { backgroundColor: selected ? colors.primary : colors.muted }]}>
        <Text style={[styles.avatarText, { color: selected ? colors.primaryForeground : colors.mutedForeground, fontFamily: "Inter_700Bold" }]}>{initials}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{user.full_name}</Text>
        <Text style={[styles.userEmail, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{user.email}</Text>
      </View>
      <RoleBadge role={user.role} colors={colors} />
    </Pressable>
  );
}

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login, setUser } = useAuth();

  const [selectedUser, setSelectedUser] = useState<DemoUser>(mockDemoUsers[0]);
  const [username, setUsername] = useState(mockDemoUsers[0].username);
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSelectUser = (user: DemoUser) => {
    Haptics.selectionAsync();
    setSelectedUser(user);
    setUsername(user.username);
    setPassword("demo1234");
    setError("");
  };

  const handleQuickLogin = (user: DemoUser) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUser(user);
  };

  const handleLogin = async () => {
    if (!username.trim()) { setError("Please enter your username."); return; }
    setLoading(true);
    setError("");
    try {
      await login(username.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e?.message ?? "Login failed. Try a demo user above.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <LinearGradient
        colors={[colors.primary, colors.secondary, colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { paddingTop: topPad }]}
      >
        <View style={styles.hero}>
          <View style={styles.logoMark}>
            <Ionicons name="school" size={28} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.logoText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>ElimuPawa</Text>
          <Text style={[styles.tagline, { color: colors.primaryForeground + "cc", fontFamily: "Inter_400Regular" }]}>Your class is one tap away</Text>
        </View>

        <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: botPad }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>TAP A DEMO ACCOUNT</Text>

          <FlatList
            data={mockDemoUsers}
            keyExtractor={(u) => u.username}
            renderItem={({ item }) => (
              <UserCard user={item} selected={selectedUser.username === item.username} onPress={() => handleSelectUser(item)} colors={colors} />
            )}
            scrollEnabled={false}
            style={styles.userList}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />

          <Pressable
            onPress={() => handleQuickLogin(selectedUser)}
            style={({ pressed }) => [styles.quickLoginBtn, { backgroundColor: colors.primary + "18", opacity: pressed ? 0.7 : 1, borderColor: colors.primary + "44", borderWidth: 1 }]}
          >
            <Ionicons name="flash" size={16} color={colors.primary} />
            <Text style={[styles.quickLoginText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
              Quick sign in as {selectedUser.full_name.split(" ")[0]}
            </Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>or sign in manually</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="person-outline" size={18} color={colors.mutedForeground} style={{ marginLeft: 14 }} />
            <TextInput
              style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
              placeholder="Username"
              placeholderTextColor={colors.mutedForeground}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 10 }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} style={{ marginLeft: 14 }} />
            <TextInput
              style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} style={{ paddingHorizontal: 14 }}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {!!error && <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>{error}</Text>}

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={({ pressed }) => [styles.signInBtn, { backgroundColor: colors.primary, opacity: pressed || loading ? 0.8 : 1, marginTop: 14 }]}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Text style={[styles.signInBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>Sign in</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} style={{ marginLeft: 6 }} />
              </>
            )}
          </Pressable>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  hero: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 24 },
  logoMark: { width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  logoText: { fontSize: 28, letterSpacing: -0.5 },
  tagline: { fontSize: 15, marginTop: 6 },
  sheet: { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 24 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.2, marginBottom: 12 },
  userList: { flexGrow: 0 },
  userCard: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 12, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 15 },
  userInfo: { flex: 1 },
  userName: { fontSize: 15 },
  userEmail: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11 },
  quickLoginBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 46, borderRadius: 14, marginTop: 12 },
  quickLoginText: { fontSize: 14 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12 },
  inputRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, height: 50 },
  input: { flex: 1, fontSize: 15, paddingHorizontal: 12, height: "100%" },
  errorText: { fontSize: 13, marginTop: 8, textAlign: "center" },
  signInBtn: { height: 52, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  signInBtnText: { fontSize: 16 },
});
