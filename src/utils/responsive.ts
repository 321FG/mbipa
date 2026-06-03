import { Platform, StyleSheet } from "react-native";

/**
 * Web responsiveness: on desktop browsers the app is rendered full-width which
 * looks awkward for a mobile-first design. Cap the content at a phone-like
 * width and center it. On native (iOS/Android) these styles are no-ops.
 */
export const WEB_MAX_CONTENT_WIDTH = 560;

export const webContentStyle =
  Platform.OS === "web"
    ? ({
        maxWidth: WEB_MAX_CONTENT_WIDTH,
        width: "100%",
        marginHorizontal: "auto",
        alignSelf: "center",
      } as const)
    : ({} as const);

export const webContentStyleSheet = StyleSheet.create({
  inner: webContentStyle as any,
});
