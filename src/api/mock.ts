/**
 * Mock API layer
 * Activated when EXPO_PUBLIC_USE_MOCK === 'true'
 * Intercepts global fetch for any URL targeting our API and returns mock data.
 */

import { API_URL } from "./config";

const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === "true";

// ============ MOCK DATA ============

const MOCK_USER = {
  id: "mock-user-1",
  email: "demo@mbipa.app",
  nom: "Dupont",
  prenom: "Marie",
  age: 32,
  sexe: "femme",
  localite: "Paris",
  subscription: {
    plan: "premium",
    expiresAt: "2026-12-31T00:00:00.000Z",
  },
  preferences: {
    language: "fr",
    notifications: true,
    voiceGender: "female",
  },
  stats: {
    messagesCount: 42,
    testsCompleted: 5,
    sessionsAttended: 2,
    streak: 7,
    lastActiveAt: new Date().toISOString(),
  },
  createdAt: "2026-01-15T10:00:00.000Z",
  avatarUrl: undefined,
};

const MOCK_AUTH_RESPONSE = {
  user: MOCK_USER,
  accessToken: "mock-access-token-" + Date.now(),
  refreshToken: "mock-refresh-token-" + Date.now(),
};

const MOCK_ASSESSMENTS = [
  {
    id: "who5",
    name: "WHO-5 Bien-être",
    description:
      "Évaluez votre bien-être général sur les 2 dernières semaines.",
    questionCount: 5,
    duration: 3,
    color: "#4CAF50",
    icon: "heart-pulse",
    isPremium: false,
    category: "bien-être",
  },
  {
    id: "wemwbs",
    name: "WEMWBS",
    description: "Échelle de bien-être mental de Warwick-Edinburgh.",
    questionCount: 14,
    duration: 7,
    color: "#2196F3",
    icon: "brain",
    isPremium: false,
    category: "bien-être",
  },
  {
    id: "mbi",
    name: "MBI - Burnout",
    description: "Inventaire de Maslach pour le burnout professionnel.",
    questionCount: 22,
    duration: 10,
    color: "#FF5722",
    icon: "fire",
    isPremium: true,
    category: "professionnel",
  },
];

const MOCK_ASSESSMENT_QUESTIONS: Record<string, any> = {
  who5: {
    ...MOCK_ASSESSMENTS[0],
    questions: [
      {
        id: "q1",
        text: "Je me suis senti(e) bien et de bonne humeur",
        options: who5Options(),
      },
      {
        id: "q2",
        text: "Je me suis senti(e) calme et tranquille",
        options: who5Options(),
      },
      {
        id: "q3",
        text: "Je me suis senti(e) plein(e) d'énergie et vigoureux(se)",
        options: who5Options(),
      },
      {
        id: "q4",
        text: "Je me suis réveillé(e) frais(che) et reposé(e)",
        options: who5Options(),
      },
      {
        id: "q5",
        text: "Ma vie quotidienne a été remplie de choses intéressantes",
        options: who5Options(),
      },
    ],
  },
  wemwbs: {
    ...MOCK_ASSESSMENTS[1],
    questions: Array.from({ length: 14 }, (_, i) => ({
      id: `q${i + 1}`,
      text: `Question WEMWBS ${i + 1}`,
      options: wemwbsOptions(),
    })),
  },
  mbi: {
    ...MOCK_ASSESSMENTS[2],
    questions: Array.from({ length: 22 }, (_, i) => ({
      id: `q${i + 1}`,
      text: `Question MBI ${i + 1}`,
      options: mbiOptions(),
    })),
  },
};

function who5Options() {
  return [
    { value: 0, label: "Jamais" },
    { value: 1, label: "De temps en temps" },
    { value: 2, label: "Moins de la moitié du temps" },
    { value: 3, label: "Plus de la moitié du temps" },
    { value: 4, label: "La plupart du temps" },
    { value: 5, label: "Tout le temps" },
  ];
}
function wemwbsOptions() {
  return [
    { value: 1, label: "Jamais" },
    { value: 2, label: "Rarement" },
    { value: 3, label: "Parfois" },
    { value: 4, label: "Souvent" },
    { value: 5, label: "Tout le temps" },
  ];
}
function mbiOptions() {
  return [
    { value: 0, label: "Jamais" },
    { value: 1, label: "Quelques fois par an" },
    { value: 2, label: "Une fois par mois" },
    { value: 3, label: "Quelques fois par mois" },
    { value: 4, label: "Une fois par semaine" },
    { value: 5, label: "Quelques fois par semaine" },
    { value: 6, label: "Chaque jour" },
  ];
}

const MOCK_THERAPISTS = [
  {
    id: "t1",
    nom: "Martin",
    prenom: "Sophie",
    specializations: ["Anxiété", "Burnout", "TCC"],
    bio: "Psychologue clinicienne avec 10 ans d'expérience.",
    avatarUrl: "https://i.pravatar.cc/150?img=47",
    rating: 4.9,
    reviewsCount: 128,
    available: true,
    hourlyRate: 80,
  },
  {
    id: "t2",
    nom: "Bernard",
    prenom: "Lucas",
    specializations: ["Dépression", "Couple", "Famille"],
    bio: "Thérapeute spécialisé en thérapie de couple.",
    avatarUrl: "https://i.pravatar.cc/150?img=12",
    rating: 4.8,
    reviewsCount: 96,
    available: true,
    hourlyRate: 90,
  },
  {
    id: "t3",
    nom: "Lefebvre",
    prenom: "Camille",
    specializations: ["Stress", "Mindfulness", "Trauma"],
    bio: "Approche intégrative et pleine conscience.",
    avatarUrl: "https://i.pravatar.cc/150?img=32",
    rating: 5.0,
    reviewsCount: 64,
    available: false,
    hourlyRate: 100,
  },
];

const MOCK_MUSIC_CATEGORIES = [
  {
    id: "meditation",
    name: "Méditation",
    description: "Sons pour méditer",
    icon: "meditation",
    color: "#9C27B0",
    tracksCount: 12,
  },
  {
    id: "sleep",
    name: "Sommeil",
    description: "Pour bien dormir",
    icon: "sleep",
    color: "#3F51B5",
    tracksCount: 8,
  },
  {
    id: "focus",
    name: "Concentration",
    description: "Améliorer le focus",
    icon: "brain",
    color: "#009688",
    tracksCount: 10,
  },
  {
    id: "nature",
    name: "Nature",
    description: "Sons de la nature",
    icon: "tree",
    color: "#4CAF50",
    tracksCount: 15,
  },
];

const MOCK_TRACKS = [
  {
    id: "tr1",
    title: "Pluie douce",
    artist: "Nature Sounds",
    category: "nature",
    duration: 600,
    color: "#4CAF50",
  },
  {
    id: "tr2",
    title: "Méditation guidée",
    artist: "Mbipa",
    category: "meditation",
    duration: 900,
    color: "#9C27B0",
  },
  {
    id: "tr3",
    title: "Vagues de l'océan",
    artist: "Nature Sounds",
    category: "sleep",
    duration: 1800,
    color: "#3F51B5",
  },
  {
    id: "tr4",
    title: "Forêt enchantée",
    artist: "Nature Sounds",
    category: "nature",
    duration: 720,
    color: "#4CAF50",
  },
  {
    id: "tr5",
    title: "Concentration deep",
    artist: "Mbipa",
    category: "focus",
    duration: 1200,
    color: "#009688",
  },
];

const MOCK_PLANS = [
  {
    id: "free",
    name: "Gratuit",
    price: 0,
    currency: "EUR",
    interval: "month",
    features: ["3 messages/jour", "1 test/semaine", "Musique limitée"],
    limits: {
      messagesPerDay: 3,
      testsPerWeek: 1,
      liveSessionsPerMonth: 0,
      avatarQuality: "sd",
    },
  },
  {
    id: "premium",
    name: "Premium",
    price: 9.99,
    priceYearly: 99,
    currency: "EUR",
    interval: "month",
    features: [
      "Messages illimités",
      "Tous les tests",
      "Musique HD",
      "2 sessions/mois",
    ],
    limits: {
      messagesPerDay: "unlimited",
      testsPerWeek: "unlimited",
      liveSessionsPerMonth: 2,
      avatarQuality: "hd",
    },
    recommended: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: 19.99,
    priceYearly: 199,
    currency: "EUR",
    interval: "month",
    features: [
      "Tout Premium",
      "Sessions illimitées",
      "Avatar HD+",
      "Support prioritaire",
    ],
    limits: {
      messagesPerDay: "unlimited",
      testsPerWeek: "unlimited",
      liveSessionsPerMonth: "unlimited",
      avatarQuality: "hd",
    },
  },
];

// ============ MOCK ROUTER ============

function jsonResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function delay(ms = 300) {
  return new Promise((r) => setTimeout(r, ms));
}

async function handleMockRequest(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  await delay(300);
  const path = url.replace(API_URL, "").split("?")[0];
  const method = (init?.method || "GET").toUpperCase();
  const body = init?.body ? safeJson(init.body) : {};

  // ---- AUTH ----
  if (path === "/api/auth/login" && method === "POST") {
    if (!body.email || !body.password) {
      return jsonResponse({ message: "Email et mot de passe requis" }, 400);
    }
    return jsonResponse({
      ...MOCK_AUTH_RESPONSE,
      user: { ...MOCK_USER, email: body.email },
    });
  }
  if (path === "/api/auth/register" && method === "POST") {
    return jsonResponse({
      ...MOCK_AUTH_RESPONSE,
      user: {
        ...MOCK_USER,
        email: body.email || MOCK_USER.email,
        nom: body.nom || MOCK_USER.nom,
        prenom: body.prenom || MOCK_USER.prenom,
        age: body.age || MOCK_USER.age,
        sexe: body.sexe || MOCK_USER.sexe,
        localite: body.localite || MOCK_USER.localite,
      },
    });
  }
  if (path === "/api/auth/refresh" && method === "POST") {
    return jsonResponse(MOCK_AUTH_RESPONSE);
  }
  if (path === "/api/mobile/auth" && method === "POST") {
    return jsonResponse({
      ...MOCK_AUTH_RESPONSE,
      user: {
        ...MOCK_USER,
        email: body.email || MOCK_USER.email,
        nom: body.nom || MOCK_USER.nom,
        prenom: body.prenom || MOCK_USER.prenom,
      },
    });
  }
  if (path === "/api/auth/logout") {
    return jsonResponse({ success: true });
  }
  if (path === "/api/auth/forgot-password" && method === "POST") {
    return jsonResponse({ success: true, message: "Email envoyé (mock)" });
  }

  // ---- USER ----
  if (path === "/api/users/me") {
    return jsonResponse(MOCK_USER);
  }

  // ---- ASSESSMENTS ----
  if (path === "/api/assessments") {
    return jsonResponse(MOCK_ASSESSMENTS);
  }
  const startMatch = path.match(/^\/api\/assessments\/([^/]+)\/start$/);
  if (startMatch) {
    return jsonResponse(
      MOCK_ASSESSMENT_QUESTIONS[startMatch[1]] || MOCK_ASSESSMENTS[0],
    );
  }
  const submitMatch = path.match(/^\/api\/assessments\/([^/]+)\/submit$/);
  if (submitMatch) {
    return jsonResponse({
      id: `result-${Date.now()}`,
      userId: MOCK_USER.id,
      assessmentId: submitMatch[1],
      assessmentName: MOCK_ASSESSMENTS.find((a) => a.id === submitMatch[1])
        ?.name,
      score: 18,
      date: new Date().toISOString(),
      level: "Bon",
      interpretation:
        "Votre niveau de bien-être est satisfaisant. Continuez ainsi !",
    });
  }
  if (path === "/api/assessments/history") {
    return jsonResponse([
      {
        id: "r1",
        userId: MOCK_USER.id,
        assessmentId: "who5",
        assessmentName: "WHO-5",
        score: 18,
        date: "2026-04-10T10:00:00Z",
        level: "Bon",
      },
      {
        id: "r2",
        userId: MOCK_USER.id,
        assessmentId: "wemwbs",
        assessmentName: "WEMWBS",
        score: 52,
        date: "2026-04-15T10:00:00Z",
        level: "Moyen",
      },
    ]);
  }

  // ---- CHAT ----
  if (path === "/api/chat/conversations" && method === "GET") {
    return jsonResponse([
      {
        id: "c1",
        userId: MOCK_USER.id,
        title: "Première conversation",
        messages: [],
        createdAt: "2026-04-20T10:00:00Z",
        updatedAt: "2026-04-20T10:00:00Z",
      },
    ]);
  }
  const convMatch = path.match(/^\/api\/chat\/conversations\/(.+)$/);
  if (convMatch) {
    return jsonResponse({
      id: convMatch[1],
      userId: MOCK_USER.id,
      title: "Conversation mock",
      messages: [
        {
          id: "m1",
          conversationId: convMatch[1],
          senderId: "assistant",
          role: "assistant",
          content: "Bonjour, comment puis-je vous aider aujourd'hui ?",
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  if (path === "/api/chat/message" && method === "POST") {
    return jsonResponse({
      id: `m-${Date.now()}`,
      conversationId: body.conversationId || "c1",
      senderId: "assistant",
      role: "assistant",
      content: `Je vous entends. Vous avez dit : "${body.content}". Pouvez-vous m'en dire plus ?`,
      timestamp: new Date().toISOString(),
    });
  }
  if (path === "/api/chat/voice" && method === "POST") {
    return jsonResponse({
      id: `m-${Date.now()}`,
      conversationId: "c1",
      senderId: "assistant",
      role: "assistant",
      content: "Message vocal reçu (mock).",
      timestamp: new Date().toISOString(),
    });
  }

  // ---- SESSIONS ----
  if (path === "/api/sessions/therapists") {
    return jsonResponse(MOCK_THERAPISTS);
  }
  if (path === "/api/sessions/upcoming") {
    return jsonResponse([]);
  }
  if (path === "/api/sessions/book" && method === "POST") {
    return jsonResponse({
      id: `s-${Date.now()}`,
      userId: MOCK_USER.id,
      therapistId: body.therapistId,
      therapist: MOCK_THERAPISTS.find((t) => t.id === body.therapistId),
      type: body.type,
      status: "scheduled",
      scheduledAt: body.scheduledAt,
      duration: body.duration,
      createdAt: new Date().toISOString(),
    });
  }

  // ---- MUSIC ----
  if (path === "/api/music/categories") {
    return jsonResponse(MOCK_MUSIC_CATEGORIES);
  }
  if (path.startsWith("/api/music/favorites")) {
    if (method === "GET") return jsonResponse([MOCK_TRACKS[0]]);
    return jsonResponse({ success: true });
  }
  const musicCatMatch = path.match(/^\/api\/music\/([^/]+)$/);
  if (
    musicCatMatch &&
    !["favorites", "recommendations", "categories"].includes(musicCatMatch[1])
  ) {
    return jsonResponse(
      MOCK_TRACKS.filter((t) => t.category === musicCatMatch[1]),
    );
  }
  if (path === "/api/music/recommendations") {
    return jsonResponse(MOCK_TRACKS.slice(0, 3));
  }

  // ---- SUBSCRIPTION ----
  if (path === "/api/subscription/plans") {
    return jsonResponse(MOCK_PLANS);
  }
  if (path === "/api/subscription/status") {
    return jsonResponse(MOCK_PLANS[1]);
  }
  if (path === "/api/subscription/create" && method === "POST") {
    return jsonResponse(MOCK_PLANS[1]);
  }
  if (path === "/api/subscription/cancel") {
    return jsonResponse(MOCK_PLANS[0]);
  }

  // Fallback
  return jsonResponse(
    { message: `Mock not implemented for ${method} ${path}` },
    404,
  );
}

function safeJson(body: any): any {
  try {
    if (typeof body === "string") return JSON.parse(body);
  } catch {
    return {};
  }
  return {};
}

// ============ INSTALLER ============

let installed = false;

export function installMockApi() {
  if (!USE_MOCK || installed) return;
  installed = true;

  const originalFetch = global.fetch;
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.startsWith(API_URL)) {
      try {
        return await handleMockRequest(url, init);
      } catch (e) {
        console.warn("[mock] error", e);
        return jsonResponse({ message: "Mock error" }, 500);
      }
    }
    return originalFetch(input as any, init);
  }) as typeof fetch;

  console.log("[mock] API mocking enabled for", API_URL);
}

export const isMockEnabled = USE_MOCK;
