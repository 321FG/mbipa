/**
 * Profile Screen - Profil utilisateur et paramètres
 */
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    sendPasswordResetEmail,
} from "firebase/auth";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import {
    Button,
    Modal,
    Portal,
    Switch,
    Text,
    TextInput,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { MbipaAvatar } from "@/src/components/Avatar/MbipaAvatar";
import { auth as firebaseAuth } from "@/src/config/firebase";
import { useAppDispatch, useAppSelector } from "@/src/hooks";
import { changeLanguage, type SupportedLanguage } from "@/src/i18n";
import { FORM_ENDPOINTS, formFeedback, submitForm } from "@/src/services/forms";
import {
    logout,
    resendVerificationEmail,
    updateUserPreferences,
} from "@/src/store/slices/authSlice";
import {
    applyTheme,
    borderRadius,
    colors,
    fontSizes,
    getThemeMode,
    persistThemeMode,
    spacing,
} from "@/src/theme";
import { webContentStyle } from "@/src/utils/responsive";
import * as Updates from "expo-updates";

// Premium accents used by stat tiles and the danger zone.
const ACCENT = {
  flame: "#FF8A4C", // Day streak
  doc: colors.primary, // Tests
  calm: "#5B9BFF", // Sessions
  coral: "#FF7E7E", // Danger zone
  coralBg: "#FFF5F2",
  iconBg: "#F4F0FF", // Soft duotone violet halo
  versionDim: "#9AA3B2",
};

// Settings Item Component
const SettingsItem = ({
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
  danger,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}) => (
  <TouchableOpacity
    style={styles.settingsItem}
    onPress={onPress}
    disabled={!onPress && !rightElement}
    activeOpacity={0.65}
  >
    <View
      style={[
        styles.settingsIcon,
        danger && { backgroundColor: ACCENT.coral + "1A" },
      ]}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={danger ? ACCENT.coral : colors.primary}
      />
    </View>
    <View style={styles.settingsContent}>
      <Text style={[styles.settingsTitle, danger && { color: ACCENT.coral }]}>
        {title}
      </Text>
      {subtitle && <Text style={styles.settingsSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement ||
      (onPress && (
        <Ionicons name="chevron-forward" size={18} color={ACCENT.versionDim} />
      ))}
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state) => state.auth);
  const assessmentResults = useAppSelector((s) => s.assessment.results);
  const sessionList = useAppSelector((s) => s.session.sessions);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [reauthPassword, setReauthPassword] = useState("");
  const [showReauthDialog, setShowReauthDialog] = useState(false);
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const [testimonialForm, setTestimonialForm] = useState({
    name: user?.prenom ?? "",
    email: user?.email ?? "",
    message: "",
  });
  const [sendingTestimonial, setSendingTestimonial] = useState(false);
  const { t } = useTranslation();

  // Derived stats — fall back to persisted user.stats so the profile reflects
  // real activity (assessments taken, sessions attended) instead of a stale 0.
  const testsCompletedCount =
    assessmentResults?.length ?? user?.stats?.testsCompleted ?? 0;
  const sessionsAttendedCount =
    sessionList?.filter((s) => s.status === "completed").length ??
    user?.stats?.sessionsAttended ??
    0;
  // Streak = number of distinct days with at least one assessment result.
  const streakCount = (() => {
    if (!assessmentResults?.length) return user?.stats?.streak ?? 0;
    const days = new Set(
      assessmentResults.map((r) => new Date(r.date).toDateString()),
    );
    return days.size;
  })();

  const notificationsEnabled = user?.preferences?.notifications ?? true;
  const language = user?.preferences?.language ?? "fr";
  const [darkModeEnabled, setDarkModeEnabled] = useState(
    getThemeMode() === "dark",
  );

  const handleToggleDarkMode = async (next: boolean) => {
    const mode = next ? "dark" : "light";
    setDarkModeEnabled(next);
    applyTheme(mode);
    await persistThemeMode(mode);
    Alert.alert(t("profile.darkMode"), t("profile.restartToApply"), [
      {
        text: t("common.cancel"),
        style: "cancel",
      },
      {
        text: t("common.ok"),
        onPress: () => {
          Updates.reloadAsync().catch(() => {});
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert(t("profile.logout"), t("profile.logoutQuestion"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.logout"),
        style: "destructive",
        onPress: () => {
          dispatch(logout());
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t("profile.deleteAccountTitle"),
      t("profile.deleteAccountConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            await performDeleteAccount();
          },
        },
      ],
    );
  };

  const performDeleteAccount = async () => {
    try {
      const fbUser = firebaseAuth.currentUser;
      if (fbUser) {
        await fbUser.delete();
      }
      // Account deleted successfully, logout
      await dispatch(logout())
        .unwrap()
        .catch(() => {});
      router.replace("/(auth)/login");
    } catch (e: any) {
      if (e?.code === "auth/requires-recent-login") {
        // Firebase requires recent authentication to delete account
        // Prompt user to enter password for re-authentication
        setReauthPassword("");
        setShowReauthDialog(true);
        return;
      }
      console.warn("[profile] delete account error:", e);
      Alert.alert(
        t("common.error"),
        e?.message || t("profile.deleteAccountError"),
      );
    }
  };

  const handleReauthAndDelete = async () => {
    if (!reauthPassword.trim() || !user?.email) {
      Alert.alert(t("common.error"), t("profile.passwordRequired"));
      return;
    }

    setShowReauthDialog(false);
    try {
      // Re-authenticate with email + password
      const credential = EmailAuthProvider.credential(
        user.email,
        reauthPassword,
      );
      await reauthenticateWithCredential(firebaseAuth.currentUser!, credential);

      // Now try to delete account again
      const fbUser = firebaseAuth.currentUser;
      if (fbUser) {
        await fbUser.delete();
      }

      // Account deleted successfully, logout
      await dispatch(logout())
        .unwrap()
        .catch(() => {});
      router.replace("/(auth)/login");
    } catch (e: any) {
      console.warn("[profile] reauth/delete error:", e);
      Alert.alert(
        t("common.error"),
        e?.message || t("profile.deleteAccountError"),
      );
      setReauthPassword("");
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) {
      Alert.alert(t("common.error"), t("profile.emailUnavailable"));
      return;
    }
    Alert.alert(
      t("profile.changePasswordTitle"),
      t("profile.changePasswordPrompt", { email: user.email }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.send"),
          onPress: async () => {
            try {
              await sendPasswordResetEmail(firebaseAuth, user.email);
              Alert.alert(t("profile.emailSent"), t("profile.checkInbox"));
            } catch (e: any) {
              Alert.alert(
                t("common.error"),
                e?.message || t("profile.sendError"),
              );
            }
          },
        },
      ],
    );
  };

  const handleToggleNotifications = (value: boolean) => {
    dispatch(updateUserPreferences({ notifications: value }));
  };

  const handleSendTestimonial = async () => {
    setSendingTestimonial(true);
    try {
      const result = await submitForm(FORM_ENDPOINTS.TESTIMONIALS, {
        name: testimonialForm.name.trim(),
        email: testimonialForm.email.trim(),
        message: testimonialForm.message.trim(),
        language: user?.preferences?.language || "en",
      });

      if (result.kind === "success") {
        Alert.alert(t("common.success"), t("profile.testimonialSuccess"));
        setShowTestimonialModal(false);
        setTestimonialForm({
          name: user?.prenom ?? "",
          email: user?.email ?? "",
          message: "",
        });
        return;
      }

      const feedback = formFeedback(result, t);
      if (feedback) Alert.alert(feedback.title, feedback.message);
    } finally {
      setSendingTestimonial(false);
    }
  };

  const handleSelectLanguage = (lang: SupportedLanguage) => {
    dispatch(updateUserPreferences({ language: lang }));
    void changeLanguage(lang);
    setShowLanguageModal(false);
  };

  // ----- Email verification -----
  const isEmailVerified = firebaseAuth.currentUser?.emailVerified ?? true;
  const [resendingVerify, setResendingVerify] = useState(false);
  const handleResendVerification = async () => {
    if (resendingVerify) return;
    setResendingVerify(true);
    try {
      await dispatch(resendVerificationEmail()).unwrap();
      Alert.alert(t("profile.emailSent"), t("profile.checkInbox"));
    } catch (e: any) {
      Alert.alert(t("common.error"), String(e || t("profile.sendError")));
    } finally {
      setResendingVerify(false);
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() =>
      Alert.alert(t("common.error"), t("profile.linkError")),
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, webContentStyle]}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarHaloWrapper}>
            <LinearGradient
              colors={["#9B85FF", "#6B4EFF", "#5B9BFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarHalo}
            >
              <View style={styles.avatarInner}>
                {user?.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    style={styles.profilePhoto}
                    contentFit="cover"
                  />
                ) : (
                  <MbipaAvatar size={96} speaking={false} animated={false} />
                )}
              </View>
            </LinearGradient>
          </View>
          <Text style={styles.profileName}>
            {user?.prenom || ""} {user?.nom || ""}
          </Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>

        {!isEmailVerified && user?.email ? (
          <TouchableOpacity
            style={styles.verifyBanner}
            onPress={handleResendVerification}
            activeOpacity={0.85}
            disabled={resendingVerify}
          >
            <View style={styles.verifyIcon}>
              <Ionicons
                name="mail-unread-outline"
                size={20}
                color={ACCENT.flame}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.verifyTitle}>
                {t("profile.verifyEmailTitle")}
              </Text>
              <Text style={styles.verifySubtitle}>
                {resendingVerify
                  ? t("common.loading")
                  : t("profile.verifyEmailCta")}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={ACCENT.versionDim}
            />
          </TouchableOpacity>
        ) : null}

        {/* Stats — colored tiles with context icons */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: ACCENT.flame + "1A" },
              ]}
            >
              <Ionicons name="flame" size={16} color={ACCENT.flame} />
            </View>
            <Text style={[styles.statValue, { color: ACCENT.flame }]}>
              {streakCount}
            </Text>
            <Text style={styles.statLabel}>{t("profile.streakDays")}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View
              style={[styles.statIcon, { backgroundColor: ACCENT.doc + "1A" }]}
            >
              <Ionicons name="document-text" size={16} color={ACCENT.doc} />
            </View>
            <Text style={[styles.statValue, { color: ACCENT.doc }]}>
              {testsCompletedCount}
            </Text>
            <Text style={styles.statLabel}>{t("profile.testsTaken")}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View
              style={[styles.statIcon, { backgroundColor: ACCENT.calm + "1A" }]}
            >
              <Ionicons name="calendar" size={16} color={ACCENT.calm} />
            </View>
            <Text style={[styles.statValue, { color: ACCENT.calm }]}>
              {sessionsAttendedCount}
            </Text>
            <Text style={styles.statLabel}>{t("profile.sessions")}</Text>
          </View>
        </View>

        {/* Account Settings */}
        <Text style={styles.sectionTitle}>{t("profile.account")}</Text>
        <View style={styles.settingsSection}>
          <SettingsItem
            icon="person"
            title={t("profile.editProfile")}
            onPress={() => router.push("/profile/edit")}
          />
          <View style={styles.softDivider} />
          <SettingsItem
            icon="lock-closed"
            title={t("profile.changePassword")}
            onPress={handleChangePassword}
          />
        </View>

        {/* App Settings */}
        <Text style={styles.sectionTitle}>{t("profile.preferences")}</Text>
        <View style={styles.settingsSection}>
          <SettingsItem
            icon="notifications"
            title={t("profile.notifications")}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                color={colors.primary}
              />
            }
          />
          <View style={styles.softDivider} />
          <SettingsItem
            icon="moon"
            title={t("profile.darkMode")}
            rightElement={
              <Switch
                value={darkModeEnabled}
                onValueChange={handleToggleDarkMode}
                color={colors.primary}
              />
            }
          />
          <View style={styles.softDivider} />
          <SettingsItem
            icon="language"
            title={t("profile.language")}
            subtitle={language === "fr" ? "Français" : "English"}
            onPress={() => setShowLanguageModal(true)}
          />
        </View>

        {/* Support */}
        <Text style={styles.sectionTitle}>{t("profile.support")}</Text>
        <View style={styles.settingsSection}>
          <SettingsItem
            icon="help-circle"
            title={t("profile.helpCenter")}
            onPress={() => router.push("/legal/help")}
          />
          <View style={styles.softDivider} />
          <SettingsItem
            icon="star"
            title={t("profile.testimonial")}
            onPress={() => setShowTestimonialModal(true)}
          />
          <View style={styles.softDivider} />
          <SettingsItem
            icon="chatbox"
            title={t("profile.contactUs")}
            onPress={() => router.push("/legal/contact")}
          />
          <View style={styles.softDivider} />
          <SettingsItem
            icon="information-circle"
            title={t("profile.about")}
            subtitle={t("profile.version")}
            onPress={() => router.push("/legal/about")}
          />
          <View style={styles.softDivider} />
          <SettingsItem
            icon="document-text"
            title={t("profile.terms")}
            onPress={() => router.push("/legal/terms")}
          />
          <View style={styles.softDivider} />
          <SettingsItem
            icon="shield-checkmark"
            title={t("profile.privacy")}
            onPress={() => router.push("/legal/privacy")}
          />
        </View>

        {/* Danger Zone — coral pastel tint */}
        <Text style={[styles.sectionTitle, { color: ACCENT.coral }]}>
          {t("profile.dangerZone")}
        </Text>
        <View style={[styles.settingsSection, styles.dangerSection]}>
          <SettingsItem
            icon="log-out"
            title={t("profile.logout")}
            onPress={handleLogout}
            danger
          />
          <View style={styles.softDivider} />
          <SettingsItem
            icon="trash"
            title={t("profile.deleteAccount")}
            onPress={handleDeleteAccount}
            danger
          />
        </View>

        {/* App Version */}
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>

      {/* Plans Modal */}
      <Portal>
        {/* Language Modal */}
        <Modal
          visible={showLanguageModal}
          onDismiss={() => setShowLanguageModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("profile.selectLanguage")}</Text>
            <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.langOption}
            onPress={() => handleSelectLanguage("fr")}
          >
            <Text style={styles.langText}>🇫🇷 Français</Text>
            {language === "fr" && (
              <Ionicons name="checkmark" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
          <View style={styles.langDivider} />
          <TouchableOpacity
            style={styles.langOption}
            onPress={() => handleSelectLanguage("en")}
          >
            <Text style={styles.langText}>🇬🇧 English</Text>
            {language === "en" && (
              <Ionicons name="checkmark" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        </Modal>

        {/* Re-authentication Modal */}
        <Modal
          visible={showReauthDialog}
          onDismiss={() => setShowReauthDialog(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("profile.reauthRequired")}</Text>
            <TouchableOpacity onPress={() => setShowReauthDialog(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: spacing.md }}>
            <Text style={styles.reauthMessage}>
              {t("profile.reauthMessage")}
            </Text>
            <TextInput
              label={t("auth.password")}
              value={reauthPassword}
              onChangeText={setReauthPassword}
              secureTextEntry
              mode="outlined"
              style={{ marginVertical: spacing.md }}
              placeholder={t("auth.password")}
            />
            <View style={styles.reauthButtons}>
              <Button
                mode="outlined"
                onPress={() => setShowReauthDialog(false)}
                style={{ flex: 1, marginRight: spacing.sm }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                mode="contained"
                onPress={handleReauthAndDelete}
                buttonColor={ACCENT.coral}
                style={{ flex: 1 }}
              >
                {t("common.delete")}
              </Button>
            </View>
          </View>
        </Modal>

        {/* Testimonial Modal */}
        <Modal
          visible={showTestimonialModal}
          onDismiss={() => setShowTestimonialModal(false)}
          contentContainerStyle={styles.testimonialModal}
        >
          <View style={styles.testimonialHeader}>
            <View style={styles.testimonialIcon}>
              <Ionicons name="heart" size={22} color={colors.primary} />
            </View>
            <TouchableOpacity
              onPress={() => setShowTestimonialModal(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.testimonialClose}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.testimonialModalTitle}>
            {t("profile.testimonialTitle")}
          </Text>
          <Text style={styles.testimonialModalSubtitle}>
            {t("profile.testimonialDescription")}
          </Text>

          <ScrollView
            style={styles.testimonialScroll}
            contentContainerStyle={styles.testimonialScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              label={t("profile.testimonialName")}
              value={testimonialForm.name}
              onChangeText={(name) =>
                setTestimonialForm({ ...testimonialForm, name })
              }
              mode="outlined"
              style={styles.testimonialInput}
              left={<TextInput.Icon icon="account-outline" />}
            />
            <TextInput
              label={t("profile.testimonialEmail")}
              value={testimonialForm.email}
              onChangeText={(email) =>
                setTestimonialForm({ ...testimonialForm, email })
              }
              mode="outlined"
              style={styles.testimonialInput}
              keyboardType="email-address"
              autoCapitalize="none"
              left={<TextInput.Icon icon="email-outline" />}
            />
            <TextInput
              label={t("profile.testimonialMessage")}
              value={testimonialForm.message}
              onChangeText={(message) =>
                setTestimonialForm({ ...testimonialForm, message })
              }
              mode="outlined"
              multiline
              numberOfLines={5}
              style={[styles.testimonialInput, styles.testimonialMessageInput]}
              placeholder={t("profile.testimonialPlaceholder")}
            />
          </ScrollView>

          <View style={styles.testimonialActions}>
            <Button
              mode="outlined"
              onPress={() => {
                setShowTestimonialModal(false);
                setTestimonialForm({
                  name: user?.prenom ?? "",
                  email: user?.email ?? "",
                  message: "",
                });
              }}
              style={styles.testimonialBtn}
              contentStyle={styles.testimonialBtnContent}
            >
              {t("common.cancel")}
            </Button>
            <Button
              mode="contained"
              onPress={handleSendTestimonial}
              loading={sendingTestimonial}
              disabled={sendingTestimonial}
              style={styles.testimonialBtn}
              contentStyle={styles.testimonialBtnContent}
              icon="send"
            >
              {t("profile.testimonialSubmit")}
            </Button>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  // Gradient halo around the avatar — 4px ring of violet→blue.
  avatarHaloWrapper: {
    shadowColor: "#6B4EFF",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
  },
  avatarHalo: {
    width: 112,
    height: 112,
    borderRadius: 56,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "#FFE8B8",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profilePhoto: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.border,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.md,
    letterSpacing: -0.4,
  },
  profileEmail: {
    fontSize: fontSizes.sm,
    color: ACCENT.versionDim,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  verifyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: ACCENT.flame + "12",
    borderWidth: 1,
    borderColor: ACCENT.flame + "33",
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  verifyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT.flame + "1F",
    alignItems: "center",
    justifyContent: "center",
  },
  verifyTitle: {
    fontSize: fontSizes.md,
    fontWeight: "700",
    color: colors.text,
  },
  verifySubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Glassy plan badge — soft warm tint with hairline border.
  subscriptionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 244, 214, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(229, 178, 58, 0.35)",
  },
  subscriptionText: {
    fontSize: 12,
    color: "#7A6840",
    marginHorizontal: 6,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  // Stats: airy white card with colored tiles.
  statsCard: {
    flexDirection: "row",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: 24,
    backgroundColor: colors.surface,
    marginBottom: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: ACCENT.versionDim,
    marginTop: 2,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: "#E8EAF0",
    marginVertical: spacing.xs,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: ACCENT.versionDim,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  // Each menu group is its own rounded card with a soft drop-shadow.
  settingsSection: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 2,
  },
  dangerSection: {
    backgroundColor: ACCENT.coralBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 126, 126, 0.18)",
    shadowColor: ACCENT.coral,
    shadowOpacity: 0.06,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  // Soft duotone halo (no hard square).
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT.iconBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  settingsContent: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 15,
    color: colors.text,
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  settingsSubtitle: {
    fontSize: 12,
    color: ACCENT.versionDim,
    marginTop: 2,
  },
  softDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#EEF0F4",
    marginLeft: spacing.md + 36 + spacing.md,
  },
  versionText: {
    fontSize: 11,
    color: ACCENT.versionDim,
    textAlign: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    letterSpacing: 0.5,
    fontWeight: "400",
  },
  modalContainer: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    maxHeight: "80%",
  },
  testimonialModal: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    maxHeight: "85%",
    alignSelf: "stretch",
  },
  testimonialHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  testimonialIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  testimonialClose: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  testimonialModalTitle: {
    fontSize: fontSizes.xl,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  testimonialModalSubtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  testimonialScroll: {
    flexGrow: 0,
  },
  testimonialScrollContent: {
    paddingBottom: spacing.xs,
  },
  testimonialInput: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  testimonialMessageInput: {
    minHeight: 120,
  },
  testimonialActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  testimonialBtn: {
    flex: 1,
    borderRadius: borderRadius.md,
  },
  testimonialBtnContent: {
    paddingVertical: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    fontWeight: "bold",
    color: colors.text,
  },
  modalDescription: {
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  langOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  langText: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  langDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  planCard: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recommendedCard: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  currentPlanCard: {
    backgroundColor: colors.surfaceVariant,
  },
  recommendedBadge: {
    position: "absolute",
    top: -10,
    right: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    zIndex: 1,
  },
  recommendedText: {
    color: "#FFFFFF",
    fontSize: fontSizes.xs,
    fontWeight: "600",
  },
  planName: {
    fontSize: fontSizes.lg,
    fontWeight: "600",
    color: colors.text,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginVertical: spacing.sm,
  },
  planPrice: {
    fontSize: fontSizes.xxl,
    fontWeight: "bold",
    color: colors.text,
  },
  planInterval: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  planDivider: {
    marginVertical: spacing.md,
    height: 1,
    backgroundColor: colors.border,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.xs,
  },
  featureText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  planButton: {
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
  },
  planButtonDisabled: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planButtonDisabledText: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
    fontWeight: "600",
  },
  reauthMessage: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  reauthButtons: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
