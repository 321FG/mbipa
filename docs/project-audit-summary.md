# MBIPA — Project Audit Summary

**Generated:** June 2, 2026
**Scope:** Documentation review + configuration audit (Expo / Firebase / Azure / EAS / Android / iOS)
**Mode:** Read-only audit. **No code was changed.** Existing repository documentation is treated as the source of truth.
**Backward compatibility requirement:** All proposed actions must remain fully backward compatible.

> This report consolidates the existing docs and does **not** propose anything that contradicts them. Where docs already define a process, this report points to it rather than replacing it.

---

## 0. Documentation reviewed (source of truth)

The canonical filenames requested (`SECURITY.md`, `PRIVACY.md`, `COMPLIANCE.md`, `RELEASE.md`, `DEPLOYMENT.md`, `PLAYSTORE_GUIDE.md`, `APPSTORE_GUIDE.md`, `CONTRIBUTING.md`) **do not exist** under those exact names. The project instead documents the same concerns under these equivalents:

| Concern | Authoritative file(s) in repo |
|---|---|
| Security audit & store checklist | [SECURITY_AUDIT.md](../SECURITY_AUDIT.md), [docs/AUDIT.md](AUDIT.md) |
| P0 security hardening (complete) | [SECURITY_HARDENING_P0_COMPREHENSIVE_REPORT.md](../SECURITY_HARDENING_P0_COMPREHENSIVE_REPORT.md), [P0_ALL_ITEMS_COMPLETE_FINAL_REPORT.md](../P0_ALL_ITEMS_COMPLETE_FINAL_REPORT.md) |
| P1 hardening roadmap | [P1_ROADMAP.md](../P1_ROADMAP.md) |
| OWASP Top 10 pentest | [IMPLEMENTATION_P21_OWASP_PENTESTING.md](../IMPLEMENTATION_P21_OWASP_PENTESTING.md), [P21_OWASP_PENTESTING_SUMMARY.md](../P21_OWASP_PENTESTING_SUMMARY.md), [OWASP_TOP10_QUICK_REFERENCE.md](../OWASP_TOP10_QUICK_REFERENCE.md) |
| Privacy / GDPR | [store-assets/privacy-policy.html](../store-assets/privacy-policy.html), `app/legal/privacy.tsx` |
| Firestore rules | [IMPLEMENTATION_P15_FIREBASE_RULES.md](../IMPLEMENTATION_P15_FIREBASE_RULES.md), [P15_FIREBASE_RULES_SUMMARY.md](../P15_FIREBASE_RULES_SUMMARY.md), [firestore.rules](../firestore.rules) |
| Architecture (Firebase vs Cosmos) | [ARCHITECTURE_CLARIFICATION_FIREBASE_VS_COSMOS.md](../ARCHITECTURE_CLARIFICATION_FIREBASE_VS_COSMOS.md) |
| Deployment / release | [EAS_BUILD_DEPLOYMENT_GUIDE.md](../EAS_BUILD_DEPLOYMENT_GUIDE.md), [LATEST_UPDATES_GUIDE.md](../LATEST_UPDATES_GUIDE.md) |
| Android obfuscation | [IMPLEMENTATION_P11_ANDROID_OBFUSCATION.md](../IMPLEMENTATION_P11_ANDROID_OBFUSCATION.md), [ANDROID_BUILD_CONFIGURATION_P11.md](../ANDROID_BUILD_CONFIGURATION_P11.md) |
| Rate limiting | [IMPLEMENTATION_P13_RATE_LIMITING.md](../IMPLEMENTATION_P13_RATE_LIMITING.md), [BACKEND_P13_RATE_LIMITING.md](../BACKEND_P13_RATE_LIMITING.md) |
| Store listing | [store-assets/play-store-description.md](../store-assets/play-store-description.md) |

**Documented DO / DO-NOT constraints carried forward:**
- **DO NOT** commit secrets — only `.env.example` is tracked (enforced by `.gitignore`).
- **DO NOT** store API keys in `EXPO_PUBLIC_*` for sensitive services — proxy through the backend (P0.1).
- **DO** use "App Signing by Google Play"; never lose the keystore (`SECURITY_AUDIT.md`).
- **DO** keep changes non-breaking — every prior P0/P1 delivery states "ZERO breaking changes".
- **DO** start store rollout via internal/alpha/beta before production (`eas.json` submit track = `internal`).

---

## 1. Security findings

### Already resolved per documentation (do not redo)
- **P0.1 API key exposure** → migrated to backend proxy (`src/services/speech-secure.ts`). Status: ✅ code complete; **backend `POST /api/chat/tts` & `/api/chat/stt` are the blocking dependency**.
- **P0.2 SSL certificate pinning** → `src/utils/https-pinning.ts`. Status: ✅ code complete; **needs real Azure cert pins + 1-line integration into the HTTP client**.
- **P0.3 Privacy policy** → `app/legal/privacy.tsx` + `store-assets/privacy-policy.html` (GDPR, FR+EN). Status: ✅.
- **P0.4 API versioning** → `src/api/versioning.ts`. Status: ✅ code complete.
- **P0.5 Redux DevTools hardening** → `src/store/devtools-middleware.ts`. Status: ✅ code complete.
- **P1.3 Rate limiting** → frontend done; backend middleware documented (`BACKEND_P13_RATE_LIMITING.md`). Status: ✅ frontend / ⏳ backend deploy.
- **P1.5 Firestore rules** → `firestore.rules` (302 lines, 53/53 tests). Status: ✅ authored; ⏳ **deploy decision pending** (see note below).
- **docs/AUDIT.md** critical items S1–S3 (SignalR empty token, plaintext assessment persistence, payment HTTPS guard) → ✅ fixed.

### Verified-good configuration (this audit)
- `.gitignore` correctly ignores `.env`, `.env.*`, `*.jks`, keystores; keeps only `.env.example` (placeholders only). ✅
- Android permissions are minimal and justified: `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `CAMERA` (`app.json`). ✅

### Open security items (consistent with docs, not yet closed)
- **Backend dependencies for P0.1/P0.2** remain the gating risk for store submission.
- **Security headers + CORS tightening** (OWASP #5) — documented as outstanding in `P21_OWASP_PENTESTING_SUMMARY.md` (backend-side).
- **Structured logging / Sentry (P1.4)** — not yet implemented (OWASP #9, rated HIGH in pentest summary).
- **Jailbreak/root detection (P1.2)** — not yet implemented (MEDIUM).
- **`npm audit`** — documented as a recurring required step (`BACKEND_NPM_AUDIT_GUIDE.md`); should be re-run before release.

### Architecture note (avoid contradiction)
Per [ARCHITECTURE_CLARIFICATION_FIREBASE_VS_COSMOS.md](../ARCHITECTURE_CLARIFICATION_FIREBASE_VS_COSMOS.md), the app uses **Firebase Auth + Azure Cosmos DB via backend APIs (Option A)** and does **not** use Firestore for data today. Therefore `firestore.rules` is a *defense-in-depth artifact*; deploying it is only required if/when Firestore is used directly. **Do not treat undeployed Firestore rules as a release blocker** for the current architecture.

---

## 2. Compliance findings

- **GDPR:** Privacy policy covers collection, usage, third parties (Firebase, Azure, Stripe, YouTube), retention, EU rights, contact. ✅ (`store-assets/privacy-policy.html`, updated 2 May 2026).
- **Store policy (medical/health):** Listing includes the required medical disclaimer ("ne remplace pas un suivi médical d'urgence") and crisis guidance (`store-assets/play-store-description.md`). ✅
- **Data safety / content rating:** Checklist exists but **Play Data Safety form + content rating questionnaire are not yet declared as submitted** (`SECURITY_AUDIT.md` lists them as TODO).
- **Age policy:** Docs recommend 18+ for mental-health content; **not yet finalized** in store config.
- **OWASP Top 10:** Overall residual risk rated **MEDIUM-HIGH** with 6/10 areas needing attention, mostly backend (headers, CORS, logging) (`P21_OWASP_PENTESTING_SUMMARY.md`).
- **Privacy Policy URL** (`mbipa.app/privacy`) and **support email** (`support@mbipa.app`) are referenced as required but flagged "à créer si pas encore fait" — **verify they are live** before submission.

---

## 3. Deployment findings

Authoritative process: [EAS_BUILD_DEPLOYMENT_GUIDE.md](../EAS_BUILD_DEPLOYMENT_GUIDE.md). Follow it as-is.

**`eas.json` audit (current):**
- `cli.appVersionSource: "remote"` + `production.autoIncrement: true` → versionCode is **EAS-managed remotely**. ✅ (Do not hand-edit `versionCode`.)
- Profiles: `development` (apk, dev client, channel `development`), `preview` (apk, channel `preview`), `production` (**app-bundle / AAB**, channel `production`). ✅ matches guide.
- `submit.production.android.track: "internal"` → first rollout goes to the **internal** track. ✅ consistent with "start alpha/beta" guidance.
- **iOS submit config absent** — no `submit.production.ios`. Expected, since iOS builds were intentionally skipped per the guide.

**`app.json` audit (current):**
- `version: "1.0.0"`, `runtimeVersion.policy: "appVersion"`, EAS `projectId` and `updates.url` present. ✅
- OTA updates configured on channel `production` via `u.expo.dev`. ✅
- Stripe plugin `merchantIdentifier` is **empty** (`""`) — required for Apple Pay on iOS; fine for Android-first.
- New **in-app update system** (added this session: `src/services/versionService.ts`, `useVersionCheck`, `AppUpdateGate`) calls `GET /api/mobile/app/version`. This **complements** OTA/EAS and does not conflict with the documented deployment flow. Backend endpoint reference provided at `backend-reference/appVersion.route.js`.

---

## 4. Release readiness findings

| Area | State per docs | Blocking for store? |
|---|---|---|
| P0.1–P0.5 frontend code | ✅ Complete | No (code) |
| Backend TTS/STT proxy (P0.1 dep) | ⏳ Pending | **Yes** |
| Azure certificate pins (P0.2 dep) | ⏳ Pending | **Yes** (or ship P0.2 in monitor-only mode) |
| Privacy policy (app + hosted URL) | ✅ Authored | Verify URL live |
| Android AAB build | ✅ Produced (versionCode 4) | No |
| iOS build | ⏳ Skipped intentionally | Only if iOS launch |
| Security headers + CORS (backend) | ⏳ Pending | High risk, not hard-block |
| Logging/Sentry (P1.4) | ⏳ Pending | No (post-launch acceptable) |
| Play Data Safety + content rating | ⏳ Not declared | **Yes** (Play requirement) |
| ProGuard/R8 (P1.1) | See P11 docs | Recommended, not hard-block |

**Overall readiness (reconciling sources):** Frontend security ~95% (P0 complete per `P0_ALL_ITEMS_COMPLETE_FINAL_REPORT.md`); **end-to-end readiness gated by backend tasks + store compliance declarations**.

---

## 5. Configuration audit snapshot

- **Expo:** SDK 54, expo-router 6, new arch enabled, typed routes, React Compiler experiment on. Splash/secure-store/localization/image-picker plugins configured. ✅
- **Firebase:** Auth-only usage confirmed; persistence via AsyncStorage. Console-side tasks (email templates FR, authorized domains, action URL) remain manual per `docs/AUDIT.md §5`.
- **Azure:** Backend host `mbipa-whatsapp-...eastus-01.azurewebsites.net`; Cosmos DB `mbipaDB` is the data store. Speech/OpenAI keys must stay backend-side (P0.1).
- **EAS:** Remote version source, AAB production, internal submit track, OTA channel `production`. ✅
- **Android readiness:** Package `com.mbipa.app`, minimal permissions, AAB built. Keystore via Google Play App Signing (do not lose). ProGuard/R8 per P11 docs to confirm enabled.
- **iOS readiness:** `bundleIdentifier com.mbipa.app`, `ITSAppUsesNonExemptEncryption: false`. Build intentionally deferred; needs Apple Developer credentials, App Store Connect setup, empty `merchantIdentifier` if Apple Pay desired.

---

## 6. Prioritized action plan (proposed — awaiting approval)

> Nothing here overrides existing docs; each item points back to the documented process. **No code will be changed until you approve.**

### 🔴 Critical (store-blocking)
1. **Backend: implement P0.1 proxies** `POST /api/chat/tts` & `/api/chat/stt` (ref: `BACKEND_IMPLEMENTATION_PROMPT.md`). Frontend already wired.
2. **Backend: obtain & configure Azure cert pins for P0.2** (ref: `DEVOPS_CERTIFICATE_PINS_PROMPT.md`), then do the 1-line integration into the HTTP client. *(Alternatively ship P0.2 in monitor-only mode to avoid hard outages.)*
3. **Store compliance: complete Play Data Safety form + content rating questionnaire**, set age policy (18+), and **verify `mbipa.app/privacy` + `support@mbipa.app` are live** (ref: `SECURITY_AUDIT.md`, `play-store-description.md`).

### 🟠 High
4. **Backend: security headers (helmet/HSTS/CSP/X-Content-Type-Options) + tighten CORS to `https://mbipa.app`** (ref: `P21_OWASP_PENTESTING_SUMMARY.md`, `BACKEND_SECURITY_HEADERS_IMPLEMENTATION.md`, `BACKEND_CORS_IMPLEMENTATION.md`).
5. **Backend: deploy rate-limiting middleware** (login/register/reset/contact) (ref: `BACKEND_P13_RATE_LIMITING.md`).
6. **Run `npm audit` (frontend + backend) and resolve** (ref: `BACKEND_NPM_AUDIT_GUIDE.md`).
7. **Verify access-control (IDOR/ownership) on all backend endpoints** via `scripts/penetration-tests.js`.

### 🟡 Medium
8. **Logging/Sentry (P1.4)** — structured logging, strip sensitive fields, disable console in prod.
9. **ProGuard/R8 (P1.1)** — confirm enabled in release build & mapping file retained (ref: P11 docs).
10. **Jailbreak/root detection (P1.2)** — `src/utils/device-security.ts` + startup check.
11. **Patch v1.0.1 items from `docs/AUDIT.md §6`** — API timeout 10s, assessment index validation, a11y (`accessibilityState`/`radio`), `KeyboardAvoidingView` on profile edit, empty/retry states.

### 🟢 Low (post-launch)
12. Dark mode, skeleton loaders, music player cross-tab sync, iOS Dynamic Type, signed App Links / Universal Links, Firebase custom domain + email templates FR.
13. Decide whether to deploy `firestore.rules` (only needed if Firestore becomes a direct data store — currently Option A/Cosmos).
14. Wire the new in-app update endpoint server-side (`backend-reference/appVersion.route.js`) and set `latestVersion`/`minimumVersion` policy.

---

## 7. Approval gate

Per your instructions, **no code changes will be applied until you approve.** Please confirm:
- Which plan items (by number) you want implemented now, and
- Whether any belong to the **backend** repo (several Critical/High items are backend-side and out of this Expo workspace).

All approved work will preserve full backward compatibility and follow the existing documented procedures above.
