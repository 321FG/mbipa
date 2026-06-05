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
import { Checkbox } from "react-native-paper";
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
import { useAppDispatch, useAppSelector } from "@/src/hooks";
import { clearError, register } from "@/src/store/slices/authSlice";
import { borderRadius, colors, fontSizes, spacing } from "@/src/theme";

export default function RegisterScreen() {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((s) => s.auth);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Pulse halo around the brand logo
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
    96,
    Math.round(Dimensions.get("window").width * 0.22),
  );
  const RING_SIZE = Math.max(56, AVATAR_SIZE - 12);

  const validate = () => {
    if (!prenom.trim() || !nom.trim()) {
      setLocalError(t("auth.errors.nameRequired"));
      return false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError(t("auth.errors.invalidEmail"));
      return false;
    }
    if (!password || password.length < 8) {
      setLocalError(t("auth.errors.passwordTooShort"));
      return false;
    }
    if (password !== confirm) {
      setLocalError(t("auth.errors.passwordsMismatch"));
      return false;
    }
    if (!termsAccepted) {
      setLocalError(t("auth.errors.acceptTerms"));
      return false;
    }
    setLocalError("");
    return true;
  };

  const handleRegister = async () => {
    dispatch(clearError());
    if (!validate()) return;
    const result = await dispatch(
      register({
        email,
        password,
        nom,
        prenom,
      }),
    );
    if (register.fulfilled.match(result)) {
      // Gate access to the app behind email verification. The user lands on
      // a screen that polls Firebase until they click the link in their inbox.
      router.replace("/(auth)/verify-email");
    }
  };

  const errorMsg = localError || error;

  // Build the acceptance sentence with tappable links for Terms & Privacy.
  // We inject \0-delimited tokens, then split so the order stays correct
  // across languages (interpolation may place them differently).
  const TERMS_LABEL = t("profile.terms");
  const PRIVACY_LABEL = t("profile.privacy");
  const termsPieces = t("auth.termsAcceptance", {
    terms: "\u0000T\u0000",
    privacy: "\u0000P\u0000",
  }).split("\u0000");

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
                {t("auth.appName")}
              </Text>
              <Text style={[styles.tagline, { color: colors.textSecondary }]}>
                {t("auth.welcomeNew")}
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(700).delay(160)}
              style={styles.cardOuter}
            >
              <View style={[styles.cardGlass, { borderColor: colors.surface }]}>
                <LinearGradient
                  colors={[colors.surface + "E8", colors.surfaceVariant + "DD"]}
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
                <View
                  style={[
                    styles.cardInnerBorder,
                    { borderColor: colors.border },
                  ]}
                  pointerEvents="none"
                />

                <View style={styles.cardContent}>
                  <Animated.View entering={FadeInDown.duration(500).delay(220)}>
                    <Text style={[styles.title, { color: colors.text }]}>
                      {" "}
                      {t("auth.createAccount")}{" "}
                    </Text>
                    <Text
                      style={[styles.subtitle, { color: colors.textSecondary }]}
                    >
                      {" "}
                      {t("auth.welcomeNew")}{" "}
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

                  <Animated.View
                    entering={FadeInDown.duration(500).delay(280)}
                  >
                    <FloatingField
                      label={t("auth.firstName")}
                      icon="person-outline"
                      value={prenom}
                      onChangeText={setPrenom}
                    />
                  </Animated.View>

                  <Animated.View
                    entering={FadeInDown.duration(500).delay(310)}
                  >
                    <FloatingField
                      label={t("auth.lastName")}
                      icon="person-outline"
                      value={nom}
                      onChangeText={setNom}
                    />
                  </Animated.View>

                  <Animated.View entering={FadeInDown.duration(500).delay(340)}>
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

                  <Animated.View entering={FadeInDown.duration(500).delay(400)}>
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

                  <Animated.View entering={FadeInDown.duration(500).delay(460)}>
                    <FloatingField
                      label={t("auth.confirmPassword")}
                      icon="shield-checkmark-outline"
                      value={confirm}
                      onChangeText={setConfirm}
                      secureTextEntry={!showPassword}
                    />
                  </Animated.View>

                  <Animated.View
                    entering={FadeInDown.duration(500).delay(520)}
                    style={{ marginTop: spacing.md }}
                  >
                    <View style={styles.termsRow}>
                      <Checkbox.Android
                        status={termsAccepted ? "checked" : "unchecked"}
                        onPress={() => setTermsAccepted((v) => !v)}
                        color={colors.primary}
                      />
                      <Text style={styles.termsText}>
                        {termsPieces.map((piece, i) => {
                          if (piece === "T") {
                            return (
                              <Text
                                key={`t-${i}`}
                                style={styles.termsLink}
                                onPress={() => router.push("/legal/terms")}
                              >
                                {TERMS_LABEL}
                              </Text>
                            );
                          }
                          if (piece === "P") {
                            return (
                              <Text
                                key={`p-${i}`}
                                style={styles.termsLink}
                                onPress={() => router.push("/legal/privacy")}
                              >
                                {PRIVACY_LABEL}
                              </Text>
                            );
                          }
                          return <Text key={`s-${i}`}>{piece}</Text>;
                        })}
                      </Text>
                    </View>
                    <PrimaryButton
                      label={isLoading ? t("auth.creating") : t("auth.signUp")}
                      onPress={handleRegister}
                      loading={isLoading}
                      disabled={!termsAccepted || isLoading}
                    />
                  </Animated.View>

                  <Animated.View
                    entering={FadeInDown.duration(500).delay(620)}
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
                      {t("common.or")}
                    </Text>
                    <View
                      style={[
                        styles.dividerLine,
                        { backgroundColor: colors.border },
                      ]}
                    />
                  </Animated.View>

                  <Animated.View
                    entering={FadeInDown.duration(500).delay(680)}
                    style={styles.loginRow}
                  >
                    <Text style={styles.loginText}>
                      {t("auth.hasAccount")}{" "}
                    </Text>
                    <Link href="/(auth)/login" asChild>
                      <Pressable hitSlop={8}>
                        <Text style={styles.loginLink}>
                          {t("auth.signInLink")}
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
  avatarWrap: { alignItems: "center", marginBottom: spacing.md },
  avatarHaloRoot: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHalo: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  avatar: {
    flex: 1,
    width: "100%",
    borderRadius: borderRadius.full,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImg: { width: "140%", height: "140%" },
  brand: {
    marginTop: spacing.sm,
    fontSize: fontSizes.xxl,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 1.2,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  progress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(180,180,200,0.5)",
  },
  dotActive: { backgroundColor: colors.primary },
  lineWrap: {
    width: 56,
    height: 5,
    overflow: "hidden",
    borderRadius: 3,
  },
  line: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(180,180,200,0.35)",
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
    borderColor: "rgba(255,255,255,0.9)",
  },
  cardHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  cardInnerBorder: {
    position: "absolute",
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: borderRadius.xl - 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  cardContent: { padding: spacing.lg },
  title: {
    fontSize: fontSizes.xxl + 4,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.xs,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: spacing.md,
    letterSpacing: 1.6,
    fontWeight: "600",
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
  genderTitle: {
    fontSize: fontSizes.sm,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6,
    marginLeft: 4,
    marginTop: spacing.sm,
  },
  genderRow: { flexDirection: "row", gap: spacing.sm },
  segmented: {
    flexDirection: "row",
    backgroundColor: "rgba(124,58,237,0.06)",
    borderRadius: borderRadius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  segmentItem: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },
  segmentItemInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
  },
  segmentItemActive: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
    borderRadius: borderRadius.md,
    shadowColor: "#6B4EFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  segmentLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    fontWeight: "600",
  },
  segmentLabelActive: {
    color: "#fff",
    fontSize: fontSizes.sm,
    fontWeight: "700",
  },
  genderBtnWrap: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  genderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(180,180,200,0.4)",
    height: 48,
  },
  genderBtnActive: {
    borderColor: "transparent",
    shadowColor: "#6B4EFF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  genderLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    fontWeight: "600",
  },
  genderLabelActive: { color: "#fff" },
  goalSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    marginLeft: 4,
    marginBottom: spacing.xs,
  },
  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "space-between",
  },
  goalCardWrap: {
    width: "31.5%",
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  goalCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(180,180,200,0.4)",
    padding: spacing.xs,
  },
  goalCardActive: {
    borderColor: "transparent",
    shadowColor: "#6B4EFF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  goalIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(124,58,237,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  goalIconBubbleActive: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  goalChipWrap: {
    width: "48.5%",
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  goalChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(180,180,200,0.4)",
    height: 44,
    paddingHorizontal: spacing.sm,
  },
  goalChipActive: {
    borderColor: "transparent",
    shadowColor: "#6B4EFF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  goalLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    fontWeight: "600",
    textAlign: "center",
    flexShrink: 1,
  },
  goalLabelActive: { color: "#fff" },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  backBtnUnder: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  backTextUnder: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    fontWeight: "500",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backText: {
    color: colors.primary,
    fontSize: fontSizes.md,
    fontWeight: "600",
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingRight: spacing.xs,
  },
  termsText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    marginTop: 6,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: "700",
    textDecorationLine: "underline",
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
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: { color: colors.textSecondary, fontSize: fontSizes.md },
  loginLink: {
    color: colors.primary,
    fontSize: fontSizes.md,
    fontWeight: "700",
  },
});
