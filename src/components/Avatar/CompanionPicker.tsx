/**
 * CompanionPicker — first-run modal that lets the user choose between
 * Bagaza (male coach) and Yassingou (female coach). Stores the choice in
 * user.preferences.companion and also sets voiceGender accordingly.
 */
import { useAppDispatch } from "@/src/hooks";
import { updateUserPreferences } from "@/src/store/slices/authSlice";
import { borderRadius, colors, fontSizes, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const BAGAZA_IMG = require("../../../assets/images/mbipa-coach.png");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YASSINGOU_IMG = require("../../../assets/images/mbipa-coach-female.png");

interface CompanionPickerProps {
  visible: boolean;
  onClose?: () => void;
}

export function CompanionPicker({ visible, onClose }: CompanionPickerProps) {
  const dispatch = useAppDispatch();

  const choose = (companion: "bagaza" | "yassingou") => {
    const voiceGender = companion === "bagaza" ? "male" : "female";
    dispatch(updateUserPreferences({ companion, voiceGender }));
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Choisis ton ami d'échange</Text>
          <Text style={styles.subtitle}>
            Tu pourras toujours changer plus tard depuis ton profil.
          </Text>

          <Pressable
            style={styles.card}
            onPress={() => choose("bagaza")}
            android_ripple={{ color: colors.primary + "20" }}
          >
            <LinearGradient
              colors={[colors.primary, "#1d3fb8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardHeader}
            >
              <Image source={BAGAZA_IMG} style={styles.portrait} />
            </LinearGradient>
            <View style={styles.cardBody}>
              <Text style={styles.name}>Bagaza</Text>
              <Text style={styles.role}>
                Coach masculin · voix posée et rassurante
              </Text>
              <View style={styles.tagRow}>
                <Tag icon="mic" label="Voix masculine" />
                <Tag icon="happy" label="Bienveillant" />
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={22}
              color={colors.textSecondary}
              style={styles.cardArrow}
            />
          </Pressable>

          <Pressable
            style={styles.card}
            onPress={() => choose("yassingou")}
            android_ripple={{ color: "#FF6B6B20" }}
          >
            <LinearGradient
              colors={["#FF8C7A", "#E0356E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardHeader}
            >
              <Image source={YASSINGOU_IMG} style={styles.portrait} />
            </LinearGradient>
            <View style={styles.cardBody}>
              <Text style={styles.name}>Yassingou</Text>
              <Text style={styles.role}>
                Coach féminine · voix douce et empathique
              </Text>
              <View style={styles.tagRow}>
                <Tag icon="mic" label="Voix féminine" />
                <Tag icon="heart" label="Empathique" />
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={22}
              color={colors.textSecondary}
              style={styles.cardArrow}
            />
          </Pressable>

          {onClose && (
            <Pressable onPress={onClose} style={styles.skipBtn}>
              <Text style={styles.skipText}>Plus tard</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Tag({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={styles.tag}>
      <Ionicons name={icon} size={12} color={colors.textSecondary} />
      <Text style={styles.tagLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: {
    width: 110,
    height: 130,
    alignItems: "center",
    justifyContent: "center",
  },
  portrait: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "#fff",
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  name: {
    fontSize: fontSizes.lg,
    fontWeight: "700",
    color: colors.text,
  },
  role: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap" },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
    marginTop: 4,
  },
  tagLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  cardArrow: { marginRight: spacing.md },
  skipBtn: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  skipText: { color: colors.textSecondary, fontSize: fontSizes.sm },
});
