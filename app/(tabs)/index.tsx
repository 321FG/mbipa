/**
 * Home Screen - Dashboard principal Mbipa
 */
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/src/components/Auth/PrimaryButton";
import { MbipaAvatar } from "@/src/components/Avatar/MbipaAvatar";
import { useAppSelector } from "@/src/hooks";
import { colors, spacing } from "@/src/theme";
import { webContentStyle } from "@/src/utils/responsive";

// Shared muted gray-blue used for subtitles and meta text.
const DIM = "#9AA3B2";

// Format first name to be displayed in the greeting (no email fallback).
const formatFirstName = (raw?: string) => {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Capitalize first letter, leave the rest as-is.
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

// Quick action component
const QuickAction = ({
  icon,
  title,
  color,
  onPress,
}: {
  icon: string;
  title: string;
  color: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={styles.quickAction}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.quickActionIcon, { backgroundColor: color + "18" }]}>
      <Ionicons name={icon as any} size={22} color={color} />
    </View>
    <Text style={styles.quickActionTitle}>{title}</Text>
  </TouchableOpacity>
);

// Stat card component
const StatCard = ({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: color + "1A" }]}>
      <Ionicons name={icon as any} size={16} color={color} />
    </View>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default function HomeScreen() {
  const { user } = useAppSelector((state) => state.auth);
  const { results } = useAppSelector((state) => state.assessment);
  const [refreshing, setRefreshing] = React.useState(false);
  const { t } = useTranslation();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("home.greetingMorning");
    if (hour < 18) return t("home.greetingAfternoon");
    return t("home.greetingEvening");
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  // Show only the user's first name; never fall back to the email username.
  const firstName = formatFirstName(user?.prenom);

  // Wellbeing score derives from the most recent assessment result.
  // Each assessment exposes its raw score on a 0-100 scale already.
  const latestResult = results?.[0];
  const wellbeingScore = latestResult
    ? Math.max(0, Math.min(100, Math.round(latestResult.score)))
    : 0;
  const streakDays = user?.stats?.streak || 0;
  const messagesCount = user?.stats?.messagesCount || 0;
  const testsCompleted = results?.length || user?.stats?.testsCompleted || 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, webContentStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              {getGreeting()}
              {firstName ? `, ${firstName}` : ""} 👋
            </Text>
            <Text style={styles.subtitle}>{t("home.howAreYouToday")}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push("/(tabs)/profile")}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#9B85FF", "#6B4EFF", "#5B9BFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarHalo}
            >
              <View style={styles.avatarInner}>
                {user?.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    style={styles.profilePhoto}
                    contentFit="cover"
                  />
                ) : (
                  <MbipaAvatar size={44} speaking={false} animated={false} />
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Wellbeing Score Card */}
        <View style={styles.wellbeingCard}>
          <View style={styles.wellbeingHeader}>
            <View>
              <Text style={styles.wellbeingTitle}>
                {t("home.wellbeingScore")}
              </Text>
              <Text style={styles.wellbeingSubtitle}>
                {t("home.basedOnTests")}
              </Text>
            </View>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreText}>{wellbeingScore}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.max(0, Math.min(100, wellbeingScore))}%`,
                  backgroundColor: colors.success,
                },
              ]}
            />
          </View>
          <View style={styles.wellbeingFooter}>
            <Ionicons
              name={latestResult ? "trending-up" : "information-circle-outline"}
              size={14}
              color={latestResult ? colors.success : DIM}
            />
            <Text style={styles.wellbeingTrend}>
              {latestResult
                ? t("home.lastTest", { name: latestResult.assessmentName })
                : t("home.passTestForScore")}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>{t("home.quickAccess")}</Text>
        <View style={styles.quickActions}>
          <QuickAction
            icon="chatbubbles"
            title={t("home.quickActions.chat")}
            color={colors.primary}
            onPress={() => router.push("/(tabs)/chat")}
          />
          <QuickAction
            icon="clipboard"
            title={t("home.quickActions.tests")}
            color={colors.secondary}
            onPress={() => router.push("/(tabs)/assessments")}
          />
          <QuickAction
            icon="musical-notes"
            title={t("home.quickActions.music")}
            color={colors.relaxation}
            onPress={() => router.push("/(tabs)/music")}
          />
          <QuickAction
            icon="videocam"
            title={t("home.quickActions.session")}
            color={colors.motivation}
            onPress={() => router.push("/therapist")}
          />
        </View>

        {/* Stats */}
        <Text style={styles.sectionTitle}>{t("home.yourStats")}</Text>
        <View style={styles.statsRow}>
          <StatCard
            label={t("home.stats.streak")}
            value={`${streakDays}j`}
            icon="flame"
            color={colors.secondary}
          />
          <StatCard
            label={t("home.stats.messages")}
            value={messagesCount}
            icon="chatbubble"
            color={colors.primary}
          />
          <StatCard
            label={t("tabs.assessments")}
            value={testsCompleted}
            icon="checkmark-circle"
            color={colors.success}
          />
        </View>

        {/* Daily Tip */}
        <View style={styles.tipCard}>
          <View style={styles.tipContent}>
            <View style={styles.tipIcon}>
              <Ionicons name="bulb" size={22} color={colors.warning} />
            </View>
            <View style={styles.tipTextContainer}>
              <Text style={styles.tipTitle}>{t("home.tipOfDay")}</Text>
              <Text style={styles.tipText}>{t("home.tipText")}</Text>
            </View>
          </View>
        </View>

        {/* Upcoming Session (if any) */}
        <View style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <Ionicons name="calendar" size={18} color={colors.primary} />
            <Text style={styles.sessionTitle}>{t("home.nextSession")}</Text>
          </View>
          <Text style={styles.noSessionText}>{t("home.noSession")}</Text>
          <PrimaryButton
            label={t("home.bookWithPsychologist")}
            onPress={() => router.push("/therapist")}
            style={styles.bookButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Soft, lifted shadow used everywhere on the home dashboard.
const softShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 30,
  shadowOffset: { width: 0, height: 10 },
  elevation: 2,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: DIM,
    marginTop: 4,
  },
  profileButton: {
    marginLeft: spacing.md,
  },
  avatarHalo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  avatarInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  profilePhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  wellbeingCard: {
    padding: spacing.lg,
    borderRadius: 24,
    backgroundColor: colors.surface,
    marginBottom: spacing.xl,
    ...softShadow,
  },
  wellbeingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  wellbeingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: -0.2,
  },
  wellbeingSubtitle: {
    fontSize: 12,
    color: DIM,
    marginTop: 2,
  },
  scoreCircle: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  scoreText: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.success,
    letterSpacing: -0.8,
  },
  scoreMax: {
    fontSize: 13,
    color: DIM,
    marginLeft: 2,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EEF0F4",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  subscriptionCta: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
  },
  subscriptionCtaText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  wellbeingFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
  },
  wellbeingTrend: {
    fontSize: 12,
    color: DIM,
    marginLeft: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: DIM,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.md,
    ...softShadow,
  },
  quickAction: {
    alignItems: "center",
    flex: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  quickActionTitle: {
    fontSize: 11,
    color: colors.text,
    textAlign: "center",
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    ...softShadow,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  statLabel: {
    fontSize: 11,
    color: DIM,
    marginTop: 2,
    textAlign: "center",
  },
  tipCard: {
    marginBottom: spacing.lg,
    backgroundColor: "#FFF8E5",
    borderRadius: 24,
    padding: spacing.lg,
    ...softShadow,
  },
  tipContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF1C4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  tipTextContainer: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7A6840",
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  tipText: {
    fontSize: 13,
    color: "#9B8B5C",
    lineHeight: 19,
  },
  sessionCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.lg,
    ...softShadow,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginLeft: 8,
    letterSpacing: -0.2,
  },
  noSessionText: {
    fontSize: 13,
    color: DIM,
    textAlign: "center",
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  bookButton: {
    borderRadius: 16,
  },
  subscriptionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderRadius: 24,
    backgroundColor: "#F4F0FF",
    ...softShadow,
  },
  subscriptionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  subscriptionText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: -0.2,
  },
  subscriptionSubtitle: {
    fontSize: 12,
    color: DIM,
    marginTop: 2,
  },
});
