/**
 * Music Slice - Music player and library state
 */
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { API_URL, ENDPOINTS } from "../../api/config";
import type {
    MusicState,
    MusicTrack
} from "../../types";

const initialState: MusicState = {
  categories: [],
  tracks: [],
  favorites: [],
  currentTrack: null,
  isPlaying: false,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchCategories = createAsyncThunk(
  "music/fetchCategories",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: { accessToken: string } };
      const response = await fetch(`${API_URL}${ENDPOINTS.MUSIC.CATEGORIES}`, {
        headers: {
          Authorization: `Bearer ${state.auth.accessToken}`,
        },
      });

      if (!response.ok) {
        return rejectWithValue("Erreur lors du chargement des catégories");
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue("Erreur réseau");
    }
  },
);

export const fetchTracksByCategory = createAsyncThunk(
  "music/fetchTracksByCategory",
  async (categoryId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: { accessToken: string } };
      const response = await fetch(
        `${API_URL}${ENDPOINTS.MUSIC.TRACKS(categoryId)}`,
        {
          headers: {
            Authorization: `Bearer ${state.auth.accessToken}`,
          },
        },
      );

      if (!response.ok) {
        return rejectWithValue("Erreur lors du chargement des morceaux");
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue("Erreur réseau");
    }
  },
);

export const fetchFavorites = createAsyncThunk(
  "music/fetchFavorites",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: { accessToken: string } };
      const response = await fetch(`${API_URL}${ENDPOINTS.MUSIC.FAVORITES}`, {
        headers: {
          Authorization: `Bearer ${state.auth.accessToken}`,
        },
      });

      // Backend not yet implemented → keep local favorites untouched.
      if (!response.ok) {
        return rejectWithValue("backend-unavailable");
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue("backend-unavailable");
    }
  },
);

export const toggleFavorite = createAsyncThunk(
  "music/toggleFavorite",
  async (track: MusicTrack, { getState }) => {
    // Local-first: always succeed so favorites work without backend.
    // Backend sync is best-effort; failures are logged but never block UX.
    const state = getState() as {
      auth: { accessToken: string };
      music: MusicState;
    };
    const isFavorite = state.music.favorites.some((f) => f.id === track.id);

    try {
      const response = isFavorite
        ? await fetch(
            `${API_URL}${ENDPOINTS.MUSIC.REMOVE_FAVORITE(track.id)}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${state.auth.accessToken}`,
              },
            },
          )
        : await fetch(`${API_URL}${ENDPOINTS.MUSIC.ADD_FAVORITE}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${state.auth.accessToken}`,
            },
            body: JSON.stringify({ trackId: track.id }),
          });

      if (!response.ok) {
        console.warn(
          "[music] favorites backend sync failed, keeping local state",
        );
      }
    } catch (error) {
      console.warn(
        "[music] favorites backend sync error, keeping local state",
        error,
      );
    }

    return { track, added: !isFavorite };
  },
);

const musicSlice = createSlice({
  name: "music",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentTrack: (state, action: PayloadAction<MusicTrack | null>) => {
      state.currentTrack = action.payload;
    },
    setIsPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },
    playTrack: (state, action: PayloadAction<MusicTrack>) => {
      state.currentTrack = action.payload;
      state.isPlaying = true;
    },
    pauseTrack: (state) => {
      state.isPlaying = false;
    },
    stopTrack: (state) => {
      state.currentTrack = null;
      state.isPlaying = false;
    },
  },
  extraReducers: (builder) => {
    // Fetch categories
    builder.addCase(fetchCategories.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchCategories.fulfilled, (state, action) => {
      state.isLoading = false;
      state.categories = action.payload;
    });
    builder.addCase(fetchCategories.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch tracks by category
    builder.addCase(fetchTracksByCategory.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchTracksByCategory.fulfilled, (state, action) => {
      state.isLoading = false;
      state.tracks = action.payload;
    });
    builder.addCase(fetchTracksByCategory.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch favorites
    builder.addCase(fetchFavorites.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchFavorites.fulfilled, (state, action) => {
      state.isLoading = false;
      state.favorites = action.payload;
    });
    builder.addCase(fetchFavorites.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Toggle favorite
    builder.addCase(toggleFavorite.fulfilled, (state, action) => {
      const { track, added } = action.payload;
      if (added) {
        state.favorites.push({ ...track, isFavorite: true });
      } else {
        state.favorites = state.favorites.filter((f) => f.id !== track.id);
      }
      // Update track in tracks list
      const trackIndex = state.tracks.findIndex((t) => t.id === track.id);
      if (trackIndex >= 0) {
        state.tracks[trackIndex].isFavorite = added;
      }
    });
  },
});

export const {
  clearError,
  setCurrentTrack,
  setIsPlaying,
  playTrack,
  pauseTrack,
  stopTrack,
} = musicSlice.actions;
export default musicSlice.reducer;
