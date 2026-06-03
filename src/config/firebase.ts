/**
 * Firebase configuration (Web SDK + React Native persistence)
 * Uses EXPO_PUBLIC_FIREBASE_* env variables.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import {
    Auth,
    getAuth,
    // @ts-ignore - getReactNativePersistence is exported but not in web typings
    getReactNativePersistence,
    initializeAuth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
};

const app: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // initializeAuth throws if already initialized (Fast Refresh)
  auth = getAuth(app);
}

export { app, auth };

