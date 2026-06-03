/**
 * Redux Store Configuration
 *
 * Persistence strategy:
 *  - chat / assessment / music slices are persisted to AsyncStorage via
 *    redux-persist so that conversations, test results and favorites survive
 *    app restarts even when the backend endpoints are not yet available.
 *  - auth tokens stay in expo-secure-store (handled inside authSlice).
 *  - RTK Query cache (apiSlice) is intentionally NOT persisted.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {
    FLUSH,
    PAUSE,
    PERSIST,
    persistReducer,
    persistStore,
    PURGE,
    REGISTER,
    REHYDRATE,
} from "redux-persist";
import { apiSlice } from "../api/apiSlice";
import assessmentReducer, {
    assessmentPersistMiddleware,
} from "./slices/assessmentSlice";
import authReducer from "./slices/authSlice";
import chatReducer from "./slices/chatSlice";
import musicReducer from "./slices/musicSlice";
import sessionReducer from "./slices/sessionSlice";

const chatPersist = {
  key: "mbipa.chat",
  storage: AsyncStorage,
  whitelist: ["conversations", "currentConversation"],
};
// NOTE: assessment results are NOT persisted on disk on purpose.
// They contain sensitive mental-health data (PHQ-9, GAD-7 scores) and
// AsyncStorage is not encrypted on Android. Results are re-fetched from the
// backend on demand. We only persist the lightweight test catalog if needed.
const musicPersist = {
  key: "mbipa.music",
  storage: AsyncStorage,
  whitelist: ["favorites"],
};

const appReducer = combineReducers({
  auth: authReducer,
  chat: persistReducer(chatPersist, chatReducer),
  assessment: assessmentReducer,
  session: sessionReducer,
  music: persistReducer(musicPersist, musicReducer),
  [apiSlice.reducerPath]: apiSlice.reducer,
});

/**
 * Root reducer wrapper. On `auth/logout/fulfilled` we wipe every per-user
 * slice (chat conversations, assessment results, music favorites, session,
 * RTK Query cache) so the next account that signs in starts clean.
 *
 * Without this, redux-persist would re-hydrate the previous user's data on
 * the next launch even though their token has been cleared.
 */
const rootReducer: typeof appReducer = (state, action) => {
  if (action.type === "auth/logout/fulfilled") {
    // Drop every slice except auth (auth is reset by its own reducer).
    return appReducer(undefined, action);
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(apiSlice.middleware, assessmentPersistMiddleware),
  devTools: __DEV__,
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
