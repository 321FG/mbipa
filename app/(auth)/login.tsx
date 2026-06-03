import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
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

import { FloatingField } from "@/src/components/Auth/FloatingField";
import { LanguageSwitcher } from "@/src/components/Auth/LanguageSwitcher";
import { MeshBackground } from "@/src/components/Auth/MeshBackground";
import { PrimaryButton } from "@/src/components/Auth/PrimaryButton";
import { auth as firebaseAuth } from "@/src/config/firebase";
import { useAppDispatch, useAppSelector } from "@/src/hooks";
import { clearError, login } from "@/src/store/slices/authSlice";
import { borderRadius, colors, fontSizes, spacing } from "@/src/theme";

export default function LoginScreen() {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((s) => s.auth);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  // Slow heartbeat halo around the logo
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [pulse]);
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.08 }],
    opacity: 0.45 + pulse.value * 0.4,
  }));

  const AVATAR_SIZE = Math.min(
    110,
    Math.round(Dimensions.get("window").width * 0.26),
  );
  const RING_SIZE = Math.max(56, AVATAR_SIZE - 14);

  const validate = () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError(t("auth.errors.invalidEmail"));
      return false;
    }
    if (!password || password.length < 6) {
      setLocalError(t("auth.errors.passwordTooShort"));
      return false;
    }
    setLocalError("");
    return true;
  };

  const handleLogin = async () => {
    dispatch(clearError());
    if (!validate()) return;
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      try {
        await firebaseAuth.currentUser?.reload();
      } catch {
        /* non-fatal */
      }
      if (firebaseAuth.currentUser && !firebaseAuth.currentUser.emailVerified) {
        router.replace("/(auth)/verify-email");
        return;
      }
    }
  };

  const errorMsg = localError || error;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <MeshBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={[styles.langWrap, { top: insets.top + spacing.sm }]}
          pointerEvents="box-none"
        >
          <LanguageSwitcher />
        </View>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              entering={FadeInDown.duration(600).delay(80)}
              style={styles.avatarWrap}
            >
              <View
                style={[
                  styles.avatarHaloRoot,
                  { width: AVATAR_SIZE, height: AVATAR_SIZE },
                ]}
              >
                <Animated.View
                  style={[
                    styles.avatarHalo,
                    haloStyle,
                    {
                      width: AVATAR_SIZE,
                      height: AVATAR_SIZE,
                      borderRadius: AVATAR_SIZE / 2,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={["#A78BFA", "#7DD3FC", "#A7F3D0"]}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
                <LinearGradient
                  colors={[colors.primaryLight, colors.info]}
                  style={[
                    styles.avatarRing,
                    {
                      width: RING_SIZE,
                      height: RING_SIZE,
                      borderRadius: RING_SIZE / 2,
                    },
                  ]}
                >
                  <View
                    style={[styles.avatar, { backgroundColor: colors.surface }]}
                  >
                    <Image
                      source={require("@/assets/images/MbipaUpdatedTrim.png")}
                      style={styles.logoImg}
                      resizeMode="contain"
                    />
                  </View>
                </LinearGradient>
              </View>

              <Text style={[styles.brand, { color: colors.text }]}>
                {" "}
                {t("auth.appName")}
              </Text>
              <Text style={[styles.tagline, { color: colors.textSecondary }]}>
                {t("auth.tagline")}
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(700).delay(180)}
              style={styles.cardOuter}
            >
              <View style={[styles.cardGlass, { borderColor: colors.surface }]}>
                <LinearGradient
                  colors={[colors.surface + "E6", colors.surfaceVariant + "CC"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View
                  style={[
                    styles.cardHighlight,
                    { backgroundColor: colors.surfaceVariant },
                  ]}
                  pointerEvents="none"
                />

                <View style={styles.cardContent}>
                  <Animated.View entering={FadeInDown.duration(500).delay(260)}>
                    <Text style={[styles.title, { color: colors.text }]}>
                      {t("auth.login")}
                    </Text>
                    <Text
                      style={[styles.subtitle, { color: colors.textSecondary }]}
                    >
                      {t("auth.loginSubtitle")}
                    </Text>
                  </Animated.View>

                  {!!errorMsg && (
                    <Animated.View
                      entering={FadeInDown.duration(300)}
                      style={styles.errorBox}
                    >
                      <Text style={styles.errorText}>{errorMsg}</Text>
                    </Animated.View>
                  )}

                  <Animated.View entering={FadeInDown.duration(500).delay(320)}>
                    <FloatingField
                      label={t("auth.email")}
                      icon="mail-outline"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </Animated.View>

                  <Animated.View entering={FadeInDown.duration(500).delay(380)}>
                    <FloatingField
                      label={t("auth.password")}
                      icon="lock-closed-outline"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      trailingIcon={
                        showPassword ? "eye-off-outline" : "eye-outline"
                      }
                      onTrailingPress={() => setShowPassword((v) => !v)}
                    />
                  </Animated.View>

                  <Animated.View entering={FadeInDown.duration(500).delay(440)}>
                    <Link href="/(auth)/forgot-password" asChild>
                      <Pressable style={styles.forgot}>
                        <Text style={styles.forgotText}>
                          {t("auth.forgotPassword")}
                        </Text>
                      </Pressable>
                    </Link>
                  </Animated.View>

                  <Animated.View entering={FadeInDown.duration(500).delay(500)}>
                    <PrimaryButton
                      label={t("auth.signIn")}
                      onPress={handleLogin}
                      loading={isLoading}
                      style={{ marginTop: spacing.md }}
                    />
                  </Animated.View>

                  <Animated.View
                    entering={FadeInDown.duration(500).delay(560)}
                    style={styles.divider}
                  >
                    <View
                      style={[
                        styles.dividerLine,
                        { backgroundColor: colors.border },
                      ]}
                    />
                    <Text
                      style={[
                        styles.dividerText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {" "}
                      {t("common.or")}{" "}
                    </Text>
                    <View
                      style={[
                        styles.dividerLine,
                        { backgroundColor: colors.border },
                      ]}
                    />
                  </Animated.View>

                  <Animated.View
                    entering={FadeInDown.duration(500).delay(600)}
                    style={styles.registerRow}
                  >
                    <Text style={styles.registerText}>
                      {t("auth.noAccount")}{" "}
                    </Text>
                    <Link href="/(auth)/register" asChild>
                      <Pressable hitSlop={8}>
                        <Text style={styles.registerLink}>
                          {t("auth.createAccount")}
                        </Text>
                      </Pressable>
                    </Link>
                  </Animated.View>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  langWrap: {
    position: "absolute",
    right: spacing.md,
    zIndex: 10,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.xl,
  },
  avatarWrap: { alignItems: "center", marginBottom: spacing.lg },
  avatarHaloRoot: {
    width: 110,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHalo: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: "hidden",
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 22,
    elevation: 10,
  },
  avatar: {
    flex: 1,
    width: "100%",
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImg: { width: "100%", height: "100%" },
  brand: {
    marginTop: spacing.md,
    fontSize: fontSizes.xxxl,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 1.2,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  cardOuter: {
    borderRadius: borderRadius.xl,
    shadowColor: "#6B4EFF",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 14,
  },
  cardGlass: {
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
  },
  cardHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  cardContent: {
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSizes.xxl + 4,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.xs,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: spacing.md,
  },
  errorBox: {
    backgroundColor: "rgba(225,112,85,0.12)",
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.sm,
    textAlign: "center",
  },
  forgot: { alignSelf: "flex-end", marginTop: spacing.sm, paddingVertical: 4 },
  forgotText: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(180,180,200,0.4)",
  },
  dividerText: { color: colors.textLight, fontSize: fontSizes.sm },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerText: { color: colors.textSecondary, fontSize: fontSizes.md },
  registerLink: {
    color: colors.primary,
    fontSize: fontSizes.md,
    fontWeight: "700",
  },
});
