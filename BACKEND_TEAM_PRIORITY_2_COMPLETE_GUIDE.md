# 🔐 BACKEND TEAM - PRIORITY 2 COMPLETE GUIDE
## Security Hardening This Week

**Prepared For:** Backend Team  
**Date:** May 27, 2026  
**Duration:** 1 week  
**Status:** ✅ Ready to implement  

---

## 📦 What You're Getting

This package contains everything your backend team needs to implement Priority 2 security hardening:

1. **BACKEND_SECURITY_HEADERS_IMPLEMENTATION.md** ← Add HSTS, CSP, X-Frame-Options (2 hours)
2. **BACKEND_CORS_IMPLEMENTATION.md** ← Fix CORS to whitelist only trusted domains (1 hour)
3. **BACKEND_NPM_AUDIT_GUIDE.md** ← Find and fix vulnerable dependencies (1 hour)
4. **BACKEND_PENETRATION_TESTS_GUIDE.md** ← Test for OWASP vulnerabilities (2 hours)
5. **This file** ← Master guide with timeline & checklist

---

## 🎯 Your Mission This Week

### Total Time: ~6-8 hours
### Days: Monday-Friday
### Difficulty: Medium (mostly configuration)

**Goal:** Harden your Express.js backend to pass security tests before production deployment.

---

## 📅 Recommended Timeline

### Monday, May 27 (Today)

**Morning (2 hours): Security Headers**
- [ ] Read: `BACKEND_SECURITY_HEADERS_IMPLEMENTATION.md`
- [ ] Install helmet: `npm install helmet`
- [ ] Add middleware to app.ts
- [ ] Test with curl: `curl -I https://api.mbipa.com`
- [ ] Verify HSTS header present
- [ ] Commit: `git commit -m "security: add security headers with helmet"`

**Afternoon (1 hour): CORS Configuration**
- [ ] Read: `BACKEND_CORS_IMPLEMENTATION.md`
- [ ] Install cors: `npm install cors`
- [ ] Create middleware/cors-config.ts
- [ ] Update app.ts to use CORS whitelist
- [ ] Test: `curl -H "Origin: https://mbipa.app" ...`
- [ ] Commit: `git commit -m "security: configure CORS to whitelist trusted origins"`

### Tuesday, May 28

**Morning (1 hour): Dependency Security**
- [ ] Read: `BACKEND_NPM_AUDIT_GUIDE.md`
- [ ] Run: `npm audit`
- [ ] Run: `npm audit fix`
- [ ] Test: `npm test` & `npm run build`
- [ ] Commit: `git commit -m "security: fix npm vulnerabilities from audit"`

**Afternoon (2 hours): Penetration Testing**
- [ ] Read: `BACKEND_PENETRATION_TESTS_GUIDE.md`
- [ ] Start backend: `npm start`
- [ ] Run tests: `node scripts/penetration-tests.js`
- [ ] Review results
- [ ] Note which tests are failing

### Wednesday, May 29

**Fix Failing Tests (2-3 hours)**
- [ ] For each failing test, review OWASP Top 10 guide
- [ ] Implement fixes
- [ ] Re-run tests: `node scripts/penetration-tests.js`
- [ ] Continue until all tests pass
- [ ] Commit: `git commit -m "security: fix OWASP vulnerabilities from pen testing"`

### Thursday, May 30

**Verification & Documentation (1-2 hours)**
- [ ] Run all tests one more time
- [ ] Verify with securityheaders.com
- [ ] Check npm audit shows 0 vulnerabilities
- [ ] Create security implementation summary
- [ ] PR review & merge

### Friday, May 31

**Buffer & Deployment (1-2 hours)**
- [ ] Resolve any code review comments
- [ ] Deploy to staging
- [ ] Final verification
- [ ] Deploy to production
- [ ] Monitor for any issues

---

## 🔧 Priority 2 Tasks Explained

### Task 1: Security Headers (2 hours)

**What:** Add HTTP headers that prevent MITM, XSS, and clickjacking attacks

**Headers Added:**
- ✅ `Strict-Transport-Security` - Force HTTPS
- ✅ `X-Content-Type-Options` - Prevent MIME sniffing  
- ✅ `X-Frame-Options` - Prevent clickjacking
- ✅ `Content-Security-Policy` - Control resource loading
- ✅ `X-XSS-Protection` - Legacy XSS protection
- ✅ `Referrer-Policy` - Control referrer info
- ✅ `Permissions-Policy` - Control browser features

**Implementation:**
```typescript
import helmet from 'helmet';
app.use(helmet());  // One line!
```

**Testing:**
```bash
curl -I https://api.mbipa.com
# Should show all 7 headers
```

**File:** `BACKEND_SECURITY_HEADERS_IMPLEMENTATION.md`

---

### Task 2: CORS Configuration (1 hour)

**What:** Only allow your frontend domain to call the API (not wildcard `*`)

**Current Risk:** ANY website can call your API and steal user data

**Implementation:**
```typescript
const allowedOrigins = [
  'https://mbipa.app',
  'https://www.mbipa.app'
];

app.use(cors({ 
  origin: allowedOrigins,
  credentials: true 
}));
```

**Testing:**
```bash
# Should work (allowed)
curl -H "Origin: https://mbipa.app" https://api.mbipa.com/health

# Should fail (not allowed)
curl -H "Origin: https://evil.com" https://api.mbipa.com/health
# Error: Not allowed by CORS policy
```

**File:** `BACKEND_CORS_IMPLEMENTATION.md`

---

### Task 3: npm audit (1 hour)

**What:** Find and fix vulnerable npm packages

**Commands:**
```bash
npm audit                # See vulnerabilities
npm audit fix            # Auto-fix what can be fixed
npm audit fix --dry-run  # See what would be fixed
```

**Example Vulnerability:**
```
found 3 vulnerabilities (2 high, 1 moderate)
├─ lodash <4.17.21 → Fix: npm audit fix
├─ qs <6.7.0 → Fix: npm audit fix
└─ axios <0.21.2 → Fix: npm audit fix
```

**File:** `BACKEND_NPM_AUDIT_GUIDE.md`

---

### Task 4: Penetration Tests (2+ hours)

**What:** Automatically test for OWASP Top 10 vulnerabilities

**Run:**
```bash
node scripts/penetration-tests.js
```

**Vulnerabilities Tested:**
1. Can users access other users' data? (Broken Access Control)
2. Is HTTPS enforced? (Cryptographic Failures)
3. Can attackers inject code? (Injection)
4. Is rate limiting working? (Insecure Design)
5. Are security headers present? (Misconfiguration)
6. Are there npm vulnerabilities? (Vulnerable Components)
7. Do tokens expire? (Auth Failures)
8. Is code signed? (Data Integrity)
9. Are sensitive data logged? (Logging)
10. Can we fetch localhost? (SSRF)

**Expected Output:**
```
Total Tests: 20
✅ Passed: 20
❌ Failed: 0
Pass Rate: 100.0%
```

**File:** `BACKEND_PENETRATION_TESTS_GUIDE.md`

---

## 📋 Implementation Checklist

### Security Headers

- [ ] Read: `BACKEND_SECURITY_HEADERS_IMPLEMENTATION.md`
- [ ] Install: `npm install helmet`
- [ ] Update: `app.ts` with `app.use(helmet())`
- [ ] Test: `curl -I https://api.mbipa.com`
- [ ] Verify: All 7 headers present
- [ ] Commit: `git commit -m "security: add security headers"`

### CORS

- [ ] Read: `BACKEND_CORS_IMPLEMENTATION.md`
- [ ] Install: `npm install cors`
- [ ] Create: `middleware/cors-config.ts`
- [ ] Update: `app.ts` with CORS middleware
- [ ] Update: `allowed Origins` for your domain
- [ ] Test: `curl -H "Origin: ..." https://api.mbipa.com`
- [ ] Verify: Works for mbipa.app, fails for evil.com
- [ ] Commit: `git commit -m "security: configure CORS whitelist"`

### npm audit

- [ ] Read: `BACKEND_NPM_AUDIT_GUIDE.md`
- [ ] Run: `npm audit`
- [ ] Run: `npm audit fix`
- [ ] Test: `npm test`
- [ ] Test: `npm run build`
- [ ] Verify: 0 vulnerabilities (or only low-risk)
- [ ] Commit: `git commit -m "security: fix npm vulnerabilities"`

### Penetration Tests

- [ ] Read: `BACKEND_PENETRATION_TESTS_GUIDE.md`
- [ ] Run: `node scripts/penetration-tests.js`
- [ ] Review: Which tests are failing?
- [ ] Fix: Each failing test
- [ ] Re-test: `node scripts/penetration-tests.js`
- [ ] Verify: 20/20 tests passing
- [ ] Commit: `git commit -m "security: all penetration tests passing"`

---

## 🚀 Quick Setup

### For Impatient Teams (Just the Essentials)

```bash
# 1. Install security packages
npm install helmet cors

# 2. Update app.ts
# Add at top:
import helmet from 'helmet';
import cors from 'cors';

# Add after express initialization:
app.use(helmet());
app.use(cors({ 
  origin: 'https://mbipa.app',
  credentials: true 
}));

# 3. Test
npm audit fix
npm test

# 4. Run penetration tests
node scripts/penetration-tests.js

# 5. Commit
git commit -m "security: Priority 2 hardening"
```

---

## 📊 Success Metrics

### You'll Know You're Done When:

✅ All security headers present:
```bash
curl -I https://api.mbipa.com | grep -i "Strict-Transport-Security"
# Shows: max-age=31536000
```

✅ CORS properly configured:
```bash
curl -H "Origin: https://mbipa.app" https://api.mbipa.com/health
# Works (200 OK)

curl -H "Origin: https://evil.com" https://api.mbipa.com/health
# Fails (CORS error)
```

✅ No npm vulnerabilities:
```bash
npm audit
# Shows: found 0 vulnerabilities
```

✅ All penetration tests passing:
```bash
node scripts/penetration-tests.js
# Shows: 20/20 tests passing
```

✅ Security grade A+:
```
Visit: https://securityheaders.com/?q=api.mbipa.com
Grade: A+
```

---

## 🆘 Help & Troubleshooting

### Issue: "Cannot find module 'helmet'"

**Solution:**
```bash
npm install helmet
npm install cors
```

### Issue: CORS is blocking my requests

**Solution:** Check `allowed Origins` in cors-config.ts

```typescript
const allowedOrigins = [
  'https://mbipa.app',      // Add your domain
  'https://www.mbipa.app'   // Add www version
];
```

### Issue: npm audit shows vulnerabilities after `npm audit fix`

**Solution:** Some require manual updates

```bash
npm update vulnerable-package@latest
npm test
```

### Issue: Penetration tests show failures

**Solution:** Fix each failing test

1. Review the test name (e.g., "Cannot read other user data")
2. Read about that OWASP vulnerability in the guide
3. Implement the fix
4. Re-run tests

---

## 📞 Support Resources

### Documentation Files (Included)

1. `BACKEND_SECURITY_HEADERS_IMPLEMENTATION.md` - Add headers
2. `BACKEND_CORS_IMPLEMENTATION.md` - Configure CORS
3. `BACKEND_NPM_AUDIT_GUIDE.md` - Fix dependencies
4. `BACKEND_PENETRATION_TESTS_GUIDE.md` - Run tests
5. `OWASP_TOP10_QUICK_REFERENCE.md` - Quick reference

### External Resources

- Helmet docs: https://helmetjs.github.io/
- CORS docs: https://github.com/expressjs/cors
- npm audit: https://docs.npmjs.com/auditing-package-dependencies
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Security headers: https://securityheaders.com/

---

## 🎯 One-Page Summary

| Task | Time | Package | Command | File |
|------|------|---------|---------|------|
| Security Headers | 2h | helmet | `npm install helmet` | `BACKEND_SECURITY_HEADERS_IMPLEMENTATION.md` |
| CORS | 1h | cors | `npm install cors` | `BACKEND_CORS_IMPLEMENTATION.md` |
| npm audit | 1h | n/a | `npm audit fix` | `BACKEND_NPM_AUDIT_GUIDE.md` |
| Penetration Tests | 2h | n/a | `node scripts/penetration-tests.js` | `BACKEND_PENETRATION_TESTS_GUIDE.md` |
| **TOTAL** | **6-8h** | - | - | **This file** |

---

## 💾 Deployment Checklist

Before production deployment:

- [ ] All security headers working
- [ ] CORS whitelist configured
- [ ] npm audit shows 0 vulnerabilities (or low-risk only)
- [ ] All penetration tests passing
- [ ] Security headers grade A+
- [ ] Code reviewed and merged
- [ ] Staging deployment successful
- [ ] Final monitoring setup

---

## 🚀 Ready to Start?

### Next Steps:

1. ✅ Read: `BACKEND_SECURITY_HEADERS_IMPLEMENTATION.md` (15 min)
2. ✅ Implement: Add helmet (15 min)
3. ✅ Test: Verify headers (10 min)
4. ✅ Repeat for CORS, npm audit, penetration tests

**Estimated Total Time:** 6-8 hours over 1 week

**Difficulty:** Medium (mostly copy-paste + testing)

**Impact:** Critical security improvement

---

## 📊 Before/After Comparison

| Metric | Before P2 | After P2 | Grade |
|--------|-----------|----------|-------|
| HSTS Header | ❌ No | ✅ Yes | A+ |
| X-Content-Type-Options | ❌ No | ✅ Yes | A+ |
| X-Frame-Options | ❌ No | ✅ Yes | A+ |
| Content-Security-Policy | ❌ No | ✅ Yes | A+ |
| CORS | ⚠️ Permissive | ✅ Whitelist | Secure |
| npm Vulnerabilities | ⚠️ Unknown | ✅ 0 | Safe |
| OWASP Tests | ❌ 0% | ✅ 100% | Secure |
| Security Grade | 🟡 C | 🟢 A+ | Excellent |

---

## ✅ Sign-Off

**Backend Team Lead:** ___________________  
**Date:** ___________________  
**Status:** ✅ Ready to implement

---

**Questions?** Review the individual implementation guides or contact the security team.

**Let's harden Mbipa! 🔐**
