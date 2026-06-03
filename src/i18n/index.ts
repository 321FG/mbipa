import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import fr from "./locales/fr.json";
import sg from "./locales/sg.json";

const STORAGE_KEY = "mbipa.language";
export const SUPPORTED_LANGUAGES = ["fr", "en", "sg"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const resources = {
  fr: { translation: fr },
  en: { translation: en },
  // Sängö ships partial translations; missing keys fall back to French.
  sg: { translation: sg },
};

function detectInitialLanguage(): SupportedLanguage {
  try {
    const locales = Localization.getLocales();
    const code = locales?.[0]?.languageCode?.toLowerCase();
    if (code && (SUPPORTED_LANGUAGES as readonly string[]).includes(code)) {
      return code as SupportedLanguage;
    }
  } catch {
    // ignore
  }
  return "fr";
}

let initialized = false;

// Initialize i18n synchronously at module load so any component calling
// useTranslation() during the first render has a valid instance. The
// persisted language (AsyncStorage) is loaded later via initI18n().
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: detectInitialLanguage(),
    fallbackLng: "fr",
    interpolation: { escapeValue: false },
    compatibilityJSON: "v4",
    returnNull: false,
  });
}

export async function initI18n(): Promise<void> {
  if (initialized) return;
  initialized = true;

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (
      stored &&
      (SUPPORTED_LANGUAGES as readonly string[]).includes(stored) &&
      stored !== i18n.language
    ) {
      await i18n.changeLanguage(stored);
    }
  } catch {
    // ignore
  }
}

export async function changeLanguage(lang: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

export function getCurrentLanguage(): SupportedLanguage {
  const code = (i18n.language || "fr").slice(0, 2);
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code)
    ? (code as SupportedLanguage)
    : "fr";
}

export default i18n;
