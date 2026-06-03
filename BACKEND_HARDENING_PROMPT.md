# 🔧 MBIPA — Backend Implementation Prompt (Production Hardening)

You are a senior Node.js / Express engineer working on the **MBIPA backend** hosted at `https://mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net` (Azure App Service, region `eastus-01`). The mobile app (Expo / React Native) is already shipped with the corresponding client code.

## ⚠️ Hard constraints

- **DO NOT break existing endpoints.** The mobile app in production already calls `/api/v1/appointments`, `/api/v1/testimonials`, `/api/v1/messages`, `/api/auth/*`, `/api/users/me`, `/api/chat/*`, `/api/mobile/assessments/*`, `/api/sessions/*`, `/api/mobile/auth`. All must keep working.
- **DO NOT change authentication semantics.** Keep Firebase ID token (Bearer) verification as the auth method. Anonymous form submits must remain allowed where they already are (testimonials/messages/appointments accept `userId: "anonymous"`).
- **DO NOT introduce breaking response shapes.** Keep the `201 { success: true, id: "<uuid>" }` contract for the form endpoints.
- **All work must be backward compatible.** Add new endpoints/middleware; do not delete existing routes.
- **Persistence:** Cosmos DB `mbipaDB`, partition key `/userId`. Do not change the partitioning strategy.
- Source of truth = the existing `mbipa-app` repo docs (`SECURITY_AUDIT.md`, `BACKEND_*`, `P21_OWASP_PENTESTING_SUMMARY.md`, `P1_ROADMAP.md`).

---

## 🎯 Deliverables (in priority order)

### 🔴 1. Speech proxy endpoints (P0.1 dependency — frontend already wired)

The mobile app moved Azure Speech keys off-device. Implement two server-side proxies that hold the keys in env vars and forward to Azure Cognitive Services.

- `POST /api/chat/tts`
  - Auth: required (Firebase Bearer).
  - Body: `{ text: string (max 1000 chars), voice?: string, language?: "fr-FR" | "en-US", format?: "mp3" | "wav" }`
  - Response: `audio/mpeg` (or `audio/wav`) binary stream + headers `X-TTS-Voice`, `X-TTS-Cached`.
  - Implementation: call Azure Speech REST `/cognitiveservices/v1` with SSML; key from `AZURE_SPEECH_KEY`, region from `AZURE_SPEECH_REGION`.
- `POST /api/chat/stt`
  - Auth: required.
  - Body: multipart/form-data, field `audio` (≤ 25 MB, WAV/PCM 16 kHz mono preferred), field `language` (default `fr-FR`).
  - Response: `200 { text: string, confidence?: number, durationMs: number }`.
  - Implementation: forward to Azure Speech `/speech/recognition/conversation/cognitiveservices/v1`.

Requirements:
- 30 s timeout; return `504` on Azure timeout (never hang).
- Validate inputs; return `400` with `{ error, code }` for invalid payloads.
- Cap request size: TTS `1000` chars, STT `25 MB`.
- Log only metadata (length, duration, latency) — **never** log the text or audio.
- Add per-user rate limit (see item 4).

### 🔴 2. SSL certificate pinning support (P0.2 dependency)

Provide the **production certificate pins** (SHA-256 SPKI) for `mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net` and any custom domain (`api.mbipa.app` if/when used). Two pins minimum: leaf + backup CA (Azure intermediate). Document the rotation process.

Output expected:
```json
{
  "host": "mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net",
  "pins": [
    "sha256/<leaf-spki-base64>",
    "sha256/<intermediate-spki-base64>"
  ],
  "rotateBefore": "<ISO-date>"
}
```

Procedure to extract pins documented in the repo at `DEVOPS_CERTIFICATE_PINS_PROMPT.md` (use `openssl s_client … | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64`).

### 🔴 3. App version endpoint (in-app update system — frontend already wired)

Implement exactly the contract the mobile client expects. A reference implementation is committed at `backend-reference/appVersion.route.js`.

- `GET /api/mobile/app/version`
  - Auth: **public** (no token).
  - Response 200:
    ```json
    {
      "latestVersion": "1.1.0",
      "minimumVersion": "1.0.0",
      "forceUpdate": false,
      "releaseNotes": ["Improved AI conversations", "Voice enhancements", "Bug fixes"],
      "playStoreUrl": "https://play.google.com/store/apps/details?id=com.mbipa.app"
    }
    ```
  - Cache header: `Cache-Control: public, max-age=60`.
  - Config from env: `APP_LATEST_VERSION`, `APP_MINIMUM_VERSION`, `APP_FORCE_UPDATE`, `APP_PLAY_STORE_URL`. Release notes can be a JSON env var or a config file — both acceptable.
  - Must never throw; on internal error return the last known good config (in-memory cache).

### 🔴 4. Rate limiting (P1.3) — `express-rate-limit` (Redis-backed in prod)

Per `BACKEND_P13_RATE_LIMITING.md`:

| Endpoint | Window | Max | Key |
|---|---|---|---|
| `POST /api/auth/login` & `/api/mobile/auth` | 10 min | 5 | `ip:email` |
| `POST /api/auth/register` | 10 min | 3 | `ip:email` |
| `POST /api/auth/forgot-password` | 30 min | 3 | `ip:email` |
| `POST /api/v1/messages` (contact) | 1 h | 5 | `ip` |
| `POST /api/v1/testimonials` | 1 h | 5 | `ip` |
| `POST /api/v1/appointments` | 1 h | 10 | `ip` |
| `POST /api/chat/tts` & `/stt` | 1 min | 30 | `userId` (or `ip` if anon) |

Requirements:
- Return standard `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` headers.
- Status `429` with body `{ error, retryAfter }`.
- Use Redis store in production (`REDIS_URL`); in-memory only for dev.
- Skip for `req.user.role === 'admin'`.
- Log violations (IP + endpoint + key) to the structured logger (item 7).

### 🟠 5. Security headers + CORS (OWASP #5)

Per `BACKEND_SECURITY_HEADERS_IMPLEMENTATION.md` and `BACKEND_CORS_IMPLEMENTATION.md`:

- Add `helmet()` with:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - Referrer-Policy `no-referrer`
  - `Content-Security-Policy` for the marketing site / hosted privacy page (`store-assets/privacy-policy.html`); skip CSP for pure JSON APIs but keep nosniff.
- CORS:
  - Allowed origins: `https://mbipa.app`, `https://www.mbipa.app`, mobile app (no Origin header from native — allow null).
  - **Remove any `*` wildcard** currently in place.
  - `credentials: true`, restrict methods to those used.
- Disable `X-Powered-By` (`app.disable('x-powered-by')`).
- Force HTTPS (Azure App Service: enable "HTTPS Only" + redirect middleware).

### 🟠 6. Access control verification (OWASP #1)

Audit every authenticated endpoint:
- Every read/write of a Cosmos doc must enforce `doc.userId === req.user.uid` (or admin).
- Replace any `req.params.userId` trust with `req.user.uid` from the verified Firebase token.
- Add integration tests covering horizontal IDOR (user A reads user B's resource → must `403`).
- Re-run `scripts/penetration-tests.js` from the mobile repo against the deployed backend; all 20 tests must pass.

### 🟠 7. Structured logging + Sentry (P1.4 — OWASP #9)

- Add `@sentry/node` (or Application Insights — already provisioned in Azure) with environment tags `dev|staging|prod`.
- Use `pino` (or `winston`) JSON logger; ship to Azure Log Analytics + Sentry.
- **Never log:** `password`, `idToken`, `refreshToken`, `accessToken`, `Authorization` header, audio/text bodies, full Cosmos documents.
- Log security events: failed logins, rate-limit violations, 4xx/5xx with correlation id, Firebase token verification failures.
- Disable `console.log` in production (`if (!isProd) console.log(...)` only) and add lint rule.

### 🟠 8. Dependencies

- Run `npm audit --omit=dev` and fix all `high`/`critical` findings (`BACKEND_NPM_AUDIT_GUIDE.md`).
- Pin Node version in `package.json` `engines`.
- Add `npm audit` to CI; fail builds on `high`+.

### 🟡 9. Health + readiness

- `GET /api/health` → `200 { status: "ok", uptime, version }`. Public.
- `GET /api/readiness` → checks Cosmos + Azure Speech reachability. `200` or `503`.

---

## 📦 Required environment variables (Azure App Service → Configuration)

```
NODE_ENV=production
PORT=8080
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
COSMOS_ENDPOINT=...
COSMOS_KEY=...
COSMOS_DB=mbipaDB
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=westus2
AZURE_OPENAI_KEY=...
AZURE_OPENAI_ENDPOINT=...
REDIS_URL=...
SENTRY_DSN=...
ALLOWED_ORIGINS=https://mbipa.app,https://www.mbipa.app
APP_LATEST_VERSION=1.1.0
APP_MINIMUM_VERSION=1.0.0
APP_FORCE_UPDATE=false
APP_PLAY_STORE_URL=https://play.google.com/store/apps/details?id=com.mbipa.app
```

Never commit a `.env`. Only `.env.example` with placeholders is tracked.

---

## ✅ Acceptance criteria (run before declaring done)

1. `curl -I https://<host>/api/health` → `200` with HSTS, X-Content-Type-Options, X-Frame-Options headers, no `X-Powered-By`.
2. `curl https://<host>/api/mobile/app/version` → exact JSON shape above, no auth.
3. `POST /api/chat/tts` with valid Firebase Bearer + `{ text: "Bonjour" }` → audio binary in < 3 s.
4. 6 consecutive `POST /api/auth/login` from same IP+email → 6th returns `429` with `RateLimit-*` headers.
5. User A cannot read User B's appointments / testimonials / sessions → `403`.
6. `node scripts/penetration-tests.js` (from mobile repo, pointed at this backend) → 20/20 pass.
7. `npm audit --omit=dev` → 0 high / 0 critical.
8. Sentry receives a synthetic error within 5 s.
9. Existing mobile app build (versionCode 4) keeps working unchanged against the new backend (regression smoke test on appointments/testimonials/messages/auth/chat).
10. CORS preflight from `https://mbipa.app` → allowed; from `https://evil.example.com` → blocked.

---

## 🚫 Out of scope

- Migrating data out of Cosmos.
- Touching the chatbot prompt/voice/avatar logic (frontend-owned).
- Firestore (the app uses Cosmos via API, per `ARCHITECTURE_CLARIFICATION_FIREBASE_VS_COSMOS.md`).
- App store submission (mobile-side).

Deliver a PR per item (or a single PR with clear commits per item) plus a short `BACKEND_HARDENING_RESULTS.md` showing the 10 acceptance checks passing.
