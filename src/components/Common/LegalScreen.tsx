/**
 * Reusable layout for legal / informational screens
 * (privacy policy, terms, about, help, contact).
 *
 * All such pages share the same header + scrollable content shell, so we
 * keep the visual language consistent and avoid duplicating boilerplate.
 */
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Surface, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { borderRadius, colors, fontSizes, spacing } from "@/src/theme";

type Section = {
  heading?: string;
  body: string;
};

interface LegalScreenProps {
  title: string;
  intro?: string;
  sections: Section[];
  /** Tag shown under the title (e.g. "Mis à jour le 29 avr. 2026"). */
  meta?: string;
  /** Optional footer rendered below all sections (e.g. contact actions). */
  footer?: React.ReactNode;
}

export function LegalScreen({
  title,
  intro,
  sections,
  meta,
  footer,
}: LegalScreenProps) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <Surface style={styles.header} elevation={2}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
          style={styles.backButton}
          accessibilityLabel={t("common.back")}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 26 + spacing.xs * 2 }} />
      </Surface>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{title}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}

        {intro ? (
          <Surface style={styles.introCard} elevation={1}>
            <Text style={styles.introText}>{intro}</Text>
          </Surface>
        ) : null}

        {sections.map((s, i) => (
          <View key={i} style={styles.section}>
            {s.heading ? (
              <Text style={styles.sectionHeading}>{s.heading}</Text>
            ) : null}
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
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
    fontSize: fontSizes.lg,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
    textAlign: "center",
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  meta: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  introCard: {
    backgroundColor: colors.primary + "0F",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  introText: {
    color: colors.text,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeading: {
    fontSize: fontSizes.lg,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionBody: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  footer: {
    marginTop: spacing.lg,
  },
});
