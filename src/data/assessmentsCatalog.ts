/**
 * Built-in assessments catalog used as a fallback when the backend
 * /api/mobile/assessments endpoint is unavailable, AND as the source of
 * truth when the app language is not French (the backend currently only
 * serves French content).
 *
 * Instruments:
 *  - WHO-5 (World Health Organization, 1998)
 *  - WEMWBS (Warwick-Edinburgh Mental Wellbeing Scale, NHS Health Scotland)
 *  - MBI-HSS (Maslach Burnout Inventory — Human Services Survey)
 */
import type {
    AssessmentBand,
    AssessmentDetail,
    AssessmentListItem,
    MbiScoreResponse,
    ScoreResponse,
    SimpleScoreResponse,
} from "../types";

type Lang = "fr" | "en" | string;
const norm = (lang?: Lang): "fr" | "en" =>
  (lang || "fr").toLowerCase().startsWith("en") ? "en" : "fr";

// =============================================================================
// LIST
// =============================================================================

const LIST_FR: AssessmentListItem[] = [
  {
    id: "who5",
    title: "WHO-5 — Indice de bien-être",
    subtitle: "5 questions • environ 2 minutes",
    source: "WHO (1998)",
  },
  {
    id: "wemwbs",
    title: "WEMWBS — Bien-être mental",
    subtitle: "14 questions • environ 5 minutes",
    source: "NHS Health Scotland (2006)",
  },
  {
    id: "mbi",
    title: "MBI — Inventaire de burnout",
    subtitle: "22 questions • environ 7 minutes",
    source: "Maslach & Jackson (1981)",
  },
];

const LIST_EN: AssessmentListItem[] = [
  {
    id: "who5",
    title: "WHO-5 — Wellbeing Index",
    subtitle: "5 questions • about 2 minutes",
    source: "WHO (1998)",
  },
  {
    id: "wemwbs",
    title: "WEMWBS — Mental Wellbeing",
    subtitle: "14 questions • about 5 minutes",
    source: "NHS Health Scotland (2006)",
  },
  {
    id: "mbi",
    title: "MBI — Burnout Inventory",
    subtitle: "22 questions • about 7 minutes",
    source: "Maslach & Jackson (1981)",
  },
];

export function getFallbackList(lang: Lang = "fr"): AssessmentListItem[] {
  return norm(lang) === "en" ? LIST_EN : LIST_FR;
}

/** Backward-compatible export: French list. */
export const FALLBACK_ASSESSMENT_LIST = LIST_FR;

// =============================================================================
// SCALES
// =============================================================================

const WHO5_SCALE_FR = [
  { value: 0, label: "Jamais" },
  { value: 1, label: "De temps en temps" },
  { value: 2, label: "Moins de la moitié du temps" },
  { value: 3, label: "Plus de la moitié du temps" },
  { value: 4, label: "La plupart du temps" },
  { value: 5, label: "Tout le temps" },
];
const WHO5_SCALE_EN = [
  { value: 0, label: "At no time" },
  { value: 1, label: "Some of the time" },
  { value: 2, label: "Less than half of the time" },
  { value: 3, label: "More than half of the time" },
  { value: 4, label: "Most of the time" },
  { value: 5, label: "All of the time" },
];

const WEMWBS_SCALE_FR = [
  { value: 1, label: "Jamais" },
  { value: 2, label: "Rarement" },
  { value: 3, label: "Parfois" },
  { value: 4, label: "Souvent" },
  { value: 5, label: "Tout le temps" },
];
const WEMWBS_SCALE_EN = [
  { value: 1, label: "None of the time" },
  { value: 2, label: "Rarely" },
  { value: 3, label: "Some of the time" },
  { value: 4, label: "Often" },
  { value: 5, label: "All of the time" },
];

const MBI_SCALE_FR = [
  { value: 0, label: "Jamais" },
  { value: 1, label: "Quelques fois par an" },
  { value: 2, label: "Une fois par mois ou moins" },
  { value: 3, label: "Quelques fois par mois" },
  { value: 4, label: "Une fois par semaine" },
  { value: 5, label: "Quelques fois par semaine" },
  { value: 6, label: "Tous les jours" },
];
const MBI_SCALE_EN = [
  { value: 0, label: "Never" },
  { value: 1, label: "A few times a year" },
  { value: 2, label: "Once a month or less" },
  { value: 3, label: "A few times a month" },
  { value: 4, label: "Once a week" },
  { value: 5, label: "A few times a week" },
  { value: 6, label: "Every day" },
];

// =============================================================================
// DETAILS — French
// =============================================================================

const WHO5_DETAIL_FR: AssessmentDetail = {
  id: "who5",
  title: "WHO-5 — Indice de bien-être",
  source: "WHO (1998)",
  instructions:
    "Indiquez, pour chaque affirmation, ce qui est le plus proche de ce que vous avez ressenti au cours des deux dernières semaines.",
  scale: WHO5_SCALE_FR,
  questions: [
    { id: "q1", prompt: "Je me suis senti(e) bien et de bonne humeur." },
    { id: "q2", prompt: "Je me suis senti(e) calme et tranquille." },
    {
      id: "q3",
      prompt: "Je me suis senti(e) plein(e) d'énergie et vigoureux(se).",
    },
    {
      id: "q4",
      prompt: "Je me suis réveillé(e) en me sentant frais(che) et reposé(e).",
    },
    {
      id: "q5",
      prompt: "Ma vie quotidienne a été remplie de choses intéressantes.",
    },
  ],
};

const WEMWBS_DETAIL_FR: AssessmentDetail = {
  id: "wemwbs",
  title: "WEMWBS — Bien-être mental",
  source: "NHS Health Scotland (2006)",
  instructions:
    "Voici quelques affirmations sur les sentiments et les pensées. Indiquez à quelle fréquence vous avez ressenti chacune au cours des deux dernières semaines.",
  scale: WEMWBS_SCALE_FR,
  questions: [
    { id: "q1", prompt: "Je me suis senti(e) optimiste face à l'avenir." },
    { id: "q2", prompt: "Je me suis senti(e) utile." },
    { id: "q3", prompt: "Je me suis senti(e) détendu(e)." },
    {
      id: "q4",
      prompt: "Je me suis senti(e) intéressé(e) par d'autres personnes.",
    },
    { id: "q5", prompt: "J'ai eu de l'énergie à revendre." },
    { id: "q6", prompt: "J'ai bien fait face aux problèmes." },
    { id: "q7", prompt: "J'ai pensé clairement." },
    { id: "q8", prompt: "Je me suis senti(e) bien dans ma peau." },
    { id: "q9", prompt: "Je me suis senti(e) proche des autres." },
    { id: "q10", prompt: "Je me suis senti(e) confiant(e)." },
    { id: "q11", prompt: "J'ai pu me décider par moi-même sur les choses." },
    { id: "q12", prompt: "Je me suis senti(e) aimé(e)." },
    { id: "q13", prompt: "Je me suis intéressé(e) à de nouvelles choses." },
    { id: "q14", prompt: "Je me suis senti(e) joyeux(se)." },
  ],
};

const MBI_DETAIL_FR: AssessmentDetail = {
  id: "mbi",
  title: "MBI — Inventaire de burnout",
  source: "Maslach & Jackson (1981)",
  instructions:
    "Indiquez à quelle fréquence vous ressentez chaque affirmation au travail.",
  scale: MBI_SCALE_FR,
  questions: [
    {
      id: "ee1",
      prompt: "Je me sens émotionnellement vidé(e) par mon travail.",
    },
    {
      id: "ee2",
      prompt: "Je me sens à bout à la fin de ma journée de travail.",
    },
    {
      id: "ee3",
      prompt:
        "Je me sens fatigué(e) lorsque je me lève le matin et que j'ai à affronter une autre journée de travail.",
    },
    {
      id: "ee4",
      prompt:
        "Travailler avec des gens tout au long de la journée me demande beaucoup d'effort.",
    },
    { id: "ee5", prompt: 'Je me sens "craqué(e)" par mon travail.' },
    { id: "ee6", prompt: "Je me sens frustré(e) par mon travail." },
    {
      id: "ee7",
      prompt: "J'ai l'impression de travailler trop dur dans mon travail.",
    },
    {
      id: "ee8",
      prompt: "Travailler en contact direct avec les gens me stresse trop.",
    },
    { id: "ee9", prompt: "J'ai l'impression d'être au bout du rouleau." },
    {
      id: "dp1",
      prompt:
        "J'ai l'impression de traiter certains usagers comme s'ils étaient des objets.",
    },
    {
      id: "dp2",
      prompt:
        "Je suis devenu(e) plus insensible aux gens depuis que j'ai ce travail.",
    },
    {
      id: "dp3",
      prompt: "Je crains que ce travail ne m'endurcisse émotionnellement.",
    },
    {
      id: "dp4",
      prompt:
        "Je ne me soucie pas vraiment de ce qui arrive à certains usagers.",
    },
    {
      id: "dp5",
      prompt:
        "J'ai l'impression que les usagers me rendent responsable de certains de leurs problèmes.",
    },
    {
      id: "pa1",
      prompt: "Je peux comprendre facilement ce que mes usagers ressentent.",
    },
    {
      id: "pa2",
      prompt: "Je m'occupe très efficacement des problèmes de mes usagers.",
    },
    {
      id: "pa3",
      prompt:
        "J'ai l'impression à travers mon travail d'avoir une influence positive sur les gens.",
    },
    { id: "pa4", prompt: "Je me sens plein(e) d'énergie." },
    {
      id: "pa5",
      prompt:
        "Je peux facilement créer une atmosphère détendue avec mes usagers.",
    },
    {
      id: "pa6",
      prompt:
        "Je me sens revigoré(e) après avoir travaillé en contact étroit avec mes usagers.",
    },
    {
      id: "pa7",
      prompt:
        "J'ai accompli beaucoup de choses qui en valent la peine dans ce travail.",
    },
    {
      id: "pa8",
      prompt:
        "Dans mon travail, je traite les problèmes émotionnels avec beaucoup de calme.",
    },
  ],
};

// =============================================================================
// DETAILS — English
// =============================================================================

const WHO5_DETAIL_EN: AssessmentDetail = {
  id: "who5",
  title: "WHO-5 — Wellbeing Index",
  source: "WHO (1998)",
  instructions:
    "Please indicate, for each statement, what is closest to how you have been feeling over the last two weeks.",
  scale: WHO5_SCALE_EN,
  questions: [
    { id: "q1", prompt: "I have felt cheerful and in good spirits." },
    { id: "q2", prompt: "I have felt calm and relaxed." },
    { id: "q3", prompt: "I have felt active and vigorous." },
    { id: "q4", prompt: "I woke up feeling fresh and rested." },
    {
      id: "q5",
      prompt: "My daily life has been filled with things that interest me.",
    },
  ],
};

const WEMWBS_DETAIL_EN: AssessmentDetail = {
  id: "wemwbs",
  title: "WEMWBS — Mental Wellbeing",
  source: "NHS Health Scotland (2006)",
  instructions:
    "Below are some statements about feelings and thoughts. Please indicate how often you have felt this way over the last two weeks.",
  scale: WEMWBS_SCALE_EN,
  questions: [
    { id: "q1", prompt: "I've been feeling optimistic about the future." },
    { id: "q2", prompt: "I've been feeling useful." },
    { id: "q3", prompt: "I've been feeling relaxed." },
    { id: "q4", prompt: "I've been feeling interested in other people." },
    { id: "q5", prompt: "I've had energy to spare." },
    { id: "q6", prompt: "I've been dealing with problems well." },
    { id: "q7", prompt: "I've been thinking clearly." },
    { id: "q8", prompt: "I've been feeling good about myself." },
    { id: "q9", prompt: "I've been feeling close to other people." },
    { id: "q10", prompt: "I've been feeling confident." },
    {
      id: "q11",
      prompt: "I've been able to make up my own mind about things.",
    },
    { id: "q12", prompt: "I've been feeling loved." },
    { id: "q13", prompt: "I've been interested in new things." },
    { id: "q14", prompt: "I've been feeling cheerful." },
  ],
};

const MBI_DETAIL_EN: AssessmentDetail = {
  id: "mbi",
  title: "MBI — Burnout Inventory",
  source: "Maslach & Jackson (1981)",
  instructions:
    "Please indicate how often you experience each statement at work.",
  scale: MBI_SCALE_EN,
  questions: [
    { id: "ee1", prompt: "I feel emotionally drained by my work." },
    { id: "ee2", prompt: "I feel used up at the end of the workday." },
    {
      id: "ee3",
      prompt:
        "I feel tired when I get up in the morning and have to face another day on the job.",
    },
    {
      id: "ee4",
      prompt: "Working with people all day is really a strain for me.",
    },
    { id: "ee5", prompt: "I feel burned out from my work." },
    { id: "ee6", prompt: "I feel frustrated by my job." },
    { id: "ee7", prompt: "I feel I'm working too hard on my job." },
    {
      id: "ee8",
      prompt: "Working directly with people puts too much stress on me.",
    },
    { id: "ee9", prompt: "I feel like I'm at the end of my rope." },
    {
      id: "dp1",
      prompt:
        "I feel I treat some recipients as if they were impersonal objects.",
    },
    {
      id: "dp2",
      prompt: "I've become more callous toward people since I took this job.",
    },
    { id: "dp3", prompt: "I worry that this job is hardening me emotionally." },
    {
      id: "dp4",
      prompt: "I don't really care what happens to some recipients.",
    },
    {
      id: "dp5",
      prompt: "I feel recipients blame me for some of their problems.",
    },
    { id: "pa1", prompt: "I can easily understand how my recipients feel." },
    {
      id: "pa2",
      prompt: "I deal very effectively with the problems of my recipients.",
    },
    {
      id: "pa3",
      prompt:
        "I feel I'm positively influencing other people's lives through my work.",
    },
    { id: "pa4", prompt: "I feel very energetic." },
    {
      id: "pa5",
      prompt: "I can easily create a relaxed atmosphere with my recipients.",
    },
    {
      id: "pa6",
      prompt: "I feel exhilarated after working closely with my recipients.",
    },
    {
      id: "pa7",
      prompt: "I have accomplished many worthwhile things in this job.",
    },
    {
      id: "pa8",
      prompt: "In my work, I deal with emotional problems very calmly.",
    },
  ],
};

const DETAIL_BY_ID_FR: Record<string, AssessmentDetail> = {
  who5: WHO5_DETAIL_FR,
  wemwbs: WEMWBS_DETAIL_FR,
  mbi: MBI_DETAIL_FR,
};
const DETAIL_BY_ID_EN: Record<string, AssessmentDetail> = {
  who5: WHO5_DETAIL_EN,
  wemwbs: WEMWBS_DETAIL_EN,
  mbi: MBI_DETAIL_EN,
};

export function getFallbackDetail(
  id: string,
  lang: Lang = "fr",
): AssessmentDetail | null {
  const map = norm(lang) === "en" ? DETAIL_BY_ID_EN : DETAIL_BY_ID_FR;
  return map[id] ?? null;
}

// =============================================================================
// SCORING
// =============================================================================

function band(label: string, message: string, color: string): AssessmentBand {
  return { label, message, color };
}

function scoreWho5(answers: number[], lang: Lang = "fr"): SimpleScoreResponse {
  const raw = answers.reduce((a, b) => a + (b || 0), 0);
  const score = raw * 4;
  const en = norm(lang) === "en";
  let b: AssessmentBand;
  if (score < 28)
    b = en
      ? band(
          "Low wellbeing",
          "Low score. A depression screening may be useful.",
          "#E65A6F",
        )
      : band(
          "Bien-être faible",
          "Score bas. Un dépistage de la dépression peut être utile.",
          "#E65A6F",
        );
  else if (score < 50)
    b = en
      ? band(
          "Moderate wellbeing",
          "Mixed wellbeing. Consider activities that recharge you.",
          "#F2A33C",
        )
      : band(
          "Bien-être modéré",
          "Bien-être en demi-teinte. Pensez à des activités qui vous ressourcent.",
          "#F2A33C",
        );
  else if (score < 70)
    b = en
      ? band(
          "Good wellbeing",
          "You feel generally well. Keep it up.",
          "#7DBE6E",
        )
      : band(
          "Bon bien-être",
          "Vous vous sentez globalement bien. Continuez sur cette voie.",
          "#7DBE6E",
        );
  else
    b = en
      ? band(
          "Excellent wellbeing",
          "High level of wellbeing. Great job!",
          "#3BAE6B",
        )
      : band(
          "Excellent bien-être",
          "Niveau de bien-être élevé. Bravo !",
          "#3BAE6B",
        );
  return { id: "who5", score, max: 100, band: b };
}

function scoreWemwbs(
  answers: number[],
  lang: Lang = "fr",
): SimpleScoreResponse {
  const score = answers.reduce((a, b) => a + (b || 0), 0);
  const en = norm(lang) === "en";
  let b: AssessmentBand;
  if (score < 41)
    b = en
      ? band(
          "Low wellbeing",
          "Low mental wellbeing. Consider speaking with a professional.",
          "#E65A6F",
        )
      : band(
          "Bien-être faible",
          "Bien-être mental bas. Envisagez de parler à un professionnel.",
          "#E65A6F",
        );
  else if (score < 60)
    b = en
      ? band("Average wellbeing", "Average mental wellbeing.", "#F2A33C")
      : band("Bien-être moyen", "Bien-être mental dans la moyenne.", "#F2A33C");
  else
    b = en
      ? band("High wellbeing", "Excellent mental wellbeing.", "#3BAE6B")
      : band("Bien-être élevé", "Excellent bien-être mental.", "#3BAE6B");
  return { id: "wemwbs", score, max: 70, band: b };
}

function mbiBandEE(score: number, lang: Lang): AssessmentBand {
  const en = norm(lang) === "en";
  if (score >= 30)
    return en
      ? band("High", "High emotional exhaustion.", "#E65A6F")
      : band("Élevé", "Épuisement émotionnel élevé.", "#E65A6F");
  if (score >= 18)
    return en
      ? band("Moderate", "Moderate emotional exhaustion.", "#F2A33C")
      : band("Modéré", "Épuisement émotionnel modéré.", "#F2A33C");
  return en
    ? band("Low", "Low emotional exhaustion.", "#3BAE6B")
    : band("Faible", "Épuisement émotionnel faible.", "#3BAE6B");
}
function mbiBandDP(score: number, lang: Lang): AssessmentBand {
  const en = norm(lang) === "en";
  if (score >= 12)
    return en
      ? band("High", "High depersonalization.", "#E65A6F")
      : band("Élevé", "Dépersonnalisation élevée.", "#E65A6F");
  if (score >= 6)
    return en
      ? band("Moderate", "Moderate depersonalization.", "#F2A33C")
      : band("Modéré", "Dépersonnalisation modérée.", "#F2A33C");
  return en
    ? band("Low", "Low depersonalization.", "#3BAE6B")
    : band("Faible", "Dépersonnalisation faible.", "#3BAE6B");
}
function mbiBandPA(score: number, lang: Lang): AssessmentBand {
  const en = norm(lang) === "en";
  if (score <= 33)
    return en
      ? band("Low", "Low sense of personal accomplishment.", "#E65A6F")
      : band("Faible", "Sentiment d'accomplissement faible.", "#E65A6F");
  if (score <= 39)
    return en
      ? band(
          "Moderate",
          "Moderate sense of personal accomplishment.",
          "#F2A33C",
        )
      : band("Modéré", "Sentiment d'accomplissement modéré.", "#F2A33C");
  return en
    ? band("High", "Strong sense of personal accomplishment.", "#3BAE6B")
    : band("Élevé", "Bon sentiment d'accomplissement.", "#3BAE6B");
}

function scoreMbi(answers: number[], lang: Lang = "fr"): MbiScoreResponse {
  const ee = answers.slice(0, 9).reduce((a, b) => a + (b || 0), 0);
  const dp = answers.slice(9, 14).reduce((a, b) => a + (b || 0), 0);
  const pa = answers.slice(14, 22).reduce((a, b) => a + (b || 0), 0);

  const eeBand = mbiBandEE(ee, lang);
  const dpBand = mbiBandDP(dp, lang);
  const paBand = mbiBandPA(pa, lang);

  const highEE = ee >= 30;
  const highDP = dp >= 12;
  const lowPA = pa <= 33;
  const highCount = (highEE ? 1 : 0) + (highDP ? 1 : 0) + (lowPA ? 1 : 0);

  const burnoutRisk: MbiScoreResponse["burnoutRisk"] =
    highCount >= 2 ? "high" : highCount === 1 ? "moderate" : "low";

  return {
    id: "mbi",
    dimensions: {
      emotionalExhaustion: ee,
      depersonalization: dp,
      personalAccomplishment: pa,
    },
    bands: {
      emotionalExhaustion: eeBand,
      depersonalization: dpBand,
      personalAccomplishment: paBand,
    },
    burnoutRisk,
  };
}

export function scoreFallback(
  id: string,
  answers: number[],
  lang: Lang = "fr",
): ScoreResponse | null {
  if (id === "who5") return scoreWho5(answers, lang);
  if (id === "wemwbs") return scoreWemwbs(answers, lang);
  if (id === "mbi") return scoreMbi(answers, lang);
  return null;
}
