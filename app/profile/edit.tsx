/**
 * Edit Profile Screen — modify user info (prenom, nom, age, sexe, localite,
 * voiceGender). Visual language matches the rest of the app: gradient avatar
 * halo (like profile tab), FloatingField inputs (like auth screens), pill
 * segmented controls and PrimaryButton (gradient, shimmer).
 */
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import { FloatingField } from "@/src/components/Auth/FloatingField";
import { PrimaryButton } from "@/src/components/Auth/PrimaryButton";
import { MbipaAvatar } from "@/src/components/Avatar/MbipaAvatar";
import { useAppDispatch, useAppSelector } from "@/src/hooks";
import { isRemoteUrl, uploadAvatar } from "@/src/services/avatarUpload";
import {
    updateUserPreferences,
    updateUserProfile,
} from "@/src/store/slices/authSlice";
import { borderRadius, colors, fontSizes, spacing } from "@/src/theme";

type SegOption<T extends string> = { value: T; label: string };

function PillSegment<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: SegOption<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.pillTrack}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.pill, active && styles.pillActive]}
            android_ripple={{ color: "rgba(107,78,255,0.15)" }}
          >
            <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { user } = useAppSelector((s) => s.auth);

  const [prenom, setPrenom] = useState(user?.prenom || "");
  const [nom, setNom] = useState(user?.nom || "");
  const [age, setAge] = useState(String(user?.age || ""));
  const [sexe, setSexe] = useState<"homme" | "femme" | "autre">(
    user?.sexe || "autre",
  );
  const [localite, setLocalite] = useState(user?.localite || "");
  const [voiceGender, setVoiceGender] = useState<"female" | "male">(
    user?.preferences?.voiceGender || "female",
  );
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    user?.avatarUrl,
  );
  const [saving, setSaving] = useState(false);
  const [pickingPhoto, setPickingPhoto] = useState(false);

  const handlePickPhoto = async () => {
    try {
      setPickingPhoto(true);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t("common.permissionRequired"), t("edit.permissionPhotos"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setAvatarUrl(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message || t("edit.photoError"));
    } finally {
      setPickingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert(t("edit.removePhoto"), t("edit.removePhotoConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => setAvatarUrl(undefined),
      },
    ]);
  };

  const handleSave = async () => {
    if (!prenom.trim()) {
      Alert.alert(t("common.fieldRequired"), t("edit.firstNameRequired"));
      return;
    }
    setSaving(true);
    try {
      // If the user picked a new local photo, upload it via the backend
      // (which stores it in Azure Blob) and use the returned HTTPS URL so
      // it survives logout/cache clear on every platform.
      let finalAvatarUrl: string | undefined = avatarUrl;
      if (avatarUrl && !isRemoteUrl(avatarUrl)) {
        if (!user?.id) throw new Error("User not loaded");
        finalAvatarUrl = await uploadAvatar(avatarUrl, user.id);
        setAvatarUrl(finalAvatarUrl);
      }
      await dispatch(
        updateUserProfile({
          prenom: prenom.trim(),
          nom: nom.trim(),
          age: parseInt(age, 10) || 0,
          sexe,
          localite: localite.trim(),
          avatarUrl: finalAvatarUrl,
        }),
      ).unwrap();
      await dispatch(updateUserPreferences({ voiceGender })).unwrap();
      Alert.alert(t("profile.title"), t("edit.saved"), [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      // Map known backend codes to friendlier messages.
      const code = e?.payload?.code || e?.code;
      const status = e?.status as number | undefined;
      let msg = e?.message || t("edit.saveError");
      if (code === "FILE_TOO_LARGE") msg = "Image trop volumineuse (max 5 Mo)";
      else if (code === "INVALID_IMAGE_TYPE")
        msg = "Format d'image non supporté (JPEG, PNG, WEBP, GIF)";

      // Server-side / network failures get the full-screen error route so
      // testers don't see raw HTML 404 bodies in an Alert. Validation
      // errors stay inline as a quick Alert.
      const isServerError =
        status === 404 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        (typeof status === "number" && status >= 500);
      if (isServerError) {
        router.push({
          pathname: "/error",
          params: {
            title: "Couldn't save your profile",
            message: msg,
            detail: status ? `HTTP ${status}` : undefined,
            back: "1",
          },
        });
      } else {
        Alert.alert(t("common.error"), msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconBtn}
          hitSlop={12}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("edit.title")}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: spacing.xxl + insets.bottom + 32,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar with gradient halo (matches profile tab) */}
        <View style={styles.avatarBlock}>
          <Pressable
            onPress={handlePickPhoto}
            disabled={pickingPhoto}
            style={({ pressed }) => [
              styles.avatarPressable,
              pressed && { opacity: 0.85 },
            ]}
          >
            <LinearGradient
              colors={["#9B85FF", "#6B4EFF", "#5B9BFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarHalo}
            >
              <View style={styles.avatarInner}>
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatarImage}
                    contentFit="cover"
                  />
                ) : (
                  <MbipaAvatar size={96} speaking={false} animated={false} />
                )}
              </View>
            </LinearGradient>
            <View style={styles.cameraBadge}>
              {pickingPhoto ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={16} color="#fff" />
              )}
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>
            {avatarUrl ? t("edit.tapToChange") : t("edit.tapToAdd")}
          </Text>
          {avatarUrl ? (
            <TouchableOpacity onPress={handleRemovePhoto} hitSlop={8}>
              <Text style={styles.avatarRemove}>{t("edit.removePhoto")}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Section: Identity */}
        <Text style={styles.sectionTitle}>{t("edit.title")}</Text>

        <View style={styles.fieldGroup}>
          <FloatingField
            label={t("edit.firstName")}
            icon="person-outline"
            value={prenom}
            onChangeText={setPrenom}
            autoCapitalize="words"
          />
          <FloatingField
            label={t("edit.lastName")}
            icon="people-outline"
            value={nom}
            onChangeText={setNom}
            autoCapitalize="words"
          />
          <FloatingField
            label={t("auth.age")}
            icon="calendar-outline"
            value={age}
            onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            maxLength={3}
          />
          <FloatingField
            label={t("auth.location")}
            icon="location-outline"
            value={localite}
            onChangeText={setLocalite}
            autoCapitalize="words"
          />
        </View>

        {/* Section: Gender */}
        <Text style={styles.label}>{t("auth.gender")}</Text>
        <PillSegment
          value={sexe}
          onChange={setSexe}
          options={[
            { value: "femme", label: t("auth.genderFemale") },
            { value: "homme", label: t("auth.genderMale") },
            { value: "autre", label: t("auth.genderOther") },
          ]}
        />

        {/* Section: Voice */}
        <Text style={styles.label}>{t("edit.voice")}</Text>
        <PillSegment
          value={voiceGender}
          onChange={setVoiceGender}
          options={[
            { value: "female", label: t("edit.voiceFemale") },
            { value: "male", label: t("edit.voiceMale") },
          ]}
        />

        {/* Save / Cancel */}
        <PrimaryButton
          label={t("common.save")}
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={{ marginTop: spacing.xl }}
        />

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.cancelBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>{t("common.cancel")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const HALO_SIZE = 120;
const AVATAR_SIZE = 104;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: "700",
    color: colors.text,
  },

  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },

  // Avatar
  avatarBlock: { alignItems: "center", marginBottom: spacing.xl },
  avatarPressable: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHalo: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarInner: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.background,
  },
  avatarHint: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    fontWeight: "500",
  },
  avatarRemove: {
    marginTop: spacing.xs,
    color: colors.error,
    fontSize: fontSizes.sm,
    fontWeight: "600",
  },

  // Section
  sectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: "700",
    color: colors.textLight,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  fieldGroup: {
    gap: spacing.md,
  },
  label: {
    fontSize: fontSizes.xs,
    fontWeight: "700",
    color: colors.textLight,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },

  // Pill segment
  pillTrack: {
    flexDirection: "row",
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    padding: 4,
    gap: 4,
  },
  pill: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.md,
  },
  pillActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  pillLabel: {
    fontSize: fontSizes.md,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  pillLabelActive: {
    color: colors.primary,
  },

  cancelBtn: {
    marginTop: spacing.md,
    alignSelf: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
    fontWeight: "600",
  },
});
