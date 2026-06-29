/**
 * Auth Slice - User authentication state
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    createUserWithEmailAndPassword,
    sendEmailVerification,
    signInWithEmailAndPassword,
    signOut,
} from "firebase/auth";
import { doc, getFirestore, setDoc } from "firebase/firestore";
import { API_URL, ENDPOINTS } from "../../api/config";
import { app as firebaseApp, auth as firebaseAuth } from "../../config/firebase";
import { apiFetch } from "../../services/api";
import type {
    AuthResponse,
    AuthState,
    LoginRequest,
    RegisterRequest,
    User,
} from "../../types";
import * as SecureStore from "../../utils/secureStore";

/**
 * AsyncStorage key used as a *cache* of the canonical user document
 * returned by GET/PUT /api/users/me. Never used as the source of truth —
 * Redux state is, and we always refetch on auth state changes.
 */
export const USER_PROFILE_CACHE_KEY = "user_profile_cache";

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isEmailVerified: false,
  isEmailVerificationLoaded: false,
  isLoading: false,
  error: null,
};

/**
 * Maps Firebase auth error codes to user-friendly French messages.
 */
function mapFirebaseError(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "Email invalide";
    case "auth/user-disabled":
      return "Ce compte a été désactivé";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email ou mot de passe incorrect";
    case "auth/email-already-in-use":
      return "Cet email est déjà utilisé";
    case "auth/weak-password":
      return "Mot de passe trop faible (min. 6 caractères)";
    case "auth/network-request-failed":
      return "Erreur réseau. Vérifiez votre connexion.";
    case "auth/too-many-requests":
      return "Trop de tentatives. Réessayez plus tard.";
    default:
      return "Erreur d'authentification";
  }
}

/**
 * Safely persist a value to SecureStore — only accepts non-empty strings.
 */
async function safeSetItem(key: string, value: unknown): Promise<void> {
  if (typeof value === "string" && value.length > 0) {
    await SecureStore.setItemAsync(key, value);
  }
}

const USER_CACHE_KEY = USER_PROFILE_CACHE_KEY;

async function persistUser(user: User | null | undefined): Promise<void> {
  try {
    if (user) {
      const json = JSON.stringify(user);
      await AsyncStorage.setItem(USER_CACHE_KEY, json);
      // Also write a per-uid copy so it survives logout (the generic key is
      // wiped on logout, but the per-uid one isn't, letting profile fields
      // reload on next login if the backend doesn't echo them back).
      if (user.id) {
        await AsyncStorage.setItem(`${USER_CACHE_KEY}.${user.id}`, json);
      }
    }
  } catch {}
}

async function loadCachedUser(uid?: string): Promise<User | null> {
  try {
    if (uid) {
      const perUid = await AsyncStorage.getItem(`${USER_CACHE_KEY}.${uid}`);
      if (perUid) return JSON.parse(perUid) as User;
    }
    const raw = await AsyncStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/**
 * Migrate any legacy SecureStore-cached user into AsyncStorage so existing
 * sessions don't lose their profile when the app updates. Best-effort.
 */
export async function migrateLegacyUserCache(): Promise<void> {
  try {
    const legacy = await SecureStore.getItemAsync("mbipa.user");
    if (!legacy) return;
    const existing = await AsyncStorage.getItem(USER_CACHE_KEY);
    if (!existing) await AsyncStorage.setItem(USER_CACHE_KEY, legacy);
    await SecureStore.deleteItemAsync("mbipa.user");
  } catch {}
}

/**
 * Build a complete User object from any partial backend response, falling back
 * to register form data and Firebase profile so the UI never shows "Utilisateur".
 */
function normalizeUser(
  partial: Partial<User> | undefined,
  fallback: {
    uid: string;
    email: string;
    displayName?: string | null;
  } & Partial<RegisterRequest>,
): User {
  const p: any = partial || {};
  const displayName = fallback.displayName || "";
  const [fbFirst, ...fbRest] = displayName.split(" ").filter(Boolean);
  // Backend may return a single `name` field instead of prenom/nom — split it.
  const backendName: string | undefined = p.name;
  let backendFirst: string | undefined;
  let backendLast: string | undefined;
  if (backendName && typeof backendName === "string") {
    const parts = backendName.trim().split(/\s+/);
    backendFirst = parts.shift();
    backendLast = parts.join(" ") || undefined;
  }
  return {
    id: p.id || p._id || p.uid || fallback.uid,
    email: p.email || fallback.email,
    nom:
      p.nom ||
      p.lastName ||
      backendLast ||
      fbRest.join(" ") ||
      fallback.nom ||
      "",
    prenom:
      p.prenom ||
      p.firstName ||
      backendFirst ||
      fbFirst ||
      fallback.prenom ||
      (fallback.email ? fallback.email.split("@")[0] : "Utilisateur"),
    age: p.age ?? fallback.age ?? 0,
    sexe: p.sexe || fallback.sexe || "autre",
    localite: p.localite || fallback.localite || "",
    subscription: p.subscription || { plan: "free" },
    // Deep-merge preferences so client-only fields (e.g. `companion`) survive
    // a backend round-trip that doesn't echo them back. Backend values win
    // over the cached fallback for any field it explicitly sets.
    preferences: {
      language: "fr",
      notifications: true,
      voiceGender: "female",
      ...(fallback as any).preferences,
      ...p.preferences,
    },
    stats: p.stats || {
      messagesCount: 0,
      testsCompleted: 0,
      sessionsAttended: 0,
      streak: 0,
      lastActiveAt: new Date().toISOString(),
    },
    createdAt: p.createdAt || new Date().toISOString(),
    // Accept any of avatarUrl / avatar / photoURL from backend.
    avatarUrl:
      p.avatarUrl ?? p.avatar ?? p.photoURL ?? (fallback as any).avatarUrl,
  };
}

/**
 * Sends Firebase ID token to backend and returns the app session.
 * Backend endpoint: POST /api/mobile/auth
 */
async function exchangeFirebaseToken(
  idToken: string,
  extra?: Partial<RegisterRequest>,
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}${ENDPOINTS.AUTH.MOBILE}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ idToken, ...(extra || {}) }),
  });

  if (!response.ok) {
    let message = "Erreur serveur lors de l'authentification";
    try {
      const err = await response.json();
      message = err.message || message;
    } catch {}
    throw new Error(message);
  }

  return (await response.json()) as AuthResponse;
}

// Async thunks
export const login = createAsyncThunk<AuthResponse, LoginRequest>(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      // 1. Firebase email/password sign-in
      const cred = await signInWithEmailAndPassword(
        firebaseAuth,
        credentials.email,
        credentials.password,
      );
      // Force-refresh so we always start the session with a fresh token.
      const idToken = await cred.user.getIdToken(true);

      // 2. Exchange Firebase token with backend
      let backendData: Partial<AuthResponse> = {};
      try {
        backendData = await exchangeFirebaseToken(idToken);
      } catch (e) {
        // backend may be down — continue with local profile
        console.warn("[auth] backend exchange failed on login:", e);
      }

      // Try cached user first (preserves prenom from previous register)
      const cached = await loadCachedUser();

      const user = normalizeUser(backendData.user || cached || undefined, {
        uid: cred.user.uid,
        email: cred.user.email || credentials.email,
        displayName: cred.user.displayName,
      });

      // 3. Persist tokens (always fall back to Firebase ID token if backend omits accessToken)
      await safeSetItem("accessToken", backendData.accessToken || idToken);
      await safeSetItem("refreshToken", backendData.refreshToken);
      await safeSetItem("firebaseIdToken", idToken);
      await persistUser(user);

      return {
        user,
        accessToken: backendData.accessToken || idToken,
        refreshToken: backendData.refreshToken || "",
      };
    } catch (error: any) {
      if (
        error?.code &&
        typeof error.code === "string" &&
        error.code.startsWith("auth/")
      ) {
        return rejectWithValue(mapFirebaseError(error.code));
      }
      return rejectWithValue(
        error?.message || "Erreur réseau. Veuillez réessayer.",
      );
    }
  },
);

export const register = createAsyncThunk<AuthResponse, RegisterRequest>(
  "auth/register",
  async (userData, { rejectWithValue }) => {
    try {
      // 1. Create Firebase user
      const cred = await createUserWithEmailAndPassword(
        firebaseAuth,
        userData.email,
        userData.password,
      );
      // 1b. Fire-and-forget verification email so the new account can confirm
      //     their address. Failures here are non-fatal (network, quota, etc.).
      try {
        await sendEmailVerification(cred.user);
      } catch (e) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn("[auth] sendEmailVerification failed:", e);
        }
      }
      // Force-refresh so the first backend call always carries a fresh token.
      const idToken = await cred.user.getIdToken(true);

      // 2. Send token + profile data to backend
      const { password: _pw, ...profile } = userData;
      let backendData: Partial<AuthResponse> = {};
      try {
        backendData = await exchangeFirebaseToken(idToken, profile);
      } catch (e) {
        // backend may be down — keep local registration
        console.warn("[auth] backend exchange failed on register:", e);
      }

      const user = normalizeUser(backendData.user, {
        uid: cred.user.uid,
        displayName: cred.user.displayName,
        ...profile,
        email: cred.user.email || userData.email,
      });

      // 3. Persist tokens (always fall back to Firebase ID token if backend omits accessToken)
      await safeSetItem("accessToken", backendData.accessToken || idToken);
      await safeSetItem("refreshToken", backendData.refreshToken);
      await safeSetItem("firebaseIdToken", idToken);
      await persistUser(user);

      return {
        user,
        accessToken: backendData.accessToken || idToken,
        refreshToken: backendData.refreshToken || "",
      };
    } catch (error: any) {
      if (
        error?.code &&
        typeof error.code === "string" &&
        error.code.startsWith("auth/")
      ) {
        return rejectWithValue(mapFirebaseError(error.code));
      }
      return rejectWithValue(
        error?.message || "Erreur réseau. Veuillez réessayer.",
      );
    }
  },
);

/**
 * Resend a Firebase email-verification link to the currently signed-in user.
 */
export const resendVerificationEmail = createAsyncThunk<void>(
  "auth/resendVerificationEmail",
  async (_, { rejectWithValue }) => {
    try {
      const fbUser = firebaseAuth.currentUser;
      if (!fbUser) return rejectWithValue("Not signed in") as any;
      await sendEmailVerification(fbUser);
    } catch (e: any) {
      if (e?.code === "auth/too-many-requests") {
        return rejectWithValue(
          "Trop de tentatives. Réessayez dans quelques minutes.",
        );
      }
      return rejectWithValue(e?.message || "Échec de l'envoi");
    }
  },
);

/**
 * Best-effort Firestore mirror for email verification status.
 * Safe no-op when Firestore is unused/unconfigured.
 */
async function syncFirestoreEmailVerified(uid: string): Promise<void> {
  try {
    const db = getFirestore(firebaseApp);
    await setDoc(
      doc(db, "users", uid),
      {
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch (e) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn("[auth] Firestore emailVerified sync skipped:", e);
    }
  }
}

/**
 * Force-refresh Firebase user and return latest emailVerified status.
 * Also mirrors `emailVerified=true` into Firestore when available.
 */
export const refreshEmailVerificationStatus = createAsyncThunk<boolean>(
  "auth/refreshEmailVerificationStatus",
  async (_, { rejectWithValue }) => {
    try {
      const fbUser = firebaseAuth.currentUser;
      if (!fbUser) return false;
      await fbUser.reload();
      const verified = !!fbUser.emailVerified;
      if (verified) {
        await syncFirestoreEmailVerified(fbUser.uid);
      }
      return verified;
    } catch (e: any) {
      return rejectWithValue(e?.message || "Failed to refresh email status") as any;
    }
  },
);

export const logout = createAsyncThunk("auth/logout", async () => {
  // 1. Sign out of Firebase first.
  try {
    await signOut(firebaseAuth);
  } catch {
    // ignore Firebase signout errors
  }
  // 2. Then clear the profile cache. Nothing else.
  try {
    await AsyncStorage.removeItem(USER_CACHE_KEY);
  } catch {
    // non-fatal
  }
  // 2b. Also drop ALL per-uid profile caches (`user_profile_cache.<uid>`) so
  //     a different account signing in on the same device cannot briefly see
  //     the previous user's name/email while their fresh profile loads.
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const perUid = allKeys.filter((k) => k.startsWith(`${USER_CACHE_KEY}.`));
    if (perUid.length) await AsyncStorage.multiRemove(perUid);
  } catch {
    // non-fatal
  }
  // 3. Purge every per-user persisted slice so the next account that signs
  //    in does NOT see the previous user's chat history, assessment results
  //    or music favorites. The redux-persist keys live in AsyncStorage under
  //    `persist:<key>` (see store.ts).
  try {
    await AsyncStorage.multiRemove([
      "persist:mbipa.chat",
      "persist:mbipa.assessment",
      "persist:mbipa.music",
    ]);
  } catch {
    // non-fatal
  }
  // Legacy cleanup so older builds' SecureStore tokens don't linger.
  try {
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
    await SecureStore.deleteItemAsync("firebaseIdToken");
  } catch {}
  // Reset onboarding flag so the user sees onboarding again on next login.
  try {
    await AsyncStorage.removeItem("mbipa.hasSeenOnboarding");
  } catch {}
  return true;
});

/**
 * Fetch the canonical user document from the backend.
 *
 * Called after Firebase login / on `onAuthStateChanged` with a user.
 * Forces a fresh ID token and overwrites the AsyncStorage cache with the
 * server response. The cache is *never* used as a source of truth — it only
 * powers a faster cold-start render before this call resolves.
 */
export const fetchProfile = createAsyncThunk<User>(
  "auth/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const fbUser = firebaseAuth.currentUser;
      if (!fbUser) return rejectWithValue("Not signed in") as any;
      // Force-refresh the ID token at session start.
      const idToken = await fbUser.getIdToken(true);
      await safeSetItem("accessToken", idToken);
      await safeSetItem("firebaseIdToken", idToken);

      const backendUser = await apiFetch<Partial<User>>("/api/users/me");
      const cached = await loadCachedUser(fbUser.uid);
      const user = normalizeUser(backendUser, {
        uid: fbUser.uid,
        email: fbUser.email || cached?.email || "",
        displayName: fbUser.displayName,
        ...(cached || {}),
      });
      // Overwrite cache with the fresh canonical response.
      await persistUser(user);
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log("[auth] fetchProfile", {
          fromBackend: {
            hasPrenom: !!backendUser?.prenom,
            hasNom: !!backendUser?.nom,
            hasAvatar: !!backendUser?.avatarUrl,
          },
          fromCache: cached
            ? {
                hasPrenom: !!cached.prenom,
                hasNom: !!cached.nom,
                hasAvatar: !!cached.avatarUrl,
              }
            : null,
          merged: {
            hasPrenom: !!user.prenom,
            hasNom: !!user.nom,
            hasAvatar: !!user.avatarUrl,
          },
        });
      }
      return user;
    } catch (e: any) {
      return rejectWithValue(e?.message || "Failed to fetch profile");
    }
  },
);

/**
 * Update profile on backend + Redux + cache.
 */
/**
 * PUT /api/users/me — sends the partial updates and replaces local state
 * with the server's canonical response (NOT the values we sent). Cache is
 * overwritten with the same response.
 */
export const updateUserProfile = createAsyncThunk<
  User,
  Partial<
    Pick<User, "prenom" | "nom" | "age" | "sexe" | "localite" | "avatarUrl">
  >
>("auth/updateProfile", async (updates, { getState, rejectWithValue }) => {
  try {
    const state = getState() as { auth: AuthState };
    const current = state.auth.user;
    if (!current) return rejectWithValue("Not authenticated") as any;

    // Translate the client schema to what the backend expects:
    //   prenom + nom -> name      (single field)
    //   avatarUrl    -> avatar
    //   age/sexe/localite/email pass through unchanged.
    const payload: Record<string, unknown> = {};
    if (updates.prenom !== undefined || updates.nom !== undefined) {
      const prenom = updates.prenom ?? current.prenom ?? "";
      const nom = updates.nom ?? current.nom ?? "";
      payload.name = `${prenom} ${nom}`.trim();
    }
    if (updates.age !== undefined) payload.age = updates.age;
    if (updates.sexe !== undefined) payload.sexe = updates.sexe;
    if (updates.localite !== undefined) payload.localite = updates.localite;
    if (updates.avatarUrl !== undefined) payload.avatar = updates.avatarUrl;

    // Force-refresh the Firebase token before this critical call.
    const backendUser = await apiFetch<Partial<User>>("/api/users/me", {
      method: "PUT",
      body: payload,
      forceRefresh: true,
    });

    // Merge the user's submitted `updates` on top of the backend response so
    // the new values stick even if the backend doesn't echo them back. Then
    // fall back to the cached `current` user for any other field the server
    // didn't return.
    const merged: Partial<User> = {
      ...(backendUser || {}),
      ...updates,
    };
    const canonical = normalizeUser(merged, {
      uid: current.id,
      displayName: null,
      ...current,
      email: current.email,
    });
    await persistUser(canonical);
    return canonical;
  } catch (e: any) {
    return rejectWithValue(e?.message || "Échec de mise à jour du profil");
  }
});

/**
 * Persist preferences locally + best-effort backend sync.
 */
export const updateUserPreferences = createAsyncThunk<
  User,
  Partial<User["preferences"]>
>("auth/updatePreferences", async (prefs, { getState, rejectWithValue }) => {
  try {
    const state = getState() as { auth: AuthState };
    const current = state.auth.user;
    if (!current) return rejectWithValue("Not authenticated") as any;
    const accessToken = state.auth.accessToken;

    const merged: User = {
      ...current,
      preferences: { ...current.preferences, ...prefs },
    };

    try {
      await fetch(`${API_URL}${ENDPOINTS.USER.PREFERENCES}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(prefs),
      });
    } catch {}

    await persistUser(merged);
    return merged;
  } catch (e: any) {
    return rejectWithValue(
      e?.message || "Échec de mise à jour des préférences",
    );
  }
});

export const restoreSession = createAsyncThunk(
  "auth/restoreSession",
  async (_, { rejectWithValue }) => {
    try {
      const accessToken = await SecureStore.getItemAsync("accessToken");
      const refreshToken = await SecureStore.getItemAsync("refreshToken");
      const cached = await loadCachedUser();

      if (!accessToken) {
        return rejectWithValue("No session found");
      }

      // Best-effort backend verify; tolerate failures by using the cached user.
      let backendUser: Partial<User> | null = null;
      try {
        const response = await fetch(`${API_URL}${ENDPOINTS.USER.ME}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.ok) {
          backendUser = (await response.json()) as Partial<User>;
        }
      } catch (e) {
        console.warn("[auth] restoreSession backend check failed:", e);
      }

      const user = backendUser
        ? normalizeUser(backendUser, {
            uid: cached?.id || backendUser.id || "unknown",
            email: cached?.email || backendUser.email || "",
            displayName: null,
            ...(cached || {}),
          })
        : cached;

      if (!user) return rejectWithValue("Session expired");

      await persistUser(user);
      return { user, accessToken, refreshToken: refreshToken || "" };
    } catch (error) {
      return rejectWithValue("Failed to restore session");
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setEmailVerified: (state, action: PayloadAction<boolean>) => {
      state.isEmailVerified = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(login.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.isEmailVerified = firebaseAuth.currentUser?.emailVerified ?? false;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Register
    builder.addCase(register.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(register.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.isEmailVerified = false; // Newly registered users must verify email
      state.isEmailVerificationLoaded = true; // We know for certain: new account = unverified
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    });
    builder.addCase(register.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      return initialState;
    });

    // Update profile (replaces with canonical server response)
    builder.addCase(updateUserProfile.fulfilled, (state, action) => {
      state.user = action.payload;
    });
    builder.addCase(updateUserPreferences.fulfilled, (state, action) => {
      state.user = action.payload;
    });

    // Fetch canonical profile (called from onAuthStateChanged)
    builder.addCase(fetchProfile.fulfilled, (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    });

    // Email verification refresh
    builder.addCase(refreshEmailVerificationStatus.fulfilled, (state, action) => {
      state.isEmailVerified = !!action.payload;
      state.isEmailVerificationLoaded = true;
    });
    builder.addCase(refreshEmailVerificationStatus.rejected, (state) => {
      // Even on network error we mark as loaded so routing is never blocked
      // forever. isEmailVerified stays at its last known value.
      state.isEmailVerificationLoaded = true;
    });

    // Restore session
    builder.addCase(restoreSession.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(restoreSession.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken || null;
    });
    builder.addCase(restoreSession.rejected, (state) => {
      state.isLoading = false;
      state.isAuthenticated = false;
    });
  },
});

export const { clearError, updateUser, setEmailVerified } = authSlice.actions;
export default authSlice.reducer;
