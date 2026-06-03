/**
 * UpdateModal — optional & forced app-update prompt.
 *
 * Reusable, design-system-aligned modal shown when a newer app version is
 * available. In "forced" mode the modal cannot be dismissed (no close button,
 * no backdrop dismiss, no "Later" action). Purely presentational — all logic
 * lives in `useVersionCheck`.
 */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Modal, Portal, Text } from "react-native-paper";

import { borderRadius, colors, fontSizes, spacing } from "@/src/theme";

interface UpdateModalProps {
  visible: boolean;
  /** When true the modal is mandatory and cannot be dismissed. */
  forced: boolean;
  releaseNotes: string[];
  latestVersion?: string;
  onUpdate: () => void;
  onDismiss: () => void;
}

export function UpdateModal({
  visible,
  forced,
  releaseNotes,
  latestVersion,
  onUpdate,
  onDismiss,
}: UpdateModalProps) {
  const { t } = useTranslation();

  return (
    <Portal>
      <Modal
        visible={visible}
        // Forced updates ignore backdrop dismissal.
        dismissable={!forced}
        onDismiss={forced ? undefined : onDismiss}
        contentContainerStyle={styles.modal}
      >
        <View style={styles.header}>
          <View
            style={[
              styles.iconCircle,
              forced && { backgroundColor: colors.warning + "22" },
            ]}
          >
            <Ionicons
              name={forced ? "warning-outline" : "rocket-outline"}
              size={26}
              color={forced ? colors.warning : colors.primary}
            />
          </View>
          {!forced && (
            <TouchableOpacity
              onPress={onDismiss}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.close}
              accessibilityLabel={t("common.close")}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.title}>
          {forced ? t("update.forcedTitle") : t("update.optionalTitle")}
        </Text>
        <Text style={styles.subtitle}>
          {forced ? t("update.forcedMessage") : t("update.optionalMessage")}
        </Text>

        {releaseNotes.length > 0 && (
          <ScrollView
            style={styles.notes}
            contentContainerStyle={styles.notesContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.notesHeading}>{t("update.whatsNewHeading")}</Text>
            {releaseNotes.map((note, i) => (
              <View key={`note-${i}`} style={styles.noteRow}>
                <Ionicons
                  name="ellipse"
                  size={6}
                  color={colors.primary}
                  style={styles.noteBullet}
                />
                <Text style={styles.noteText}>{note}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {!!latestVersion && (
          <Text style={styles.versionTag}>
            {t("update.versionLabel", { version: latestVersion })}
          </Text>
        )}

        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={onUpdate}
            style={styles.primaryBtn}
            contentStyle={styles.btnContent}
            icon="download"
          >
            {t("update.updateNow")}
          </Button>
          {!forced && (
            <Button
              mode="text"
              onPress={onDismiss}
              style={styles.laterBtn}
              textColor={colors.textSecondary}
            >
              {t("update.later")}
            </Button>
          )}
        </View>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    maxHeight: "85%",
    alignSelf: "stretch",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  notes: {
    flexGrow: 0,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  notesContent: {
    paddingVertical: spacing.xs,
  },
  notesHeading: {
    fontSize: fontSizes.sm,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  noteBullet: {
    marginTop: 7,
    marginRight: spacing.sm,
  },
  noteText: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.text,
    lineHeight: 20,
  },
  versionTag: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  actions: {
    marginTop: spacing.xs,
  },
  primaryBtn: {
    borderRadius: borderRadius.md,
  },
  btnContent: {
    paddingVertical: spacing.xs,
  },
  laterBtn: {
    marginTop: spacing.xs,
  },
});
