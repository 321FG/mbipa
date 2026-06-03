/**
 * Mbipa API Configuration
 */

// API Base URL
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net";
export const API_VERSION = "v1";

// API Endpoints
export const ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    REFRESH: "/api/auth/refresh",
    LOGOUT: "/api/auth/logout",
    FORGOT_PASSWORD: "/api/auth/forgot-password",
    RESET_PASSWORD: "/api/auth/reset-password",
    MOBILE: "/api/mobile/auth",
  },

  // User
  USER: {
    ME: "/api/users/me",
    UPDATE: "/api/users/me",
    STATS: "/api/users/stats",
    PREFERENCES: "/api/users/preferences",
  },

  // Chat
  CHAT: {
    MESSAGE: "/api/chat/message",
    VOICE: "/api/chat/voice",
    HISTORY: "/api/chat/history",
    CONVERSATION: (id: string) => `/api/chat/conversations/${id}`,
    CONVERSATIONS: "/api/chat/conversations",
  },

  // Assessments (mobile API — backend computes scoring & bands, persists results)
  ASSESSMENTS: {
    LIST: "/api/mobile/assessments",
    DETAIL: (id: string) => `/api/mobile/assessments/${id}`,
    SCORE: (id: string) => `/api/mobile/assessments/${id}/score`,
    RESULTS: "/api/mobile/assessments/results",
    RESULT: (resultId: string) => `/api/mobile/assessments/results/${resultId}`,
  },

  // Live Sessions
  SESSIONS: {
    THERAPISTS: "/api/sessions/therapists",
    THERAPIST: (id: string) => `/api/sessions/therapists/${id}`,
    BOOK: "/api/sessions/book",
    UPCOMING: "/api/sessions/upcoming",
    HISTORY: "/api/sessions/history",
    JOIN: (id: string) => `/api/sessions/${id}/join`,
    LEAVE: (id: string) => `/api/sessions/${id}/leave`,
    RATE: (id: string) => `/api/sessions/${id}/rate`,
  },

  // Music
  MUSIC: {
    CATEGORIES: "/api/music/categories",
    TRACKS: (category: string) => `/api/music/${category}`,
    FAVORITES: "/api/music/favorites",
    ADD_FAVORITE: "/api/music/favorites",
    REMOVE_FAVORITE: (id: string) => `/api/music/favorites/${id}`,
    RECOMMENDATIONS: "/api/music/recommendations",
  },

  // Subscription
  SUBSCRIPTION: {
    PLANS: "/api/subscription/plans",
    CREATE: "/api/subscription/create",
    CANCEL: "/api/subscription/cancel",
    STATUS: "/api/subscription/status",
    PAYMENT_INTENT: "/api/subscription/payment-intent",
  },

  // Vision (emotional check-in via Azure Vision — non-medical)
  VISION: {
    ANALYZE: "/api/mobile/vision/analyze",
  },
};

// SignalR Hubs
export const SIGNALR_HUBS = {
  CHAT: "/hubs/chat",
  SESSION: "/hubs/session",
  NOTIFICATION: "/hubs/notification",
};

// Azure Speech Configuration
export const AZURE_SPEECH = {
  KEY: process.env.EXPO_PUBLIC_AZURE_SPEECH_KEY || "",
  REGION: process.env.EXPO_PUBLIC_AZURE_SPEECH_REGION || "westus2",
  AVATAR: {
    CHARACTER: "lisa",
    STYLE: "graceful",
    VOICE_FR: "fr-FR-DeniseNeural",
    VOICE_EN: "en-US-JennyNeural",
  },
};

// Stripe Configuration
export const STRIPE = {
  PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
};

// App Configuration
export const APP_CONFIG = {
  NAME: "Mbipa",
  VERSION: "1.0.0",
  DEFAULT_LANGUAGE: "fr" as const,
  SUPPORTED_LANGUAGES: ["fr", "en"] as const,

  // Limits for free plan
  FREE_LIMITS: {
    MESSAGES_PER_DAY: 3,
    TESTS_PER_WEEK: 1,
    SESSIONS_PER_MONTH: 0,
  },

  // Session durations (in minutes)
  SESSION_DURATIONS: [30, 45, 60],

  // Assessment types
  ASSESSMENT_TYPES: ["who5", "wemwbs", "mbi"] as const,
};
