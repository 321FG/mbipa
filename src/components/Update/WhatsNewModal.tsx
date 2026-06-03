/**
 * WhatsNewModal — one-time post-update welcome screen.
 *
 * Shown once after the user updates to a new version (gated by
 * `useVersionCheck` + AsyncStorage). Celebratory but calm, matching the
 * MBIPA design language. Purely presentational.
 */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Modal, Portal, Text } from "react-native-paper";

import { borderRadius, colors, fontSizes, spacing } from "@/src/theme";

interface WhatsNewModalProps {
  visible: boolean;
  version: string;
  releaseNotes: string[];
  onContinue: () => void;
}

export function WhatsNewModal({
  visible,
  version,
  releaseNotes,
  onContinue,
}: WhatsNewModalProps) {
  const { t } = useTranslation();

  return (
    <Portal>
      <Modal
        visible={visible}
        // The user must tap "Continue" to acknowledge.
        dismissable={false}
        contentContainerStyle={styles.modal}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="sparkles" size={28} color={colors.primary} />
        </View>

        <Text style={styles.title}>
          {t("update.whatsNewTitle", { version })}
        </Text>
        <Text style={styles.subtitle}>{t("update.whatsNewSubtitle")}</Text>

        <ScrollView
          style={styles.notes}
          contentContainerStyle={styles.notesContent}
          showsVerticalScrollIndicator={false}
        >
          {releaseNotes.map((note, i) => (
            <View key={`wn-${i}`} style={styles.noteRow}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={14} color={colors.success} />
              </View>
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ))}
        </ScrollView>

        <Button
          mode="contained"
          onPress={onContinue}
          style={styles.primaryBtn}
          contentStyle={styles.btnContent}
        >
          {t("common.continue")}
        </Button>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    maxHeight: "85%",
    alignSelf: "stretch",
    alignItems: "stretch",
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  notes: {
    flexGrow: 0,
    marginBottom: spacing.md,
  },
  notesContent: {
    paddingVertical: spacing.xs,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success + "1A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  noteText: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.text,
    lineHeight: 21,
    paddingTop: 2,
  },
  primaryBtn: {
    borderRadius: borderRadius.md,
  },
  btnContent: {
    paddingVertical: spacing.xs,
  },
});
