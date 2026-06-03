/**
 * Mbipa TypeScript Types
 */

// ============ USER TYPES ============

export interface UserPreferences {
  language: "fr" | "en" | "sg";
  notifications: boolean;
  voiceGender: "female" | "male";
  /** Ami d'échange choisi par l'utilisateur. */
  companion?: "bagaza" | "yassingou";
  /** Objectif principal choisi à l'inscription. */
  goal?: "stress" | "sleep" | "anxiety" | "burnout" | "focus" | "wellbeing";
}

export interface UserStats {
  messagesCount: number;
  testsCompleted: number;
  sessionsAttended: number;
  streak: number;
  lastActiveAt: string;
}

export interface Subscription {
  plan: "free" | "premium" | "pro";
  stripeCustomerId?: string;
  expiresAt?: string;
}

export interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  age: number;
  sexe: "homme" | "femme" | "autre";
  localite: string;
  subscription: Subscription;
  preferences: UserPreferences;
  stats: UserStats;
  createdAt: string;
  avatarUrl?: string;
}

// ============ AUTH TYPES ============

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  age?: number;
  sexe?: "homme" | "femme" | "autre";
  localite?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// ============ CHAT TYPES ============

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  role: "user" | "assistant" | "system";
  content: string;
  lang?: "fr" | "en" | "sg";
  audioUrl?: string;
  timestamp: string;
  createdAt?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title?: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageRequest {
  content: string;
  conversationId?: string;
  isVoice?: boolean;
  audioData?: string;
}

// ============ ASSESSMENT TYPES ============

export type AssessmentType = "who5" | "wemwbs" | "mbi";

export interface AssessmentQuestion {
  id: string;
  text: string;
  options: AssessmentOption[];
}

export interface AssessmentOption {
  value: number;
  label: string;
}

export interface Assessment {
  id: string;
  name: string;
  description: string;
  questionCount: number;
  duration: number;
  color?: string;
  icon?: string;
  isPremium: boolean;
  category: string;
  questions?: AssessmentQuestion[];
}

export interface AssessmentAnswer {
  questionId: string;
  value: number;
}

export interface AssessmentResult {
  id: string;
  userId: string;
  assessmentId: string;
  assessmentName?: string;
  score: number;
  date: string;
  level?: string;
  interpretation?: string;
  answers?: AssessmentAnswer[];
}

export interface MBIResult extends AssessmentResult {
  dimensions: {
    emotionalExhaustion: number;
    depersonalization: number;
    personalAccomplishment: number;
  };
}

// ---- Mobile API contract (/api/mobile/assessments) ----

/** A single option on the response scale. */
export interface ScaleOption {
  value: number;
  label: string;
}

/** A question as returned by the backend. */
export interface AssessmentDetailQuestion {
  /** Optional stable id (e.g. "who5_1"). Falls back to index if absent. */
  id?: string;
  /** Question text shown to the user. */
  prompt: string;
  /** Optional per-question scale override; defaults to detail.scale. */
  scale?: ScaleOption[];
}

/** GET /api/mobile/assessments — single list item. */
export interface AssessmentListItem {
  id: string; // who5 | wemwbs | mbi
  title: string;
  subtitle?: string;
  source?: string; // e.g. "WHO (1998)" — shown as "Source: ..."
}

/** GET /api/mobile/assessments/:id — full questionnaire. */
export interface AssessmentDetail {
  id: string;
  title: string;
  source?: string;
  instructions: string;
  scale: ScaleOption[];
  questions: AssessmentDetailQuestion[];
}

/** Common band returned with every score. */
export interface AssessmentBand {
  label: string;
  message: string;
  color: string;
}

/** POST /api/mobile/assessments/who5|wemwbs/score response. */
export interface SimpleScoreResponse {
  id: "who5" | "wemwbs";
  score: number;
  max?: number;
  band: AssessmentBand;
}

export type BurnoutRisk = "low" | "moderate" | "high";

/** POST /api/mobile/assessments/mbi/score response. */
export interface MbiScoreResponse {
  id: "mbi";
  dimensions: {
    emotionalExhaustion: number;
    depersonalization: number;
    personalAccomplishment: number;
  };
  bands: {
    emotionalExhaustion: AssessmentBand;
    depersonalization: AssessmentBand;
    personalAccomplishment: AssessmentBand;
  };
  burnoutRisk: BurnoutRisk;
}

export type ScoreResponse = SimpleScoreResponse | MbiScoreResponse;

// ============ LIVE SESSION TYPES ============

export interface Therapist {
  id: string;
  nom: string;
  prenom: string;
  specializations: string[];
  bio: string;
  avatarUrl: string;
  rating: number;
  reviewsCount: number;
  available: boolean;
  hourlyRate: number;
  /** ISO country code (e.g. "CD", "CM", "FR"). Optional. */
  country?: string;
  /** Spoken languages (e.g. ["Français", "Lingala"]). Optional. */
  languages?: string[];
  /** Session duration in minutes. Defaults to 60. */
  sessionDuration?: number;
  /** True when the profile is a demo placeholder (no real booking). */
  isDemo?: boolean;
}

export type SessionType = "video" | "audio" | "chat";
export type SessionStatus =
  | "scheduled"
  | "in-progress"
  | "completed"
  | "cancelled";

export interface LiveSession {
  id: string;
  userId: string;
  therapistId: string;
  therapist?: Therapist;
  type: SessionType;
  status: SessionStatus;
  scheduledAt: string;
  duration: number; // in minutes
  notes?: string;
  rating?: number;
  createdAt: string;
}

export interface BookSessionRequest {
  therapistId: string;
  type: SessionType;
  scheduledAt: string;
  duration: number;
}

// ============ MUSIC TYPES ============

export interface MusicCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist?: string;
  category: string;
  duration: number; // in seconds
  /** Direct audio URL (legacy / backend tracks). */
  url?: string;
  /** YouTube video ID (used by the in-app YouTube player). */
  youtubeId?: string;
  color?: string;
  thumbnailUrl?: string;
  isFavorite?: boolean;
}

export interface MusicCategoryInfo {
  id: MusicCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  tracksCount: number;
}

// ============ SUBSCRIPTION TYPES ============

export interface SubscriptionPlan {
  id: "free" | "premium" | "pro";
  name: string;
  price: number;
  priceYearly?: number;
  currency: string;
  interval?: "month" | "year";
  features: string[];
  limits: {
    messagesPerDay: number | "unlimited";
    testsPerWeek: number | "unlimited";
    liveSessionsPerMonth: number | "unlimited";
    avatarQuality: "sd" | "hd";
  };
  recommended?: boolean;
}

export interface CreateSubscriptionRequest {
  planId: string;
  paymentMethodId: string;
  billing: "monthly" | "yearly";
}

// ============ API RESPONSE TYPES ============

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============ APP STATE TYPES ============

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  isLoading: boolean;
  isSending: boolean;
  isTyping: boolean;
  error: string | null;
}

export interface AssessmentState {
  /** List from GET /api/mobile/assessments. */
  assessments: AssessmentListItem[];
  /** Local-only history of past results (no backend storage). */
  results: AssessmentResult[];
  /** Detail for the currently opened assessment. */
  currentDetail: AssessmentDetail | null;
  /** Last score response (used by the result screen). */
  lastScore: ScoreResponse | null;
  isLoading: boolean; // list loading
  detailLoading: boolean;
  submitting: boolean;
  listError: string | null;
  detailError: string | null;
  submitError: string | null;
  /** Kept for backward-compat with callers reading state.assessment.error. */
  error: string | null;
}

export interface SessionState {
  therapists: Therapist[];
  sessions: LiveSession[];
  currentSession: LiveSession | null;
  isLoading: boolean;
  error: string | null;
}

export interface MusicState {
  categories: MusicCategoryInfo[];
  tracks: MusicTrack[];
  favorites: MusicTrack[];
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface SubscriptionState {
  plans: SubscriptionPlan[];
  currentPlan: SubscriptionPlan | null;
  isLoading: boolean;
  error: string | null;
}

// ============ NAVIGATION TYPES ============

export type RootStackParamList = {
  "(tabs)": undefined;
  "(auth)": undefined;
  modal: undefined;
  "chat/[id]": { id: string };
  "assessment/[type]": { type: AssessmentType };
  "therapist/[id]": { id: string };
  "session/[id]": { id: string };
};
