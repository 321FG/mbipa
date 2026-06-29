import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import "react-native-reanimated";
import { Provider, useSelector } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import { installMockApi } from "@/src/api/mock";
import MeshBackground from "@/src/components/Auth/MeshBackground";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import { AppUpdateGate } from "@/src/components/Update";
import { auth as firebaseAuth } from "@/src/config/firebase";
import { initI18n } from "@/src/i18n";
import { loadAssessmentHistory } from "@/src/store/slices/assessmentSlice";
import {
    fetchProfile,
    migrateLegacyUserCache,
  refreshEmailVerificationStatus,
    restoreSession,
  setEmailVerified,
} from "@/src/store/slices/authSlice";
import { persistor, store, type RootState } from "@/src/store/store";
import { loadStoredThemeMode, paperTheme } from "@/src/theme";
import { useColorScheme } from "react-native";

// Install mock API early (no-op if EXPO_PUBLIC_USE_MOCK !== 'true')
installMockApi();

export const unstable_settings = {
  anchor: "(tabs)",
};

// Custom Paper theme with Mbipa colors
const customPaperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...paperTheme.colors,
  },
};

function AppContent() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const isEmailVerified = useSelector((s: RootState) => s.auth.isEmailVerified);
  const isEmailVerificationLoaded = useSelector((s: RootState) => s.auth.isEmailVerificationLoaded);
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const userEmail = useSelector((s: RootState) => s.auth.user?.email);
  const segments = useSegments();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // Fast-path startup: don't block the first render on long-running
    // background tasks such as restoreSession(). We eagerly mark the app
    // ready so the navigator can mount; heavy work runs afterwards.
    let mounted = true;
    (async () => {
      try {
        const [i18nResult, , seen] = await Promise.all([
          initI18n(),
          migrateLegacyUserCache(),
          AsyncStorage.getItem("mbipa.hasSeenOnboarding"),
          loadStoredThemeMode(),
        ]);
        if (!mounted) return;
        setHasSeenOnboarding((seen as string) === "1");
      } catch {
        // ignore — we'll continue to app
      } finally {
        if (mounted) setIsReady(true);
      }

      // Restore session after the UI is able to render. This avoids the
      // blank/white screen seen on cold installs where rehydration + network
      // work blocks the main render loop.
      try {
        await store.dispatch(restoreSession());
      } catch {
        // non-fatal
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Single source of truth for "is the user signed in?" — Firebase.
  // On every auth-state change with a user, fetch the canonical profile
  // from the backend (overwrites the AsyncStorage cache).
  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (fbUser) => {
      if (fbUser) {
        // Fast-path: immediately reflect the token's emailVerified claim so
        // the routing effect doesn't make a wrong decision while the async
        // reload() network call is in flight.
        if (fbUser.emailVerified) {
          store.dispatch(setEmailVerified(true));
        }
        store.dispatch(fetchProfile());
        store.dispatch(refreshEmailVerificationStatus());
      } else {
        store.dispatch(setEmailVerified(false));
      }
    });
    return () => unsub();
  }, []);

  // Hourly Firebase ID token refresh while signed in.
  useEffect(() => {
    if (!isAuthenticated) return;
    const id = setInterval(
      () => {
        firebaseAuth.currentUser?.getIdToken(true).catch(() => {});
      },
      60 * 60 * 1000,
    );
    return () => clearInterval(id);
  }, [isAuthenticated]);

  // Restore this user's assessment history from disk every time the
  // user id changes (initial restore, login, account switch).
  useEffect(() => {
    if (!userId) return;
    store.dispatch(loadAssessmentHistory(userId));
  }, [userId]);

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    // Defer one tick so the navigation root is fully mounted before we
    // try to redirect across route groups (avoids silently-dropped
    // router.replace calls right after login).
    const t = setTimeout(async () => {
      const inAuthGroup = segments[0] === "(auth)";
      const authScreen = inAuthGroup ? segments[1] : undefined;
      // Legal pages (terms, privacy, etc.) are public — viewable without
      // being signed in (e.g. from the register screen before accepting).
      const inPublicGroup = segments[0] === "legal";
      if (isAuthenticated && inAuthGroup) {
        if (isEmailVerified) {
          // Verified users should never be stuck on auth screens.
          router.replace("/(tabs)");
        } else if (isEmailVerificationLoaded && authScreen !== "verify-email") {
          // Only redirect to verify-email AFTER Firebase reload confirmed
          // they are not verified. Without this guard, a race between
          // fetchProfile (sets isAuthenticated=true) and
          // refreshEmailVerificationStatus (sets isEmailVerified) causes
          // verified users to briefly land on verify-email.
          router.replace("/(auth)/verify-email");
        }
        // If !isEmailVerificationLoaded: reload() still in flight — stay put.
      } else if (!isAuthenticated && !inAuthGroup && !inPublicGroup) {
        // Logged out / never logged in but on a protected screen.
        router.replace(
          hasSeenOnboarding ? "/(auth)/login" : "/(auth)/onboarding",
        );
      } else if (
        !isAuthenticated &&
        inAuthGroup &&
        !hasSeenOnboarding &&
        authScreen !== "onboarding"
      ) {
        // Re-read the flag from disk: the onboarding screen may have just
        // written "1" before navigating, before our React state caught up.
        const seen = await AsyncStorage.getItem("mbipa.hasSeenOnboarding");
        if (cancelled) return;
        if (seen === "1") {
          // Sync state, do NOT bounce the user back to onboarding.
          setHasSeenOnboarding(true);
          return;
        }
        // Truly never seen onboarding (e.g. fresh install landing on /login).
        router.replace("/(auth)/onboarding");
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isReady, isAuthenticated, isEmailVerified, isEmailVerificationLoaded, hasSeenOnboarding, segments]);

  // On logout, re-read the onboarding flag so users see onboarding again
  // (the logout thunk clears the flag in AsyncStorage).
  const wasAuthenticated = useRef(isAuthenticated);
  useEffect(() => {
    if (wasAuthenticated.current && !isAuthenticated) {
      AsyncStorage.getItem("mbipa.hasSeenOnboarding").then((seen) => {
        setHasSeenOnboarding(seen === "1");
      });
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated]);

  // Refresh current plan whenever the user logs in.
  useEffect(() => {
    // No-op: app is fully free; subscription state intentionally unused.
  }, [isAuthenticated, userId, userEmail]);

  // App resume hook reserved for future background refresh logic.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      appState.current = next;
    });
    return () => sub.remove();
  }, [userId, userEmail]);

  if (!isReady) {
    return null; // Or a loading screen
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="assessment/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
        <Stack.Screen name="therapist/index" options={{ headerShown: false }} />
        <Stack.Screen name="legal/privacy" options={{ headerShown: false }} />
        <Stack.Screen name="legal/terms" options={{ headerShown: false }} />
        <Stack.Screen name="legal/about" options={{ headerShown: false }} />
        <Stack.Screen name="legal/help" options={{ headerShown: false }} />
        <Stack.Screen name="legal/contact" options={{ headerShown: false }} />
        <Stack.Screen name="error" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      {/* In-app update system (optional/forced update + What's new).
          Additive, non-blocking; renders nothing when up to date. */}
      <AppUpdateGate />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      {/* Render a minimal loading surface while redux-persist rehydrates
          so the user never sees a plain white screen on cold start. */}
      <ErrorBoundary>
        <PersistGate loading={<MeshBackground />} persistor={persistor}>
          <PaperProvider theme={customPaperTheme}>
            <AppContent />
          </PaperProvider>
        </PersistGate>
      </ErrorBoundary>
    </Provider>
  );
}
