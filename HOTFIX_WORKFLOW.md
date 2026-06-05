# Hotfix Workflow — MBIPA

Procédure standard pour appliquer un correctif (bug, traduction manquante, texte à corriger) et le pousser jusqu'aux testeurs Play Store.

---

## TL;DR

```powershell
# 1. Corriger le code
# 2. Commit + push
git add <fichiers>
git commit -m "fix: <description>"
git push origin main

# 3. Build + submit Play Store
eas build --platform android --profile production --non-interactive --no-wait
# (attendre ~10-15 min que le build finisse)
eas submit --platform android --latest --non-interactive
```

Les testeurs reçoivent l'update dans Play Store sous 5–30 minutes (track Internal) ou plusieurs heures (Closed Testing).

---

## Pourquoi pas d'OTA (Expo Updates) ?

Même si `expo-updates` est installé, le canal n'est pas configuré pour pousser sur les builds Play Store sans rebuild. **Tant que cette config n'est pas faite, chaque correctif = un nouveau AAB.**

Pour activer l'OTA plus tard : voir https://docs.expo.dev/eas-update/getting-started/

---

## Étapes détaillées

### 1. Identifier le problème

**Cas typique : texte FR codé en dur alors que l'utilisateur est en EN.**

Recherche rapide pour trouver des textes français codés en dur dans le JSX :

```powershell
# Recherche dans VS Code (Ctrl+Shift+F) avec regex activée :
>\s*[A-ZÀÂÉÈ][a-zA-ZÀ-ÿ '\-]{3,}\s*<
```

Pattern à éviter :
```tsx
<Text>Demande envoyée</Text>          // ❌ codé en dur
```

Pattern correct :
```tsx
<Text>{t("therapist.requestSentTitle")}</Text>   // ✅ via i18n
```

### 2. Vérifier les clés i18n existent

Dans `src/i18n/locales/fr.json` ET `src/i18n/locales/en.json` :

```json
{
  "therapist": {
    "requestSentTitle": "Demande envoyée",
    "requestSentText": "...",
    "back": "Retour",
    "newRequest": "Faire une autre demande"
  }
}
```

Si une clé manque, l'ajouter dans **les deux fichiers** (FR + EN).

### 3. Corriger le code

Remplacer chaque texte en dur par un `t("namespace.key")`.

### 4. Vérifier les erreurs TypeScript

Dans VS Code, ouvrir le fichier modifié → l'onglet **Problems** doit être vide pour ce fichier.

### 5. Commit + push

```powershell
cd C:\Users\Julius\mbipa-app
git add app/<fichier>.tsx src/i18n/locales/fr.json src/i18n/locales/en.json
git commit -m "fix(<scope>): <description courte>"
git push origin main
```

### 6. Build production

`eas.json` est configuré avec `autoIncrement: true` et `appVersionSource: remote` → le `versionCode` est géré automatiquement par EAS.

```powershell
eas build --platform android --profile production --non-interactive --no-wait
```

Le `--no-wait` rend la main immédiatement. Surveiller le build à l'URL retournée (ex: `https://expo.dev/accounts/juliuschrys07/projects/mbipa-app/builds/<id>`).

### 7. Soumettre à Play Store

Une fois le build **finished** (statut visible sur Expo dashboard) :

```powershell
eas submit --platform android --latest --non-interactive
```

Cette commande prend le **dernier AAB** et l'envoie sur la piste configurée dans `eas.json` → actuellement `track: "internal"`.

#### Changer de track Play Store

Dans `eas.json` :
```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./google-play-service-account.json",
      "track": "internal"     // ← "internal" | "alpha" | "beta" | "production"
    }
  }
}
```

| Track       | Délai propagation | Usage                                  |
| ----------- | ----------------- | -------------------------------------- |
| internal    | 5–30 min          | Tests internes (équipe, ami)           |
| alpha       | 1–2 h             | Test fermé (groupe limité)             |
| beta        | 1–2 h             | Test ouvert                            |
| production  | Plusieurs jours   | Public — passage par revue Google Play |

---

## Côté testeurs

Une fois la release publiée :

1. Play Store → page de l'app → **Mettre à jour**
2. Si rien n'apparaît : Play Store → profil → **Gérer les apps** → **Mises à jour disponibles** → MBIPA → **Mettre à jour**
3. En dernier recours : désinstaller + réinstaller depuis le lien de la piste de test

---

## Vérifier qu'un fix est bien dans le build

L'écran **Profil** affiche normalement le `versionCode` (ou ajoute-le si pas encore fait). Demander au testeur :

> Quel numéro de version vois-tu en bas de l'écran Profil ?

Si le numéro correspond au nouveau `versionCode` (visible dans EAS dashboard), le fix est en place.

---

## Historique des hotfixes

| Date       | Commit    | versionCode | Description                                         |
| ---------- | --------- | ----------- | --------------------------------------------------- |
| 2026-06-04 | `c0ae5e9` | 9           | Ajout note tarif sur écran thérapeute               |
| 2026-06-05 | `c81a68d` | 10          | i18n écran de confirmation (corrige FR forcé en EN) |

