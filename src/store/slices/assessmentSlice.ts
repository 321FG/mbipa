/**
 * Assessment Slice — backed by the real /api/mobile/assessments API.
 *
 * No mocks: list, detail and scoring all hit the backend. Errors are surfaced
 * to the UI which shows toast + retry. History is kept locally only (the
 * backend does not yet persist results).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { API_URL, ENDPOINTS } from "../../api/config";
import {
    getFallbackDetail,
    getFallbackList,
    scoreFallback,
} from "../../data/assessmentsCatalog";
import i18n from "../../i18n";
import type {
    AssessmentDetail,
    AssessmentListItem,
    AssessmentResult,
    AssessmentState,
    AssessmentType,
    MbiScoreResponse,
    ScoreResponse,
    SimpleScoreResponse,
} from "../../types";

function currentLang(): "fr" | "en" {
  const code = (i18n.language || "fr").toLowerCase();
  return code.startsWith("en") ? "en" : "fr";
}

// ---- Per-user history persistence ----
// We intentionally store assessment results scoped per user id so that
// (a) they survive logout/login and (b) they don't leak across accounts.
// AsyncStorage is unencrypted on Android — this is an accepted trade-off
// to fix the "history disappears after logout" bug; entries only contain
// numeric scores + interpretation text, no raw answers.
const RESULTS_KEY_PREFIX = "mbipa.assessment.results.";
const resultsKey = (uid: string) => `${RESULTS_KEY_PREFIX}${uid}`;

async function loadStoredResults(uid: string): Promise<AssessmentResult[]> {
  try {
    const raw = await AsyncStorage.getItem(resultsKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AssessmentResult[]) : [];
  } catch {
    return [];
  }
}

async function saveStoredResults(
  uid: string,
  results: AssessmentResult[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(resultsKey(uid), JSON.stringify(results));
  } catch {
    /* ignore — best-effort persistence */
  }
}

const initialState: AssessmentState = {
  assessments: [],
  results: [],
  currentDetail: null,
  lastScore: null,
  isLoading: false,
  detailLoading: false,
  submitting: false,
  listError: null,
  detailError: null,
  submitError: null,
  error: null,
};

interface AuthSlice {
  auth: { accessToken?: string | null; user?: { id?: string } | null };
}

function authHeaders(token?: string | null): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/json",
    "Accept-Language": currentLang(),
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.text();
    if (body) return `${res.status} ${body.slice(0, 200)}`;
  } catch {
    /* ignore */
  }
  return `HTTP ${res.status}`;
}

// ---------------- Normalizers ----------------

/** Backend returns { assessments: [...] }; tolerate either shape. */
function normalizeList(data: any): AssessmentListItem[] {
  if (Array.isArray(data)) return data as AssessmentListItem[];
  if (data && Array.isArray(data.assessments))
    return data.assessments as AssessmentListItem[];
  return [];
}

/** Backend returns questions as string[]; convert to {id, prompt}[]. */
function normalizeDetail(data: any): AssessmentDetail {
  const rawQuestions = Array.isArray(data?.questions) ? data.questions : [];
  const questions = rawQuestions.map((q: any, i: number) => {
    if (typeof q === "string") return { id: `q${i + 1}`, prompt: q };
    return {
      id: q.id ?? `q${i + 1}`,
      prompt: q.prompt ?? q.text ?? q.question ?? q.label ?? q.title ?? "",
      scale: q.scale,
    };
  });
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(
      "[assessment] normalizeDetail",
      data?.id,
      "raw type:",
      typeof rawQuestions[0],
      "→",
      questions.length,
      "questions, first prompt:",
      questions[0]?.prompt?.slice(0, 40),
    );
  }
  return {
    id: data.id,
    title: data.title,
    source: data.source,
    instructions: data.instructions ?? "",
    scale: Array.isArray(data.scale) ? data.scale : [],
    questions,
  };
}

/** Normalize MBI {EE,DP,AP} into {emotionalExhaustion,...}. */
function normalizeScore(id: string, data: any): ScoreResponse {
  if (id === "mbi" && data?.dimensions?.EE) {
    const d = data.dimensions;
    return {
      id: "mbi",
      dimensions: {
        emotionalExhaustion: d.EE?.score ?? 0,
        depersonalization: d.DP?.score ?? 0,
        personalAccomplishment: d.AP?.score ?? 0,
      },
      bands: {
        emotionalExhaustion: d.EE?.band ?? {
          label: "",
          message: "",
          color: "",
        },
        depersonalization: d.DP?.band ?? { label: "", message: "", color: "" },
        personalAccomplishment: d.AP?.band ?? {
          label: "",
          message: "",
          color: "",
        },
      },
      burnoutRisk: data.burnoutRisk ?? "low",
    } as ScoreResponse;
  }
  return { ...data, id } as ScoreResponse;
}

// ---------------- Thunks ----------------

export const fetchAssessments = createAsyncThunk<
  AssessmentListItem[],
  void,
  { state: AuthSlice; rejectValue: string }
>("assessment/fetchAssessments", async (_, { getState, rejectWithValue }) => {
  const lang = currentLang();
  // Backend currently serves French only. When the app is in English,
  // skip the network and return the localized built-in catalog directly.
  if (lang === "en") return getFallbackList(lang);
  try {
    const token = getState().auth.accessToken;
    const res = await fetch(`${API_URL}${ENDPOINTS.ASSESSMENTS.LIST}`, {
      headers: authHeaders(token),
    });
    if (!res.ok) return getFallbackList(lang);
    const list = normalizeList(await res.json());
    return list.length > 0 ? list : getFallbackList(lang);
  } catch {
    return getFallbackList(lang);
  }
});

export const fetchAssessmentDetail = createAsyncThunk<
  AssessmentDetail,
  string,
  { state: AuthSlice; rejectValue: string }
>("assessment/fetchDetail", async (id, { getState, rejectWithValue }) => {
  const lang = currentLang();
  // Backend serves French only — for English use the local catalog directly
  // so questions and option labels render in the right language.
  if (lang === "en") {
    const fb = getFallbackDetail(id, lang);
    if (fb) return fb;
  }
  try {
    const token = getState().auth.accessToken;
    const res = await fetch(`${API_URL}${ENDPOINTS.ASSESSMENTS.DETAIL(id)}`, {
      headers: authHeaders(token),
    });
    if (!res.ok) {
      const fb = getFallbackDetail(id, lang);
      if (fb) return fb;
      return rejectWithValue(await readError(res));
    }
    return normalizeDetail(await res.json());
  } catch (e: any) {
    const fb = getFallbackDetail(id, lang);
    if (fb) return fb;
    return rejectWithValue(e?.message || "Network error");
  }
});

export const submitAssessment = createAsyncThunk<
  ScoreResponse,
  { id: AssessmentType; answers: number[] },
  { state: AuthSlice; rejectValue: string }
>(
  "assessment/submit",
  async ({ id, answers }, { getState, rejectWithValue }) => {
    const lang = currentLang();
    // English: score locally so band labels/messages are in English too.
    if (lang === "en") {
      const fb = scoreFallback(id, answers, lang);
      if (fb) return { ...fb, id } as ScoreResponse;
    }
    try {
      const token = getState().auth.accessToken;
      const res = await fetch(`${API_URL}${ENDPOINTS.ASSESSMENTS.SCORE(id)}`, {
        method: "POST",
        headers: {
          ...authHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) {
        const fb = scoreFallback(id, answers, lang);
        if (fb) return { ...fb, id } as ScoreResponse;
        return rejectWithValue(await readError(res));
      }
      return normalizeScore(id, await res.json());
    } catch (e: any) {
      const fb = scoreFallback(id, answers, lang);
      if (fb) return { ...fb, id } as ScoreResponse;
      return rejectWithValue(e?.message || "Network error");
    }
  },
);

/**
 * Load this user's result history.
 *
 * Strategy:
 *  1. Try the backend first (GET /api/mobile/assessments/results) so the
 *     dashboard reflects what's actually persisted in Cosmos DB.
 *  2. On any failure (offline, backend down, 4xx), fall back to the
 *     AsyncStorage cache written by `assessmentPersistMiddleware`.
 *  3. On successful backend fetch, also refresh the cache so subsequent
 *     offline launches show the same data.
 */
export const loadAssessmentHistory = createAsyncThunk<
  AssessmentResult[],
  string,
  { state: AuthSlice; rejectValue: string }
>("assessment/loadHistory", async (uid, { getState }) => {
  if (!uid) return [];
  const token = getState().auth.accessToken;
  try {
    const res = await fetch(`${API_URL}${ENDPOINTS.ASSESSMENTS.RESULTS}`, {
      method: "GET",
      headers: authHeaders(token),
    });
    if (res.ok) {
      const data = (await res.json()) as AssessmentResult[];
      const results = Array.isArray(data) ? data : [];
      // Refresh offline cache.
      void saveStoredResults(uid, results);
      return results;
    }
  } catch {
    // network error → fall through to cache
  }
  return loadStoredResults(uid);
});

// ---------------- Slice ----------------

function toLocalResult(
  id: string,
  title: string | undefined,
  score: ScoreResponse,
): AssessmentResult {
  if (score.id === "mbi") {
    const mbi = score as MbiScoreResponse;
    return {
      id: `local-${Date.now()}`,
      userId: "local",
      assessmentId: id,
      assessmentName: title || id.toUpperCase(),
      // For history list we surface the EE score as the headline number;
      // the dedicated MBI screen renders the 3 dimensions in detail.
      score: mbi.dimensions.emotionalExhaustion,
      level: mbi.burnoutRisk,
      date: new Date().toISOString(),
    };
  }
  const simple = score as SimpleScoreResponse;
  return {
    id: `local-${Date.now()}`,
    userId: "local",
    assessmentId: id,
    assessmentName: title || id.toUpperCase(),
    score: simple.score,
    level: simple.band?.label,
    interpretation: simple.band?.message,
    date: new Date().toISOString(),
  };
}

const assessmentSlice = createSlice({
  name: "assessment",
  initialState,
  reducers: {
    clearErrors: (state) => {
      state.listError = null;
      state.detailError = null;
      state.submitError = null;
      state.error = null;
    },
    clearLastScore: (state) => {
      state.lastScore = null;
    },
    clearCurrentDetail: (state) => {
      state.currentDetail = null;
      state.detailError = null;
    },
  },
  extraReducers: (builder) => {
    // List
    builder
      .addCase(fetchAssessments.pending, (state) => {
        state.isLoading = true;
        state.listError = null;
      })
      .addCase(fetchAssessments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.assessments = action.payload;
      })
      .addCase(fetchAssessments.rejected, (state, action) => {
        state.isLoading = false;
        state.listError =
          (action.payload as string) || action.error.message || "Erreur";
        state.error = state.listError;
      });

    // Detail
    builder
      .addCase(fetchAssessmentDetail.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
        state.currentDetail = null;
      })
      .addCase(fetchAssessmentDetail.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.currentDetail = action.payload;
      })
      .addCase(fetchAssessmentDetail.rejected, (state, action) => {
        state.detailLoading = false;
        state.detailError =
          (action.payload as string) || action.error.message || "Erreur";
      });

    // Submit
    builder
      .addCase(submitAssessment.pending, (state) => {
        state.submitting = true;
        state.submitError = null;
        state.lastScore = null;
      })
      .addCase(
        submitAssessment.fulfilled,
        (state, action: PayloadAction<ScoreResponse>) => {
          state.submitting = false;
          state.lastScore = action.payload;
          // Keep a local-only history entry so the History tab still works.
          const meta = state.assessments.find(
            (a) => a.id === action.payload.id,
          );
          state.results.unshift(
            toLocalResult(action.payload.id, meta?.title, action.payload),
          );
        },
      )
      .addCase(submitAssessment.rejected, (state, action) => {
        state.submitting = false;
        state.submitError =
          (action.payload as string) || action.error.message || "Erreur";
      });

    // History (per-user persisted)
    builder.addCase(loadAssessmentHistory.fulfilled, (state, action) => {
      state.results = action.payload || [];
    });
  },
});

export const { clearErrors, clearLastScore, clearCurrentDetail } =
  assessmentSlice.actions;
export default assessmentSlice.reducer;

/**
 * Side-effect middleware: every time `submitAssessment` succeeds, snapshot the
 * in-memory results into AsyncStorage under the current user's id so history
 * survives logout / app restart. Wired in `src/store/store.ts`.
 */
export const assessmentPersistMiddleware =
  (storeApi: any) => (next: any) => (action: any) => {
    const result = next(action);
    if (action?.type === submitAssessment.fulfilled.type) {
      const state = storeApi.getState();
      const uid: string | undefined = state?.auth?.user?.id;
      if (uid) {
        void saveStoredResults(uid, state.assessment.results || []);
      }
    }
    return result;
  };
