/**
 * MbipaAvatar — animated avatar that pulses when the AI is speaking.
 *
 * Renders a gradient disc with a sparkle icon (no external PNG asset) so it
 * displays clearly at any size. Two animated rings pulse outward when
 * `speaking` is true. Subscribes to the speech service so it syncs
 * automatically with TTS playback.
 */
import { onSpeakingChange } from "@/src/services/speech";
import { colors } from "@/src/theme";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View, ViewStyle } from "react-native";
import { AnimatedFace } from "./AnimatedFace";

interface MbipaAvatarProps {
  size?: number;
  /** If provided, overrides the auto-subscription to the speech service. */
  speaking?: boolean;
  style?: ViewStyle;
  /**
   * When false, disables the pulse rings + face blink loop. Use for
   * static thumbnails so we don't burn JS frames on background animation.
   */
  animated?: boolean;
}

export function MbipaAvatar({
  size = 120,
  speaking,
  style,
  animated = true,
}: MbipaAvatarProps) {
  const [autoSpeaking, setAutoSpeaking] = useState(false);
  const isSpeaking = animated ? (speaking ?? autoSpeaking) : false;

  const ring1 = useRef(new Animated.Value(1)).current;
  const ring2 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0)).current;
  const opacity2 = useRef(new Animated.Value(0)).current;

  // Auto-subscribe to global speech state if `speaking` not passed
  useEffect(() => {
    if (!animated) return;
    if (speaking !== undefined) return;
    return onSpeakingChange(setAutoSpeaking);
  }, [speaking, animated]);

  // Pulse animation
  useEffect(() => {
    if (!animated) return;
    if (!isSpeaking) {
      ring1.stopAnimation();
      ring2.stopAnimation();
      Animated.parallel([
        Animated.timing(ring1, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(ring2, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity1, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity2, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    const makePulse = (
      scale: Animated.Value,
      opacity: Animated.Value,
      delay: number,
    ) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 1.6,
              duration: 1400,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(opacity, {
                toValue: 0.5,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(opacity, {
                toValue: 0,
                duration: 1200,
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.timing(scale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );

    const a1 = makePulse(ring1, opacity1, 0);
    const a2 = makePulse(ring2, opacity2, 700);
    a1.start();
    a2.start();
    return () => {
      a1.stop();
      a2.stop();
    };
  }, [isSpeaking, ring1, ring2, opacity1, opacity2]);

  const ringSize = size;
  const portraitSize = size * 0.85;

  return (
    <View
      style={[
        styles.container,
        { width: ringSize * 1.6, height: ringSize * 1.6 },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.ring,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            transform: [{ scale: ring1 }],
            opacity: opacity1,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            transform: [{ scale: ring2 }],
            opacity: opacity2,
          },
        ]}
      />
      <View
        style={[
          styles.portrait,
          {
            width: portraitSize,
            height: portraitSize,
            borderRadius: portraitSize / 2,
          },
        ]}
      >
        <AnimatedFace
          size={portraitSize}
          speaking={isSpeaking}
          animated={animated}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    backgroundColor: colors.primary,
  },
  portrait: {
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
