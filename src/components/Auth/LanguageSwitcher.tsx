import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
    changeLanguage,
    getCurrentLanguage,
    type SupportedLanguage,
} from "@/src/i18n";
import { borderRadius, colors, fontSizes, spacing } from "@/src/theme";

const LANGS: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: "fr", label: "FR", flag: "🇫🇷" },
  { code: "en", label: "EN", flag: "🇬🇧" },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = (i18n.language?.slice(0, 2) ||
    getCurrentLanguage()) as SupportedLanguage;

  const onPick = (lang: SupportedLanguage) => {
    if (lang === current) return;
    void changeLanguage(lang);
  };

  return (
    <View style={styles.row}>
      <Ionicons
        name="globe-outline"
        size={14}
        color={colors.textSecondary}
        style={{ marginRight: 6 }}
      />
      {LANGS.map(({ code, label, flag }, idx) => {
        const active = current === code;
        return (
          <View key={code} style={styles.itemWrap}>
            <Pressable
              onPress={() => onPick(code)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Language ${label}`}
            >
              <Text style={[styles.label, active && styles.labelActive]}>
                {flag} {label}
              </Text>
            </Pressable>
            {idx < LANGS.length - 1 && <Text style={styles.sep}>|</Text>}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceVariant + "EE",
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontSize: fontSizes.xs,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: "800",
  },
  sep: {
    color: colors.textLight,
    fontSize: fontSizes.xs,
    marginHorizontal: 1,
  },
});

export default LanguageSwitcher;
