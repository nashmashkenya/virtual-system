import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect, router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { studentLogin } from "@/lib/api";

export default function SignInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { setAuth, student, isLoading } = useAuth();

  const [admNo, setAdmNo] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passRef = useRef<TextInput>(null);

  if (!isLoading && student) {
    return <Redirect href="/dashboard" />;
  }

  const styles = makeStyles(colors, topPad);

  const handleSignIn = async () => {
    if (!admNo.trim() || !password.trim()) {
      setError("Please enter your ADM No and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await studentLogin(admNo.trim().toUpperCase(), password.trim());
      await setAuth(res.student, res.token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/dashboard");
    } catch (e) {
      setError((e as Error).message ?? "Sign in failed. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      bottomOffset={20}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in with your student credentials</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>ADM Number</Text>
          <View style={styles.inputWrap}>
            <Feather name="user" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. ADM-2024-001"
              placeholderTextColor={colors.mutedForeground}
              value={admNo}
              onChangeText={setAdmNo}
              autoCapitalize="characters"
              returnKeyType="next"
              onSubmitEditing={() => passRef.current?.focus()}
              testID="adm-no-input"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <Text style={styles.hint}>First 7 digits of your parent's phone number</Text>
          <View style={styles.inputWrap}>
            <Feather name="lock" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              ref={passRef}
              style={[styles.input, styles.inputFlex]}
              placeholder="e.g. 0712345"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
              testID="password-input"
            />
            <Pressable onPress={() => setShowPass((v) => !v)} style={styles.eyeBtn}>
              <Feather
                name={showPass ? "eye-off" : "eye"}
                size={18}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={15} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.btnPrimary,
            (pressed || loading) && styles.pressed,
          ]}
          onPress={handleSignIn}
          disabled={loading}
          testID="submit-btn"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Sign in</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.push("/sign-up")} style={styles.linkRow}>
          <Text style={styles.linkText}>
            Don't have an account?{" "}
            <Text style={{ color: colors.primary }}>Create one</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAwareScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, topPad: number) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingTop: topPad + 16,
      paddingHorizontal: 24,
      paddingBottom: 40,
      gap: 32,
    },
    header: {
      gap: 6,
    },
    title: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    form: {
      gap: 20,
    },
    fieldGroup: {
      gap: 6,
    },
    label: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    hint: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: -2,
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.muted,
      borderRadius: colors.radius - 4,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: 14,
      height: 52,
    },
    inputIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    inputFlex: {
      flex: 1,
    },
    eyeBtn: {
      padding: 4,
      marginLeft: 8,
    },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: `${colors.destructive}18`,
      borderRadius: 10,
      padding: 12,
    },
    errorText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      flex: 1,
    },
    btnPrimary: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius - 4,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 4,
    },
    btnText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: "#ffffff",
    },
    pressed: {
      opacity: 0.75,
    },
    linkRow: {
      alignItems: "center",
      paddingVertical: 4,
    },
    linkText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
  });
}
