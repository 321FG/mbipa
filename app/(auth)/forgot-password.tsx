/**
 * Forgot Password Screen
 */
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import {
    Button,
    HelperText,
    Surface,
    Text,
    TextInput,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth as firebaseAuth } from "@/src/config/firebase";
import { borderRadius, colors, fontSizes, spacing } from "@/src/theme";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    setEmailError("");
    setError("");

    if (!email) {
      setEmailError(t("auth.errors.invalidEmail"));
      return;
    }

    if (!validateEmail(email)) {
      setEmailError(t("auth.errors.invalidEmail"));
      return;
    }

    setIsLoading(true);

    try {
      // Firebase client-side password reset — no backend dependency.
      await sendPasswordResetEmail(firebaseAuth, email);
      setIsSent(true);
    } catch (err: any) {
      const code = err?.code as string | undefined;
      if (code === "auth/invalid-email") {
        setEmailError(t("auth.errors.invalidEmail"));
      } else if (code === "auth/user-not-found") {
        // Don't reveal account existence — show success anyway.
        setIsSent(true);
      } else if (code === "auth/too-many-requests") {
        setError(t("common.error"));
      } else if (code === "auth/network-request-failed") {
        setError(t("common.error"));
      } else {
        setError(t("common.error"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons
              name="checkmark-circle"
              size={80}
              color={colors.success}
            />
          </View>
          <Text style={styles.successTitle}>{t("auth.forgot.sent")}</Text>
          <Text style={styles.successText}>
            {t("auth.forgot.subtitle")}
            {"\n"}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>
          <Text style={styles.instructionText}>
            {t("auth.forgot.subtitle")}
          </Text>
          <Button
            mode="contained"
            onPress={() => router.replace("/(auth)/login")}
            style={styles.backButton}
            contentStyle={styles.buttonContent}
          >
            {t("auth.forgot.back")}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backArrow}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="key-outline" size={40} color={colors.primary} />
            </View>
            <Text style={styles.title}>{t("auth.forgot.title")}</Text>
            <Text style={styles.subtitle}>{t("auth.forgot.subtitle")}</Text>
          </View>

          {/* Form */}
          <Surface style={styles.formCard} elevation={2}>
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            <TextInput
              label={t("auth.email")}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError("");
              }}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={!!emailError}
              style={styles.input}
              left={<TextInput.Icon icon="email-outline" />}
            />
            <HelperText type="error" visible={!!emailError}>
              {emailError}
            </HelperText>

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isLoading}
              disabled={isLoading}
              style={styles.submitButton}
              contentStyle={styles.buttonContent}
            >
              {isLoading ? t("common.loading") : t("auth.forgot.send")}
            </Button>
          </Surface>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>{t("auth.hasAccount")} </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>{t("auth.signInLink")}</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  backArrow: {
    marginBottom: spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight + "30",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: "bold",
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: "center",
    lineHeight: 22,
  },
  formCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
  },
  errorBanner: {
    backgroundColor: colors.error + "20",
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    color: colors.error,
    textAlign: "center",
  },
  input: {
    backgroundColor: colors.surface,
  },
  submitButton: {
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  buttonContent: {
    paddingVertical: spacing.xs,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  loginText: {
    color: colors.textSecondary,
  },
  loginLink: {
    color: colors.primary,
    fontWeight: "600",
  },
  // Success state styles
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  successIcon: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: spacing.md,
  },
  successText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  emailHighlight: {
    color: colors.primary,
    fontWeight: "600",
  },
  instructionText: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    textAlign: "center",
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
  backButton: {
    borderRadius: borderRadius.md,
    width: "100%",
  },
});
