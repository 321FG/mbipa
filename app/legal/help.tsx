import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import { Surface, Text } from "react-native-paper";

import { LegalScreen } from "@/src/components/Common/LegalScreen";
import { borderRadius, colors, fontSizes, spacing } from "@/src/theme";

type FAQ = { q: string; a: string };

function FAQItem({ item }: { item: FAQ }) {
  const [open, setOpen] = useState(false);
  return (
    <Surface style={styles.card} elevation={1}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={styles.cardHeader}
        accessibilityRole="button"
      >
        <Text style={styles.question}>{item.q}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.textSecondary}
        />
      </Pressable>
      {open ? <Text style={styles.answer}>{item.a}</Text> : null}
    </Surface>
  );
}

export default function HelpScreen() {
  const { t } = useTranslation();
  const faqs =
    (t("legal.helpContent.faqs", { returnObjects: true }) as FAQ[]) || [];
  return (
    <LegalScreen
      title={t("legal.help")}
      intro={t("legal.helpContent.intro")}
      sections={[]}
      footer={
        <View>
          {faqs.map((f, i) => (
            <FAQItem key={i} item={f} />
          ))}

          <Pressable
            style={styles.contactCta}
            onPress={() => router.push("/legal/contact")}
          >
            <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
            <Text style={styles.contactCtaText}>
              {t("legal.helpContent.contactCta")}
            </Text>
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  question: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: "600",
    paddingRight: spacing.sm,
  },
  answer: {
    marginTop: spacing.sm,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  contactCta: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  contactCtaText: { color: "#fff", fontWeight: "600", fontSize: fontSizes.md },
});
