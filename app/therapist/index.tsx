/**
 * Demande de rendez-vous — formulaire simple qui envoie un email
 * pré-rempli vers le support, puis affiche un état de confirmation.
 *
 * Pas d'API ni de mocks de psychologues : la prise de RDV est manuelle
 * pour le moment, l'équipe rappelle ensuite par email.
 */
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, Stack } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { Button, Surface, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppSelector } from "@/src/hooks";
import {
    APPOINTMENT_FORMATS,
    APPOINTMENT_PERIODS,
    APPOINTMENT_REASONS,
    FORM_ENDPOINTS,
    formFeedback,
    submitForm,
} from "@/src/services/forms";
import { borderRadius, colors, fontSizes, spacing } from "@/src/theme";

const REASON_IDS = APPOINTMENT_REASONS;

const PERIOD_IDS = APPOINTMENT_PERIODS;

const FORMAT_IDS = APPOINTMENT_FORMATS;

export default function AppointmentRequestScreen() {
  const { t, i18n } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);

  const [name, setName] = useState(
    user ? `${user.prenom ?? ""} ${user.nom ?? ""}`.trim() : "",
  );
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [reason, setReason] = useState<(typeof REASON_IDS)[number] | null>(
    null,
  );
  const [format, setFormat] = useState<(typeof FORMAT_IDS)[number]>("video");
  const [date, setDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [period, setPeriod] = useState<(typeof PERIOD_IDS)[number]>("morning");
  const [notes, setNotes] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reasons = useMemo(
    () =>
      REASON_IDS.map((id) => ({
        id,
        label: t(`therapist.reasons.${id}`),
      })),
    [i18n.language, t],
  );

  const formats = useMemo(
    () =>
      FORMAT_IDS.map((id) => ({
        id,
        label: t(`therapist.formats.${id}`),
        icon: id === "video" ? "videocam" : id === "phone" ? "call" : "person",
      })),
    [i18n.language, t],
  );

  const periods = useMemo(
    () =>
      PERIOD_IDS.map((id) => ({
        id,
        label: t(`therapist.periods.${id}`),
      })),
    [i18n.language, t],
  );

  const isValid = useMemo(
    () =>
      name.trim().length > 1 &&
      (email.trim().length > 3 || phone.trim().length > 3) &&
      reason !== null,
    [name, email, phone, reason],
  );

  const locale = (i18n.language || "fr").slice(0, 2);
  const formatDateLong = (d: Date) =>
    d.toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const handleSubmit = async () => {
    if (!isValid) return;

    const locale = (i18n.language || "fr").slice(0, 2);

    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedNotes = notes.trim();

    const result = await submitForm(FORM_ENDPOINTS.APPOINTMENTS, {
      name: name.trim(),
      ...(trimmedEmail ? { email: trimmedEmail } : {}),
      ...(trimmedPhone ? { phone: trimmedPhone } : {}),
      reason,
      format,
      date: date.toISOString(),
      period,
      ...(trimmedNotes ? { notes: trimmedNotes } : {}),
      language: locale,
    });

    if (result.kind === "success") {
      setSubmitted(true);
      return;
    }

    const feedback = formFeedback(result, t);
    if (feedback) Alert.alert(feedback.title, feedback.message);
  };

  // continue to render form below

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    headerTitle: {
      fontSize: fontSizes.lg,
      fontWeight: "700",
      color: colors.text,
    },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    lead: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
      lineHeight: 20,
    },
    section: { marginBottom: spacing.xl },
    sectionTitle: {
      fontSize: fontSizes.sm,
      fontWeight: "600",
      color: colors.text,
      marginBottom: spacing.sm,
      letterSpacing: 0.2,
    },
    field: {
      backgroundColor: colors.surface,
      marginBottom: spacing.sm,
    },
    outline: {
      borderColor: colors.border,
    },
    chipsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    chip: {
      backgroundColor: colors.surface,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      color: colors.text,
      fontSize: fontSizes.sm,
      fontWeight: "600",
    },
    chipTextSelected: {
      color: colors.textOnPrimary,
    },
    formatRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    formatCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      alignItems: "center",
      justifyContent: "center",
    },
    formatCardSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    formatText: {
      marginTop: spacing.xs,
      color: colors.textSecondary,
      fontSize: fontSizes.sm,
      fontWeight: "600",
    },
    formatTextSelected: {
      color: colors.textOnPrimary,
    },
    dateRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dateText: {
      flex: 1,
      marginHorizontal: spacing.sm,
      color: colors.text,
      fontSize: fontSizes.md,
    },
    infoCard: {
      flexDirection: "row",
      gap: spacing.sm,
      alignItems: "center",
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      marginVertical: spacing.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoText: {
      color: colors.textSecondary,
      fontSize: fontSizes.sm,
      lineHeight: 20,
      flex: 1,
    },
    submitBtn: {
      marginTop: spacing.md,
      borderRadius: borderRadius.lg,
    },
    smallNote: {
      marginTop: spacing.sm,
      color: colors.textSecondary,
      fontSize: fontSizes.xs,
      lineHeight: 18,
    },
    confirmWrap: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.lg,
    },
    confirmIcon: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.lg,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.22,
      shadowRadius: 18,
      elevation: 10,
    },
    confirmTitle: {
      fontSize: fontSizes.xxl,
      fontWeight: "800",
      color: colors.text,
      marginBottom: spacing.sm,
      textAlign: "center",
    },
    confirmText: {
      fontSize: fontSizes.md,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: spacing.lg,
    },
    confirmBtn: {
      width: "100%",
      borderRadius: borderRadius.lg,
      marginBottom: spacing.sm,
    },
  });

  // ---------- Confirmation screen ----------
  if (submitted) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.confirmWrap}>
          <View style={styles.confirmIcon}>
            <Ionicons name="checkmark" size={40} color="#fff" />
          </View>
          <Text style={styles.confirmTitle}>Demande envoyée</Text>
          <Text style={styles.confirmText}>
            Un membre de l'équipe Mbipa vous recontactera par email sous 24–48h
            pour confirmer votre rendez-vous.
          </Text>
          <Text style={[styles.confirmText, { marginTop: -spacing.sm }]}>
            {t("therapist.priceNote")}
          </Text>
          <Button
            mode="contained"
            onPress={() => router.back()}
            style={styles.confirmBtn}
          >
            Retour
          </Button>
          <Button
            mode="text"
            onPress={() => {
              setSubmitted(false);
            }}
          >
            Faire une nouvelle demande
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // ---------- Form ----------
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("therapist.title")}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>{t("therapist.subtitle")}</Text>

        {/* Identité */}
        <Section title={t("therapist.fields.identity")}>
          <TextInput
            label={t("therapist.fields.fullName")}
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.field}
            outlineStyle={styles.outline}
          />
          <TextInput
            label={t("therapist.fields.email")}
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.field}
            outlineStyle={styles.outline}
          />
          <TextInput
            label={t("therapist.fields.phoneOptional")}
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.field}
            outlineStyle={styles.outline}
          />
        </Section>

        {/* Motif */}
        <Section title={t("therapist.fields.reason")}>
          <View style={styles.chipsWrap}>
            {reasons.map((r) => {
              const selected = reason === r.id;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => setReason(r.id)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selected && styles.chipTextSelected,
                    ]}
                  >
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {/* Format */}
        <Section title={t("therapist.fields.format")}>
          <View style={styles.formatRow}>
            {formats.map((f) => {
              const selected = format === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setFormat(f.id)}
                  style={[
                    styles.formatCard,
                    selected && styles.formatCardSelected,
                  ]}
                >
                  <Ionicons
                    name={f.icon as any}
                    size={22}
                    color={selected ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.formatText,
                      selected && styles.formatTextSelected,
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {/* Date */}
        <Section title={t("therapist.fields.date")}>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={styles.dateRow}
          >
            <Ionicons
              name="calendar-outline"
              size={20}
              color={colors.textSecondary}
            />
            <Text style={styles.dateText}>{formatDateLong(date)}</Text>
            <Ionicons
              name="chevron-down"
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              minimumDate={new Date()}
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={(_, selectedDate) => {
                if (Platform.OS !== "ios") setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}

          <View style={[styles.chipsWrap, { marginTop: spacing.md }]}>
            {periods.map((p) => {
              const selected = period === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setPeriod(p.id)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selected && styles.chipTextSelected,
                    ]}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {/* Notes */}
        <Section title={t("therapist.fields.notes")}>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            multiline
            numberOfLines={4}
            placeholder={t("therapist.fields.notesPlaceholder")}
            style={[styles.field, { minHeight: 110 }]}
            outlineStyle={styles.outline}
          />
        </Section>

        <Surface style={styles.infoCard} elevation={0}>
          <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
          <Text style={styles.infoText}>{t("therapist.confidentialInfo")}</Text>
        </Surface>

        <Surface style={styles.infoCard} elevation={0}>
          <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
          <Text style={styles.infoText}>{t("therapist.priceNote")}</Text>
        </Surface>

        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!isValid}
          style={styles.submitBtn}
          contentStyle={{ paddingVertical: 6 }}
          icon="send"
        >
          {t("therapist.sendRequest")}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: "700",
    color: colors.text,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  lead: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
    letterSpacing: 0.2,
  },
  field: { backgroundColor: colors.surface, marginBottom: spacing.sm },
  outline: { borderRadius: borderRadius.md },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#E6E8EE",
  },
  chipSelected: {
    backgroundColor: colors.primary + "18",
    borderColor: colors.primary,
  },
  chipText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  chipTextSelected: { color: colors.primary, fontWeight: "600" },

  formatRow: { flexDirection: "row", gap: 10 },
  formatCard: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E6E8EE",
    gap: 6,
  },
  formatCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  formatText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  formatTextSelected: { color: colors.primary, fontWeight: "600" },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "#E6E8EE",
  },
  dateText: { flex: 1, fontSize: fontSizes.md, color: colors.text },

  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + "0E",
    marginBottom: spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  submitBtn: { borderRadius: 16 },
  smallNote: {
    marginTop: spacing.sm,
    fontSize: 11,
    color: colors.textLight,
    textAlign: "center",
  },

  // Confirmation
  confirmWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  confirmIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  confirmText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  confirmBtn: { borderRadius: 16, minWidth: 180, marginBottom: spacing.sm },
});
