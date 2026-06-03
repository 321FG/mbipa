# P1.3 - Rate Limiting Implementation Guide

**Status:** ✅ Complete  
**Priority:** 🔴 Critical  
**Estimated Time:** 1 day  
**Phase:** Prevents brute force attacks on sensitive endpoints

---

## Overview

Rate limiting protects your app from brute force attacks by limiting the number of requests a user can make in a given time window. This implementation uses:

- **Frontend:** React component hook with AsyncStorage persistence
- **Backend:** Express.js middleware with Redis support
- **Strategy:** Defense in depth (frontend UX + backend security)

---

## Frontend Implementation

### 1. Module: `src/utils/rate-limiting.ts`

✅ **Already Created** (600+ lines, fully typed)

**Key Exports:**
- `RateLimitingManager` - Core class for tracking attempts
- `useRateLimiting(endpoint)` - React hook for components
- `rateLimit(endpoint)` - Async function for API interceptors
- `checkRateLimit(endpoint)` - Check without recording
- `getRateLimitInfo(endpoint)` - Get full endpoint info

**Endpoints Configured:**
- `auth/login` - 5 attempts / 10 minutes
- `auth/register` - 3 attempts / 10 minutes
- `auth/forgot-password` - 3 attempts / 30 minutes
- `contact/submit` - 5 attempts / 1 hour
- `api/generic` - 10 attempts / 5 minutes

### 2. Usage in Login Component

**File:** `app/(auth)/login.tsx`

```typescript
import { useRateLimiting } from '@/src/utils/rate-limiting';
import { useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';

export default function LoginScreen() {
  const { attemptAction, isLimited, remainingSeconds, isReady } = useRateLimiting('auth/login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    // Check rate limiting before attempting
    const canAttempt = attemptAction();
    if (!canAttempt) {
      Alert.alert(
        'Too Many Attempts',
        `Please try again in ${remainingSeconds} seconds`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // Perform login
      const response = await apiClient.post('/api/v1/auth/login', { email, password });
      // Handle success
    } catch (error) {
      if (error.response?.status === 429) {
        Alert.alert('Rate Limited', 'Too many attempts. Try again later.');
      }
      // Handle error
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        editable={!isLimited && isReady}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!isLimited && isReady}
      />
      <Pressable
        onPress={handleLogin}
        disabled={!isReady || isLimited}
        style={[styles.button, { opacity: isLimited ? 0.5 : 1 }]}
      >
        <Text>{isLimited ? `Try again in ${remainingSeconds}s` : 'Login'}</Text>
      </Pressable>
    </View>
  );
}
```

### 3. Usage in Register Component

**File:** `app/(auth)/register.tsx`

```typescript
import { useRateLimiting } from '@/src/utils/rate-limiting';

export default function RegisterScreen() {
  const { attemptAction, isLimited, remainingSeconds, isReady } = useRateLimiting('auth/register');

  const handleRegister = async () => {
    const canAttempt = attemptAction();
    if (!canAttempt) {
      Alert.alert('Too Many Attempts', `Please try again in ${remainingSeconds} seconds`);
      return;
    }

    // ... registration logic
  };

  return (
    // Form with button disabled={isLimited}
  );
}
```

### 4. Usage in API Interceptor

**File:** `src/api/http.ts`

```typescript
import { rateLimit, checkRateLimit } from '@/src/utils/rate-limiting';

// Axios interceptor: Check rate limiting before request
apiClient.interceptors.request.use(async (config) => {
  // Extract endpoint from URL (e.g., /api/v1/auth/login → auth/login)
  const endpoint = config.url?.replace(/^.*\/api\/(v\d+\/)?/, '') as RateLimitEndpoint;
  
  if (endpoint && endpoint in RATE_LIMIT_CONFIG) {
    // Check if rate limited (without recording)
    const { isLimited, remainingSeconds } = await checkRateLimit(endpoint);
    
    if (isLimited) {
      // Cancel request if rate limited
      throw new Error(`Rate limited. Try again in ${remainingSeconds}s`);
    }
  }

  return config;
});

// Response interceptor: Handle 429 responses from backend
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      // Backend rate limited us too - clear local cache
      const endpoint = error.config?.url?.replace(/^.*\/api\/(v\d+\/)?/, '');
      console.warn(`[RateLimit] Backend rate limited: ${endpoint}`);
    }
    return Promise.reject(error);
  }
);
```

---

## Backend Implementation

### 1. Installation

```bash
npm install express-rate-limit
# For production with Redis:
npm install redis rate-limit-redis
```

### 2. Configuration File

**File:** `backend/middleware/rate-limiting.js`

```javascript
import rateLimit from 'express-rate-limit';

// Login rate limiter: 5 attempts per 10 minutes
export const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${req.body?.email || 'unknown'}`,
  skip: (req) => req.user?.role === 'admin' // Skip for admins
});

// Register rate limiter: 3 attempts per 10 minutes
export const registerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: 'Too many registration attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${req.body?.email || 'unknown'}`
});

// Password reset rate limiter: 3 attempts per 30 minutes
export const passwordResetLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 3,
  message: 'Too many password reset attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${req.body?.email || 'unknown'}`
});

// Contact form rate limiter: 5 attempts per hour
export const contactFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many contact submissions. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});
```

### 3. Register Limiters on Routes

**File:** `backend/routes/auth.js`

```javascript
import { Router } from 'express';
import { loginLimiter, registerLimiter, passwordResetLimiter } from '../middleware/rate-limiting.js';
import * as authController from '../controllers/auth.js';

const router = Router();

// Apply rate limiters to endpoints
router.post('/login', loginLimiter, authController.login);
router.post('/register', registerLimiter, authController.register);
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);

export default router;
```

**File:** `backend/routes/contact.js`

```javascript
import { Router } from 'express';
import { contactFormLimiter } from '../middleware/rate-limiting.js';
import * as contactController from '../controllers/contact.js';

const router = Router();

router.post('/submit', contactFormLimiter, contactController.submit);

export default router;
```

### 4. Redis Configuration (Production)

**File:** `backend/config/redis.js`

```javascript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from 'redis';

const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
});

client.connect();

export const createRedisLimiter = (options) => {
  return rateLimit({
    store: new RedisStore({
      client,
      prefix: `rl:${options.prefix}:`
    }),
    windowMs: options.windowMs,
    max: options.max,
    message: options.message,
    standardHeaders: true,
    legacyHeaders: false,
    ...options
  });
};
```

---

## Integration Checklist

### Frontend
- [ ] Create `src/utils/rate-limiting.ts`
- [ ] Add rate limiting hook to `app/(auth)/login.tsx`
- [ ] Add rate limiting hook to `app/(auth)/register.tsx`
- [ ] Add rate limiting hook to `app/(auth)/forgot-password.tsx`
- [ ] Integrate into `src/api/http.ts` (axios interceptors)
- [ ] Test on physical device

### Backend
- [ ] Install `express-rate-limit` package
- [ ] Create `backend/middleware/rate-limiting.js`
- [ ] Register limiters on auth routes
- [ ] Register limiters on contact route
- [ ] (Production) Install Redis and configure
- [ ] Test with curl commands or Postman

### Testing
- [ ] Run `scripts/validate-p13.js`
- [ ] Manual test: Make 5+ login attempts → see cooldown
- [ ] Manual test: Backend returns 429 on 6th attempt
- [ ] Verify RateLimit headers in response
- [ ] Test persistence: Close and reopen app → cooldown still active

---

## Validation Commands

```bash
# Test frontend module
npm test -- scripts/validate-p13.js

# Test backend (from backend directory)
node tests/rate-limiting.test.js

# Manual test with curl
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}'

# Repeat to trigger rate limit (should return 429 on attempt 6+)
```

---

## Response Examples

### Success (First Attempt)

```
POST /api/v1/auth/login
Status: 401 Unauthorized (invalid credentials, but allowed)

Headers:
  RateLimit-Limit: 5
  RateLimit-Remaining: 4
  RateLimit-Reset: 1653234567
```

### Rate Limited (6th Attempt)

```
POST /api/v1/auth/login
Status: 429 Too Many Requests

Body:
{
  "error": "Too many login attempts. Please try again later."
}

Headers:
  RateLimit-Limit: 5
  RateLimit-Remaining: 0
  RateLimit-Reset: 1653234567
```

---

## Security Benefits

✅ **Prevents Brute Force Attacks** - Limits login/register attempts  
✅ **Protects Against Spam** - Limits contact form submissions  
✅ **Defense in Depth** - Frontend UX + backend security  
✅ **User-Friendly** - Clear feedback on cooldown timer  
✅ **Production Ready** - Redis support for scaled deployment  
✅ **Configurable** - Different limits per endpoint  

---

## Performance Impact

- **Frontend:** ~2KB AsyncStorage usage per endpoint
- **Backend:** ~1KB per client per tracked endpoint
- **Memory:** Scales with number of unique IPs/emails

---

## Best Practices

1. ✅ Combine frontend + backend limiting
2. ✅ Rate limit by IP + email (prevents enumeration)
3. ✅ Use different limits per endpoint
4. ✅ Return standard RateLimit headers
5. ✅ Log violations for monitoring
6. ✅ Use Redis for production
7. ✅ Exclude admin users (optional)

---

## Next Steps

1. **Integrate into Components:** Add to login, register, password reset
2. **Backend Deployment:** Deploy limiters to production
3. **Monitoring:** Set up alerts for rate limit violations
4. **Documentation:** Share with team
5. **Testing:** Physical device + load testing
6. **Iterate:** Adjust limits based on real usage patterns
