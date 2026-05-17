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
import { studentRegister } from "@/lib/api";

const CLASS_LEVELS = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "Form 1", "Form 2", "Form 3", "Form 4"];

export default function SignUpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { setAuth, student, isLoading } = useAuth();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    adm_no: "",
    class_level: "",
    parent_phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showClassPicker, setShowClassPicker] = useState(false);

  const lastRef = useRef<TextInput>(null);
  const admRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  if (!isLoading && student) {
    return <Redirect href="/dashboard" />;
  }

  const styles = makeStyles(colors, topPad);

  const update = (key: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    const { first_name, last_name, adm_no, class_level, parent_phone } = form;
    if (!first_name.trim() || !last_name.trim() || !adm_no.trim() || !class_level || !parent_phone.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (!/^\d/.test(parent_phone.trim())) {
      setError("Parent phone must start with a digit.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await studentRegister({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        adm_no: adm_no.trim().toUpperCase(),
        class_level: class_level.trim(),
        parent_phone: parent_phone.trim(),
      });
      await setAuth(res.student, res.token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/dashboard");
    } catch (e) {
      setError((e as Error).message ?? "Registration failed. Please try again.");
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
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join ElimuPawa to access your lessons</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>First name</Text>
            <TextInput
              style={styles.input}
              placeholder="John"
              placeholderTextColor={colors.mutedForeground}
              value={form.first_name}
              onChangeText={update("first_name")}
              returnKeyType="next"
              onSubmitEditing={() => lastRef.current?.focus()}
              testID="first-name-input"
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Last name</Text>
            <TextInput
              ref={lastRef}
              style={styles.input}
              placeholder="Doe"
              placeholderTextColor={colors.mutedForeground}
              value={form.last_name}
              onChangeText={update("last_name")}
              returnKeyType="next"
              onSubmitEditing={() => admRef.current?.focus()}
              testID="last-name-input"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>ADM Number</Text>
          <TextInput
            ref={admRef}
            style={styles.input}
            placeholder="e.g. ADM-2024-001"
            placeholderTextColor={colors.mutedForeground}
            value={form.adm_no}
            onChangeText={update("adm_no")}
            autoCapitalize="characters"
            returnKeyType="next"
            onSubmitEditing={() => setShowClassPicker(true)}
            testID="adm-no-input"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Class / Grade</Text>
          <Pressable
            style={styles.input}
            onPress={() => setShowClassPicker((v) => !v)}
            testID="class-picker"
          >
            <Text style={form.class_level ? styles.pickerText : styles.pickerPlaceholder}>
              {form.class_level || "Select your class"}
            </Text>
            <Feather
              name={showClassPicker ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.mutedForeground}
            />
          </Pressable>
          {showClassPicker && (
            <View style={styles.dropdown}>
              {CLASS_LEVELS.map((lvl) => (
                <Pressable
                  key={lvl}
                  style={[
                    styles.dropdownItem,
                    form.class_level === lvl && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    update("class_level")(lvl);
                    setShowClassPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      form.class_level === lvl && { color: colors.primary, fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    {lvl}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Parent's Phone Number</Text>
          <Text style={styles.hint}>This will be your password (first 7 digits)</Text>
          <TextInput
            ref={phoneRef}
            style={styles.input}
            placeholder="e.g. 0712345678"
            placeholderTextColor={colors.mutedForeground}
            value={form.parent_phone}
            onChangeText={update("parent_phone")}
            keyboardType="phone-pad"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            testID="phone-input"
          />
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
          onPress={handleSubmit}
          disabled={loading}
          testID="submit-btn"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Create account</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.push("/sign-in")} style={styles.linkRow}>
          <Text style={styles.linkText}>
            Already have an account?{" "}
            <Text style={{ color: colors.primary }}>Sign in</Text>
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
    header: { gap: 6 },
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
    form: { gap: 18 },
    row: { flexDirection: "row", gap: 12 },
    fieldGroup: { gap: 6 },
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
    input: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.muted,
      borderRadius: colors.radius - 4,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: 14,
      height: 52,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    pickerText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    pickerPlaceholder: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    dropdown: {
      backgroundColor: colors.card,
      borderRadius: colors.radius - 4,
      borderWidth: 1.5,
      borderColor: colors.border,
      overflow: "hidden",
      maxHeight: 220,
    },
    dropdownItem: {
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    dropdownItemActive: {
      backgroundColor: `${colors.primary}18`,
    },
    dropdownText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
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
    pressed: { opacity: 0.75 },
    linkRow: { alignItems: "center", paddingVertical: 4 },
    linkText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
  });
}
