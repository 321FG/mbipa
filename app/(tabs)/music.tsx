/**
 * Music Screen — Bibliothèque de musicothérapie Mbipa.
 * Utilise `src/data/musicLibrary` (miroir du backend WhatsApp) et joue les
 * pistes via le player YouTube IFrame officiel (légal, respecte les ToS
 * YouTube). Les favoris sont persistés via le slice Redux `music`.
 */
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
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
    Chip,
    IconButton,
    Modal,
    Portal,
    Searchbar,
    Surface,
    Text,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import YoutubePlayer from "react-native-youtube-iframe";

import {
    getAllTracks,
    musicLibrary,
    type FlatTrack,
} from "@/src/data/musicLibrary";
import { useAppDispatch, useAppSelector } from "@/src/hooks";
import { setCurrentTrack, toggleFavorite } from "@/src/store/slices/musicSlice";
import { borderRadius, colors, fontSizes, shadows, spacing } from "@/src/theme";
import type { MusicTrack } from "@/src/types";
import { webContentStyle } from "@/src/utils/responsive";

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

void formatTime; // kept for future use

const CategoryCard = ({
  category,
  isSelected,
  onPress,
}: {
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
    emoji: string;
  };
  isSelected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[
      styles.categoryCard,
      isSelected && { borderColor: category.color, borderWidth: 2 },
    ]}
    onPress={onPress}
  >
    <View
      style={[styles.categoryIcon, { backgroundColor: category.color + "20" }]}
    >
      <Ionicons name={category.icon as any} size={24} color={category.color} />
    </View>
    <Text style={styles.categoryName}>{category.name}</Text>
  </TouchableOpacity>
);

const TrackItem = ({
  track,
  isFavorite,
  onPlay,
  onFavorite,
}: {
  track: FlatTrack;
  isFavorite: boolean;
  onPlay: () => void;
  onFavorite: () => void;
}) => (
  <Surface style={styles.trackItem} elevation={1}>
    <TouchableOpacity style={styles.trackContent} onPress={onPlay}>
      <View
        style={[styles.trackImage, { backgroundColor: track.color + "20" }]}
      >
        <Ionicons name="play" size={24} color={track.color} />
      </View>
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {track.artist}
        </Text>
        <Text style={styles.trackDuration}>
          {track.duration} • {track.categoryName}
        </Text>
      </View>
    </TouchableOpacity>
    <IconButton
      icon={isFavorite ? "heart" : "heart-outline"}
      iconColor={isFavorite ? colors.secondary : colors.textSecondary}
      size={20}
      accessibilityLabel={
        isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"
      }
      onPress={onFavorite}
    />
  </Surface>
);

export default function MusicScreen() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [playingTrack, setPlayingTrack] = useState<FlatTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const { favorites } = useAppSelector((state) => state.music);

  const allTracks = useMemo(() => getAllTracks(), []);

  const onPlayerStateChange = useCallback(
    (state: string) => {
      if (state === "ended") {
        setIsPlaying(false);
        // Auto-advance to next track
        setPlayingTrack((current) => {
          if (!current) return null;
          const idx = allTracks.findIndex((tr) => tr.id === current.id);
          const next = allTracks[idx + 1];
          if (next) {
            setIsPlaying(true);
            return next;
          }
          return null;
        });
      } else if (state === "playing") {
        setIsPlaying(true);
      } else if (state === "paused") {
        setIsPlaying(false);
      }
    },
    [allTracks],
  );

  const onPlayerError = useCallback(
    (error: string) => {
      console.warn("[YouTubePlayer] error:", error);
      const current = playingTrack;
      Alert.alert(t("music.playError"), t("music.embedBlockedMsg"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("music.openInYoutube"),
          onPress: () => {
            if (current) {
              Linking.openURL(
                `https://www.youtube.com/watch?v=${current.youtubeId}`,
              );
            }
          },
        },
      ]);
      setIsPlaying(false);
    },
    [t, playingTrack],
  );

  const filteredTracks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allTracks.filter((track) => {
      const matchesSearch =
        !q ||
        track.title.toLowerCase().includes(q) ||
        track.artist.toLowerCase().includes(q) ||
        track.categoryName.toLowerCase().includes(q);
      const matchesCategory =
        !selectedCategory || track.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allTracks, searchQuery, selectedCategory]);

  function handlePlayTrack(track: FlatTrack) {
    const mt: MusicTrack = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: 0,
      category: track.category,
      color: track.color,
      youtubeId: track.youtubeId,
    };
    dispatch(setCurrentTrack(mt));
    setPlayingTrack(track);
    setIsPlaying(true);
  }

  const handleTogglePlay = () => {
    setIsPlaying((p) => {
      console.log("[music] toggle play:", !p);
      return !p;
    });
  };

  const handleSkip = (delta: number) => {
    if (!playingTrack) return;
    const idx = allTracks.findIndex((tr) => tr.id === playingTrack.id);
    const next = allTracks[idx + delta];
    if (next) handlePlayTrack(next);
  };

  const handleClosePlayer = () => {
    setIsPlaying(false);
    setPlayingTrack(null);
  };

  const handleOpenInYouTube = () => {
    if (!playingTrack) return;
    Linking.openURL(
      `https://www.youtube.com/watch?v=${playingTrack.youtubeId}`,
    );
  };

  const handleToggleFavorite = (track: FlatTrack) => {
    const mt: MusicTrack = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: 0,
      category: track.category,
      color: track.color,
      youtubeId: track.youtubeId,
    };
    dispatch(toggleFavorite(mt));
  };

  const favoriteTracks = useMemo(
    () => allTracks.filter((t) => favorites.some((f) => f.id === t.id)),
    [allTracks, favorites],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("music.title")}</Text>
        <Text style={styles.subtitle}>{t("music.subtitle")}</Text>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder={t("music.searchPlaceholder")}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, webContentStyle]}
      >
        <Text style={styles.sectionTitle}>{t("music.categories")}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {musicLibrary.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              isSelected={selectedCategory === category.id}
              onPress={() =>
                setSelectedCategory(
                  selectedCategory === category.id ? null : category.id,
                )
              }
            />
          ))}
        </ScrollView>

        {selectedCategory && (
          <View style={styles.filterChipContainer}>
            <Chip
              icon="close"
              onPress={() => setSelectedCategory(null)}
              style={styles.filterChip}
            >
              {musicLibrary.find((c) => c.id === selectedCategory)?.name}
            </Chip>
          </View>
        )}

        {favoriteTracks.length > 0 && !selectedCategory && !searchQuery && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t("music.yourFavorites")}
              </Text>
              <Ionicons name="heart" size={18} color={colors.secondary} />
            </View>
            {favoriteTracks.slice(0, 5).map((track) => (
              <TrackItem
                key={`fav-${track.id}`}
                track={track}
                isFavorite={true}
                onPlay={() => handlePlayTrack(track)}
                onFavorite={() => handleToggleFavorite(track)}
              />
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>
          {selectedCategory
            ? musicLibrary.find((c) => c.id === selectedCategory)?.name
            : t("music.allTracks")}
        </Text>

        {filteredTracks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="musical-notes-outline"
              size={48}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>{t("music.empty")}</Text>
          </View>
        ) : (
          filteredTracks.map((track) => (
            <TrackItem
              key={track.id}
              track={track}
              isFavorite={favorites.some((f) => f.id === track.id)}
              onPlay={() => handlePlayTrack(track)}
              onFavorite={() => handleToggleFavorite(track)}
            />
          ))
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* In-app YouTube player */}
      <Portal>
        <Modal
          visible={!!playingTrack}
          onDismiss={handleClosePlayer}
          contentContainerStyle={styles.playerModal}
        >
          {playingTrack ? (
            <View
              style={[
                styles.playerContainer,
                { backgroundColor: playingTrack.color + "15" },
              ]}
            >
              <View style={styles.playerHeader}>
                <Text style={styles.playerCategory}>
                  {playingTrack.categoryName}
                </Text>
                <IconButton
                  icon="chevron-down"
                  size={26}
                  accessibilityLabel={t("music.closePlayer")}
                  onPress={handleClosePlayer}
                />
              </View>

              {/* YouTube player */}
              <View style={styles.youtubeWrapper}>
                <YoutubePlayer
                  key={playingTrack.youtubeId}
                  height={220}
                  play={isPlaying}
                  videoId={playingTrack.youtubeId}
                  onChangeState={onPlayerStateChange}
                  onError={onPlayerError}
                  initialPlayerParams={{
                    controls: true,
                    modestbranding: true,
                  }}
                  webViewProps={{
                    allowsInlineMediaPlayback: true,
                    mediaPlaybackRequiresUserAction: false,
                  }}
                />
              </View>

              <View style={styles.playerMeta}>
                <Text style={styles.playerTitle} numberOfLines={2}>
                  {playingTrack.title}
                </Text>
                <Text style={styles.playerArtist} numberOfLines={1}>
                  {playingTrack.artist}
                </Text>
              </View>

              {/* Controls — play/pause is handled by the embedded YouTube player */}
              <View style={styles.controlsRow}>
                <IconButton
                  icon="skip-previous"
                  size={36}
                  accessibilityLabel={t("music.previous")}
                  onPress={() => handleSkip(-1)}
                  disabled={
                    allTracks.findIndex((tr) => tr.id === playingTrack.id) === 0
                  }
                />
                <IconButton
                  icon="skip-next"
                  size={36}
                  accessibilityLabel={t("music.next")}
                  onPress={() => handleSkip(1)}
                  disabled={
                    allTracks.findIndex((tr) => tr.id === playingTrack.id) ===
                    allTracks.length - 1
                  }
                />
              </View>

              <TouchableOpacity
                onPress={handleOpenInYouTube}
                style={styles.openYoutubeBtn}
              >
                <Ionicons name="logo-youtube" size={18} color="#FF0000" />
                <Text style={styles.openYoutubeText}>
                  {t("music.openInYoutube")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: fontSizes.xxl, fontWeight: "bold", color: colors.text },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  searchContainer: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  searchbar: { borderRadius: borderRadius.lg, backgroundColor: colors.surface },
  searchInput: { fontSize: fontSizes.md },
  scrollContent: { padding: spacing.lg, paddingTop: 0 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
    marginRight: spacing.sm,
  },
  categoriesContainer: { paddingBottom: spacing.md },
  categoryCard: {
    width: 110,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginRight: spacing.md,
    alignItems: "center",
    ...shadows.small,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  categoryName: {
    fontSize: fontSizes.sm,
    color: colors.text,
    textAlign: "center",
  },
  filterChipContainer: { flexDirection: "row", marginBottom: spacing.md },
  filterChip: { backgroundColor: colors.primary + "20" },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  trackContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  trackImage: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  trackInfo: { flex: 1, marginLeft: spacing.md },
  trackTitle: {
    fontSize: fontSizes.md,
    fontWeight: "500",
    color: colors.text,
  },
  trackArtist: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  trackDuration: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyContainer: { padding: spacing.xxl, alignItems: "center" },
  emptyText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  playerModal: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: "hidden",
  },
  playerContainer: {
    width: "100%",
    paddingBottom: spacing.xl,
  },
  playerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingTop: spacing.sm,
  },
  playerCategory: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  albumArt: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.xl,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: spacing.lg,
    ...shadows.medium,
  },
  youtubeWrapper: {
    width: "100%",
    paddingHorizontal: spacing.md,
    marginVertical: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  openYoutubeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  openYoutubeText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  playerMeta: {
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  playerTitle: {
    fontSize: fontSizes.xl,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  playerArtist: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  progressContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  progressBg: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  timeText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.medium,
  },
});
