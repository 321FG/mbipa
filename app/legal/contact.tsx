import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router, Stack } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Surface,
  Text,
  TextInput,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppSelector } from "@/src/hooks";
import { FORM_ENDPOINTS, formFeedback, submitForm } from "@/src/services/forms";
import { borderRadius, colors, fontSizes, spacing } from "@/src/theme";

const SUPPORT_EMAIL = "support@mbipa.app";

export default function ContactScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAppSelector((s) => s.auth);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert(
        t("common.fieldRequired"),
        t("legal.contactSubject") + " + " + t("legal.contactMessage"),
      );
      return;
    }
    setSending(true);
    try {
      const senderEmail = user?.email?.trim();
      const result = await submitForm(FORM_ENDPOINTS.MESSAGES, {
        subject: subject.trim(),
        message: message.trim(),
        ...(senderEmail ? { senderEmail } : {}),
        language: (i18n.language || "en").slice(0, 2),
      });

      if (result.kind === "success") {
        Alert.alert(t("common.success"), t("legal.contactSuccess"));
        setSubject("");
        setMessage("");
        return;
      }

      const feedback = formFeedback(result, t);
      if (feedback) Alert.alert(feedback.title, feedback.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <Surface style={styles.header} elevation={2}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("legal.contact")}</Text>
        <View style={{ width: 26 + spacing.xs * 2 }} />
      </Surface>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>{t("legal.contactTitle")}</Text>
          <Text style={styles.subtitle}>{t("legal.contactSubtitle")}</Text>

          {/* Quick contact options */}
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.option}
              onPress={() =>
                Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})
              }
            >
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <Ionicons name="mail" size={22} color={colors.primary} />
              </View>
              <Text style={styles.optionLabel}>E-mail</Text>
              <Text style={styles.optionValue}>{SUPPORT_EMAIL}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={() =>
                Linking.openURL("https://mbipa.app").catch(() => {})
              }
            >
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: colors.info + "22" },
                ]}
              >
                <Ionicons name="globe" size={22} color={colors.info} />
              </View>
              <Text style={styles.optionLabel}>
                {t("legal.aboutContent.website")}
              </Text>
              <Text style={styles.optionValue}>mbipa.app</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <Text style={styles.sectionLabel}>{t("common.send")}</Text>

          <TextInput
            mode="outlined"
            label={t("legal.contactSubject")}
            value={subject}
            onChangeText={setSubject}
            style={styles.input}
            maxLength={120}
          />

          <TextInput
            mode="outlined"
            label={t("legal.contactMessage")}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            style={[styles.input, { minHeight: 140 }]}
            maxLength={2000}
          />

          <Button
            mode="contained"
            onPress={handleSend}
            disabled={sending}
            style={styles.sendBtn}
            contentStyle={{ paddingVertical: 6 }}
            icon={sending ? undefined : "send"}
          >
            {sending ? <ActivityIndicator color="#fff" /> : t("common.send")}
          </Button>

          <Text style={styles.hint}>{t("legal.contactHint")}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  backButton: { padding: spacing.xs },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: fontSizes.lg,
    fontWeight: "600",
    color: colors.text,
  },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  optionsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  option: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  optionLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  optionValue: {
    fontSize: fontSizes.sm,
    color: colors.text,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: "600",
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  sendBtn: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
  },
  hint: {
    marginTop: spacing.md,
    fontSize: fontSizes.xs,
    color: colors.textLight,
    textAlign: "center",
  },
  credit: {
    marginTop: spacing.sm,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
