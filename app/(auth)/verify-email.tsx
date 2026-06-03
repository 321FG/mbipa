/**
 * Verify Email Screen
 *
 * Shown right after registration. Blocks access to the app until the user
 * has clicked the verification link Firebase emailed them.
 *
 * - "J'ai vérifié" → reloads firebaseAuth.currentUser and checks emailVerified.
 * - "Renvoyer le lien" → fires resendVerificationEmail thunk.
 * - "Changer de compte" → logs out and goes back to login.
 */
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { auth } from "@/src/config/firebase";
import { useAppDispatch } from "@/src/hooks";
import { logout, resendVerificationEmail, setEmailVerified } from "@/src/store/slices/authSlice";
import { borderRadius, colors, fontSizes, spacing } from "@/src/theme";

const ACCENT = { flame: "#FF8A4C" };

export default function VerifyEmailScreen() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState("");

  // Auto-poll every 4 seconds while the screen is open. Cheap (just calls
  // currentUser.reload()) and the user instantly transitions once they tap
  // the link in their email.
  useEffect(() => {
    // Capture email from Firebase auth (safely)
    try {
      if (auth && auth.currentUser?.email) {
        setEmail(auth.currentUser.email);
      }
    } catch {
      // auth may not be initialized yet
    }

    let cancelled = false;
    const id = setInterval(async () => {
      try {
        const u = auth?.currentUser;
        if (!u) return;
        await u.reload();
        if (!cancelled && u.emailVerified) {
          clearInterval(id);
          dispatch(setEmailVerified(true));
          router.replace("/(tabs)");
        }
      } catch {
        /* ignore */
      }
    }, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [dispatch]);

  const handleCheck = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const u = auth?.currentUser;
      if (!u) {
        router.replace("/(auth)/login");
        return;
      }
      await u.reload();
      if (u.emailVerified) {
        dispatch(setEmailVerified(true));
        router.replace("/(tabs)");
      } else {
        Alert.alert(
          t("verifyEmail.notYetTitle"),
          t("verifyEmail.notYetMessage"),
        );
      }
    } catch (e: any) {
      Alert.alert(t("common.error"), String(e?.message || e));
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    try {
      await dispatch(resendVerificationEmail()).unwrap();
      Alert.alert(t("profile.emailSent"), t("profile.checkInbox"));
    } catch (e: any) {
      Alert.alert(t("common.error"), String(e || ""));
    } finally {
      setResending(false);
    }
  };

  const handleSwitchAccount = async () => {
    await dispatch(logout());
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="mail-unread-outline" size={42} color={ACCENT.flame} />
        </View>

        <Text style={styles.title}>{t("verifyEmail.title")}</Text>
        <Text style={styles.subtitle}>
          {t("verifyEmail.subtitle")}
          {email ? <Text style={styles.emailText}>{` ${email}`}</Text> : null}
        </Text>

        <View style={styles.tipBox}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.textSecondary}
          />
          <Text style={styles.tipText}>{t("verifyEmail.spamTip")}</Text>
        </View>

        <Pressable
          style={[styles.primaryBtn, checking && { opacity: 0.6 }]}
          onPress={handleCheck}
          disabled={checking}
          accessibilityRole="button"
          accessibilityLabel={t("verifyEmail.checkCta")}
        >
          {checking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {t("verifyEmail.checkCta")}
            </Text>
          )}
        </Pressable>

        <Pressable
          style={styles.secondaryBtn}
          onPress={handleResend}
          disabled={resending}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryBtnText}>
            {resending ? t("common.loading") : t("verifyEmail.resendCta")}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleSwitchAccount}
          style={{ marginTop: spacing.lg }}
          accessibilityRole="button"
        >
          <Text style={styles.linkText}>{t("verifyEmail.switchAccount")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: ACCENT.flame + "1A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  emailText: { color: colors.text, fontWeight: "700" },
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: "#F4F0FF",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  tipText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  primaryBtn: {
    width: "100%",
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: fontSizes.md,
    fontWeight: "700",
  },
  secondaryBtn: {
    width: "100%",
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.primary + "33",
  },
  secondaryBtnText: {
    color: colors.primary,
    fontSize: fontSizes.md,
    fontWeight: "600",
  },
  linkText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    textDecorationLine: "underline",
  },
});
