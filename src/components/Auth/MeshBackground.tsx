/**
 * MeshBackground — soft animated aurora-like backdrop made of overlapping
 * radial-style gradient blobs. Pure JS (no native dep) using reanimated v4.
 */
import { getThemeMode } from "@/src/theme";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

const { width: W, height: H } = Dimensions.get("window");

type BlobProps = {
  colors: readonly [string, string, ...string[]];
  size: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  delay?: number;
  duration?: number;
  driftX?: number;
  driftY?: number;
};

function Blob({
  colors,
  size,
  top,
  left,
  right,
  bottom,
  delay = 0,
  duration = 9000,
  driftX = 30,
  driftY = 20,
}: BlobProps) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [t, duration]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: (t.value - 0.5) * driftX * 2 },
      { translateY: (t.value - 0.5) * driftY * 2 },
      { scale: 1 + t.value * 0.08 },
    ],
    opacity: 0.55 + t.value * 0.25,
  }));

  return (
    <Animated.View
      style={[
        styles.blob,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          top,
          left,
          right,
          bottom,
        },
        style,
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

export function MeshBackground() {
  const isDark = getThemeMode() === "dark";
  const baseColors = isDark
    ? ["#090B10", "#11151F", "#121622"]
    : ["#F4EEFF", "#EAF2FF", "#F0FFF7"];
  const veilColor = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(255,255,255,0.18)";

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Soft base */}
      <LinearGradient
        colors={baseColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Aurora blobs */}
      <Blob
        colors={["#C4B5FD", "#8B7CFF"] as const}
        size={W * 0.95}
        top={-W * 0.35}
        left={-W * 0.25}
        duration={11000}
        driftX={40}
        driftY={30}
      />
      <Blob
        colors={["#7DD3FC", "#A5B4FC"] as const}
        size={W * 0.85}
        top={H * 0.18}
        right={-W * 0.35}
        duration={13000}
        driftX={50}
        driftY={40}
      />
      <Blob
        colors={["#FBCFE8", "#C4B5FD"] as const}
        size={W * 0.75}
        bottom={-W * 0.2}
        left={-W * 0.15}
        duration={15000}
        driftX={30}
        driftY={45}
      />
      <Blob
        colors={["#A7F3D0", "#7DD3FC"] as const}
        size={W * 0.6}
        bottom={H * 0.12}
        right={-W * 0.2}
        duration={17000}
        driftX={35}
        driftY={25}
      />

      {/* Soft veil to keep contrast on text */}
      <View
        style={[styles.veil, { backgroundColor: veilColor }]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
    overflow: "hidden",
  },
  veil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
});

export default MeshBackground;
