# 🧪 PENETRATION TESTING GUIDE
## Priority 2 - Run OWASP Penetration Tests

**For:** Backend Team & Security Team  
**Time:** 2 hours  
**Impact:** Identify OWASP Top 10 vulnerabilities

---

## 📋 What is Penetration Testing?

Penetration testing (pen testing) means actively trying to exploit your API to find vulnerabilities **before attackers do**.

This guide runs automated tests for the OWASP Top 10 most critical vulnerabilities.

---

## 🚀 Quick Start

### Prerequisites

Your backend API must be running:

```bash
# Terminal 1: Start your backend
npm start
# or
npm run dev

# Should show:
# Server running on https://mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net
```

### Run the Test Suite

```bash
# Terminal 2: Run penetration tests
node scripts/penetration-tests.js
```

**Expected output:**

```
[OWASP TOP 10 PENETRATION TESTING SUITE]

✅ Cannot read other user data (Horizontal ACL)
✅ Cannot access admin endpoints as regular user (Vertical ACL)
✅ HTTPS is enabled
❌ Security headers are present
✅ NoSQL injection protection (input validation)
❌ Rate limiting is enforced
...

Total Tests: 20
✅ Passed: 17
❌ Failed: 3
Pass Rate: 85.0%
```

---

## 🔍 Understanding Test Results

### ✅ Test Passing

```
✅ Cannot read other user data (Horizontal ACL)
   Status: 403 (expected 403 or 401)
```

**Meaning:** Your API correctly rejected unauthorized access. ✓ Good!

### ❌ Test Failing

```
❌ Security headers are present
   Headers: server, content-type (missing: strict-transport-security)
```

**Meaning:** Security headers are missing. You need to fix this.

---

## 📊 OWASP Top 10 Vulnerabilities Explained

### 1️⃣ BROKEN ACCESS CONTROL

**What it is:** Users can access data they shouldn't have access to.

**Example of vulnerability:**
```typescript
// ❌ WRONG
app.get('/api/v1/assessments/:id', (req, res) => {
  // Returns ANY assessment by ID, no ownership check!
  db.findOne({ id: req.params.id });
});

// An attacker can guess other users' assessment IDs
GET /api/v1/assessments/user123-assessment-456
→ Returns data they shouldn't see
```

**How we test it:**
- Try to read another user's data → Should get 403
- Try to access admin endpoints → Should get 403

**Fix:**
```typescript
// ✅ RIGHT
app.get('/api/v1/assessments/:id', authenticateToken, (req, res) => {
  const uid = req.user.uid;  // From JWT
  const assessment = db.findOne({
    id: req.params.id,
    userId: uid  // ← Must match!
  });
  
  if (!assessment) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  res.json(assessment);
});
```

---

### 2️⃣ CRYPTOGRAPHIC FAILURES

**What it is:** Sensitive data is transmitted or stored insecurely.

**Example of vulnerability:**
```typescript
// ❌ WRONG
fetch('http://api.com/login', { body: { email, password } });
// Sent over HTTP (not HTTPS) - can be intercepted!
```

**How we test it:**
- Is API using HTTPS? → Should be yes
- Are security headers present? → Should prevent MITM

**Fix:**
```typescript
// ✅ RIGHT
// Always use HTTPS
fetch('https://api.com/login', { body: { email, password } });

// Add security headers (prevents MITM)
res.setHeader('Strict-Transport-Security', 'max-age=31536000');
```

---

### 3️⃣ INJECTION

**What it is:** Attacker injects malicious code through input fields.

**Example of vulnerability:**
```typescript
// ❌ WRONG
app.post('/api/search', (req, res) => {
  // Attacker could send: { query: "'; DROP TABLE users; --" }
  const results = db.query(`SELECT * FROM items WHERE name = '${req.body.query}'`);
  res.json(results);
});
```

**How we test it:**
- Send NoSQL injection payload: `"; db.dropDatabase(); //`
- Send command injection payload: `file.txt; rm -rf /`
- Should get 400 (bad request), not execute!

**Fix:**
```typescript
// ✅ RIGHT
app.post('/api/search', (req, res) => {
  // Use parameterized queries / ORM
  const results = db.find({
    name: req.body.query  // Never concatenate!
  });
  res.json(results);
});
```

---

### 4️⃣ INSECURE DESIGN

**What it is:** No protection against brute force, account enumeration, etc.

**Example of vulnerability:**
```typescript
// ❌ WRONG - No rate limiting
app.post('/api/login', (req, res) => {
  // Attacker can try 1000 passwords per minute
  const user = authenticate(req.body.email, req.body.password);
});

// ❌ WRONG - Different error messages
if (!user) return res.status(404);  // Email doesn't exist
if (!validPassword) return res.status(401);  // Bad password
// Attacker knows which emails are registered!
```

**How we test it:**
- Try login 10 times → Should get 429 (too many requests)
- Compare error messages for missing email vs wrong password → Should be identical

**Fix:**
```typescript
// ✅ RIGHT - Rate limiting
const limiter = rateLimit({ windowMs: 10*60*1000, max: 5 });
app.post('/api/login', limiter, (req, res) => { ... });

// ✅ RIGHT - Same error message
if (!user || !validPassword) {
  return res.status(401).json({ error: 'Invalid email or password' });
}
```

---

### 5️⃣ SECURITY MISCONFIGURATION

**What it is:** Missing security headers, debug mode on, etc.

**Example of vulnerability:**
```typescript
// ❌ WRONG - No security headers
app.use((req, res, next) => {
  res.send('Hello');  // No HSTS, no CSP, etc.
});

// ❌ WRONG - Debug mode in production
if (process.env.NODE_ENV !== 'production') {
  app.use(errorHandler);  // Leaks stack traces!
}
```

**How we test it:**
- Check for HSTS header → Should be present
- Check for X-Content-Type-Options → Should be present
- Check for CSP → Should be present

**Fix:**
```typescript
// ✅ RIGHT
app.use(helmet());  // Adds all security headers
app.use(cors({ origin: 'https://mbipa.app' }));

// ✅ RIGHT - No debug info in prod
app.use((err, req, res, next) => {
  console.error(err);  // Log error
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Server error'
      : err.message  // Only show details in dev
  });
});
```

---

### 6️⃣ VULNERABLE & OUTDATED COMPONENTS

**What it is:** Using npm packages with known vulnerabilities.

**Example:**
```json
{
  "dependencies": {
    "lodash": "3.10.1"  // ❌ Old version with vulnerability!
  }
}
```

**How we test it:**
- Run `npm audit` → Should show 0 vulnerabilities

**Fix:**
```bash
npm audit fix
npm update lodash@latest
```

---

### 7️⃣ IDENTIFICATION & AUTHENTICATION FAILURES

**What it is:** Tokens don't expire, sessions not validated, etc.

**Example of vulnerability:**
```typescript
// ❌ WRONG - Token never expires
const token = jwt.sign({ uid }, secret);  // No expiration!

// After token stolen, attacker has permanent access
```

**How we test it:**
- Send expired token → Should get 401
- Send invalid token → Should get 401

**Fix:**
```typescript
// ✅ RIGHT - Token expires
const token = jwt.sign(
  { uid },
  secret,
  { expiresIn: '24h' }  // ← Expires after 24 hours
);

// In route handler
app.get('/api/user', authenticateToken, (req, res) => {
  // Token automatically validated and expiration checked
});
```

---

### 8️⃣ DATA INTEGRITY FAILURES

**What it is:** Code could be modified, CI/CD compromised, etc.

**Example:**
```typescript
// ❌ WRONG - Anyone can push to main
git push origin main  // No branch protection, no review

// ❌ WRONG - Secrets in git history
git log  // Contains old API keys!
```

**Fix:**
```bash
# ✅ RIGHT - Protected branches
# GitHub: Enable branch protection
# Require: pull request review, status checks pass

# ✅ RIGHT - Signed commits
git commit -S -m "Fix bug"  # Sign with GPG key

# ✅ RIGHT - No secrets in git
git rm --cached .env  # Don't commit secrets
echo .env >> .gitignore
```

---

### 9️⃣ LOGGING & MONITORING FAILURES

**What it is:** No logs of security events, or logs contain secrets.

**Example of vulnerability:**
```typescript
// ❌ WRONG - Logs contain password!
console.log(`Login: ${email}, ${password}`);

// ❌ WRONG - No security logging
// Attacker brute forces with no alerts
```

**Fix:**
```typescript
// ✅ RIGHT - Structured logging
logger.info('Login attempt', {
  email: email,
  // Don't log: password, token, creditCard, ssn
  timestamp: new Date(),
  ip: req.ip,
  success: true
});

// Alert on multiple failed attempts
if (failedAttempts > 5) {
  logger.warn('Multiple failed login attempts', { email, ip });
  // Could block account or IP
}
```

---

### 🔟 SERVER-SIDE REQUEST FORGERY (SSRF)

**What it is:** Attacker tricks server into fetching URLs they control.

**Example of vulnerability:**
```typescript
// ❌ WRONG - User controls URL
app.post('/api/fetch', (req, res) => {
  fetch(req.body.url);  // Attacker could send "http://localhost:8080/admin"
});
```

**Fix:**
```typescript
// ✅ RIGHT - Whitelist URLs
const whitelist = [
  'https://api.example.com',
  'https://cdn.example.com'
];

app.post('/api/fetch', (req, res) => {
  if (!whitelist.includes(req.body.url)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  fetch(req.body.url);
});
```

---

## 🧪 How to Run & Fix Issues

### Step 1: Run the tests

```bash
node scripts/penetration-tests.js
```

### Step 2: Review failing tests

```
❌ Security headers are present
   Headers: server, content-type
   (missing: strict-transport-security)
```

This means HSTS header is missing. Fix it:

```typescript
// backend/app.ts
import helmet from 'helmet';

app.use(helmet());  // Adds security headers
```

### Step 3: Re-run tests

```bash
node scripts/penetration-tests.js
```

Should now show:

```
✅ Security headers are present
   Headers: strict-transport-security, x-content-type-options, ...
```

### Step 4: Fix all failing tests

Repeat steps 2-3 for each failing test.

### Step 5: Verify all pass

```
Total Tests: 20
✅ Passed: 20
❌ Failed: 0
Pass Rate: 100.0%
```

---

## 📋 Complete Test Checklist

| # | Vulnerability | Test | Fix | Status |
|---|---|---|---|---|
| 1 | Access Control | Can I read other users' data? | Add userId check | ? |
| 2 | Cryptographic | Is HTTPS enforced? | Use HTTPS only | ? |
| 3 | Injection | Can I inject malicious code? | Validate input | ? |
| 4 | Insecure Design | Rate limiting works? | npm install express-rate-limit | ? |
| 5 | Misconfiguration | Security headers present? | npm install helmet | ? |
| 6 | Vulnerable Components | npm vulnerabilities? | npm audit fix | ? |
| 7 | Auth Failures | Expired tokens rejected? | Add expiration | ? |
| 8 | Integrity | Code signed? | Enable branch protection | ? |
| 9 | Logging | No sensitive data logged? | Audit console.log | ? |
| 10 | SSRF | Can fetch localhost? | Whitelist URLs | ? |

---

## 🚀 Running Tests Automatically

### In CI/CD Pipeline

```yaml
# .github/workflows/security.yml
name: Security Tests

on: [push]

jobs:
  penetration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm start &  # Start server in background
      - run: sleep 5  # Wait for server to start
      - run: node scripts/penetration-tests.js
        # Fails if any test fails (prevents merging)
```

---

## 📊 Sample Output

```
======================================================================
OWASP TOP 10 PENETRATION TESTING SUITE
======================================================================

[1. BROKEN ACCESS CONTROL]

✅ Cannot read other user data (Horizontal ACL)
   Status: 403 (expected 403 or 401)
✅ Cannot access admin endpoints as regular user (Vertical ACL)
   Status: 401 (expected 403 or 401)

[2. CRYPTOGRAPHIC FAILURES]

✅ HTTPS is enabled
   API uses: https://api.mbipa.com
❌ Security headers are present
   Headers: server, content-type
   (expected: strict-transport-security, x-content-type-options, ...)

[3. INJECTION]

✅ NoSQL injection protection (input validation)
   Status: 400
❌ Command injection protection
   Status: 200 (expected 400 or 422)

...

======================================================================
TEST SUMMARY
======================================================================

Total Tests: 20
✅ Passed: 17
❌ Failed: 3
Pass Rate: 85.0%

ISSUES FOUND - SEE RECOMMENDATIONS

======================================================================
RECOMMENDATIONS
======================================================================

High Priority Issues to Fix:
1. Add security headers (helmet package)
2. Implement command input validation
3. Enable rate limiting on login endpoint
...
```

---

## 💾 Next Steps

1. ✅ Run: `node scripts/penetration-tests.js`
2. ✅ Review: Check which tests failed
3. ✅ Fix: Implement security headers, CORS, etc.
4. ✅ Re-test: Run again until all pass
5. ✅ Commit: `git commit -m "security: all penetration tests passing"`

---

**Status:** Ready to execute  
**Time:** 2 hours (including fixing failures)  
**Difficulty:** Medium
