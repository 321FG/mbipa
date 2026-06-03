/**
 * Mbipa Theme Configuration
 * "La paix de l'esprit" - Psychological support app
 */

export const colors = {
  // Primary colors
  primary: "#6B4EFF", // Violet chaleureux
  primaryLight: "#9B85FF",
  primaryDark: "#4A32CC",

  // Secondary colors
  secondary: "#FF6B6B", // Corail empathique
  secondaryLight: "#FF9999",
  secondaryDark: "#CC4444",

  // Background
  background: "#F8F9FA", // Gris très clair
  surface: "#FFFFFF",
  surfaceVariant: "#F0F2F5",

  // Text
  text: "#2D3436",
  textSecondary: "#636E72",
  textLight: "#B2BEC3",
  textOnPrimary: "#FFFFFF",

  // Status colors
  success: "#00B894", // Vert bien-être
  warning: "#FDCB6E", // Jaune attention
  error: "#E17055", // Rouge doux
  info: "#74B9FF", // Bleu info

  // Mood/Category colors
  relaxation: "#74B9FF", // Bleu calme
  motivation: "#FD79A8", // Rose énergique
  meditation: "#A29BFE", // Violet méditation
  sadness: "#636E72", // Gris tristesse
  anxiety: "#FDCB6E", // Jaune anxiété
  sleep: "#2D3436", // Sombre sommeil
  focus: "#00CEC9", // Turquoise concentration

  // Misc
  border: "#DFE6E9",
  shadow: "rgba(0, 0, 0, 0.1)",
  overlay: "rgba(0, 0, 0, 0.5)",
  transparent: "transparent",
};

export const fonts = {
  regular: "Poppins-Regular",
  medium: "Poppins-Medium",
  semiBold: "Poppins-SemiBold",
  bold: "Poppins-Bold",
  // Fallback fonts
  systemRegular: "System",
  systemBold: "System",
};

export const fontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 24,
  xxxl: 32,
  display: 40,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
};

export const shadows = {
  small: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// React Native Paper theme configuration
export const paperTheme = {
  colors: {
    primary: colors.primary,
    secondary: colors.secondary,
    tertiary: colors.info,
    error: colors.error,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceVariant,
    onPrimary: colors.textOnPrimary,
    onSecondary: colors.textOnPrimary,
    onTertiary: colors.textOnPrimary,
    onError: colors.textOnPrimary,
    onBackground: colors.text,
    onSurface: colors.text,
    onSurfaceVariant: colors.textSecondary,
    outline: colors.border,
    outlineVariant: colors.border,
    shadow: colors.shadow,
    scrim: colors.overlay,
    inverseSurface: colors.text,
    inverseOnSurface: colors.surface,
    inversePrimary: colors.primaryLight,
    elevation: {
      level0: colors.surface,
      level1: colors.surface,
      level2: colors.surfaceVariant,
      level3: colors.surfaceVariant,
      level4: colors.surfaceVariant,
      level5: colors.surfaceVariant,
    },
  },
  roundness: borderRadius.sm,
};

// ---------------------------------------------------------------------------
// Dark mode support
// ---------------------------------------------------------------------------
// We snapshot the original light palette and define a dark counterpart, then
// expose `applyTheme(mode)` which mutates the exported `colors` object in
// place. Screens that read `colors.X` directly inside `StyleSheet.create()`
// will only see the change after the JS bundle reloads (call
// `Updates.reloadAsync()` from the toggle handler), but Paper-themed
// components and any inline-styled views will react immediately.

const lightColors = { ...colors };

export const darkColors: typeof colors = {
  primary: "#9B85FF",
  primaryLight: "#B8A8FF",
  primaryDark: "#6B4EFF",

  secondary: "#FF8E8E",
  secondaryLight: "#FFB3B3",
  secondaryDark: "#CC5555",

  background: "#0F1115",
  surface: "#1A1D23",
  surfaceVariant: "#22262D",

  text: "#E8EAED",
  textSecondary: "#9AA0A6",
  textLight: "#5F6368",
  textOnPrimary: "#FFFFFF",

  success: "#26D7A8",
  warning: "#FDCB6E",
  error: "#FF8A6B",
  info: "#74B9FF",

  relaxation: "#74B9FF",
  motivation: "#FD79A8",
  meditation: "#A29BFE",
  sadness: "#9AA0A6",
  anxiety: "#FDCB6E",
  sleep: "#5F6368",
  focus: "#00CEC9",

  border: "#2D3036",
  shadow: "rgba(0, 0, 0, 0.4)",
  overlay: "rgba(0, 0, 0, 0.7)",
  transparent: "transparent",
};

export type ThemeMode = "light" | "dark";

let _currentMode: ThemeMode = "light";
export function getThemeMode(): ThemeMode {
  return _currentMode;
}

function rebuildPaperColors() {
  Object.assign(paperTheme.colors, {
    primary: colors.primary,
    secondary: colors.secondary,
    tertiary: colors.info,
    error: colors.error,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceVariant,
    onPrimary: colors.textOnPrimary,
    onSecondary: colors.textOnPrimary,
    onTertiary: colors.textOnPrimary,
    onError: colors.textOnPrimary,
    onBackground: colors.text,
    onSurface: colors.text,
    onSurfaceVariant: colors.textSecondary,
    outline: colors.border,
    outlineVariant: colors.border,
    shadow: colors.shadow,
    scrim: colors.overlay,
    inverseSurface: colors.text,
    inverseOnSurface: colors.surface,
    inversePrimary: colors.primaryLight,
    elevation: {
      level0: colors.surface,
      level1: colors.surface,
      level2: colors.surfaceVariant,
      level3: colors.surfaceVariant,
      level4: colors.surfaceVariant,
      level5: colors.surfaceVariant,
    },
  });
}

export function applyTheme(mode: ThemeMode) {
  _currentMode = mode;
  Object.assign(colors, mode === "dark" ? darkColors : lightColors);
  rebuildPaperColors();
}

const THEME_MODE_KEY = "mbipa.themeMode";

export async function loadStoredThemeMode(): Promise<ThemeMode> {
  try {
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;
    const stored = await AsyncStorage.getItem(THEME_MODE_KEY);
    const mode: ThemeMode = stored === "dark" ? "dark" : "light";
    applyTheme(mode);
    return mode;
  } catch {
    return "light";
  }
}

export async function persistThemeMode(mode: ThemeMode): Promise<void> {
  try {
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;
    await AsyncStorage.setItem(THEME_MODE_KEY, mode);
  } catch {}
}

const theme = {
  colors,
  fonts,
  fontSizes,
  spacing,
  borderRadius,
  shadows,
  paperTheme,
};

export default theme;
