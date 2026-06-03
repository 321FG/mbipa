/**
 * RecordingOverlay — visible feedback while the microphone is recording.
 *
 * Replaces the input row with a red "REC" pill, an elapsed timer, and an
 * animated waveform of bars that bounce in a wave pattern. Two action
 * buttons: cancel (X) on the left, send (check) on the right.
 */
import { borderRadius, colors, fontSizes, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

interface RecordingOverlayProps {
  onCancel: () => void;
  onStop: () => void;
}

const BAR_COUNT = 18;

export function RecordingOverlay({ onCancel, onStop }: RecordingOverlayProps) {
  const [seconds, setSeconds] = useState(0);
  const dot = useRef(new Animated.Value(1)).current;
  const bars = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.2)),
  ).current;

  // Elapsed timer
  useEffect(() => {
    const i = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(i);
  }, []);

  // Pulsing red dot
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dot, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(dot, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [dot]);

  // Waveform bars: random heights animated continuously
  useEffect(() => {
    const animations = bars.map((bar, idx) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(idx * 60),
          Animated.timing(bar, {
            toValue: 0.4 + Math.random() * 0.6,
            duration: 250 + Math.random() * 200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(bar, {
            toValue: 0.15 + Math.random() * 0.3,
            duration: 250 + Math.random() * 200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
        ]),
      ),
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [bars]);

  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");

  return (
    <View style={styles.container}>
      <Pressable onPress={onCancel} style={styles.cancelBtn} hitSlop={12}>
        <Ionicons name="close" size={22} color={colors.error} />
      </Pressable>

      <View style={styles.middle}>
        <View style={styles.recPill}>
          <Animated.View style={[styles.recDot, { opacity: dot }]} />
          <Text style={styles.recText}>REC</Text>
        </View>

        <View style={styles.waveform}>
          {bars.map((bar, i) => (
            <Animated.View
              key={i}
              style={[
                styles.bar,
                {
                  height: bar.interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, 28],
                  }),
                },
              ]}
            />
          ))}
        </View>

        <Text style={styles.timer}>
          {mm}:{ss}
        </Text>
      </View>

      <Pressable onPress={onStop} style={styles.sendBtn} hitSlop={12}>
        <Ionicons name="checkmark" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    minHeight: 60,
  },
  cancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.error + "15",
  },
  middle: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  recPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.error + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    marginRight: 6,
  },
  recText: {
    color: colors.error,
    fontSize: fontSizes.xs,
    fontWeight: "700",
    letterSpacing: 1,
  },
  waveform: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 32,
    marginHorizontal: spacing.sm,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  timer: {
    fontSize: fontSizes.sm,
    color: colors.text,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
});
