/**
 * PrimaryButton - Animated gradient with looping shimmer + colored glow
 */
import { borderRadius, colors, fontSizes, spacing } from "@/src/theme";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
    ActivityIndicator,
    Animated,
    Easing,
    Pressable,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from "react-native";

type Props = {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  variant?: "primary" | "soft";
};

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  style,
  variant = "primary",
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const shimmer = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    if (variant !== "primary" || disabled || loading) return;
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 2400,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer, variant, disabled, loading]);

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
    }).start();
  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();

  const gradient =
    variant === "primary"
      ? (["#7C3AED", "#6B4EFF", "#5B8DEF"] as const)
      : ([colors.surface, colors.surfaceVariant] as const);

  const textColor =
    variant === "primary" ? colors.textOnPrimary : colors.primary;

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [-1, 1],
    outputRange: [-220, 320],
  });

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled || loading}
      >
        <View
          style={[
            styles.shadowWrap,
            (disabled || loading) && { shadowOpacity: 0.1 },
          ]}
        >
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.button, (disabled || loading) && styles.disabled]}
          >
            {variant === "primary" && !disabled && !loading && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.shimmer,
                  {
                    transform: [
                      { translateX: shimmerTranslate },
                      { rotate: "20deg" },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    "rgba(255,255,255,0)",
                    "rgba(255,255,255,0.35)",
                    "rgba(255,255,255,0)",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            )}
            {loading ? (
              <ActivityIndicator color={textColor} />
            ) : (
              <Text style={[styles.label, { color: textColor }]}>{label}</Text>
            )}
          </LinearGradient>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: borderRadius.lg,
    shadowColor: "#6B4EFF",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 10,
  },
  button: {
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    overflow: "hidden",
  },
  shimmer: {
    position: "absolute",
    top: -20,
    bottom: -20,
    width: 80,
  },
  label: {
    fontSize: fontSizes.lg,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  disabled: {
    opacity: 0.6,
  },
});

export default PrimaryButton;
