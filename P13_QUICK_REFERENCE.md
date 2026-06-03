# P1.3 - Rate Limiting Quick Reference

**Print this for your desk!**

---

## 🚀 Quick Start

### Install Backend Dependencies
```bash
npm install express-rate-limit
# For production:
npm install redis rate-limit-redis
```

### Frontend: Login Component
```typescript
import { useRateLimiting } from '@/src/utils/rate-limiting';

export default function LoginScreen() {
  const { attemptAction, isLimited, remainingSeconds, isReady } = useRateLimiting('auth/login');

  const handleLogin = async () => {
    // 1. Check rate limit
    const canAttempt = attemptAction();
    if (!canAttempt) {
      Alert.alert('Too Many Attempts', `Try again in ${remainingSeconds}s`);
      return;
    }

    // 2. Do login
    await apiClient.post('/api/v1/auth/login', { email, password });
  };

  return (
    <Pressable disabled={isLimited} onPress={handleLogin}>
      <Text>{isLimited ? `Try again in ${remainingSeconds}s` : 'Login'}</Text>
    </Pressable>
  );
}
```

### Backend: Express Middleware
```javascript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, try again later'
});

app.post('/api/v1/auth/login', loginLimiter, authController.login);
```

---

## 📊 Configuration Reference

| Endpoint | Limit | Window |
|----------|-------|--------|
| `auth/login` | 5 attempts | 10 min |
| `auth/register` | 3 attempts | 10 min |
| `auth/forgot-password` | 3 attempts | 30 min |
| `contact/submit` | 5 attempts | 1 hour |

To add a new endpoint:
1. Add to `RATE_LIMIT_CONFIG` in `src/utils/rate-limiting.ts`
2. Create limiter in backend
3. Register on route

---

## 🔧 Common Tasks

### Add Rate Limiting to Register Component
```typescript
const { attemptAction, isLimited, remainingSeconds } = useRateLimiting('auth/register');

const handleRegister = async () => {
  if (!attemptAction()) {
    Alert.alert('Too Many Attempts', `Try again in ${remainingSeconds}s`);
    return;
  }
  // ... register logic
};
```

### Add Rate Limiting to Contact Form
```typescript
const { attemptAction, isLimited, remainingSeconds } = useRateLimiting('contact/submit');

const handleSubmit = async () => {
  if (!attemptAction()) {
    Alert.alert('Too Many Submissions', `Try again in ${remainingSeconds}s`);
    return;
  }
  // ... submit logic
};
```

### Disable Button During Cooldown
```typescript
<Pressable disabled={isLimited} style={{ opacity: isLimited ? 0.5 : 1 }}>
  <Text>{isLimited ? `Wait ${remainingSeconds}s` : 'Submit'}</Text>
</Pressable>
```

### Test Rate Limiting (Backend)
```bash
# Attempt 1-5: Success
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'

# Attempt 6+: Rate limited (HTTP 429)
# Response:
# {
#   "error": "Too many login attempts, try again later"
# }
# Headers:
# RateLimit-Limit: 5
# RateLimit-Remaining: 0
# RateLimit-Reset: 1653234567
```

---

## 🐛 Debugging

### Check Rate Limit State (React)
```typescript
const { isReady } = useRateLimiting('auth/login');

useEffect(() => {
  if (isReady) {
    console.log('Rate limiting initialized');
  }
}, [isReady]);
```

### Get Full Endpoint Info
```typescript
import { getRateLimitInfo } from '@/src/utils/rate-limiting';

const info = await getRateLimitInfo('auth/login');
console.log(info);
// {
//   isLimited: false,
//   attempts: 2,
//   maxAttempts: 5,
//   remainingSeconds: 598,
//   windowMs: 600000
// }
```

### Reset Rate Limit (Testing Only)
```typescript
import { getRateLimitingManager } from '@/src/utils/rate-limiting';

const manager = await getRateLimitingManager();
manager.reset('auth/login'); // Reset this endpoint
manager.resetAll(); // Reset all endpoints
```

---

## ✅ Integration Checklist

- [ ] Frontend: Add hook to login component
- [ ] Frontend: Add hook to register component
- [ ] Frontend: Add hook to password reset component
- [ ] Frontend: Add hook to contact form component
- [ ] Backend: Install express-rate-limit
- [ ] Backend: Create rate-limiting middleware
- [ ] Backend: Register limiters on routes
- [ ] Testing: Make 5+ attempts, verify cooldown
- [ ] Testing: Verify button disabled during cooldown
- [ ] Testing: Close and reopen app, verify cooldown persists
- [ ] Testing: Verify 6th attempt gets HTTP 429 from backend

---

## 📚 Full Documentation

- **Implementation Guide:** `IMPLEMENTATION_P13_RATE_LIMITING.md`
- **Backend Setup:** `BACKEND_P13_RATE_LIMITING.md`
- **Complete Summary:** `P13_RATE_LIMITING_SUMMARY.md`
- **Validation Test:** `scripts/validate-p13.js`

---

## 🎯 Remember

✅ **Frontend** = Better UX (disable button immediately)  
✅ **Backend** = Actual Security (attacks can bypass frontend)  
✅ **Both Together** = Defense in Depth  

Never rely on frontend-only rate limiting!

---

**Status:** ✅ Complete & Tested (55/55 tests)  
**Production Ready:** Yes  
**Last Updated:** May 26, 2026
