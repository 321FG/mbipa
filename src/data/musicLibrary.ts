/**
 * Bibliothèque musicale thérapeutique Mbipa
 * Miroir du fichier backend `musicLibrary.js` (WhatsApp bot).
 *
 * SOURCE LÉGALE : Pistes diffusées via le player YouTube IFrame
 * (`react-native-youtube-iframe`). Cela respecte les ToS YouTube
 * (pas d'extraction de flux audio), préserve la monétisation des créateurs
 * et reste compatible App Store / Play Store.
 *
 * Pour ajouter / changer une piste : copie l'ID de la vidéo YouTube
 * (la partie après `?v=` dans l'URL) dans le champ `youtubeId`.
 * Si une vidéo devient indisponible, le player affichera un message
 * "Vidéo non disponible" — il suffit alors de la remplacer.
 */
import { colors } from "@/src/theme";

export interface MusicTrackData {
  title: string;
  artist: string;
  /** ID YouTube (11 caractères, ex: "1ZYbU82GVz4"). */
  youtubeId: string;
  duration: string;
}

export interface MusicCategoryData {
  id: string;
  name: string;
  emoji: string;
  icon: string; // Ionicons name
  color: string;
  description: string;
  tracks: MusicTrackData[];
}

/**
 * IMPORTANT — Sélection de vidéos avec embed AUTORISÉ.
 * Toutes les pistes ci-dessous proviennent de chaînes officielles connues
 * (Yellow Brick Cinema, Soothing Relaxation, Jason Stephenson, Lofi Girl,
 *  Meditation Relax Music, etc.) qui autorisent la lecture intégrée.
 *
 * Comment vérifier qu'une vidéo est lisible dans l'app :
 *   1. Ouvre https://www.youtube.com/embed/<youtubeId>
 *   2. Si elle joue → OK. Si "Vidéo indisponible" → embed désactivé.
 *
 * Comment remplacer une piste :
 *   - Va sur YouTube, copie l'ID (la partie après ?v= dans l'URL)
 *   - Vérifie l'embed avec l'étape 1 ci-dessus
 *   - Colle le nouvel ID dans `youtubeId` ci-dessous
 */
export const musicLibrary: MusicCategoryData[] = [
  {
    id: "relaxation",
    name: "Relaxation & Calme",
    emoji: "😌",
    icon: "leaf",
    color: colors.relaxation,
    description: "Pour te détendre et relâcher la tension",
    tracks: [
      {
        title: "Relaxing Music - 3 Hours",
        artist: "Yellow Brick Cinema",
        youtubeId: "1ZYbU82GVz4",
        duration: "3h",
      },
      {
        title: "Peaceful Piano & Soft Rain",
        artist: "Soothing Relaxation",
        youtubeId: "lFcSrYw-ARY",
        duration: "3h",
      },
      {
        title: "Weightless - Marconi Union (10h)",
        artist: "Just Music",
        youtubeId: "UfcAVejslrU",
        duration: "10h",
      },
    ],
  },
  {
    id: "tristesse",
    name: "Réconfort",
    emoji: "💙",
    icon: "heart",
    color: colors.primary,
    description: "Musique douce pour les moments difficiles",
    tracks: [
      {
        title: "Sad Piano Music - Healing",
        artist: "Soothing Relaxation",
        youtubeId: "lCOF9LN_Zxs",
        duration: "1h+",
      },
      {
        title: "Beautiful Piano - Letting Go",
        artist: "Soothing Relaxation",
        youtubeId: "9Q634rbsypE",
        duration: "1h",
      },
      {
        title: "Acoustic Healing Music",
        artist: "Meditation Relax Music",
        youtubeId: "hlWiI4xVXKY",
        duration: "2h",
      },
    ],
  },
  {
    id: "anxiete",
    name: "Anti-stress",
    emoji: "🧘",
    icon: "flower",
    color: colors.focus,
    description: "Pour calmer l'anxiété et retrouver la paix",
    tracks: [
      {
        title: "Stress Relief Music",
        artist: "Greenred Productions",
        youtubeId: "lE6RYpe9IT0",
        duration: "3h",
      },
      {
        title: "Forest Sounds - Birds & Stream",
        artist: "Johnnie Lawson",
        youtubeId: "xNN7iTA57jM",
        duration: "8h",
      },
      {
        title: "432 Hz - Calm the Mind",
        artist: "Meditation Relax Music",
        youtubeId: "K1QICr9lkb8",
        duration: "1h",
      },
    ],
  },
  {
    id: "sommeil",
    name: "Sommeil",
    emoji: "🌙",
    icon: "moon",
    color: colors.sleep,
    description: "Pour t'aider à t'endormir paisiblement",
    tracks: [
      {
        title: "Deep Sleep Music - 8 Hours",
        artist: "Jason Stephenson",
        youtubeId: "aXItOY0sLRY",
        duration: "8h",
      },
      {
        title: "Rain Sounds for Sleeping",
        artist: "Relaxing White Noise",
        youtubeId: "q76bMs-NwRk",
        duration: "10h",
      },
      {
        title: "Ocean Waves - Sleep & Relax",
        artist: "Nature Healing Society",
        youtubeId: "WHPEKLQID4U",
        duration: "10h",
      },
      {
        title: "Sleep Meditation Music",
        artist: "Yellow Brick Cinema",
        youtubeId: "9Cv3ycjEAJU",
        duration: "8h",
      },
    ],
  },
  {
    id: "motivation",
    name: "Motivation",
    emoji: "💪",
    icon: "rocket",
    color: colors.motivation,
    description: "Pour retrouver de l'énergie positive",
    tracks: [
      {
        title: "Lofi Hip Hop Radio - Beats to Relax/Study",
        artist: "Lofi Girl",
        youtubeId: "jfKfPfyJRdk",
        duration: "Live",
      },
      {
        title: "Lofi Hip Hop Radio - Beats to Sleep/Chill",
        artist: "Lofi Girl",
        youtubeId: "rUxyKA_-grg",
        duration: "Live",
      },
      {
        title: "Chillhop Radio - Jazzy & Lofi Beats",
        artist: "Chillhop Music",
        youtubeId: "5yx6BWlEVcY",
        duration: "Live",
      },
    ],
  },
  {
    id: "meditation",
    name: "Méditation",
    emoji: "🙏",
    icon: "sparkles",
    color: colors.success,
    description: "Pour la méditation et la prière",
    tracks: [
      {
        title: "5 Minute Meditation",
        artist: "Goodful",
        youtubeId: "inpok4MKVLM",
        duration: "5 min",
      },
      {
        title: "Tibetan Singing Bowls - Healing",
        artist: "Meditative Mind",
        youtubeId: "Q0BUya0BEDA",
        duration: "3h",
      },
      {
        title: "Guided Meditation - Inner Peace",
        artist: "The Honest Guys",
        youtubeId: "ZToicYcHIOU",
        duration: "15 min",
      },
      {
        title: "Healing Frequencies - 528 Hz",
        artist: "Meditation Relax Music",
        youtubeId: "RBwyJUmYmXE",
        duration: "1h",
      },
    ],
  },
];

const moodKeywords: Record<string, string[]> = {
  relaxation: [
    "relax",
    "détendre",
    "détente",
    "calme",
    "calmer",
    "tension",
    "décompresser",
  ],
  tristesse: [
    "triste",
    "pleurer",
    "pleure",
    "mal",
    "douleur",
    "perdu",
    "seul",
    "solitude",
    "deuil",
    "mort",
  ],
  anxiete: [
    "anxieux",
    "anxiété",
    "stress",
    "stressé",
    "peur",
    "panique",
    "angoisse",
    "inquiet",
    "nerveux",
  ],
  sommeil: [
    "dormir",
    "sommeil",
    "insomnie",
    "nuit",
    "coucher",
    "endormir",
    "fatigue",
    "fatigué",
  ],
  motivation: [
    "motivation",
    "énergie",
    "courage",
    "force",
    "boost",
    "positif",
    "espoir",
  ],
  meditation: [
    "méditer",
    "méditation",
    "prier",
    "prière",
    "spirituel",
    "âme",
    "paix",
  ],
};

export function detectMusicMood(text: string): string | null {
  const t = text.toLowerCase();
  for (const [mood, keywords] of Object.entries(moodKeywords)) {
    if (keywords.some((kw) => t.includes(kw))) return mood;
  }
  return null;
}

export function getCategoryById(id: string): MusicCategoryData | undefined {
  return musicLibrary.find((c) => c.id === id);
}

/** Build a flat list of all tracks across all categories. */
export interface FlatTrack extends MusicTrackData {
  id: string;
  category: string;
  categoryName: string;
  color: string;
}

export function getAllTracks(): FlatTrack[] {
  return musicLibrary.flatMap((cat) =>
    cat.tracks.map((t, i) => ({
      ...t,
      id: `${cat.id}-${i}`,
      category: cat.id,
      categoryName: cat.name,
      color: cat.color,
    })),
  );
}
