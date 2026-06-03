/**
 * +not-found — 404 route.
 *
 * Expo Router renders this screen automatically for any unmatched path.
 * Reuses the shared ErrorView for a friendly, on-brand 404 experience.
 */
import { Stack, useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { SafeAreaView, StyleSheet } from "react-native";

import { ErrorView } from "@/src/components/Common/ErrorView";
import { colors } from "@/src/theme/theme";

export default function NotFoundScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const showBack = router.canGoBack();

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false, title: "404" }} />
      <ErrorView
        iconName="help-circle-outline"
        title={t("error.notFound.title")}
        message={t("error.notFound.description")}
        detail="404"
        primaryLabel={t("error.backHome")}
        onPrimary={() => router.replace("/(tabs)")}
        secondaryLabel={showBack ? t("common.back") : undefined}
        onSecondary={showBack ? () => router.back() : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
