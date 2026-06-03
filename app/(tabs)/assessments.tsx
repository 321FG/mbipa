/**
 * Assessments Screen — Tests psychologiques.
 *
 * Branché directement sur GET /api/mobile/assessments. Pas de mocks :
 * en cas d'erreur on affiche un message + bouton "Réessayer".
 */
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  ProgressBar,
  SegmentedButtons,
  Text,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppDispatch, useAppSelector } from "@/src/hooks";
import { fetchAssessments } from "@/src/store/slices/assessmentSlice";
import { colors, spacing } from "@/src/theme";
import type { AssessmentListItem, AssessmentResult } from "@/src/types";
import { webContentStyle } from "@/src/utils/responsive";

// Shared muted gray-blue used for subtitles and meta text.
const DIM = "#9AA3B2";

// Soft shadow shared by every card on this screen.
const softShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 30,
  shadowOffset: { width: 0, height: 10 },
  elevation: 2,
};

// Per-id presentation hints (icon + accent color). Backend doesn't ship these.
const PRESENTATION: Record<string, { icon: string; color: string }> = {
  who5: { icon: "happy", color: colors.primary },
  wemwbs: { icon: "heart", color: colors.relaxation },
  mbi: { icon: "briefcase", color: colors.motivation },
};

const presentationFor = (id: string) =>
  PRESENTATION[id] || { icon: "clipboard", color: colors.primary };

// ---------------- Card ----------------

const AssessmentCard = ({
  item,
  lastResult,
  onStart,
}: {
  item: AssessmentListItem;
  lastResult?: AssessmentResult;
  onStart: () => void;
}) => {
  const { t } = useTranslation();
  const { icon, color } = presentationFor(item.id);

  const getStatusColor = (score?: number) => {
    if (score === undefined) return colors.textSecondary;
    if (score >= 70) return colors.success;
    if (score >= 40) return colors.warning;
    return colors.error;
  };

  return (
    <TouchableOpacity
      style={styles.assessmentCard}
      onPress={onStart}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: color + "18" }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        {item.source ? (
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceBadgeText} numberOfLines={1}>
              {`Source: ${item.source}`}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.cardTitle}>{item.title}</Text>
      {item.subtitle ? (
        <Text style={styles.cardDescription} numberOfLines={3}>
          {item.subtitle}
        </Text>
      ) : null}

      {lastResult && typeof lastResult.score === "number" && (
        <View style={styles.lastResultContainer}>
          <Text style={styles.lastResultLabel}>
            {t("assessments.lastResult")}
          </Text>
          <View style={styles.scoreRow}>
            <Text
              style={[
                styles.lastScore,
                { color: getStatusColor(lastResult.score) },
              ]}
            >
              {lastResult.score}
            </Text>
            <Text style={styles.lastResultDate}>
              {new Date(lastResult.date).toLocaleDateString("fr-FR")}
            </Text>
          </View>
          <ProgressBar
            progress={Math.min(1, Math.max(0, lastResult.score / 100))}
            color={getStatusColor(lastResult.score)}
            style={styles.scoreProgress}
          />
        </View>
      )}

      <Button
        mode="contained"
        onPress={onStart}
        style={styles.startButton}
        icon="play"
      >
        {lastResult ? t("assessments.redo") : t("assessments.start")}
      </Button>
    </TouchableOpacity>
  );
};

// ---------------- History row ----------------

const ResultHistoryItem = ({ result }: { result: AssessmentResult }) => {
  const getStatusColor = (score: number) => {
    if (score >= 70) return colors.success;
    if (score >= 40) return colors.warning;
    return colors.error;
  };
  return (
    <View style={styles.historyItem}>
      <View style={styles.historyContent}>
        <Text style={styles.historyTestName}>
          {result.assessmentName || result.assessmentId}
        </Text>
        <Text style={styles.historyDate}>
          {new Date(result.date).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </Text>
      </View>
      <View
        style={[
          styles.historyScore,
          { backgroundColor: getStatusColor(result.score) + "1A" },
        ]}
      >
        <Text
          style={[
            styles.historyScoreText,
            { color: getStatusColor(result.score) },
          ]}
        >
          {result.score}
        </Text>
      </View>
    </View>
  );
};

// ---------------- Screen ----------------

export default function AssessmentsScreen() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("tests");
  const [refreshing, setRefreshing] = useState(false);

  const { assessments, results, isLoading, listError } = useAppSelector(
    (state) => state.assessment,
  );
  const assessmentList: AssessmentListItem[] = Array.isArray(assessments)
    ? assessments
    : [];
  const resultList: AssessmentResult[] = Array.isArray(results) ? results : [];

  useEffect(() => {
    dispatch(fetchAssessments());
  }, [dispatch]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    dispatch(fetchAssessments()).finally(() => setRefreshing(false));
  }, [dispatch]);

  const handleStartAssessment = (item: AssessmentListItem) => {
    router.push({
      pathname: "/assessment/[id]",
      params: { id: item.id },
    });
  };

  const getLastResult = (assessmentId: string) =>
    resultList.find((r) => r.assessmentId === assessmentId);

  const renderTests = () => {
    if (isLoading && !refreshing && assessmentList.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    if (listError && assessmentList.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline" size={36} color={colors.error} />
          <Text style={styles.errorTitle}>{t("common.errorTitle")}</Text>
          <Text style={styles.errorText}>{listError}</Text>
          <Button
            mode="contained"
            icon="refresh"
            onPress={() => dispatch(fetchAssessments())}
            style={{ marginTop: spacing.md, borderRadius: 16 }}
          >
            {t("common.retry")}
          </Button>
        </View>
      );
    }
    return (
      <>
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Text style={styles.overviewTitle}>
              {t("assessments.yourWellbeing")}
            </Text>
          </View>
          <View style={styles.overviewStats}>
            <View style={styles.overviewStat}>
              <Text style={styles.overviewValue}>{resultList.length}</Text>
              <Text style={styles.overviewLabel}>
                {t("assessments.testsTaken")}
              </Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewStat}>
              <Text style={[styles.overviewValue, { color: colors.success }]}>
                {resultList.length > 0
                  ? Math.round(
                      resultList.reduce((acc, r) => acc + r.score, 0) /
                        resultList.length,
                    )
                  : "-"}
              </Text>
              <Text style={styles.overviewLabel}>
                {t("assessments.averageScore")}
              </Text>
            </View>
          </View>
        </View>

        {assessmentList.map((item) => (
          <AssessmentCard
            key={item.id}
            item={item}
            lastResult={getLastResult(item.id)}
            onStart={() => handleStartAssessment(item)}
          />
        ))}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("assessments.title")}</Text>
        <Text style={styles.subtitle}>{t("assessments.subtitle")}</Text>
      </View>

      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            { value: "tests", label: t("assessments.tabs") },
            { value: "history", label: t("assessments.history") },
          ]}
          style={styles.segments}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, webContentStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === "tests" ? (
          renderTests()
        ) : resultList.length === 0 ? (
          <View style={styles.emptyHistory}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="clipboard-outline"
                size={36}
                color={colors.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {t("assessments.emptyHistory")}
            </Text>
            <Text style={styles.emptyText}>
              {t("assessments.emptyHistoryText")}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              {t("assessments.recentResults")}
            </Text>
            {[...resultList]
              .sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime(),
              )
              .map((result) => (
                <ResultHistoryItem key={result.id} result={result} />
              ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: spacing.md },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.4,
  },
  subtitle: { fontSize: 13, color: DIM, marginTop: 4 },
  tabContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  segments: { backgroundColor: colors.surfaceVariant },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: { padding: spacing.xxl, alignItems: "center" },
  errorContainer: {
    padding: spacing.xl,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: "center",
    ...softShadow,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: 13,
    color: DIM,
    textAlign: "center",
    marginTop: 4,
  },
  overviewCard: {
    padding: spacing.lg,
    borderRadius: 24,
    backgroundColor: colors.surface,
    marginBottom: spacing.xl,
    ...softShadow,
  },
  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: -0.2,
  },
  overviewStats: { flexDirection: "row", alignItems: "center" },
  overviewStat: { flex: 1, alignItems: "center" },
  overviewDivider: { width: 1, height: 40, backgroundColor: "#EEF0F4" },
  overviewValue: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.6,
  },
  overviewLabel: {
    fontSize: 12,
    color: DIM,
    marginTop: 4,
    textAlign: "center",
  },
  assessmentCard: {
    marginBottom: spacing.md,
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...softShadow,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sourceBadge: {
    maxWidth: 180,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#EEF1F7",
    borderRadius: 999,
  },
  sourceBadgeText: { fontSize: 11, color: "#5A6376", fontWeight: "600" },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  cardDescription: {
    fontSize: 13,
    color: DIM,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  lastResultContainer: {
    backgroundColor: "#F8F9FB",
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.md,
  },
  lastResultLabel: {
    fontSize: 11,
    color: DIM,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  lastScore: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  lastResultDate: { fontSize: 12, color: DIM },
  scoreProgress: { height: 4, borderRadius: 2 },
  startButton: { borderRadius: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: DIM,
    marginBottom: spacing.md,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    ...softShadow,
  },
  historyContent: { flex: 1 },
  historyTestName: { fontSize: 14, fontWeight: "600", color: colors.text },
  historyDate: { fontSize: 12, color: DIM, marginTop: 2 },
  historyScore: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  historyScoreText: { fontSize: 14, fontWeight: "700" },
  emptyHistory: { alignItems: "center", paddingVertical: spacing.xxl },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: DIM,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
});
