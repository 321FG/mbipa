/**
 * MbipaPortrait — cinematic hero portrait.
 *
 * A deep "Aurora" gradient (night blue → electric violet) frames a large
 * circular portrait. While the TTS is speaking, two soft sound-wave rings
 * ripple outward and the portrait gently breathes. Floating glow orbs add
 * depth, mimicking a portrait-mode background. Supports a parallax effect
 * via the optional `scrollY` prop and a compact "in conversation" mode.
 */
import { onSpeakingChange } from "@/src/services/speech";
import { colors, fontSizes, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Animated,
    Dimensions,
    Easing,
    Image,
    ImageSourcePropType,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

const { height: SCREEN_H } = Dimensions.get("window");

interface MbipaPortraitProps {
  source?: ImageSourcePropType;
  /** Switches the default portrait + name when no `source` is provided. */
  companion?: "bagaza" | "yassingou";
  name?: string;
  subtitle?: string;
  /** Compact mode shows a small 56px circle instead of the full hero. */
  compact?: boolean;
  onToggleCompact?: () => void;
  /** Override auto-subscription to the speech service. */
  speaking?: boolean;
  /** Scroll offset to drive parallax (the avatar drifts slowly upward). */
  scrollY?: Animated.Value;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const BAGAZA_IMG: ImageSourcePropType = require("../../../assets/images/mbipa-coach.png");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YASSINGOU_IMG: ImageSourcePropType = require("../../../assets/images/mbipa-coach-female.png");

const HERO_H = Math.max(280, Math.min(360, Math.round(SCREEN_H * 0.36)));
const PORTRAIT = Math.round(HERO_H * 0.55);

export function MbipaPortrait({
  source,
  companion = "yassingou",
  name,
  subtitle,
  compact = false,
  onToggleCompact,
  speaking,
  scrollY,
}: MbipaPortraitProps) {
  const { t } = useTranslation();
  const resolvedSource: ImageSourcePropType =
    source ?? (companion === "bagaza" ? BAGAZA_IMG : YASSINGOU_IMG);
  const resolvedName =
    name ?? (companion === "bagaza" ? "Bagaza" : "Yassingou");
  const [autoSpeaking, setAutoSpeaking] = useState(false);
  const isSpeaking = speaking ?? autoSpeaking;

  const wave1 = useRef(new Animated.Value(1)).current;
  const wave2 = useRef(new Animated.Value(1)).current;
  const wave3 = useRef(new Animated.Value(1)).current;
  const waveOp1 = useRef(new Animated.Value(0)).current;
  const waveOp2 = useRef(new Animated.Value(0)).current;
  const waveOp3 = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(1)).current;
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (speaking !== undefined) return;
    return onSpeakingChange(setAutoSpeaking);
  }, [speaking]);

  // Ambient orb drift — always active for depth
  useEffect(() => {
    const drift = (v: Animated.Value, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration: dur,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration: dur,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
    const a = drift(orb1, 6500);
    const b = drift(orb2, 9000);
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [orb1, orb2]);

  // Sound waves while speaking
  useEffect(() => {
    if (!isSpeaking) {
      [wave1, wave2, wave3].forEach((v) => v.stopAnimation());
      breathe.stopAnimation();
      Animated.parallel([
        Animated.timing(wave1, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(wave2, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(wave3, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(waveOp1, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(waveOp2, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(waveOp3, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    const pulse = (scale: Animated.Value, op: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 1.55,
              duration: 1800,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(op, {
                toValue: 0.5,
                duration: 220,
                useNativeDriver: true,
              }),
              Animated.timing(op, {
                toValue: 0,
                duration: 1580,
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

    const breath = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1.04,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const a = pulse(wave1, waveOp1, 0);
    const b = pulse(wave2, waveOp2, 600);
    const c = pulse(wave3, waveOp3, 1200);
    a.start();
    b.start();
    c.start();
    breath.start();
    return () => {
      a.stop();
      b.stop();
      c.stop();
      breath.stop();
    };
  }, [isSpeaking, wave1, wave2, wave3, waveOp1, waveOp2, waveOp3, breathe]);

  const status =
    subtitle ??
    (isSpeaking ? t("chat.status.speaking") : t("chat.status.online"));

  // Compact strip — shown when keyboard is open
  if (compact) {
    return (
      <Pressable onPress={onToggleCompact} style={styles.compactWrap}>
        <View style={styles.compactHaloWrap}>
          <Animated.View
            style={[
              styles.compactWave,
              { transform: [{ scale: wave1 }], opacity: waveOp1 },
            ]}
          />
          <Animated.View
            style={[
              styles.compactImageWrap,
              { transform: [{ scale: breathe }] },
            ]}
          >
            <Image
              source={resolvedSource}
              style={styles.compactImage}
              resizeMode="cover"
            />
          </Animated.View>
        </View>
        <View style={styles.compactText}>
          <Text style={styles.compactName}>{resolvedName}</Text>
          <Text
            style={[
              styles.compactStatus,
              isSpeaking && { color: colors.primary },
            ]}
          >
            {status}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
      </Pressable>
    );
  }

  // Parallax — portrait drifts up at ~30% the scroll velocity
  const parallaxStyle = scrollY
    ? {
        transform: [
          {
            translateY: scrollY.interpolate({
              inputRange: [0, 220],
              outputRange: [0, -40],
              extrapolate: "clamp" as const,
            }),
          },
          {
            scale: scrollY.interpolate({
              inputRange: [0, 220],
              outputRange: [1, 0.92],
              extrapolate: "clamp" as const,
            }),
          },
        ],
        opacity: scrollY.interpolate({
          inputRange: [0, 200],
          outputRange: [1, 0.85],
          extrapolate: "clamp" as const,
        }),
      }
    : null;

  const orb1Style = {
    transform: [
      {
        translateY: orb1.interpolate({
          inputRange: [0, 1],
          outputRange: [-10, 14],
        }),
      },
      {
        translateX: orb1.interpolate({
          inputRange: [0, 1],
          outputRange: [-4, 8],
        }),
      },
    ],
  };
  const orb2Style = {
    transform: [
      {
        translateY: orb2.interpolate({
          inputRange: [0, 1],
          outputRange: [12, -8],
        }),
      },
      {
        translateX: orb2.interpolate({
          inputRange: [0, 1],
          outputRange: [6, -10],
        }),
      },
    ],
  };

  return (
    <View style={styles.heroOuter}>
      <LinearGradient
        colors={["#0B0F2C", "#1F1B5A", "#3A1F8F", "#7C3AED"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.hero}
      >
        {/* Ambient glow orbs to fake portrait-mode depth */}
        <Animated.View style={[styles.orb, styles.orbA, orb1Style]} />
        <Animated.View style={[styles.orb, styles.orbB, orb2Style]} />
        <Animated.View style={[styles.orb, styles.orbC, orb1Style]} />

        {/* Soft top vignette to deepen the gradient */}
        <LinearGradient
          colors={["rgba(0,0,0,0.35)", "transparent"]}
          style={styles.vignetteTop}
          pointerEvents="none"
        />

        <Animated.View
          style={[styles.parallaxLayer, parallaxStyle]}
          pointerEvents="box-none"
        >
          <View style={styles.haloWrap}>
            {/* Sound-wave rings */}
            <Animated.View
              style={[
                styles.wave,
                { transform: [{ scale: wave1 }], opacity: waveOp1 },
              ]}
            />
            <Animated.View
              style={[
                styles.wave,
                { transform: [{ scale: wave2 }], opacity: waveOp2 },
              ]}
            />
            <Animated.View
              style={[
                styles.wave,
                { transform: [{ scale: wave3 }], opacity: waveOp3 },
              ]}
            />
            {/* Soft static aura */}
            <View style={styles.aura} pointerEvents="none" />
            <Animated.View
              style={[styles.imageWrap, { transform: [{ scale: breathe }] }]}
            >
              <Image
                source={resolvedSource}
                style={styles.image}
                resizeMode="cover"
              />
            </Animated.View>
          </View>

          {/* Glass status pill */}
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                isSpeaking && { backgroundColor: "#FCD34D" },
              ]}
            />
            <Text style={styles.heroName}>{resolvedName}</Text>
            <Text style={styles.heroStatus}>· {status}</Text>
          </View>
        </Animated.View>

        {onToggleCompact && (
          <Pressable
            onPress={onToggleCompact}
            style={styles.collapseBtn}
            hitSlop={10}
          >
            <Ionicons name="chevron-up" size={18} color="#fff" />
          </Pressable>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  heroOuter: {
    overflow: "hidden",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  hero: {
    height: HERO_H,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  vignetteTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  parallaxLayer: {
    alignItems: "center",
    justifyContent: "center",
  },
  haloWrap: {
    width: PORTRAIT + 120,
    height: PORTRAIT + 80,
    alignItems: "center",
    justifyContent: "center",
  },
  wave: {
    position: "absolute",
    width: PORTRAIT,
    height: PORTRAIT,
    borderRadius: PORTRAIT / 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  aura: {
    position: "absolute",
    width: PORTRAIT + 28,
    height: PORTRAIT + 28,
    borderRadius: (PORTRAIT + 28) / 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  imageWrap: {
    width: PORTRAIT,
    height: PORTRAIT,
    borderRadius: PORTRAIT / 2,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#5BE584",
    marginRight: spacing.xs,
  },
  heroName: {
    color: "#fff",
    fontSize: fontSizes.md,
    fontWeight: "700",
    letterSpacing: 0.4,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  heroStatus: {
    color: "rgba(255,255,255,0.85)",
    fontSize: fontSizes.sm,
    marginLeft: 2,
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
  },
  orbA: {
    width: 220,
    height: 220,
    backgroundColor: "rgba(124,58,237,0.45)",
    top: -60,
    left: -40,
  },
  orbB: {
    width: 180,
    height: 180,
    backgroundColor: "rgba(91,141,239,0.4)",
    bottom: -40,
    right: -30,
  },
  orbC: {
    width: 140,
    height: 140,
    backgroundColor: "rgba(252,211,77,0.18)",
    top: 30,
    right: 40,
  },
  collapseBtn: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Compact mode
  compactWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  compactHaloWrap: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  compactWave: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + "40",
  },
  compactImageWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    padding: 2,
  },
  compactImage: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
  },
  compactText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  compactName: {
    fontSize: fontSizes.md,
    fontWeight: "600",
    color: colors.text,
  },
  compactStatus: {
    fontSize: fontSizes.xs,
    color: colors.success,
  },
});
