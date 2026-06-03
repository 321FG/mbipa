/**
 * Onboarding Screen — premium 2-slide intro over the shared mesh aurora.
 * Same vibe as login/register: serif titles, glass surfaces, gradient CTA.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Dimensions,
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Animated, {
    Easing,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import { LanguageSwitcher } from "@/src/components/Auth/LanguageSwitcher";
import { MeshBackground } from "@/src/components/Auth/MeshBackground";
import { OnboardingSlide } from "@/src/components/Auth/OnboardingSlide";
import { PrimaryButton } from "@/src/components/Auth/PrimaryButton";
import { borderRadius, colors, fontSizes, spacing } from "@/src/theme";

const { width } = Dimensions.get("window");

const SLIDE_IMAGES = [
  require("@/assets/images/page1.jpg"),
  require("@/assets/images/page2.jpg"),
];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const SLIDES = useMemo(
    () => [
      {
        id: "1",
        image: SLIDE_IMAGES[0],
        title: t("onboarding.slide1.title"),
        quote: t("onboarding.slide1.quote"),
      },
      {
        id: "2",
        image: SLIDE_IMAGES[1],
        title: t("onboarding.slide2.title"),
        quote: t("onboarding.slide2.quote"),
      },
    ],
    [t],
  );

  // Subtle pulse on the active dot to add liveliness
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [pulse]);
  const dotPulse = useAnimatedStyle(() => ({
    opacity: 0.7 + pulse.value * 0.3,
  }));

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(i);
  };

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem("mbipa.hasSeenOnboarding", "1");
    } catch {
      // non-fatal
    }
    router.replace("/(auth)/login");
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
      setIndex(index + 1);
    } else {
      finishOnboarding();
    }
  };

  const skip = () => finishOnboarding();

  return (
    <View style={styles.root}>
      <MeshBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.View
          entering={FadeInDown.duration(500).delay(80)}
          style={[
            styles.topBar,
            { paddingTop: insets.top > 0 ? 0 : spacing.sm },
          ]}
        >
          <LanguageSwitcher />
          <Pressable onPress={skip} hitSlop={12} style={styles.skipBtn}>
            <Text style={styles.skipText}>{t("common.skip")}</Text>
          </Pressable>
        </Animated.View>

        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          renderItem={({ item, index: i }) => (
            <OnboardingSlide
              image={item.image}
              title={item.title}
              quote={item.quote}
              active={i === index}
            />
          )}
        />

        <Animated.View
          entering={FadeInDown.duration(600).delay(220)}
          style={styles.bottom}
        >
          <View style={styles.dots}>
            {SLIDES.map((_, i) => {
              const active = i === index;
              if (active) {
                return (
                  <Animated.View
                    key={i}
                    style={[styles.dotActiveWrap, dotPulse]}
                  >
                    <LinearGradient
                      colors={["#7C3AED", "#5B8DEF"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </Animated.View>
                );
              }
              return <View key={i} style={styles.dot} />;
            })}
          </View>

          <PrimaryButton
            label={
              index === SLIDES.length - 1
                ? t("common.start")
                : t("common.continue")
            }
            onPress={next}
            style={styles.cta}
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  skipBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  bottom: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(107,78,255,0.25)",
  },
  dotActiveWrap: {
    width: 28,
    height: 8,
    borderRadius: borderRadius.full,
    overflow: "hidden",
    shadowColor: "#6B4EFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  cta: {
    width: "100%",
  },
});
