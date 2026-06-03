# 🔗 BACKEND CORS IMPLEMENTATION
## Priority 2 - Fix CORS Configuration

**For:** Backend Team (Node.js/Express.js on Azure App Service)  
**Time:** 1 hour  
**Status:** Ready to implement  

---

## 📋 What You Need to Do

Configure CORS to only allow requests from your frontend domain (not wildcard `*`).

**Current Issue:** If CORS is set to `*`, ANY website can call your API and access user data.

**Security Impact:** ⚠️ HIGH - Malicious websites could steal authentication tokens and user data.

---

## 🔧 Implementation (Recommended: Using cors package)

### Step 1: Install CORS package

```bash
npm install cors
```

### Step 2: Create CORS configuration

**Create file:** `middleware/cors-config.ts`

```typescript
import cors from 'cors';
import { CorsOptions } from 'cors';

// List of allowed origins (frontend domains)
const allowedOrigins = [
  // Production
  'https://mbipa.app',
  'https://www.mbipa.app',
  'https://app.mbipa.app',
  
  // Mobile (Expo)
  // Note: Mobile apps don't send Origin header, so they won't be blocked
  // Just ensure backend validates JWT tokens properly
  
  // Development ONLY - remove before production
  'http://localhost:3000',
  'http://localhost:8081',
  'http://192.168.0.101:8082',  // Local Expo
];

export const corsOptions: CorsOptions = {
  // Check if origin is in whitelist
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile, curl, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  
  // Allow sending credentials (cookies, auth headers)
  credentials: true,
  
  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  // Headers clients can send
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Accept-Language'
  ],
  
  // Headers exposed to client
  exposedHeaders: ['X-Total-Count', 'X-Page-Number'],
  
  // Cache preflight requests for 24 hours
  maxAge: 86400,
  
  // Allow sending cookies with cross-origin requests
  optionsSuccessStatus: 200
};
```

### Step 3: Add to your app.ts / app.js

```typescript
import express from 'express';
import { corsOptions } from './middleware/cors-config';
import cors from 'cors';
import helmet from 'helmet';

const app = express();

// IMPORTANT: Add CORS and security headers FIRST (before routes)
app.use(helmet());
app.use(cors(corsOptions));

// Then add other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Then add your routes
app.use('/api/v1', authRoutes);
app.use('/api/v1', userRoutes);
// ... rest of your routes
```

---

## ✅ Verification - Test CORS is Working

### Method 1: From Your Frontend

```typescript
// frontend/src/api/apiSlice.ts
const response = await fetch('https://api.mbipa.com/health', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  credentials: 'include'  // Important for cookies
});

console.log(response.headers.get('Access-Control-Allow-Origin'));
// Should show: https://mbipa.app (or your frontend domain)
```

### Method 2: Using curl

```bash
# Test preflight OPTIONS request
curl -i -X OPTIONS https://api.mbipa.com/api/v1/users \
  -H "Origin: https://mbipa.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"

# Should show:
# HTTP/1.1 200 OK
# Access-Control-Allow-Origin: https://mbipa.app
# Access-Control-Allow-Credentials: true
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
# Access-Control-Allow-Headers: Content-Type, Authorization, ...
```

### Method 3: Test from unauthorized origin

```bash
# Try from evil.com (should be blocked)
curl -i -X OPTIONS https://api.mbipa.com/api/v1/users \
  -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST"

# Should show:
# HTTP/1.1 403 Forbidden
# (no Access-Control-Allow-Origin header)
```

---

## 🔍 How CORS Works

### Step 1: Browser sends preflight request (OPTIONS)

```http
OPTIONS /api/v1/users HTTP/1.1
Origin: https://mbipa.app
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type
```

### Step 2: Server responds

```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://mbipa.app
Access-Control-Allow-Methods: POST, GET, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

### Step 3: If allowed, browser sends actual request

```http
POST /api/v1/users HTTP/1.1
Origin: https://mbipa.app
Authorization: Bearer token123
```

### Step 4: Server responds with data

```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://mbipa.app
Content-Type: application/json

{"id": "123", "name": "John"}
```

---

## 🚨 Common CORS Mistakes

### ❌ WRONG: Wildcard allows everyone

```typescript
app.use(cors({ origin: '*' }));
// ❌ DANGEROUS: Any website can call your API!
```

### ✅ RIGHT: Whitelist only trusted origins

```typescript
app.use(cors({
  origin: ['https://mbipa.app', 'https://www.mbipa.app'],
  credentials: true
}));
```

---

## ❌ WRONG: No validation of JWT

```typescript
app.get('/api/v1/users/:id', (req, res) => {
  // ❌ DANGEROUS: Just reading ID from URL without auth!
  const user = db.findOne({ id: req.params.id });
  res.json(user);
});
```

### ✅ RIGHT: Always validate JWT + check ownership

```typescript
app.get('/api/v1/users/:id', authenticateToken, (req, res) => {
  const userId = req.params.id;
  const authenticatedUid = req.user.uid;  // From JWT
  
  // Check user owns this resource
  if (userId !== authenticatedUid) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const user = db.findOne({ id: userId });
  res.json(user);
});
```

---

## 📝 CORS + Mobile Apps

**Important:** Mobile apps (Expo) don't send `Origin` header, so CORS won't block them. Your security relies on:

1. **JWT Token Validation** - Every request must have valid token
2. **Ownership Checks** - User can only access their own data
3. **Rate Limiting** - Prevent brute force attacks

Example secure endpoint:

```typescript
app.get('/api/v1/assessments/:id', authenticateToken, async (req, res) => {
  const assessmentId = req.params.id;
  const uid = req.user.uid;  // From JWT token
  
  // Check user owns this assessment
  const assessment = await db.assessments.findOne({
    id: assessmentId,
    userId: uid  // ← CRITICAL: Filter by owner
  });
  
  if (!assessment) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  res.json(assessment);
});
```

---

## 🚀 Deployment Steps

### 1. Update code

Add CORS middleware to your Express app.

### 2. Update allowed origins for environment

```bash
# .env.production
ALLOWED_ORIGINS=https://mbipa.app,https://www.mbipa.app

# .env.staging
ALLOWED_ORIGINS=https://staging.mbipa.app

# .env.development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
```

### 3. Use environment variable

```typescript
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim());
```

### 4. Deploy to Azure

```bash
git push azure main
# OR
az webapp deployment source config --resource-group myRG --name myAppService --repo-url ...
```

### 5. Test after deployment

```bash
curl -I -X OPTIONS https://api.mbipa.com/api/v1/users \
  -H "Origin: https://mbipa.app"

# Verify headers are correct
```

---

## 📋 Deployment Checklist

- [ ] Install cors: `npm install cors`
- [ ] Create cors-config.ts with allowed origins
- [ ] Add cors middleware to app (before routes)
- [ ] Test with curl from allowed origin (should work)
- [ ] Test with curl from evil.com (should fail)
- [ ] Verify credentials: true if using auth
- [ ] Update for staging/dev environments
- [ ] Deploy to production
- [ ] Monitor logs for CORS rejections

---

## 🆘 Troubleshooting

### Issue: CORS error in browser console

```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:** Check origin is in whitelist

```typescript
// Add your domain
const allowedOrigins = [
  'https://mbipa.app',
  'https://your-new-domain.com'  // ← Add here
];
```

### Issue: Mobile app can't send auth header

**Solution:** Add Authorization to allowedHeaders

```typescript
allowedHeaders: [
  'Content-Type',
  'Authorization',  // ← Important for JWT
  'X-Requested-With'
]
```

### Issue: Cookies not being sent

**Solution:** Add credentials: true

```typescript
export const corsOptions = {
  credentials: true,  // ← Must be true
  origin: allowedOrigins
};
```

### Issue: Preflight requests failing

**Solution:** Make sure OPTIONS is allowed

```typescript
methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
//                                                     ↑
```

---

## 📊 Before/After

| Aspect | Before | After |
|--------|--------|-------|
| CORS Configuration | ⚠️ Permissive or missing | ✅ Whitelist only |
| Security | 🔴 Any website can call API | ✅ Only trusted origins |
| Data Exposure | ❌ High risk | ✅ Protected |
| Credentials | ❌ Not validated | ✅ Properly secured |

---

## 💾 Ready to Deploy?

1. Install cors package: `npm install cors`
2. Create cors-config.ts with your domains
3. Add to app.ts
4. Test with curl
5. Deploy to production

**Time:** 30 minutes  
**Difficulty:** Easy  
**Impact:** Critical security improvement

---

**Next:** Read `BACKEND_NPM_AUDIT_GUIDE.md` for dependency security
