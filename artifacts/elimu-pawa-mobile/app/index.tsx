import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect, router } from "expo-router";
import React from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { student, isLoading } = useAuth();

  if (!isLoading && student) {
    return <Redirect href="/dashboard" />;
  }
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/sign-in");
  };

  const handleSignUp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/sign-up");
  };

  const styles = makeStyles(colors, topPad, bottomPad);

  return (
    <View style={styles.container}>
      <View style={styles.heroSection}>
        <View style={styles.logoWrap}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
          />
        </View>
        <Text style={styles.brand}>ElimuPawa</Text>
        <Text style={styles.tagline}>Your classroom, anywhere.</Text>
        <Text style={styles.sub}>
          Join live lessons, track your progress, and{"\n"}never miss a class.
        </Text>
      </View>

      <View style={styles.features}>
        {[
          { icon: "videocam-outline" as const, label: "Live video lessons" },
          { icon: "chatbubble-outline" as const, label: "In-class chat & polls" },
          { icon: "calendar-outline" as const, label: "Lesson schedule & reminders" },
        ].map((f) => (
          <View key={f.label} style={styles.featureRow}>
            <View style={styles.featureIconWrap}>
              <Ionicons name={f.icon} size={18} color={colors.primary} />
            </View>
            <Text style={styles.featureLabel}>{f.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
          onPress={handleSignIn}
          testID="sign-in-btn"
        >
          <Text style={styles.btnPrimaryText}>Sign in</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
          onPress={handleSignUp}
          testID="sign-up-btn"
        >
          <Text style={styles.btnSecondaryText}>Create account</Text>
        </Pressable>
      </View>
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
      paddingTop: topPad + 24,
      paddingBottom: bottomPad + 24,
      paddingHorizontal: 28,
      justifyContent: "space-between",
    },
    heroSection: {
      alignItems: "center",
      marginTop: 20,
    },
    logoWrap: {
      width: 88,
      height: 88,
      borderRadius: 24,
      overflow: "hidden",
      marginBottom: 20,
      shadowColor: colors.primary,
      shadowOpacity: 0.35,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    logo: {
      width: 88,
      height: 88,
    },
    brand: {
      fontSize: 32,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    tagline: {
      fontSize: 16,
      fontFamily: "Inter_500Medium",
      color: colors.primary,
      marginTop: 4,
    },
    sub: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      marginTop: 12,
      lineHeight: 21,
    },
    features: {
      gap: 12,
      paddingHorizontal: 4,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    featureIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    featureLabel: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    actions: {
      gap: 12,
    },
    btnPrimary: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 15,
      alignItems: "center",
    },
    btnPrimaryText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: "#ffffff",
    },
    btnSecondary: {
      borderRadius: colors.radius,
      paddingVertical: 15,
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    btnSecondaryText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    pressed: {
      opacity: 0.75,
    },
  });
}
