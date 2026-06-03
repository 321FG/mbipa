/**
 * Assessment Test Screen — passer un test psychologique.
 *
 * Branché sur l'API mobile :
 *  - GET  /api/mobile/assessments/:id           → détail (instructions, scale, questions)
 *  - POST /api/mobile/assessments/:id/score     → score branché (WHO-5 / WEMWBS / MBI)
 *
 * Aucun mock : si une étape échoue, on affiche un message d'erreur + bouton "Réessayer".
 */
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import {
    ActivityIndicator,
    Button,
    IconButton,
    ProgressBar,
    Surface,
    Text,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppDispatch, useAppSelector } from "@/src/hooks";
import {
    clearCurrentDetail,
    clearLastScore,
    fetchAssessmentDetail,
    submitAssessment,
} from "@/src/store/slices/assessmentSlice";
import { borderRadius, colors, fontSizes, spacing } from "@/src/theme";
import type {
    AssessmentType,
    MbiScoreResponse,
    ScaleOption,
    SimpleScoreResponse,
} from "@/src/types";
import { stripMarkdown } from "@/src/utils/text";

// ---------------------------------------------------------------------------
// Option button (single-select radio look)
// ---------------------------------------------------------------------------
const OptionButton = ({
  option,
  selected,
  onPress,
}: {
  option: ScaleOption;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.optionButton, selected && styles.optionButtonSelected]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <View style={[styles.optionRadio, selected && styles.optionRadioSelected]}>
      {selected ? <View style={styles.optionRadioDot} /> : null}
    </View>
    <Text
      style={[styles.optionText, selected && styles.optionTextSelected]}
      numberOfLines={3}
    >
      {option.label}
    </Text>
  </TouchableOpacity>
);

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function AssessmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const {
    currentDetail,
    detailLoading,
    detailError,
    submitting,
    submitError,
    lastScore,
  } = useAppSelector((s) => s.assessment);

  // -1 = écran d'instructions ; 0..n-1 = questions ; lastScore présent = résultat.
  const [step, setStep] = useState<number>(-1);
  const [answers, setAnswers] = useState<number[]>([]);

  // ---- Lifecycle ----
  useEffect(() => {
    if (!id) return;
    dispatch(clearLastScore());
    dispatch(fetchAssessmentDetail(id));
    return () => {
      dispatch(clearCurrentDetail());
      dispatch(clearLastScore());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Initialise le tableau de réponses dès que le détail est chargé.
  useEffect(() => {
    if (currentDetail) {
      setAnswers(new Array(currentDetail.questions.length).fill(-1));
      setStep(-1);
    }
  }, [currentDetail]);

  const totalQuestions = currentDetail?.questions.length ?? 0;
  const currentQuestion =
    step >= 0 && step < totalQuestions ? currentDetail!.questions[step] : null;

  const currentScale: ScaleOption[] = useMemo(() => {
    if (!currentQuestion || !currentDetail) return [];
    return currentQuestion.scale ?? currentDetail.scale ?? [];
  }, [currentQuestion, currentDetail]);

  const progress = totalQuestions > 0 ? (step + 1) / totalQuestions : 0;

  // ---- Handlers ----
  const handleSelect = (value: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[step] = value;
      return next;
    });
  };

  const handleNext = () => {
    if (step < totalQuestions - 1) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (step > 0) setStep(step - 1);
    else setStep(-1);
  };

  const handleSubmit = async () => {
    if (!id || submitting) return;
    await dispatch(submitAssessment({ id: id as AssessmentType, answers }));
  };

  const handleRetake = () => {
    dispatch(clearLastScore());
    setAnswers(new Array(totalQuestions).fill(-1));
    setStep(-1);
  };

  // ---- Render: loading / error / result / intro / question ----

  if (detailLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (detailError && !currentDetail) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline" size={40} color={colors.error} />
          <Text style={styles.errorTitle}>{t("common.errorTitle")}</Text>
          <Text style={styles.errorText}>{detailError}</Text>
          <Button
            mode="contained"
            icon="refresh"
            onPress={() => id && dispatch(fetchAssessmentDetail(id))}
            style={styles.retryBtn}
          >
            {t("common.retry")}
          </Button>
          <Button onPress={() => router.back()} style={{ marginTop: 8 }}>
            {t("common.back")}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentDetail) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ---- Result screen ----
  if (lastScore) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <IconButton
            icon="close"
            size={24}
            onPress={() => router.back()}
            style={styles.closeBtn}
          />
          <Text style={styles.headerTitle}>{currentDetail.title}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.resultScroll}>
          {lastScore.id === "mbi" ? (
            <MbiResult result={lastScore as MbiScoreResponse} />
          ) : (
            <SimpleResult result={lastScore as SimpleScoreResponse} />
          )}

          <View style={{ height: spacing.lg }} />
          <Button
            mode="outlined"
            icon="refresh"
            onPress={handleRetake}
            style={styles.resultBtn}
          >
            {t("assessments.redo")}
          </Button>
          <Button
            mode="contained"
            onPress={() => router.back()}
            style={[styles.resultBtn, { marginTop: spacing.sm }]}
          >
            {t("common.done")}
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---- Intro (step === -1) ----
  if (step === -1) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => router.back()}
            style={styles.closeBtn}
          />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {currentDetail.title}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.introScroll}>
          {currentDetail.source ? (
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceBadgeText}>
                {`Source: ${currentDetail.source}`}
              </Text>
            </View>
          ) : null}
          <Text style={styles.introTitle}>{currentDetail.title}</Text>
          <Surface style={styles.introCard} elevation={1}>
            <Text style={styles.introText}>
              {stripMarkdown(currentDetail.instructions || "")}
            </Text>
          </Surface>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons
                name="help-circle-outline"
                size={18}
                color={colors.textSecondary}
              />
              <Text style={styles.metaText}>
                {t("assessments.questionsCount", {
                  count: currentDetail.questions.length,
                })}
              </Text>
            </View>
          </View>

          <Button
            mode="contained"
            icon="play"
            onPress={() => setStep(0)}
            style={styles.startBtn}
          >
            {t("assessments.start")}
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---- Question screen ----
  const selectedValue = answers[step];
  const hasAnswer = selectedValue !== undefined && selectedValue !== -1;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={handlePrevious}
          style={styles.closeBtn}
        />
        <Text style={styles.headerTitle}>
          {`${step + 1} / ${totalQuestions}`}
        </Text>
        <IconButton
          icon="close"
          size={24}
          onPress={() => router.back()}
          style={styles.closeBtn}
        />
      </View>

      <ProgressBar
        progress={progress}
        color={colors.primary}
        style={styles.progress}
      />

      <ScrollView contentContainerStyle={styles.questionScroll}>
        <Text style={styles.questionText}>
          {stripMarkdown(
            (currentQuestion as any)?.prompt ??
              (currentQuestion as any)?.text ??
              (typeof currentQuestion === "string" ? currentQuestion : ""),
          )}
        </Text>
        <View style={styles.optionsContainer}>
          {currentScale.map((option) => (
            <OptionButton
              key={option.value}
              option={option}
              selected={selectedValue === option.value}
              onPress={() => handleSelect(option.value)}
            />
          ))}
        </View>

        {submitError ? (
          <View style={styles.submitErrorBox}>
            <Text style={styles.submitErrorText}>{submitError}</Text>
            <Button
              mode="contained"
              icon="refresh"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
              style={{ marginTop: spacing.sm, borderRadius: 16 }}
            >
              {t("common.retry")}
            </Button>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleNext}
          disabled={!hasAnswer || submitting}
          loading={submitting && step === totalQuestions - 1}
          style={styles.nextBtn}
        >
          {step === totalQuestions - 1
            ? t("assessments.finish")
            : t("common.next")}
        </Button>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Result components
// ---------------------------------------------------------------------------
const SimpleResult = ({ result }: { result: SimpleScoreResponse }) => {
  const accent = result.band?.color || colors.primary;
  return (
    <Surface style={styles.scoreCard} elevation={2}>
      <Text style={styles.scoreLabel}>Score</Text>
      <Text style={styles.scoreValue}>
        {result.score}
        {typeof result.max === "number" ? (
          <Text style={styles.scoreMax}>{` / ${result.max}`}</Text>
        ) : null}
      </Text>
      {result.band ? (
        <>
          <View style={[styles.bandBadge, { backgroundColor: accent + "22" }]}>
            <Text style={[styles.bandBadgeText, { color: accent }]}>
              {result.band.label}
            </Text>
          </View>
          <Text style={styles.bandMessage}>{result.band.message}</Text>
        </>
      ) : null}
    </Surface>
  );
};

const MBI_LABELS: Record<keyof MbiScoreResponse["dimensions"], string> = {
  emotionalExhaustion: "Épuisement émotionnel",
  depersonalization: "Dépersonnalisation",
  personalAccomplishment: "Accomplissement personnel",
};

const RISK_COLOR: Record<MbiScoreResponse["burnoutRisk"], string> = {
  low: colors.success,
  moderate: colors.warning,
  high: colors.error,
};
const RISK_LABEL: Record<MbiScoreResponse["burnoutRisk"], string> = {
  low: "faible",
  moderate: "modéré",
  high: "élevé",
};

const MbiResult = ({ result }: { result: MbiScoreResponse }) => {
  const dims = Object.keys(MBI_LABELS) as (keyof typeof MBI_LABELS)[];
  const riskColor = RISK_COLOR[result.burnoutRisk];
  return (
    <View>
      {dims.map((key) => {
        const band = result.bands[key];
        const accent = band?.color || colors.primary;
        return (
          <Surface key={key} style={styles.mbiCard} elevation={1}>
            <Text style={styles.mbiCardTitle}>{MBI_LABELS[key]}</Text>
            <View style={styles.mbiCardRow}>
              <Text style={styles.mbiCardScore}>{result.dimensions[key]}</Text>
              {band ? (
                <View
                  style={[styles.bandChip, { backgroundColor: accent + "22" }]}
                >
                  <Text style={[styles.bandChipText, { color: accent }]}>
                    {band.label}
                  </Text>
                </View>
              ) : null}
            </View>
            {band?.message ? (
              <Text style={styles.mbiCardMessage}>{band.message}</Text>
            ) : null}
          </Surface>
        );
      })}

      <View
        style={[
          styles.riskBanner,
          { backgroundColor: riskColor + "22", borderColor: riskColor },
        ]}
      >
        <Ionicons name="alert-circle" size={20} color={riskColor} />
        <Text style={[styles.riskBannerText, { color: riskColor }]}>
          {`Risque de burn-out : ${RISK_LABEL[result.burnoutRisk]}`}
        </Text>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: fontSizes.md,
    fontWeight: "600",
    color: colors.text,
  },
  closeBtn: { margin: 0 },
  progress: { height: 4, marginHorizontal: spacing.lg },

  // Intro
  introScroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  sourceBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#EEF1F7",
    borderRadius: 999,
    marginBottom: spacing.md,
  },
  sourceBadgeText: { fontSize: 12, color: "#5A6376", fontWeight: "600" },
  introTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
    letterSpacing: -0.4,
  },
  introCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  introText: {
    fontSize: fontSizes.md,
    color: colors.text,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: "row",
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  metaItem: { flexDirection: "row", alignItems: "center" },
  metaText: {
    marginLeft: 6,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  startBtn: { borderRadius: 16, paddingVertical: 4 },

  // Errors
  errorTitle: {
    marginTop: spacing.md,
    fontSize: fontSizes.lg,
    fontWeight: "600",
    color: colors.text,
  },
  errorText: {
    marginTop: 4,
    color: colors.textSecondary,
    textAlign: "center",
  },
  retryBtn: { marginTop: spacing.lg, borderRadius: 16 },

  // Question
  questionScroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  questionText: {
    fontSize: fontSizes.lg,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.lg,
    lineHeight: 26,
  },
  optionsContainer: { gap: spacing.sm },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#E6E8EE",
  },
  optionButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#C7CCD6",
    marginRight: spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  optionRadioSelected: { borderColor: colors.primary },
  optionRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  optionText: { flex: 1, fontSize: fontSizes.md, color: colors.text },
  optionTextSelected: { color: colors.primary, fontWeight: "600" },

  submitErrorBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.error + "12",
  },
  submitErrorText: { color: colors.error, fontSize: fontSizes.sm },

  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#EEF0F4",
    backgroundColor: colors.surface,
  },
  nextBtn: { borderRadius: 16, paddingVertical: 4 },

  // Result
  resultScroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  scoreCard: {
    padding: spacing.xl,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -1,
    marginVertical: spacing.sm,
  },
  scoreMax: {
    fontSize: 22,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  bandBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: spacing.sm,
  },
  bandBadgeText: { fontSize: fontSizes.md, fontWeight: "700" },
  bandMessage: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    color: colors.text,
    textAlign: "center",
    lineHeight: 22,
  },

  mbiCard: {
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  mbiCardTitle: {
    fontSize: fontSizes.md,
    fontWeight: "600",
    color: colors.text,
  },
  mbiCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  mbiCardScore: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.5,
  },
  bandChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  bandChipText: { fontSize: fontSizes.sm, fontWeight: "700" },
  mbiCardMessage: {
    marginTop: spacing.sm,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  riskBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  riskBannerText: {
    marginLeft: 8,
    fontSize: fontSizes.md,
    fontWeight: "700",
  },

  resultBtn: { borderRadius: 16, paddingVertical: 4 },
});
