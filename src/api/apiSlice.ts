/**
 * RTK Query API Slice
 */
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { auth as firebaseAuth } from "../config/firebase";
import type { RootState } from "../store/store";
import type {
    Assessment,
    AssessmentResult,
    Conversation,
    LiveSession,
    Message,
    MusicCategoryInfo,
    MusicTrack,
    SubscriptionPlan,
    Therapist,
    User,
} from "../types";
import { API_URL } from "./config";

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: async (headers, { getState }) => {
      let token = (getState() as RootState).auth.accessToken;
      // Fallback: get fresh Firebase ID token if Redux doesn't have one
      if (!token) {
        try {
          const user = firebaseAuth.currentUser;
          if (user) {
            token = await user.getIdToken();
          }
        } catch (e) {
          console.warn("[apiSlice] firebase getIdToken failed", e);
        }
      }
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),
  tagTypes: [
    "User",
    "Conversations",
    "Assessments",
    "Sessions",
    "Music",
    "Subscription",
  ],
  endpoints: (builder) => ({
    // User endpoints
    getUser: builder.query<User, void>({
      query: () => "/api/users/me",
      providesTags: ["User"],
    }),
    updateUser: builder.mutation<User, Partial<User>>({
      query: (data) => ({
        url: "/api/users/me",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),

    // Chat endpoints
    getConversations: builder.query<Conversation[], void>({
      query: () => "/api/chat/conversations",
      providesTags: ["Conversations"],
    }),
    getConversation: builder.query<Conversation, string>({
      query: (id) => `/api/chat/conversations/${id}`,
      providesTags: (result, error, id) => [{ type: "Conversations", id }],
    }),
    sendMessage: builder.mutation<
      Message,
      { content: string; conversationId?: string }
    >({
      query: (data) => ({
        url: "/api/chat/message",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Conversations"],
    }),

    // Assessment endpoints
    getAssessments: builder.query<Assessment[], void>({
      query: () => "/api/assessments",
      providesTags: ["Assessments"],
    }),
    getAssessmentHistory: builder.query<AssessmentResult[], void>({
      query: () => "/api/assessments/history",
      providesTags: ["Assessments"],
    }),
    submitAssessment: builder.mutation<
      AssessmentResult,
      { type: string; answers: Array<{ questionId: number; value: number }> }
    >({
      query: ({ type, answers }) => ({
        url: `/api/assessments/${type}/submit`,
        method: "POST",
        body: { answers },
      }),
      invalidatesTags: ["Assessments"],
    }),

    // Session endpoints
    getTherapists: builder.query<Therapist[], void>({
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      queryFn: async (_arg, _api, _extra, baseQuery) => {
        const { MOCK_THERAPISTS } = require("../data/therapistsMock");
        // Specific avatar overrides per therapist id (Black African professionals).
        const AVATAR_BY_ID: Record<string, string> = {
          th_001:
            "https://images.unsplash.com/photo-1573497019418-b400bb3ab074?w=400&h=400&fit=crop&crop=face", // Aline Mbeti — femme africaine pro
          th_002:
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face", // Jean-Claude Ngoma — homme noir africain professionnel
          th_003:
            "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=face", // (legacy)
        };
        // Curated portraits pool (Black African professionals, Unsplash).
        const AVATAR_POOL = [
          "https://images.unsplash.com/photo-1573497019418-b400bb3ab074?w=400&h=400&fit=crop&crop=face", // femme africaine pro
          "https://images.unsplash.com/photo-1556157382-97eda2d62296?w=400&h=400&fit=crop&crop=face", // homme africain costume
          "https://images.unsplash.com/photo-1542206395-9feb3edaa68d?w=400&h=400&fit=crop&crop=face", // homme africain souriant
          "https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=400&h=400&fit=crop&crop=face", // femme africaine souriante
          "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face", // femme africaine portrait
        ];
        const pickAvatar = (id: string): string => {
          if (AVATAR_BY_ID[id]) return AVATAR_BY_ID[id];
          let h = 0;
          for (let i = 0; i < id.length; i++)
            h = (h * 31 + id.charCodeAt(i)) >>> 0;
          return AVATAR_POOL[h % AVATAR_POOL.length];
        };
        try {
          const result = await baseQuery("/api/sessions/therapists");
          const raw = result.data as any[] | undefined;
          if (Array.isArray(raw) && raw.length > 0) {
            // Normalize backend shape (name/specialty) -> app shape (prenom/nom/specializations[])
            const normalized: Therapist[] = raw.map((t: any) => {
              const fullName: string = String(
                t.name || `${t.prenom ?? ""} ${t.nom ?? ""}`,
              ).trim();
              const cleaned = fullName.replace(/^Dr\.?\s+/i, "").trim();
              const parts = cleaned ? cleaned.split(/\s+/) : [];
              const prenom = t.prenom || parts[0] || "";
              const nom =
                t.nom || (parts.length > 1 ? parts.slice(1).join(" ") : "");
              const specializations: string[] = Array.isArray(t.specializations)
                ? t.specializations
                : typeof t.specialty === "string"
                  ? t.specialty
                      .split(/[\u2014\u2013\-,]/)
                      .map((s: string) => s.trim())
                      .filter(Boolean)
                  : [];
              const backendAvatar = t.avatarUrl || t.avatar;
              const avatarUrl =
                backendAvatar && !String(backendAvatar).includes("pravatar")
                  ? backendAvatar
                  : pickAvatar(t.id || prenom);
              return {
                id: t.id,
                prenom,
                nom,
                specializations,
                bio: t.bio ?? "",
                avatarUrl,
                rating: typeof t.rating === "number" ? t.rating : 0,
                reviewsCount:
                  typeof t.reviewsCount === "number" ? t.reviewsCount : 0,
                available: t.available !== false,
                hourlyRate: typeof t.hourlyRate === "number" ? t.hourlyRate : 0,
                country: typeof t.country === "string" ? t.country : "CD",
                languages: Array.isArray(t.languages)
                  ? t.languages
                  : ["Français"],
                sessionDuration:
                  typeof t.sessionDuration === "number"
                    ? t.sessionDuration
                    : 60,
                isDemo:
                  t.isDemo === true ||
                  !t.id ||
                  String(t.id).startsWith("th_") ||
                  String(t.id).startsWith("mock-"),
              } as Therapist;
            });
            return { data: normalized };
          }
        } catch {
          // ignore — fall through to mocks
        }
        return { data: MOCK_THERAPISTS as Therapist[] };
      },
      providesTags: ["Sessions"],
    }),
    getUpcomingSessions: builder.query<LiveSession[], void>({
      query: () => "/api/sessions/upcoming",
      providesTags: ["Sessions"],
    }),
    bookSession: builder.mutation<
      LiveSession,
      {
        therapistId: string;
        type: string;
        scheduledAt: string;
        duration: number;
        notes?: string;
      }
    >({
      query: (data) => ({
        url: "/api/sessions/book",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Sessions"],
    }),

    // Music endpoints
    getMusicCategories: builder.query<MusicCategoryInfo[], void>({
      query: () => "/api/music/categories",
      providesTags: ["Music"],
    }),
    getTracksByCategory: builder.query<MusicTrack[], string>({
      query: (category) => `/api/music/${category}`,
      providesTags: ["Music"],
    }),
    getFavorites: builder.query<MusicTrack[], void>({
      query: () => "/api/music/favorites",
      providesTags: ["Music"],
    }),
    toggleFavorite: builder.mutation<
      void,
      { trackId: string; isFavorite: boolean }
    >({
      query: ({ trackId, isFavorite }) => ({
        url: isFavorite
          ? `/api/music/favorites/${trackId}`
          : "/api/music/favorites",
        method: isFavorite ? "DELETE" : "POST",
        body: isFavorite ? undefined : { trackId },
      }),
      invalidatesTags: ["Music"],
    }),

    // Subscription endpoints
    getPlans: builder.query<SubscriptionPlan[], void>({
      query: () => "/api/subscription/plans",
      providesTags: ["Subscription"],
    }),
    getSubscriptionStatus: builder.query<SubscriptionPlan, void>({
      query: () => "/api/subscription/status",
      providesTags: ["Subscription"],
    }),
    createSubscription: builder.mutation<
      SubscriptionPlan,
      { planId: string; paymentMethodId: string; billing: string }
    >({
      query: (data) => ({
        url: "/api/subscription/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Subscription"],
    }),
  }),
});

export const {
  useGetUserQuery,
  useUpdateUserMutation,
  useGetConversationsQuery,
  useGetConversationQuery,
  useSendMessageMutation,
  useGetAssessmentsQuery,
  useGetAssessmentHistoryQuery,
  useSubmitAssessmentMutation,
  useGetTherapistsQuery,
  useGetUpcomingSessionsQuery,
  useBookSessionMutation,
  useGetMusicCategoriesQuery,
  useGetTracksByCategoryQuery,
  useGetFavoritesQuery,
  useToggleFavoriteMutation,
  useGetPlansQuery,
  useGetSubscriptionStatusQuery,
  useCreateSubscriptionMutation,
} = apiSlice;
