/**
 * /error — full-screen error route.
 *
 * Navigate with:
 *   router.push({
 *     pathname: "/error",
 *     params: { title, message, detail, back: "1" },
 *   });
 *
 * All params are optional. `back=1` shows a "Go back" secondary button.
 */
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";

import { ErrorView } from "@/src/components/Common/ErrorView";
import { colors } from "@/src/theme/theme";

export default function ErrorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    title?: string;
    message?: string;
    detail?: string;
    back?: string;
  }>();

  const showBack = params.back === "1" && router.canGoBack();

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ErrorView
        title={params.title}
        message={params.message}
        detail={params.detail}
        primaryLabel={showBack ? "Try again" : "OK"}
        onPrimary={() => {
          if (showBack) router.back();
          else router.replace("/(tabs)");
        }}
        secondaryLabel={showBack ? "Go to home" : undefined}
        onSecondary={showBack ? () => router.replace("/(tabs)") : undefined}
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
