# 🔐 AUDIT DE SÉCURITÉ - MBIPA APP
## Rapport Complet & Checklist Stores

**Date:** 25 mai 2026  
**Version:** 1.0.0  
**Statut:** ⚠️ NON PRÊTE pour production

---

## 📋 RÉSUMÉ EXÉCUTIF

L'application Mbipa est en bon état général mais présente **3 vulnérabilités critiques** et plusieurs points de durcissement nécessaires avant production. Aucune modification destructive n'a été apportée — ce rapport est purement analytique.

**Statut Global:** ⚠️ **NON PRÊTE pour production** (Nécessite corrections critiques)

---

## 🚨 VULNÉRABILITÉS IDENTIFIÉES

### 🔴 CRITIQUE - Niveau 1: Exposition des clés API

**Problème:**
```env
EXPO_PUBLIC_FIREBASE_API_KEY=<REDACTED_FIREBASE_KEY>
EXPO_PUBLIC_AZURE_SPEECH_KEY=<REDACTED_AZURE_SPEECH_KEY>
AZURE_OPENAI_KEY=<REDACTED_AZURE_OPENAI_KEY>
```

**Risque:** 
- Les variables `EXPO_PUBLIC_*` sont compilées directement dans le bundle APK/IPA
- N'importe qui peut décompiler l'app et récupérer ces clés
- Accès non autorisé aux services Azure et Firebase

**Impact:** ⚠️ **TRÈS ÉLEVÉ** - Exploitation financière possible (coûts Azure), accès aux données utilisateur

---

### 🔴 CRITIQUE - Niveau 2: Absence de versioning des API

**Problème:**
```typescript
export const API_VERSION = "v1";
export const API_URL = "https://mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net";
```

**Risque:**
- Pas de route de basculement en cas de migration backend
- Les anciennes versions de l'app resteraient connectées à des endpoints deprecates
- Pas de gestion des breaking changes

---

### 🔴 CRITIQUE - Niveau 3: Absence de pinning de certificats SSL

**Problème:**
- Les requêtes HTTPS ne valident pas les certificats pinnés
- Vulnérable aux attaques MITM (Man-In-The-Middle)

**Impact:** Un attaquant sur le réseau peut intercepter les données sensibles (tokens JWT, emails, etc.)

---

### 🟠 HAUT - Niveau 4: Gestion des tokens JWT

**Problème:**
```typescript
// secureStore.ts
if (Platform.OS === "web") {
  webSet(key, value);  // ← localStorage en plain text sur web!
}
```

**Risque:**
- Sur la version web, les tokens sont stockés en localStorage (vulnérable aux XSS)
- Pas de flag `httpOnly` ou `Secure` pour les cookies

---

### 🟠 HAUT - Niveau 5: Redux DevTools en production

**Problème:**
```typescript
// store.ts ligne 80
devTools: __DEV__,  // Activé en développement
```

**Risque:**
- Si `__DEV__` n'est pas correctement set à false en production, Redux DevTools expose l'état complet incluant les données sensibles

---

### 🟡 MOYEN - Niveau 6: Absence de ProGuard/R8 (Android)

**Problème:**
- Pas de configuration de ProGuard/R8 apparente
- Le code Android peut être facilement décompilé

---

### 🟡 MOYEN - Niveau 7: Absence de jailbreak/root detection

**Problème:**
- L'app n'a pas de détection de dispositifs jailbreakés (iOS) ou rootés (Android)
- Sur ces appareils, la sécurité est compromise

---

## ✅ POINTS POSITIFS

| Point | Status |
|-------|--------|
| Firebase Auth bien configuré (AsyncStorage persistence) | ✅ |
| Email verification enforcement (blocks dashboard) | ✅ |
| SecureStore utilisé pour tokens critiques | ✅ |
| SignalR tokens requièrent authentication | ✅ |
| Permissions Android limitées et justifiées | ✅ |
| Gestion d'erreurs Firebase mappée en français | ✅ |
| CORS configuré (à vérifier coté backend) | ✅ |
| Logging conditionnel avec `__DEV__` | ✅ |

---

## 📱 CHECKLIST PRODUCTION - GOOGLE PLAY STORE (Android)

### Configuration de Base
- [ ] **Version Name:** Définie dans `app.json` → `"version": "1.0.0"` ✅
- [ ] **Version Code:** Configuré dans EAS → incrémenter pour chaque build
- [ ] **Package Name:** `com.mbipa.app` ✅
- [ ] **Bundle ID:** Vérifié dans `android.package` ✅

### Signing & Security
- [ ] **Génération du keystore:** Créer avec `keytool` (ne jamais perdre ce fichier)
  ```bash
  keytool -genkey -v -keystore mbipa-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias mbipa
  ```
- [ ] **Configuration EAS:** Configurer le keystore dans `eas.json`
- [ ] **Upload key vs App signing:** Utiliser App Signing by Google Play
- [ ] **Pas de clés API hardcodées** en clair (voir critiques ci-dessus)

### Permissions & Features
- [ ] Vérifier `app.json` → `android.permissions`:
  ```json
  "permissions": [
    "android.permission.RECORD_AUDIO",      // ✅ Microphone (chat)
    "android.permission.MODIFY_AUDIO_SETTINGS", // ✅ Contrôle audio
    "android.permission.CAMERA"             // ✅ Avatar pickup
  ]
  ```
- [ ] Ajouter si manquant:
  ```json
  "android.permission.INTERNET",
  "android.permission.ACCESS_NETWORK_STATE",
  "android.permission.POST_NOTIFICATIONS"  // (si notification push)
  ```

### Store Listing
- [ ] **Titre:** "Mbipa - Suivi de santé mentale" (max 50 caractères)
- [ ] **Description courte:** Bien rédigée, SEO-friendly (max 80 caractères)
- [ ] **Description longue:** Valoriser les features clés (FR et EN)
- [ ] **Screenshots:** 
  - [ ] 2-8 images PNG 1080x1920px
  - [ ] Montrer : onboarding, therapist booking, testimonials, profile
- [ ] **Vidéo preview:** Optionnel mais recommandé (30 secondes)
- [ ] **Icon:** Carré 512x512px avec logo Mbipa
- [ ] **Feature Graphic:** 1024x500px banner

### Catégorie & Contenu
- [ ] **Catégorie:** Medical ou Health & Fitness
- [ ] **Contenu:** Sélectionner:
  - [ ] "Appels passés via le réseau mobile"
  - [ ] "Enregistrement audio"
  - [ ] "Caméra"
- [ ] **Classification des contenus:**
  - [ ] Pas de contenu violent/adulte/etc.
- [ ] **Données personnelles collectées:**
  - [ ] Email
  - [ ] Profil utilisateur
  - [ ] Historique chats/sessions
  - [ ] Audio (enregistrements)

### Politique de Confidentialité & Conditions
- [ ] **Privacy Policy:** 
  - [ ] URL HTTPS valide
  - [ ] Mention Firebase, Azure, SignalR
  - [ ] Mention des données collectées
  - [ ] Politique de rétention
  - [ ] Droits RGPD (droit à l'oubli, export, etc.)
  - [ ] **CRITÈRE MANQUANT:** À ajouter avant submission

- [ ] **Terms of Service:**
  - [ ] URL HTTPS valide
  - [ ] Clauses de responsabilité
  - [ ] Conditions d'utilisation
  - [ ] Tarification Premium/Abonnement
  - [ ] **EXISTE:** `app/legal/terms.tsx` ✅

### Contenu Légal
- [ ] **Âge minimal:** COPPA compliance
  - [ ] Si ciblant enfants < 13 ans: Consentement parental
  - [ ] Actuellement: Pas d'indication d'âge → Recommander 18+ pour santé mentale
- [ ] **Responsabilité médicale:**
  - [ ] Disclaimer: "Not a substitute for professional medical advice"
  - [ ] Mention: "Consult a licensed therapist"

### API & SDK
- [ ] **Google Play Services:** Vers. minimale compatible
- [ ] **Firebase:** Services utilisés documentés
  - [ ] Firebase Auth ✅
  - [ ] (Vérifier pas de Realtime DB avec données non-chiffrées)
- [ ] **Stripe:** Si paiements en app
  - [ ] Configuration Stripe correcte
  - [ ] `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` ✅

### Rating & Release
- [ ] **Rating di contenuto:** Remplir questionnaire:
  - Violence
  - Contenu sexuel
  - Langue
  - Drogue/alcool
  - Réseaux sociaux
- [ ] **Pays de distribution:** Activer/Désactiver par région
- [ ] **Test de compatibilité:** Tester sur Android 8+ (minimum)
- [ ] **Release:** Commencer par version alpha/beta avant production

---

## 📱 CHECKLIST PRODUCTION - APPLE APP STORE (iOS)

### Configuration de Base
- [ ] **Version:** Définie dans `app.json` ✅
- [ ] **Bundle Identifier:** `com.mbipa.app` ✅
- [ ] **Build Number:** À incrémenter (1, 2, 3...)
- [ ] **iOS Minimum Version:** Set dans `app.json` → généralement iOS 14.0+

### Code Signing & Provisioning
- [ ] **Certificate Signing Request (CSR):** Générer depuis Keychain
- [ ] **Apple Developer Certificate:** Distribution (pas Development)
- [ ] **Provisioning Profile:** App Store profile
- [ ] **EAS Build Configuration:** Configurer dans `eas.json`
  ```json
  "ios": {
    "buildType": "app-store",
    "signing": {...}
  }
  ```

### App Store Connect Setup
- [ ] Créer nouvelle app dans App Store Connect
- [ ] **App Name:** "Mbipa"
- [ ] **SKU:** Unique ID (ex: `com.mbipa.app.2026`)
- [ ] **Bundle ID:** `com.mbipa.app` ✅
- [ ] **Primary Language:** French (Français)

### App Information
- [ ] **Subtitle (optionnel):** "Suivi de santé mentale"
- [ ] **Privacy Policy URL:** HTTPS valide (requis)
- [ ] **Support URL:** support@mbipa.app ou page web
- [ ] **Category:** Medical
- [ ] **Content Rights:** Accepter que le contenu est propriétaire

### Screenshots & Media
- [ ] **Screenshots:** 5 par taille d'écran (iPhone 6.7", iPhone 5.5", iPad Pro 12.9")
  - [ ] Format: PNG, JPEG, 1242×2688px (ou approprié)
  - [ ] Texte localisé en FR et EN
  - [ ] Montrer features clés
- [ ] **App Preview Video:** Optionnel mais recommandé
- [ ] **App Icon:** 1024×1024px (JPEG/PNG)
- [ ] **Keywords:** 100 caractères, séparés par virgules
  - Ex: "santé mentale, psychologue, bien-être, therapy, therapiste"

### Description & Notes
- [ ] **Description:** 
  - [ ] Saillants: Features principales
  - [ ] Mention de therapists
  - [ ] Call-to-action pour booking
  - [ ] Confidentialité/sécurité
- [ ] **Release Notes (Build 1):**
  - [ ] "Version initiale"
  - [ ] Features principales
  - [ ] Bug fixes (si applicable)

### Rating & Age
- [ ] **Age Rating Questionnaire:**
  - [ ] Medical/Health: OUI (pas d'inquiétude)
  - [ ] Violence: NON
  - [ ] Contenu sexuel: NON
  - [ ] Langage fort: NON
  - [ ] Alcool/drogue: NON
  - [ ] Gambling: NON
  - [ ] Réseaux sociaux: Possible (booking features)

### Privacy & Security
- [ ] **Privacy Policy URL:** 
  - [ ] Complète et à jour
  - [ ] Mention données sensibles (santé mentale)
  - [ ] Conformité RGPD + CCPA
  - [ ] **À AJOUTER avant submission**

- [ ] **Terms of Service:**
  - [ ] Responsabilité médico-légale
  - [ ] Clauses de limitation

- [ ] **App Privacy Label:** Remplir de manière honnête
  - [ ] Email
  - [ ] User ID
  - [ ] Audio recordings
  - [ ] Vérifier: Utilisé pour tracking?

### Permissions & Device Features
- [ ] **Microphone:** `NSMicrophoneUsageDescription` ✅
  - [ ] Texte explicatif pour l'utilisateur
- [ ] **Camera:** `NSCameraUsageDescription` ✅
  - [ ] Texte explicatif (avatar picker)
- [ ] **Photos:** `NSPhotoLibraryUsageDescription` (check si needed)
- [ ] **Health Data:** Si intégration santé (FHIR, HealthKit)
- [ ] **Keychain Sharing:** If inter-app communication

### Version & Release
- [ ] **Version Number:** "1.0.0" (semantic versioning)
- [ ] **Build Number:** "1"
- [ ] **Status:** Set to "Ready to Submit"
- [ ] **Test Devices:** Optionnel mais recommandé

### TestFlight (Strongly Recommended)
- [ ] Créer version TestFlight
- [ ] Inviter 50+ testeurs internes/externes
- [ ] Laisser tourner minimum 1 semaine
- [ ] Collecter feedback crashes/bugs
- [ ] Itérer avant soumission App Store

---

## 🔐 TO-DO LIST SÉCURITÉ (Classée par Priorité)

### 🔴 P0 - BLOQUANTS (À faire AVANT les stores)

#### P0.1 - Sécuriser les clés API
- [ ] Migrer `EXPO_PUBLIC_FIREBASE_API_KEY` vers backend (proxy requests)
- [ ] Migrer `AZURE_OPENAI_KEY` vers backend (private endpoint)
- [ ] Migrer `AZURE_SPEECH_KEY` vers backend
- [ ] Supprimer du .env toutes les `EXPO_PUBLIC_` sensibles
- [ ] Garder uniquement Firebase API Key (public par design, mais sécuriser au niveau des règles Firestore)
- **Estimation:** 2-3 jours

#### P0.2 - Implémenter SSL Pinning
- [ ] Ajouter package: `react-native-ssl-pinning` ou `axios` + certificat
- [ ] Générer certificate pinning pour `mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net`
- [ ] Valider en dev et prod
- **Estimation:** 1 jour

#### P0.3 - Ajouter Privacy Policy & Terms
- [ ] Créer `/app/legal/privacy.tsx` (si manquant)
- [ ] Ajouter endpoint HTTPS public pour policy
- [ ] Mention: Firebase, Azure, SignalR, données collectées, RGPD
- [ ] Versions FR + EN
- **Estimation:** 1 jour

#### P0.4 - Configurer versioning API
- [ ] Ajouter `/api/v1/` prefix à tous les endpoints
- [ ] Créer `/api/v2/` pour futures migrations
- [ ] Ajouter fallback logic (si v2 fail, retry v1)
- **Estimation:** 1 jour

#### P0.5 - Vérifier & Durcir DevTools Redux
- [ ] Confirmer `__DEV__` = false en prod builds
- [ ] Ajouter Redux store encryption middleware (redux-persist + crypto)
- **Estimation:** 4 heures

### 🟠 P1 - HAUTEMENT RECOMMANDÉ (À faire avant stores)

#### P1.1 - Configurer ProGuard/R8 (Android)
- [ ] Activer dans `build.gradle`
- [ ] Règles pour Firebase, Stripe, SignalR
- **Estimation:** 1 jour

#### P1.2 - Ajouter Jailbreak/Root Detection
- [ ] Package: `react-native-root-detect` ou `react-native-jailbreak-detect`
- [ ] Warning/block si détecté
- **Estimation:** 4 heures

#### P1.3 - Implémenter Rate Limiting
- [ ] Backend: Limiter 5 tentatives par 10min (login, contact form, etc.)
- [ ] Frontend: Disable button pendant cooldown
- **Estimation:** 1 jour

#### P1.4 - Audit des Logs
- [ ] Vérifier qu'aucun token/password n'est loggé
- [ ] En prod: Désactiver tous les `console.log` (ou utiliser Sentry)
- [ ] Ajouter structured logging (Sentry, LogRocket)
- **Estimation:** 1 jour

#### P1.5 - Audit Firebase Security Rules
- [ ] Vérifier Firestore rules: Pas de read/write publique
- [ ] Vérifier authentification requise
- [ ] Vérifier données utilisateur partitionnées par uid
- **Estimation:** 4 heures

### 🟡 P2 - IMPORTANT (À faire avant production)

#### P2.1 - Test Penetration OWASP Top 10
- [ ] Injection (SQLi, NoSQLi)
- [ ] XSS
- [ ] CSRF
- [ ] Broken auth
- [ ] Sensitive data exposure
- **Estimation:** 3-5 jours (externe: $2-5k)

#### P2.2 - Configurer HSTS Headers
- [ ] Backend: Add `Strict-Transport-Security` header
- [ ] Minimum 1 année
- **Estimation:** 2 heures

#### P2.3 - Implémenter Monitoring
- [ ] Sentry pour crashes
- [ ] Sentry pour security issues
- [ ] Datadog ou CloudWatch pour logs backend
- **Estimation:** 1 jour

#### P2.4 - Backup & Disaster Recovery
- [ ] Plan pour perte de données Firebase
- [ ] Backup automatisé
- [ ] RTO/RPO définis
- **Estimation:** 2 jours

### 🟢 P3 - BONNES PRATIQUES (Post-MVP)

#### P3.1 - Implémenter 2FA
- [ ] TOTP optional pour users
- [ ] SMS-based pour reset password
- **Estimation:** 3-5 jours

#### P3.2 - FIDO2/WebAuthn
- [ ] Biometric authentication
- [ ] Windows Hello, Face ID, fingerprint
- **Estimation:** 5-7 jours

#### P3.3 - Certificate Pinning Avancé
- [ ] Backup certificates
- [ ] Key rotation strategy
- **Estimation:** 2 jours

---

## 📋 CHECKLIST DE SOUMISSION FINALE

### 1 Semaine Avant Soumission
- [ ] Build APK/IPA final et tester sur devices physiques
- [ ] Vérifier tous les P0 et P1 sont complétés
- [ ] Test de performance (Lighthouse, APK size < 100MB)
- [ ] Crash test: Try edge cases, bad network, offline mode
- [ ] Review Privacy Policy + Terms une dernière fois
- [ ] Recueillir 10+ testeurs externes (TestFlight iOS)

### 2-3 Jours Avant Soumission
- [ ] Screenshots finalisés et localisés
- [ ] Description & release notes révisées
- [ ] Vérifier tous les liens (privacy, terms, support)
- [ ] Test complet du parcours utilisateur
- [ ] Vérifier pas d'erreurs dans console (prod builds)

### Jour de Soumission
- [ ] Soumission Google Play (review: 2-4h)
- [ ] Soumission App Store (review: 24-48h, parfois plus)
- [ ] Monitorer crashes premiers 24h
- [ ] Avoir plan de rollback prêt

---

## 📊 RISQUES RÉSIDUELS POST-MITIGATION

| Risque | Probabilité | Sévérité | Mitigation |
|--------|------------|----------|-----------|
| Compromission clés API | Faible ⬇️ | Critique | SSL pinning + encryption |
| MITM Attack | Faible ⬇️ | Haute | SSL pinning |
| Données de santé exposées | Faible | Critique | Chiffrement end-to-end |
| DDoS sur API | Moyen | Moyenne | Rate limiting + CDN |
| SQL Injection backend | Faible | Critique | Input validation + ORM |
| Session hijacking | Faible | Haute | JWT + HTTPS only |

---

## 📞 RECOMMENDATIONS FINALES

### Avant Stores
1. **✅ OBLIGATOIRE:** Résoudre P0.1 à P0.5 (5 jours)
2. **✅ HAUTEMENT RECOMMANDÉ:** P1.1 à P1.5 (4-5 jours)
3. **⚠️ IMPORTANT:** Audit externe OWASP (3-5 jours, $2-5k)

### Post-Launch
- Monitoring 24/7 (Sentry + backend logs)
- Response time SLA < 1h pour security issues
- Monthly security reviews
- Penetration testing annuel

---

## 🎯 TIMELINE RECOMMANDÉE

```
Semaine 1: P0 items (5 jours)
Semaine 2: P1 items + Testing (4-5 jours)
Semaine 3: Pen testing externe (3 jours)
Semaine 4: Remediation + Final QA (5 jours)
Semaine 5: TestFlight/Android beta (7 jours)
Semaine 6: Store submission
```

**Durée totale avant production:** 4-6 semaines minimum

---

**Rapport généré:** 25 mai 2026  
**Prochaine révision:** Après chaque major update  
**Responsable:** Security & DevOps Team
