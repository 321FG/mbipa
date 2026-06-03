import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/src/components/Common/HapticTab";
import { useAppSelector } from "@/src/hooks";
import { colors } from "@/src/theme";

/**
 * Renders the tab icon with a soft luminous dot above when focused —
 * a subtle "active" cue without the heavy background pill.
 */
function TabIcon({
  name,
  color,
  size,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
  focused: boolean;
}) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: 4,
          height: 4,
          borderRadius: 2,
          marginBottom: 3,
          backgroundColor: focused ? colors.primary : "transparent",
          shadowColor: colors.primary,
          shadowOpacity: focused ? 0.8 : 0,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Redirect to auth if not authenticated
  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === "android" ? 8 : 0,
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingTop: 8,
          paddingBottom: bottomInset,
          height: 60 + bottomInset,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="home" size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t("tabs.chat"),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name="chatbubbles"
              size={size}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="assessments"
        options={{
          title: t("tabs.assessments"),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name="clipboard"
              size={size}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="music"
        options={{
          title: t("tabs.music"),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name="musical-notes"
              size={size}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name="person"
              size={size}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
