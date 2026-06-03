/**
 * AnimatedFace — friendly SVG character that blinks and talks.
 *
 * Pure react-native-svg + Animated, no external assets. The mouth opens and
 * closes when `speaking` is true to give the impression Mbipa is talking; the
 * eyes blink occasionally so the face feels alive.
 */
import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, {
    Circle,
    Defs,
    Ellipse,
    G,
    Path,
    Stop,
    LinearGradient as SvgLinearGradient,
} from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
  size: number;
  speaking: boolean;
  /** Skin / face fill color. */
  skin?: string;
  /** Hair color. */
  hair?: string;
  /**
   * When false, completely disables the blink + mouth animation loops.
   * Use this for thumbnail / list usages where the avatar shouldn't be
   * doing JS-driven SVG animation in the background (which is expensive
   * because it can't run on the native driver).
   */
  animated?: boolean;
}

export function AnimatedFace({
  size,
  speaking,
  skin = "#8D5524",
  hair = "#1A1A1A",
  animated = true,
}: Props) {
  // 100x100 viewBox.
  const blink = useRef(new Animated.Value(1)).current; // eye scaleY (1 open, 0.05 closed)
  const mouthOpen = useRef(new Animated.Value(0)).current; // 0 closed, 1 wide

  // Blink loop — random-ish using fixed schedule. Disabled when not animated.
  useEffect(() => {
    if (!animated) return;
    let cancelled = false;
    const doBlink = () => {
      if (cancelled) return;
      Animated.sequence([
        Animated.timing(blink, {
          toValue: 0.05,
          duration: 90,
          useNativeDriver: false,
        }),
        Animated.timing(blink, {
          toValue: 1,
          duration: 110,
          useNativeDriver: false,
        }),
      ]).start(() => {
        const next = 2200 + Math.random() * 2800;
        setTimeout(doBlink, next);
      });
    };
    const t = setTimeout(doBlink, 1500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [blink, animated]);

  // Mouth animation when speaking. Disabled when not animated.
  useEffect(() => {
    if (!animated) return;
    if (!speaking) {
      Animated.timing(mouthOpen, {
        toValue: 0,
        duration: 120,
        useNativeDriver: false,
      }).start();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(mouthOpen, {
          toValue: 1,
          duration: 180,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(mouthOpen, {
          toValue: 0.2,
          duration: 140,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(mouthOpen, {
          toValue: 0.8,
          duration: 200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(mouthOpen, {
          toValue: 0.1,
          duration: 160,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [speaking, mouthOpen]);

  // Eye Y radius animates: base 4 multiplied by blink (1 -> 0.05).
  const eyeRy = blink.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 4],
  });
  // Mouth ellipse Y radius: 0.5 (closed line) -> 5 (wide open).
  const mouthRy = mouthOpen.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 6],
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <SvgLinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFE6B3" />
            <Stop offset="1" stopColor="#FFC97A" />
          </SvgLinearGradient>
        </Defs>
        {/* Background disc */}
        <Circle cx="50" cy="50" r="50" fill="url(#bg)" />

        {/* Hair back */}
        <Path
          d="M20 45 C20 25, 40 12, 50 12 C60 12, 80 25, 80 45 L80 55 L70 55 L70 45 C70 38, 60 35, 50 35 C40 35, 30 38, 30 45 L30 55 L20 55 Z"
          fill={hair}
        />

        {/* Face */}
        <Ellipse cx="50" cy="55" rx="22" ry="26" fill={skin} />

        {/* Ears */}
        <Ellipse cx="28" cy="55" rx="3.5" ry="5" fill={skin} />
        <Ellipse cx="72" cy="55" rx="3.5" ry="5" fill={skin} />

        {/* Eyebrows */}
        <Path
          d="M38 47 Q42 44 46 47"
          stroke={hair}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M54 47 Q58 44 62 47"
          stroke={hair}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />

        {/* Eyes (animated blink) */}
        <AnimatedEllipse
          cx={42}
          cy={54}
          rx={3}
          ry={eyeRy as unknown as number}
          fill="#1A1A1A"
        />
        <AnimatedEllipse
          cx={58}
          cy={54}
          rx={3}
          ry={eyeRy as unknown as number}
          fill="#1A1A1A"
        />

        {/* Nose */}
        <Path
          d="M50 58 Q49 64 47 66 Q49 67 50 66 Q51 67 53 66 Q51 64 50 58"
          fill={skin}
          stroke="#6B3F1A"
          strokeWidth="0.4"
          opacity={0.6}
        />

        {/* Mouth (animated open) */}
        <AnimatedEllipse
          cx={50}
          cy={73}
          rx={6}
          ry={mouthRy as unknown as number}
          fill="#3A1010"
        />
        {/* Lips outline */}
        <Path
          d="M44 73 Q50 70 56 73 Q50 76 44 73 Z"
          fill="none"
          stroke="#6B2020"
          strokeWidth="0.6"
        />

        {/* Cheek blush */}
        <Circle cx="36" cy="65" r="3" fill="#E9897E" opacity={0.35} />
        <Circle cx="64" cy="65" r="3" fill="#E9897E" opacity={0.35} />
      </Svg>
    </View>
  );
}
