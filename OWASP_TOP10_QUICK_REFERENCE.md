# OWASP Top 10 Quick Reference

**For Developers - Keep on Desk**

---

## 1️⃣ BROKEN ACCESS CONTROL

```typescript
// ❌ WRONG
app.get('/api/users/:id', (req, res) => {
  db.findOne({ id: req.params.id });  // No ownership check!
});

// ✅ RIGHT
app.get('/api/users/:id', (req, res) => {
  const uid = req.user.uid;  // From JWT
  const resource = db.findOne({ id: req.params.id, userId: uid });
  if (!resource) return res.status(403).json({ error: 'Access denied' });
  res.json(resource);
});
```

**Test:** Can I access other users' data? → Should get 403

---

## 2️⃣ CRYPTOGRAPHIC FAILURES

```typescript
// ❌ WRONG
localStorage.setItem('token', token);  // XSS vulnerable

// ✅ RIGHT (React Native)
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('token', token);
```

**Check:** API uses HTTPS? Certificate pinned? Sensitive data encrypted?

---

## 3️⃣ INJECTION

```typescript
// ❌ WRONG (NoSQL)
db.find({ name: userInput });  // userInput could be { $ne: '' }

// ✅ RIGHT
import * as z from 'zod';
const safe = z.string().parse(userInput);
db.find({ name: safe });
```

**Test:** Try `"; db.dropDatabase(); //` → Should get 400

---

## 4️⃣ INSECURE DESIGN

```typescript
// ❌ WRONG: No rate limiting
app.post('/login', async (req, res) => {
  // Anyone can brute-force!
  const user = authenticate(req.body);
});

// ✅ RIGHT
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,  // 10 min
  max: 5  // 5 attempts
});
app.post('/login', limiter, authenticate);
```

**Test:** Try login 10 times → Should get 429 after 5

---

## 5️⃣ SECURITY MISCONFIGURATION

```typescript
// ❌ WRONG
app.use(cors());  // Allows all origins!

// ✅ RIGHT
app.use(cors({
  origin: 'https://mbipa.app',
  credentials: true
}));

// Add headers
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
```

**Check:**
```bash
curl -I https://api.mbipa.com
# Should see security headers
```

---

## 6️⃣ VULNERABLE COMPONENTS

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Update packages
npm update

# Use exact versions (lockfile)
npm ci  # Instead of npm install
```

**Do:** Run `npm audit` before deploying

---

## 7️⃣ AUTHENTICATION FAILURES

```typescript
// ❌ WRONG: Different error messages
if (!user) return res.status(404);  // Email doesn't exist
if (!validPassword) return res.status(401);  // Bad password

// ✅ RIGHT: Same error
if (!user || !validPassword) {
  return res.status(401).json({ error: 'Invalid email or password' });
}
```

**Check:** Email enumeration not possible

---

## 8️⃣ DATA INTEGRITY FAILURES

```typescript
// ✅ DO
- Use package-lock.json
- Sign commits: git commit -S
- Use CI/CD with checks
- Don't auto-merge PRs
- Require code review

// ❌ DON'T
- Manual package updates
- Skip security checks
- Push directly to main
```

---

## 9️⃣ LOGGING & MONITORING

```typescript
// ❌ WRONG
console.log(`Login: ${email}, ${password}`);  // Never log passwords!

// ✅ RIGHT
console.log(`[SECURITY] Login attempt: ${email}`);
logger.error(`Failed login from IP: ${req.ip}`);

// ❌ NEVER LOG
- Passwords
- Tokens
- Email addresses
- Phone numbers
- Credit cards
```

**Use:** Sentry, CloudWatch, structured logging

---

## 🔟 SSRF

```typescript
// ❌ WRONG
app.post('/fetch', (req, res) => {
  fetch(req.body.url);  // User controls URL!
});

// ✅ RIGHT
app.post('/fetch', (req, res) => {
  const whitelist = ['https://api.example.com', 'https://cdn.example.com'];
  if (!whitelist.includes(req.body.url)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  fetch(req.body.url);
});
```

---

## ⚡ Quick Checklist

- [ ] All endpoints check user ownership (Access Control)
- [ ] HTTPS + certificate pinning (Cryptographic)
- [ ] Input validation on all user inputs (Injection)
- [ ] Rate limiting on login/register (Insecure Design)
- [ ] Security headers set (Misconfiguration)
- [ ] npm audit shows 0 vulnerabilities (Components)
- [ ] No default credentials (Auth)
- [ ] Lockfile in git (Integrity)
- [ ] No sensitive data in logs (Logging)
- [ ] No user-controlled URL fetching (SSRF)

---

## 🧪 Run Tests

```bash
node scripts/penetration-tests.js
```

Expected: ✅ All tests passing

---

## 📚 Learn More

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Cheat Sheets: https://cheatsheetseries.owasp.org/
- Testing Guide: https://owasp.org/www-project-web-security-testing-guide/

---

## 🆘 If Issue Found

1. **Broken Access Control**: Add `userId` check to all queries
2. **Crypto Failures**: Use SecureStore, enable HTTPS, pin certs
3. **Injection**: Use parameterized queries, validate input
4. **Insecure Design**: Add rate limiting, add email verification
5. **Misconfiguration**: Add helmet, configure CORS, disable debug
6. **Outdated**: `npm audit fix`, update dependencies
7. **Auth Failures**: Use Firebase Auth, enforce email verification
8. **Integrity**: Use package-lock.json, sign commits
9. **Logging**: Use structured logging, never log secrets
10. **SSRF**: Whitelist URLs, don't fetch user-supplied URLs
