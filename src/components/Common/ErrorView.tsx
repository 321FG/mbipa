/**
 * ErrorView — reusable, friendly error display.
 *
 * Use inline (e.g. inside a screen) or via the `/error` route
 * (`app/error.tsx`) for a full-screen variant.
 */
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";

import { borderRadius, colors, fontSizes, spacing } from "@/src/theme/theme";

export type ErrorViewProps = {
  title?: string;
  message?: string;
  /** Small technical detail rendered in muted text (e.g. HTTP 404). */
  detail?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
};

export function ErrorView({
  title = "Something went wrong",
  message = "Please try again in a moment.",
  detail,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  iconName = "alert-circle-outline",
  style,
}: ErrorViewProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconWrap}>
        <Ionicons name={iconName} size={56} color={colors.error} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}

      {onPrimary ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPrimary}
          style={styles.primaryBtnWrap}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>
              {primaryLabel ?? "Try again"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : null}

      {onSecondary ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onSecondary}
          style={styles.secondaryBtn}
        >
          <Text style={styles.secondaryBtnText}>
            {secondaryLabel ?? "Go back"}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FDECE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: fontSizes.lg,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  detail: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  primaryBtnWrap: {
    marginTop: spacing.lg,
    width: "100%",
    maxWidth: 320,
  },
  primaryBtn: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: "center",
  },
  primaryBtnText: {
    color: colors.textOnPrimary,
    fontSize: fontSizes.lg,
    fontWeight: "600",
  },
  secondaryBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
    fontWeight: "500",
  },
});
