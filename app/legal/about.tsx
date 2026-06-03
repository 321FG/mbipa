import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";

import { LegalScreen } from "@/src/components/Common/LegalScreen";
import { borderRadius, colors, fontSizes, spacing } from "@/src/theme";

const APP_VERSION = "1.0.0";
const LOGO = require("../../assets/images/MbipaUpdatedTrim.png");

export default function AboutScreen() {
  const { t } = useTranslation();
  const sections =
    (t("legal.aboutContent.sections", {
      returnObjects: true,
    }) as { heading: string; body: string }[]) || [];
  return (
    <LegalScreen
      title={t("legal.about")}
      meta={`Version ${APP_VERSION}`}
      intro={t("legal.aboutContent.intro")}
      sections={sections}
      footer={
        <View style={styles.footer}>
          <Image source={LOGO} style={styles.logo} contentFit="contain" />
          <Text style={styles.tagline}>{t("legal.aboutContent.tagline")}</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => Linking.openURL("https://mbipa.app")}
            >
              <Ionicons name="globe-outline" size={18} color={colors.primary} />
              <Text style={styles.linkText}>mbipa.app</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => Linking.openURL("mailto:hello@mbipa.app")}
            >
              <Ionicons name="mail-outline" size={18} color={colors.primary} />
              <Text style={styles.linkText}>hello@mbipa.app</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.copyright}>
            {t("legal.aboutContent.copyright", {
              year: new Date().getFullYear(),
            })}
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  footer: { alignItems: "center", paddingTop: spacing.lg },
  logo: { width: 72, height: 72, marginBottom: spacing.sm },
  tagline: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary + "12",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  linkText: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: "600",
  },
  copyright: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    marginTop: spacing.sm,
  },
});
