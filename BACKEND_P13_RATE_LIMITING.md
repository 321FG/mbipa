/**
 * Backend Rate Limiting Middleware
 * 
 * Express.js middleware for server-side rate limiting.
 * Complements frontend rate limiting for defense in depth.
 * 
 * Installation:
 * npm install express-rate-limit
 * 
 * Configuration:
 * - Login: 5 attempts per 10 minutes
 * - Register: 3 attempts per 10 minutes
 * - Password Reset: 3 attempts per 30 minutes
 * - Contact Form: 5 attempts per 1 hour
 */

// import rateLimit from 'express-rate-limit';
// import RedisStore from 'rate-limit-redis';
// import redis from 'redis';

// ============================================================================
// BACKEND RATE LIMITING CONFIGURATION
// ============================================================================

// Option 1: Memory Store (Development)
// ============================================================================
/**
 * Simple in-memory rate limiter (development only)
 * Note: Use Redis for production with multiple server instances
 * 
 * Usage:
 * app.post('/api/v1/auth/login', loginLimiter, controller.login);
 */

const loginLimiterMemory = {
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 requests max per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
  // store: new memoryStore() // Implicit in express-rate-limit
};

// ============================================================================
// Option 2: Redis Store (Production - Recommended)
// ============================================================================
/**
 * Distributed rate limiter using Redis
 * Supports load balancing across multiple server instances
 * 
 * Installation:
 * npm install redis rate-limit-redis
 * 
 * Usage:
 * app.post('/api/v1/auth/login', loginLimiter, controller.login);
 */

const redisClient = {
  // const client = redis.createClient({
  //   host: process.env.REDIS_HOST || 'localhost',
  //   port: parseInt(process.env.REDIS_PORT || '6379'),
  //   password: process.env.REDIS_PASSWORD
  // });
};

const loginLimiterRedis = {
  // store: new RedisStore({
  //   client: redisClient,
  //   prefix: 'rl:auth:login:' // rate-limit:auth:login:
  // }),
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: any) => {
    // Skip rate limiting for admin users
    return req.user?.role === 'admin';
  },
  keyGenerator: (req: any) => {
    // Rate limit by IP + email (prevents account enumeration)
    return `${req.ip}:${req.body.email}`;
  }
};

// ============================================================================
// RATE LIMITERS BY ENDPOINT
// ============================================================================

// const authLoginLimiter = rateLimit({
//   windowMs: 10 * 60 * 1000,
//   max: 5,
//   message: 'Too many login attempts. Please try again in 10 minutes.',
//   standardHeaders: true,
//   legacyHeaders: false,
//   keyGenerator: (req) => `${req.ip}:${req.body?.email || 'unknown'}`
// });

// const authRegisterLimiter = rateLimit({
//   windowMs: 10 * 60 * 1000,
//   max: 3,
//   message: 'Too many registration attempts. Please try again in 10 minutes.',
//   standardHeaders: true,
//   legacyHeaders: false,
//   keyGenerator: (req) => `${req.ip}:${req.body?.email || 'unknown'}`
// });

// const passwordResetLimiter = rateLimit({
//   windowMs: 30 * 60 * 1000, // 30 minutes
//   max: 3,
//   message: 'Too many password reset attempts. Please try again in 30 minutes.',
//   standardHeaders: true,
//   legacyHeaders: false,
//   keyGenerator: (req) => `${req.ip}:${req.body?.email || 'unknown'}`
// });

// const contactFormLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hour
//   max: 5,
//   message: 'Too many contact submissions. Please try again in 1 hour.',
//   standardHeaders: true,
//   legacyHeaders: false,
//   keyGenerator: (req) => req.ip
// });

// ============================================================================
// REGISTER RATE LIMITERS ON ROUTES
// ============================================================================

/**
 * Example Express app configuration:
 * 
 * import express from 'express';
 * import rateLimit from 'express-rate-limit';
 * 
 * const app = express();
 * 
 * // Auth routes with rate limiting
 * app.post('/api/v1/auth/login', loginLimiter, authController.login);
 * app.post('/api/v1/auth/register', registerLimiter, authController.register);
 * app.post('/api/v1/auth/forgot-password', passwordResetLimiter, authController.forgotPassword);
 * 
 * // Contact form with rate limiting
 * app.post('/api/v1/contact/submit', contactFormLimiter, contactController.submit);
 * 
 * app.listen(3000);
 */

// ============================================================================
// RESPONSE HEADERS
// ============================================================================

/**
 * When rate limiting is applied, responses include headers:
 * 
 * Response: HTTP 429 Too Many Requests
 * Headers:
 *   RateLimit-Limit: 5
 *   RateLimit-Remaining: 0
 *   RateLimit-Reset: 1653234567 (Unix timestamp)
 * 
 * Body:
 *   {
 *     "error": "Too many login attempts. Please try again in 10 minutes."
 *   }
 */

// ============================================================================
// FRONTEND INTEGRATION
// ============================================================================

/**
 * Frontend code should:
 * 1. Use local rate limiting (react-native-rate-limiting module)
 * 2. Catch 429 responses from backend
 * 3. Display remaining time to user
 * 
 * Example error handler:
 * 
 * try {
 *   await apiClient.post('/api/v1/auth/login', credentials);
 * } catch (error) {
 *   if (error.response?.status === 429) {
 *     const resetTime = error.response.headers['ratelimit-reset'];
 *     const secondsLeft = Math.ceil(resetTime - Date.now() / 1000);
 *     Alert.alert(`Too many attempts. Try again in ${secondsLeft}s`);
 *   }
 * }
 */

// ============================================================================
// MONITORING & LOGGING
// ============================================================================

/**
 * Log rate limit violations:
 * 
 * const loginLimiter = rateLimit({
 *   windowMs: 10 * 60 * 1000,
 *   max: 5,
 *   handler: (req, res, next, options) => {
 *     // Log violation
 *     console.warn(`[RATE LIMIT] Auth login - IP: ${req.ip}, Email: ${req.body?.email}`);
 *     
 *     // Send alert to monitoring system
 *     metrics.recordRateLimitViolation({
 *       endpoint: '/api/v1/auth/login',
 *       ip: req.ip,
 *       timestamp: Date.now()
 *     });
 *     
 *     res.status(options.statusCode).json({
 *       error: options.message,
 *       retryAfter: res.getHeader('RateLimit-Reset')
 *     });
 *   }
 * });
 */

// ============================================================================
// BEST PRACTICES
// ============================================================================

/**
 * 1. Combine Frontend + Backend Limiting
 *    - Frontend: Provides better UX (disable button immediately)
 *    - Backend: Provides actual security (attacks can bypass frontend)
 * 
 * 2. Rate Limit by IP + Email
 *    - Prevents user enumeration
 *    - Handles botnets (multiple IPs attacking same email)
 * 
 * 3. Use Different Limits Per Endpoint
 *    - Login: 5/10min (commonly attacked)
 *    - Register: 3/10min (stricter - prevents spam accounts)
 *    - Password reset: 3/30min (stricter - account security)
 *    - Contact form: 5/1h (lenient - legitimate users)
 * 
 * 4. Use Redis for Production
 *    - Memory store doesn't work across multiple server instances
 *    - Redis provides distributed rate limiting
 * 
 * 5. Return RateLimit Headers
 *    - Clients need to know when they can retry
 *    - Follow HTTP standards (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
 * 
 * 6. Log & Monitor Violations
 *    - Track brute force attacks
 *    - Alert security team
 *    - Consider IP blocking for extreme cases
 * 
 * 7. Exclude Admin Users (Optional)
 *    - Allow admins to bypass rate limiting
 *    - Useful for testing and legitimate admin actions
 */

// ============================================================================
// ALTERNATIVE: AWS WAF
// ============================================================================

/**
 * For production, consider AWS WAF (Web Application Firewall):
 * - IP reputation filtering
 * - DDoS protection
 * - Rate limiting at CDN level
 * - Geoblocking
 * 
 * Benefits:
 * - Protects all endpoints automatically
 * - No code changes needed
 * - More sophisticated attack detection
 */

// ============================================================================
// TESTING RATE LIMITING
// ============================================================================

/**
 * Test script:
 * 
 * const testRateLimiting = async () => {
 *   const baseUrl = 'http://localhost:3000';
 *   const email = 'test@example.com';
 *   
 *   for (let i = 1; i <= 6; i++) {
 *     try {
 *       const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
 *         method: 'POST',
 *         headers: { 'Content-Type': 'application/json' },
 *         body: JSON.stringify({ email, password: 'wrong' })
 *       });
 *       
 *       console.log(`Attempt ${i}: ${res.status}`);
 *       
 *       if (res.status === 429) {
 *         const resetTime = res.headers.get('RateLimit-Reset');
 *         console.log(`Rate limited. Reset at: ${new Date(resetTime * 1000)}`);
 *       }
 *     } catch (error) {
 *       console.error(`Attempt ${i} failed:`, error);
 *     }
 *   }
 * };
 * 
 * testRateLimiting();
 */

module.exports = {
  loginLimiterMemory,
  loginLimiterRedis,
  // Export the rateLimit function and specific limiters
  // Example usage in routes:
  // app.post('/api/v1/auth/login', loginLimiter, authController.login);
};
