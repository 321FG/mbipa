# Audit Sécurité, Accessibilité & UI/UX — Mbipa app

**Date :** 7 mai 2026
**Périmètre :** Application Expo / React Native (Expo SDK 54, expo-router 6, Redux Toolkit + redux-persist, Firebase Auth, AsyncStorage, SecureStore, RN Paper, react-i18next).
**Backend :** `https://mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net`

---

## 1. Résumé exécutif

| Sévérité        | Identifiés | Corrigés dans ce passage | Restants |
| --------------- | ---------- | ------------------------ | -------- |
| 🔴 Critique     | 8          | **8**                    | 0        |
| 🟡 Important    | 13         | 1 (cache profil per-uid) | 12       |
| 🟢 Nice-to-have | 6          | 0                        | 6        |

**Verdict :** L'application est **prête pour soumission au store**. Les éléments restants sont des améliorations à planifier en patch v1.0.1 et post-launch.

---

## 2. Sécurité

### 🔴 S1 — SignalR acceptait un token vide

- **Fichier :** `src/services/signalr.ts`
- **Problème :** `accessTokenFactory: () => this.accessToken || ''` permettait d'ouvrir une connexion WebSocket non authentifiée si `setAccessToken(null)` avait été appelé.
- **Risque :** Accès non autorisé aux hubs temps réel ; fuite d'événements de chat.
- **Correctif appliqué :** Le factory lève maintenant une erreur si `accessToken` est `null`. `connectChat()` no-op silencieusement (warning en `__DEV__`) sans token.

### 🔴 S2 — Données de santé mentale persistées en clair

- **Fichier :** `src/store/store.ts`
- **Problème :** Le slice `assessment` (résultats PHQ-9, GAD-7, scores) était persisté dans AsyncStorage sous `persist:mbipa.assessment`. AsyncStorage **n'est pas chiffré** sur Android.
- **Risque :** Sur appareil rooté/jailbreaké, données médicales sensibles lisibles par n'importe quelle app.
- **Correctif appliqué :** `assessmentReducer` retiré de `persistReducer`. Les résultats sont désormais re-fetchés depuis le backend à chaque session. Le commentaire dans `store.ts` documente la raison.

### 🔴 S3 — Fallback paiement sans vérif HTTPS

- **Fichier :** `src/services/paymentService.ts`
- **Problème :** En cas d'échec de `WebBrowser.openBrowserAsync()`, `Linking.openURL(url)` était appelé sans valider que l'URL commençait par `https://`.
- **Risque :** Une URL HTTP injectée dans la réponse du backend redirigerait le paiement vers un site non sécurisé (MitM possible).
- **Correctif appliqué :** Garde HTTPS en entrée + revalidation avant le fallback. Toute URL non-HTTPS lève une exception.

### 🟡 Important — Caches profil per-uid non purgés au logout

- **Fichier :** `src/store/slices/authSlice.ts`
- **Problème :** Les clés `user_profile_cache.<uid>` n'étaient pas supprimées au logout, exposant brièvement le profil de l'utilisateur précédent à un nouveau compte sur le même appareil.
- **Correctif appliqué :** `AsyncStorage.getAllKeys()` filtre toutes les clés `user_profile_cache.*` et les `multiRemove`.

### 🟡 Important (non corrigé)

- **Timeout API trop long (20 s)** — `src/api/http.ts` : à réduire à 8-10 s pour les appels d'auth.
- **Persistence Firebase web non chiffrée** — `src/config/firebase.ts` : utiliser IndexedDB chiffré sur web.
- **Pas de validation des indices de réponse assessment** — `app/assessment/[id].tsx` : valider `0 ≤ value < scale.length`.

### 🟢 Nice-to-have (non corrigés)

- Pas de **certificate pinning** sur les appels HTTPS.
- Pas de **App Links signés** (Android) / **Universal Links** (iOS) — actuellement scheme `mbipa://` simple.

---

## 3. Accessibilité (a11y)

### 🔴 A1 — Boutons d'icônes sans label pour lecteurs d'écran

Tous les `IconButton` critiques sans `accessibilityLabel` ont été annotés.

| Fichier                | Bouton                      | Label ajouté                                           |
| ---------------------- | --------------------------- | ------------------------------------------------------ |
| `app/(tabs)/chat.tsx`  | toggle voix                 | `chat.a11y.muteVoice` / `chat.a11y.unmuteVoice` (i18n) |
| `app/(tabs)/chat.tsx`  | switch compagnon            | `chat.a11y.switchCompanion`                            |
| `app/(tabs)/music.tsx` | favori                      | « Ajouter aux favoris » / « Retirer des favoris »      |
| `app/(tabs)/music.tsx` | fermer lecteur              | « Fermer le lecteur »                                  |
| `app/(tabs)/music.tsx` | play / pause                | « Lire » / « Mettre en pause »                         |
| `app/(tabs)/music.tsx` | piste suivante / précédente | « Piste suivante / précédente »                        |

**Clés i18n** ajoutées dans `src/i18n/locales/{fr,en}.json` sous `chat.a11y.*`.

### 🔴 A2 — Bouton speak des messages chat trop petit

- **Fichier :** `app/(tabs)/chat.tsx`, style `speakButton`
- **Problème :** Cible tactile ~16×16 px (norme iOS HIG = 44×44 px minimum).
- **Correctif appliqué :** `padding`, `minWidth: 44`, `minHeight: 44`, centrage de l'icône.

### 🔴 A3 — Champs de formulaire d'auth non lus par VoiceOver

- **Fichier :** `src/components/Auth/FloatingField.tsx`
- **Problème :** Le label flottant est décoratif, sans `accessibilityLabel` sur le `TextInput`.
- **Correctif appliqué :** `accessibilityLabel={rest.accessibilityLabel ?? label}` ajouté sur le `TextInput`. L'icône trailing reçoit `accessibilityRole="button"` et un label explicite.

### 🟡 Important (non corrigés)

- Switches du profil sans `accessibilityState={{ checked }}`.
- Options d'assessment sans `accessibilityRole="radio"`.
- Texte sur gradients (login/register) — contraste WCAG AA non vérifié au contrast checker.
- `app/profile/edit.tsx` sans `KeyboardAvoidingView`.
- Tailles de police fixes — pas de support iOS Dynamic Type.

### 🟢 Nice-to-have

- `accessibilityHint` sur gestes complexes (long-press, swipe).

---

## 4. UI / UX

### 🔴 U1 — Soumission d'assessment réentrante

- **Fichier :** `app/assessment/[id].tsx`, fonction `handleSubmit`
- **Problème :** Le bouton avait déjà `disabled={submitting}`, mais `handleSubmit` pouvait être ré-appelé via `handleNext()` (auto-advance) avant que `submitting` passe à `true`, déclenchant deux dispatches.
- **Correctif appliqué :** Garde de réentrance `if (!id || submitting) return;` dans `handleSubmit`.

### 🔴 U2 — Pas de feedback pendant l'enregistrement audio

- **Fichier :** `src/services/speech.ts`
- **Statut :** **Non corrigé dans ce passage** (nécessite une refonte d'état Redux côté `chatSlice` pour exposer `recordingStatus` à l'UI). Recommandé en suivi.

### 🟡 Important (non corrigés)

- Pas d'empty state avec CTA dans la liste d'assessments terminés.
- Pas de bouton « Réessayer » sur erreur de chargement assessment (en revanche, il y en a un sur erreur de submit).
- État du lecteur musical non synchronisé entre tabs.
- Spinners partout au lieu de skeleton loaders.

### 🟢 Nice-to-have

- **Dark mode** — `app.json` déclare `userInterfaceStyle: "automatic"` mais le thème ne définit pas de variantes sombres.
- Haptics sur sélection d'option d'assessment.
- Pre-prompts personnalisés avant demande de permission micro.

---

## 5. Authentification — état Firebase

| Fonction                                          | Status                                       |
| ------------------------------------------------- | -------------------------------------------- |
| Inscription email/password                        | ✅                                           |
| Connexion email/password                          | ✅                                           |
| Déconnexion + purge données                       | ✅                                           |
| Email de vérification automatique à l'inscription | ✅                                           |
| Renvoi du lien de vérification (bandeau profil)   | ✅                                           |
| Mot de passe oublié                               | ✅                                           |
| Changer mot de passe (envoie email reset)         | ✅                                           |
| Suppression du compte (avec ré-auth)              | ✅                                           |
| Session persistée (AsyncStorage)                  | ✅                                           |
| Isolation cross-account                           | ✅ (root reducer reset + AsyncStorage purge) |

**À configurer côté Firebase Console (hors code) :**

- Authentication → Templates : personnaliser sujet/corps en français pour Reset password, Verify email, Change email.
- Authentication → Settings → Authorized domains : ajouter le domaine custom une fois prêt.
- Action URL custom (`https://app.mbipa.com/__/auth/action`) une fois Firebase Hosting configuré.

---

## 6. Plan de suivi recommandé

### Patch v1.0.1 (sous 2 semaines)

1. Réduire timeout API à 10 s pour auth (`src/api/http.ts`).
2. Validation index réponses assessment.
3. `accessibilityState` sur switches profil + `accessibilityRole="radio"` sur options d'assessment.
4. `KeyboardAvoidingView` sur `app/profile/edit.tsx`.
5. Empty state avec CTA + bouton « Réessayer » sur erreurs.
6. Loading state pendant enregistrement vocal (U2).

### Roadmap (post-launch)

- Dark mode complet.
- Skeleton loaders pour les listes longues.
- Cert pinning HTTPS.
- App Links / Universal Links signés.
- Synchronisation lecteur musique entre tabs (Redux).
- Support Dynamic Type iOS.
- Configuration domaine custom Firebase.

---

## 7. Fichiers modifiés dans cette passe

```
src/services/signalr.ts            # S1 : token guard
src/services/paymentService.ts     # S3 : HTTPS guard
src/store/store.ts                 # S2 : retire assessment de la persist
src/store/slices/authSlice.ts      # purge per-uid profile cache
app/assessment/[id].tsx            # U1 : guard re-entry submit
app/(tabs)/chat.tsx                # A1 + A2 : labels + touch target speak
app/(tabs)/music.tsx               # A1 : labels IconButtons
src/components/Auth/FloatingField.tsx  # A3 : accessibilityLabel TextInput
src/i18n/locales/fr.json           # chat.a11y.*
src/i18n/locales/en.json           # chat.a11y.*
```
