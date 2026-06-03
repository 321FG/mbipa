/**
 * OnboardingSlide — premium slide with framed image, serif title and quote
 * sitting on top of the shared mesh aurora background.
 */
import React, { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    Image,
    ImageSourcePropType,
    Platform,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { borderRadius, colors, fontSizes, spacing } from "@/src/theme";

const { width } = Dimensions.get("window");

type Props = {
  image: ImageSourcePropType;
  title: string;
  quote: string;
  active?: boolean;
};

export function OnboardingSlide({ image, title, quote, active = true }: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(24)).current;
  const scale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    if (active) {
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(translate, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fade.setValue(0);
      translate.setValue(24);
      scale.setValue(0.94);
    }
  }, [active, fade, translate, scale]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.imageOuter, { opacity: fade, transform: [{ scale }] }]}
      >
        <View style={styles.imageWrap}>
          <Image source={image} style={styles.image} resizeMode="cover" />
          {/* Top highlight + bottom dim for a polished framed look */}
          <View style={styles.imageHighlight} pointerEvents="none" />
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.textWrap,
          { opacity: fade, transform: [{ translateY: translate }] },
        ]}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.quote}>{quote}</Text>
      </Animated.View>
    </View>
  );
}

const IMAGE_SIZE = Math.min(width - spacing.lg * 2, 340);

const styles = StyleSheet.create({
  container: {
    width,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  imageOuter: {
    borderRadius: borderRadius.xl,
    shadowColor: "#6B4EFF",
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.28,
    shadowRadius: 36,
    elevation: 16,
    marginBottom: spacing.xl,
  },
  imageWrap: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  textWrap: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontSize: fontSizes.xxxl,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  quote: {
    fontSize: fontSizes.lg,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 26,
    paddingHorizontal: spacing.md,
    letterSpacing: 0.2,
  },
});

export default OnboardingSlide;
