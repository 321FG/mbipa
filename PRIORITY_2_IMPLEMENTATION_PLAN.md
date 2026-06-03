# Priority 2 Implementation - This Week

**Timeline:** May 27-31, 2026 (5 days)  
**Estimated Time:** 10-12 hours total  
**Status:** Ready to implement  

---

## 📋 Priority 2 Tasks (HIGH PRIORITY)

### Task 1: Add Security Headers (2 hours)
**Goal:** Prevent MITM attacks, clickjacking, MIME sniffing

**What:** Backend needs to send security headers

**Implementation:**

```typescript
// backend/middleware/security-headers.ts
import express from 'express';

export const securityHeaders = express.Router();

export function addSecurityHeaders(req, res, next) {
  // HSTS: Force HTTPS for 1 year
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // XSS protection (legacy, browser-level)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:"
  );
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (formerly Feature-Policy)
  res.setHeader(
    'Permissions-Policy',
    'microphone=(self), camera=(self), geolocation=()'
  );
  
  next();
}
```

**Add to app startup:**

```typescript
// backend/app.ts
import { addSecurityHeaders } from './middleware/security-headers';

app.use(addSecurityHeaders);
// or use helmet package
// app.use(helmet());
```

**Verification:**

```bash
# Test headers are present
curl -I https://api.mbipa.com

# Should show:
# Strict-Transport-Security: max-age=31536000; includeSubDomains
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
```

---

### Task 2: Fix CORS Configuration (1 hour)
**Goal:** Only allow requests from your domain

**Current Issue:** CORS may be too permissive (wildcard `*`)

**Implementation:**

```typescript
// backend/middleware/cors.ts
import cors from 'cors';

const allowedOrigins = [
  'https://mbipa.app',
  'https://www.mbipa.app',
  'https://app.mbipa.app',
  'exp://192.168.0.101:8082'  // Local dev only - remove for prod
];

export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,  // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400  // 24 hours
};

app.use(cors(corsOptions));
```

**Test:**

```bash
# Should work (allowed origin)
curl -H "Origin: https://mbipa.app" -I https://api.mbipa.com
# Response: Access-Control-Allow-Origin: https://mbipa.app

# Should fail (not allowed)
curl -H "Origin: https://evil.com" -I https://api.mbipa.com
# Response: Access to XMLHttpRequest blocked by CORS policy
```

---

### Task 3: Run npm audit (1 hour)
**Goal:** Find and fix vulnerable dependencies

**Commands:**

```bash
# Check for vulnerabilities
npm audit

# Auto-fix what can be fixed
npm audit fix

# Force major version updates (risky, review carefully)
npm audit fix --force

# Save list of issues
npm audit --json > audit-report.json
```

**Expected Output:**
```
found 3 vulnerabilities (1 moderate, 2 high)
```

**Action for each:**
- **High/Critical:** Fix immediately (try `npm audit fix`)
- **Moderate:** Fix in next sprint
- **Low:** Can ignore if not exploitable

---

### Task 4: Run Penetration Tests (2 hours)
**Goal:** Identify vulnerabilities in your setup

**Command:**

```bash
node scripts/penetration-tests.js
```

**Expected Output:**
```
✅ Cannot read other user data (Horizontal ACL)
✅ Cannot access admin endpoints as regular user (Vertical ACL)
✅ HTTPS is enabled
✅ Security headers are present
❌ Rate limiting is enforced
...
```

**For each failing test:**
1. Note which test failed
2. Check `IMPLEMENTATION_P21_OWASP_PENTESTING.md` for fix
3. Implement the fix
4. Re-run tests
5. Commit when all pass

---

### Task 5: Run Security Headers Tests (2 hours)
**Goal:** Verify headers are working

**Manual Test (using curl):**

```bash
# 1. Check HSTS header
curl -I https://api.mbipa.com | grep -i "Strict-Transport-Security"
# Expected: Strict-Transport-Security: max-age=31536000; includeSubDomains

# 2. Check X-Content-Type-Options
curl -I https://api.mbipa.com | grep -i "X-Content-Type-Options"
# Expected: X-Content-Type-Options: nosniff

# 3. Check X-Frame-Options
curl -I https://api.mbipa.com | grep -i "X-Frame-Options"
# Expected: X-Frame-Options: DENY

# 4. Check CSP
curl -I https://api.mbipa.com | grep -i "Content-Security-Policy"
# Expected: Content-Security-Policy: default-src 'self'; ...
```

**Automated Test (using securityheaders.com):**

```bash
# Or visit:
https://securityheaders.com/?q=api.mbipa.com
```

**Expected Score:** A+ (all headers present)

---

## 🎯 Day-by-Day Implementation

### Monday (Today - May 27)
- [ ] 10:00-12:00: Implement security headers
- [ ] 12:00-13:00: Fix CORS configuration
- [ ] 13:00-14:00: Run npm audit
- Commit: "security: add headers and fix CORS"

### Tuesday (May 28)
- [ ] 10:00-12:00: Run penetration tests
- [ ] 12:00-13:00: Fix failing tests (as many as possible)
- [ ] 13:00-14:00: Run tests again
- Commit: "security: fix OWASP vulnerabilities from P2.1 tests"

### Wednesday (May 29)
- [ ] Fix any remaining penetration test failures
- [ ] Verify security headers with curl
- [ ] Run full test suite: `npm test`
- Commit: "security: all P2.1 tests passing"

### Thursday (May 30)
- [ ] Buffer day for any issues
- [ ] Documentation review

### Friday (May 31)
- [ ] Final security review
- [ ] Prepare for next phase (P1.2 or P1.4)

---

## 📦 Dependencies You'll Need

### If not already installed:

```bash
npm install helmet cors
# or manually implement (shown above)

npm install jsonwebtoken
# for JWT validation

npm install express-rate-limit
# for rate limiting (if not done in P1.3)
```

---

## ✅ Success Criteria

**Task 1 - Headers:** ✅ All headers present in curl output
**Task 2 - CORS:** ✅ Only allowed origins can access API
**Task 3 - npm audit:** ✅ 0 vulnerabilities (or only low-risk)
**Task 4 - Penetration Tests:** ✅ 20/20 tests passing
**Task 5 - Header Tests:** ✅ A+ on securityheaders.com

---

## 🆘 Troubleshooting

### Issue: Tests failing after adding headers
**Solution:** Headers might be added twice (once by helmet, once manually)
```typescript
// Either use helmet...
app.use(helmet());

// OR manually add headers (not both)
app.use(addSecurityHeaders);
```

### Issue: CORS blocking legitimate requests
**Solution:** Add origin to allowlist
```typescript
const allowedOrigins = [
  'https://mbipa.app',
  'https://new-origin.com'  // ← Add here
];
```

### Issue: npm audit fix breaks something
**Solution:** Revert and update manually
```bash
npm audit fix --force  # Reverted
npm update package-name@latest  # Update specific package
npm test  # Verify
```

### Issue: Penetration tests can't reach API
**Solution:** Check API is running
```bash
curl https://api.mbipa.com
# If connection refused, start backend first
```

---

## 📊 Before/After Comparison

| Security Level | Before P2 | After P2 |
|---|---|---|
| HTTPS | ✅ Yes | ✅ Yes + HSTS |
| CORS | ⚠️ Permissive | ✅ Restricted |
| Headers | ❌ Missing | ✅ Complete |
| Vulnerabilities | ⚠️ Unknown | ✅ 0 (npm audit) |
| OWASP Tests | ❌ 0/20 | ✅ 20/20 |
| Security Grade | 🟡 C+ | 🟢 A+ |

---

## 🚀 Files to Update

```
backend/
  ├── app.ts                    ← Add security headers middleware
  ├── middleware/
  │   ├── cors.ts               ← Fix CORS configuration
  │   └── security-headers.ts   ← Add new file
  └── package.json              ← After npm audit fix

scripts/
  └── penetration-tests.js      ← Already created, just run it

package.json
  └── Dependencies check & update
```

---

## 💾 Commits You'll Make

```
1. "security: add security headers middleware"
   - File: middleware/security-headers.ts

2. "security: fix CORS configuration to whitelist origins"
   - File: middleware/cors.ts

3. "security: run npm audit and fix vulnerabilities"
   - File: package.json, package-lock.json

4. "security: fix OWASP Top 10 penetration test failures"
   - Various files based on test failures

5. "security: all P2.1 tests passing"
   - Summary commit
```

---

## 📞 Questions Before You Start?

- Backend framework: Express.js? Node.js version?
- Current npm packages? (To check npm audit)
- API domain: `mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net`?
- Local dev port: 3000? 5000?

---

**Ready to implement Priority 2?** ✅

Start with Task 1 (security headers) - it's the quickest win (2 hours).
