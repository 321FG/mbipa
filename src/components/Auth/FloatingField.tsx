/**
 * FloatingField — premium text input with animated floating label,
 * focus glow halo and slim 2px icons. Uses pure RN Animated (no native dep).
 */
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    Pressable,
    StyleSheet,
    TextInput,
    TextInputProps,
    View,
} from "react-native";

import { borderRadius, colors, fontSizes, spacing } from "@/src/theme";

type Props = TextInputProps & {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  onTrailingPress?: () => void;
};

export function FloatingField({
  label,
  icon,
  trailingIcon,
  onTrailingPress,
  value,
  onFocus,
  onBlur,
  style,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const hasValue = !!(value && String(value).length > 0);
  const float = useRef(new Animated.Value(focused || hasValue ? 1 : 0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(float, {
      toValue: focused || hasValue ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [focused, hasValue, float]);

  useEffect(() => {
    Animated.timing(glow, {
      toValue: focused ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [focused, glow]);

  const labelStyle = {
    top: float.interpolate({
      inputRange: [0, 1],
      outputRange: [18, 6],
    }),
    fontSize: float.interpolate({
      inputRange: [0, 1],
      outputRange: [fontSizes.md, fontSizes.xs],
    }),
    color: float.interpolate({
      inputRange: [0, 1],
      outputRange: [colors.textSecondary, colors.primary],
    }),
  };

  const wrapperStyle = {
    borderColor: glow.interpolate({
      inputRange: [0, 1],
      outputRange: ["rgba(180,180,200,0.35)", colors.primary],
    }),
    shadowOpacity: glow.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.35],
    }),
  };

  return (
    <Animated.View style={[styles.wrapper, wrapperStyle]}>
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={focused ? colors.primary : colors.textLight}
          style={styles.icon}
        />
      ) : null}

      <View style={styles.fieldCol}>
        <Animated.Text style={[styles.label, labelStyle]} pointerEvents="none">
          {label}
        </Animated.Text>
        <TextInput
          {...rest}
          value={value}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, style]}
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.primary}
        />
      </View>

      {trailingIcon ? (
        <Pressable
          onPress={onTrailingPress}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`${label} action`}
          style={styles.trailing}
        >
          <Ionicons
            name={trailingIcon}
            size={18}
            color={colors.textSecondary}
          />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    paddingVertical: 8,
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    elevation: 0,
  },
  icon: {
    marginRight: spacing.sm,
  },
  fieldCol: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 6,
  },
  label: {
    position: "absolute",
    left: spacing.md,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  input: {
    fontSize: fontSizes.md,
    color: colors.text,
    padding: 0,
    margin: 0,
    minHeight: 40,
  },
  trailing: {
    marginLeft: spacing.sm,
    padding: 4,
  },
});

export default FloatingField;
