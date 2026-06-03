import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      pressOpacity={0.6}
      android_ripple={{ color: "rgba(107, 78, 255, 0.12)", borderless: true }}
      hitSlop={8}
      delayLongPress={500}
      onPressIn={(ev) => {
        if (Platform.OS === "ios" || Platform.OS === "android") {
          Haptics.selectionAsync().catch(() => {});
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
