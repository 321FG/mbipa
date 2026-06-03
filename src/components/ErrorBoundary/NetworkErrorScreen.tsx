import { colors, fontSizes, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

interface NetworkErrorScreenProps {
  error?: string;
  statusCode?: number;
  onRetry?: () => void;
}

export function NetworkErrorScreen({
  error,
  statusCode = 500,
  onRetry,
}: NetworkErrorScreenProps) {
  const isNoInternet = statusCode === 0 || error?.includes("Network");
  const is404 = statusCode === 404;

  // Fallback UI without i18n (in case i18n isn't available during error boundary rendering)
  const titles = {
    noInternet: "No internet connection",
    notFound: "Page not found",
    server: "Server error",
  };

  const descriptions = {
    noInternet: "Check your WiFi or mobile data connection.",
    notFound:
      "The resource you're looking for doesn't exist or has been deleted.",
    server: "An error occurred on our servers. Please try again in a moment.",
  };

  const suggestions = {
    noInternet: [
      "Enable WiFi or mobile data",
      "Check that your signal is strong",
      "Restart your device if needed",
    ],
    other: [
      "Check your internet connection",
      "Try again",
      "Contact support if the issue persists",
    ],
  };

  const title = isNoInternet
    ? titles.noInternet
    : is404
      ? titles.notFound
      : titles.server;

  const description = isNoInternet
    ? descriptions.noInternet
    : is404
      ? descriptions.notFound
      : descriptions.server;

  const sectionSuggestions = isNoInternet
    ? suggestions.noInternet
    : suggestions.other;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name={isNoInternet ? "wifi-off" : "alert-circle"}
            size={80}
            color={colors.error}
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Description */}
        <Text style={styles.description}>{description}</Text>

        {/* Status Code & Error Details */}
        {error && (
          <View style={styles.errorDetails}>
            <Text style={styles.statusCode}>
              {isNoInternet ? "Offline" : `Error ${statusCode}`}
            </Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        )}

        {/* Suggestions */}
        <View style={styles.suggestions}>
          <Text style={styles.suggestionsTitle}>Here's what you can do:</Text>

          {sectionSuggestions.map((suggestion, idx) => (
            <View key={idx} style={styles.suggestionItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </View>
          ))}
        </View>

        {/* Retry Button */}
        {onRetry && (
          <Button
            mode="contained"
            onPress={onRetry}
            style={styles.retryButton}
            contentStyle={{ paddingVertical: 8 }}
          >
            Try again
          </Button>
        )}

        {/* Contact Support */}
        <Text style={styles.supportText}>
          If the issue persists, contact{" "}
          <Text style={styles.supportLink}>support@mbipa.app</Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    justifyContent: "center",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  description: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  errorDetails: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  statusCode: {
    fontSize: fontSizes.sm,
    fontWeight: "700",
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontFamily: "monospace",
  },
  suggestions: {
    marginBottom: spacing.xl,
  },
  suggestionsTitle: {
    fontSize: fontSizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
  },
  suggestionItem: {
    flexDirection: "row",
    marginBottom: spacing.md,
    alignItems: "flex-start",
  },
  suggestionText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginLeft: spacing.md,
    flex: 1,
    lineHeight: 20,
  },
  retryButton: {
    marginBottom: spacing.lg,
  },
  supportText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  supportLink: {
    color: colors.primary,
    fontWeight: "600",
  },
});
