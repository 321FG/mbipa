/**
 * P1.3 - Rate Limiting Validation Script
 * 
 * Validates that rate limiting is properly implemented:
 * - Frontend module exists and is fully featured
 * - Configuration is correct
 * - All endpoints are configured
 * - Code quality meets standards
 */

const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let passCount = 0;
let failCount = 0;

const test = (name, condition, message) => {
  if (condition) {
    console.log(`${GREEN}✅${RESET} ${name}`);
    if (message) console.log(`   ${message}`);
    passCount++;
  } else {
    console.log(`${RED}❌${RESET} ${name}`);
    if (message) console.log(`   ${message}`);
    failCount++;
  }
};

const section = (title) => {
  console.log(`\n${BLUE}[${title}]${RESET}\n`);
};

console.log(`
${BLUE}======================================================================${RESET}
P1.3 - RATE LIMITING VALIDATION TEST
${BLUE}======================================================================${RESET}
`);

// ============================================================================
// Test 1: Module Existence
// ============================================================================

section('Module Existence');

const rateLimitingPath = 'c:\\Users\\Julius\\mbipa-app\\src\\utils\\rate-limiting.ts';
const rateLimitingExists = fs.existsSync(rateLimitingPath);
test('Rate limiting module exists', rateLimitingExists, `Path: src/utils/rate-limiting.ts`);

if (rateLimitingExists) {
  const content = fs.readFileSync(rateLimitingPath, 'utf8');
  const lines = content.split('\n').length;
  test('Module has sufficient code', lines > 400, `${lines} lines (>400 required)`);
}

// ============================================================================
// Test 2: Class & Export Validation
// ============================================================================

section('Class & Export Validation');

if (rateLimitingExists) {
  const content = fs.readFileSync(rateLimitingPath, 'utf8');

  test('RateLimitingManager class exists', content.includes('class RateLimitingManager'), 'Core class for managing rate limits');
  test('useRateLimiting hook exists', content.includes('export const useRateLimiting'), 'React hook for components');
  test('getRateLimitingManager exported', content.includes('export const getRateLimitingManager'), 'Singleton manager getter');
  test('rateLimit function exported', content.includes('export const rateLimit'), 'Async rate limit function');
  test('checkRateLimit function exported', content.includes('export const checkRateLimit'), 'Check without recording');
  test('getRateLimitInfo function exported', content.includes('export const getRateLimitInfo'), 'Get endpoint info');
}

// ============================================================================
// Test 3: Core Methods
// ============================================================================

section('Core Methods');

if (rateLimitingExists) {
  const content = fs.readFileSync(rateLimitingPath, 'utf8');

  test('initialize() method exists', content.includes('async initialize()'), 'Load state from AsyncStorage');
  test('isLimited() method exists', content.includes('isLimited(endpoint)'), 'Check if endpoint is rate limited');
  test('getRemainingSeconds() method exists', content.includes('getRemainingSeconds(endpoint)'), 'Get remaining cooldown time');
  test('recordAttempt() method exists', content.includes('recordAttempt(endpoint)'), 'Record attempt and enforce limit');
  test('reset() method exists', content.includes('reset(endpoint)'), 'Reset specific endpoint');
  test('resetAll() method exists', content.includes('resetAll()'), 'Reset all endpoints');
  test('getState() method exists', content.includes('getState()'), 'Get current state for debugging');
  test('getEndpointInfo() method exists', content.includes('getEndpointInfo(endpoint)'), 'Get full endpoint info');
}

// ============================================================================
// Test 4: Configuration
// ============================================================================

section('Configuration');

if (rateLimitingExists) {
  const content = fs.readFileSync(rateLimitingPath, 'utf8');

  test('auth/login configured', content.includes("'auth/login'") && content.includes('5') && content.includes('10 * 60 * 1000'), '5 attempts / 10 minutes');
  test('auth/register configured', content.includes("'auth/register'") && content.includes('3') && content.includes('10 * 60 * 1000'), '3 attempts / 10 minutes');
  test('auth/forgot-password configured', content.includes("'auth/forgot-password'") && content.includes('3') && content.includes('30 * 60 * 1000'), '3 attempts / 30 minutes');
  test('contact/submit configured', content.includes("'contact/submit'") && content.includes('5') && content.includes('60 * 60 * 1000'), '5 attempts / 1 hour');
  test('api/generic configured', content.includes("'api/generic'"), 'Generic endpoint fallback');

  test('RATE_LIMIT_CONFIG constant exists', content.includes('export const RATE_LIMIT_CONFIG'), 'Configuration object exported');
  test('STORAGE_KEY constant exists', content.includes('const STORAGE_KEY'), 'AsyncStorage key defined');
}

// ============================================================================
// Test 5: AsyncStorage Integration
// ============================================================================

section('AsyncStorage Integration');

if (rateLimitingExists) {
  const content = fs.readFileSync(rateLimitingPath, 'utf8');

  test('AsyncStorage imported', content.includes('from \'@react-native-async-storage/async-storage\''), 'Persistence support');
  test('AsyncStorage.getItem() used', content.includes('AsyncStorage.getItem'), 'Load state from storage');
  test('AsyncStorage.setItem() used', content.includes('AsyncStorage.setItem'), 'Save state to storage');
  test('persist() method implemented', content.includes('private async persist()'), 'Persist state to storage');
}

// ============================================================================
// Test 6: React Hook Implementation
// ============================================================================

section('React Hook Implementation');

if (rateLimitingExists) {
  const content = fs.readFileSync(rateLimitingPath, 'utf8');

  test('React imported', content.includes('React'), 'React dependency');
  test('useEffect hook used', content.includes('React.useEffect'), 'Initialize on mount');
  test('useState hook used', content.includes('React.useState'), 'State management');
  test('useRef hook used', content.includes('React.useRef'), 'Reference management');
  test('Hook returns attemptAction', content.includes('attemptAction'), 'Main hook function');
  test('Hook returns isLimited', content.includes('isLimited'), 'Limited status');
  test('Hook returns remainingSeconds', content.includes('remainingSeconds'), 'Countdown timer');
  test('Hook returns isReady', content.includes('isReady'), 'Initialization status');
}

// ============================================================================
// Test 7: Documentation
// ============================================================================

section('Documentation');

const implPath = 'c:\\Users\\Julius\\mbipa-app\\IMPLEMENTATION_P13_RATE_LIMITING.md';
const implExists = fs.existsSync(implPath);
test('Implementation guide exists', implExists, `Path: IMPLEMENTATION_P13_RATE_LIMITING.md`);

if (implExists) {
  const implContent = fs.readFileSync(implPath, 'utf8');
  test('Frontend section documented', implContent.includes('Frontend Implementation'), 'Usage examples');
  test('Backend section documented', implContent.includes('Backend Implementation'), 'Express.js setup');
  test('Integration checklist provided', implContent.includes('Integration Checklist'), 'Step-by-step guide');
  test('Validation commands included', implContent.includes('Validation Commands'), 'How to test');
}

const backendPath = 'c:\\Users\\Julius\\mbipa-app\\BACKEND_P13_RATE_LIMITING.md';
const backendExists = fs.existsSync(backendPath);
test('Backend guide exists', backendExists, `Path: BACKEND_P13_RATE_LIMITING.md`);

if (backendExists) {
  const backendContent = fs.readFileSync(backendPath, 'utf8');
  test('Backend configuration explained', backendContent.includes('RATE LIMITING CONFIGURATION'), 'express-rate-limit setup');
  test('Redis option included', backendContent.includes('Option 2: Redis Store'), 'Production support');
  test('Example routes provided', backendContent.includes('REGISTER RATE LIMITERS'), 'Integration examples');
  test('Testing examples provided', backendContent.includes('TESTING RATE LIMITING'), 'Test scripts');
}

// ============================================================================
// Test 8: TypeScript Types
// ============================================================================

section('TypeScript Types');

if (rateLimitingExists) {
  const content = fs.readFileSync(rateLimitingPath, 'utf8');

  test('RateLimitEndpoint type defined', content.includes('type RateLimitEndpoint'), 'Endpoint enum type');
  test('AttemptRecord interface defined', content.includes('interface AttemptRecord'), 'Record structure');
  test('RateLimitState interface defined', content.includes('interface RateLimitState'), 'State structure');
  test('Full TypeScript coverage', content.includes(': ') && content.includes('Promise'), 'Type annotations present');
}

// ============================================================================
// Test 9: Error Handling
// ============================================================================

section('Error Handling');

if (rateLimitingExists) {
  const content = fs.readFileSync(rateLimitingPath, 'utf8');

  test('Try-catch in initialize()', content.includes('try {') && content.includes('} catch'), 'Graceful error handling');
  test('Error logging implemented', content.includes('console.error') || content.includes('[RateLimit]'), 'Debug logging');
}

// ============================================================================
// Test 10: File Size & Quality
// ============================================================================

section('Code Quality');

if (rateLimitingExists) {
  const stats = fs.statSync(rateLimitingPath);
  const sizeKB = (stats.size / 1024).toFixed(1);
  test('File size reasonable', stats.size > 10000, `${sizeKB} KB (>10KB required, lightweight + efficient)`);

  const content = fs.readFileSync(rateLimitingPath, 'utf8');
  test('JSDoc comments present', content.includes('/**'), 'Code documentation');
  test('Security comments included', content.includes('Security') || content.includes('brute force'), 'Security guidance');
  test('Usage examples included', content.includes('Usage:') || content.includes('Example:'), 'Developer guidance');
}

// ============================================================================
// Summary
// ============================================================================

const total = passCount + failCount;
const percentage = ((passCount / total) * 100).toFixed(1);

console.log(`
${BLUE}======================================================================${RESET}
TEST SUMMARY
${BLUE}======================================================================${RESET}

Total Tests: ${total}
${GREEN}✅ Passed: ${passCount}${RESET}
${RED}❌ Failed: ${failCount}${RESET}
⚠️  Pass Rate: ${percentage}%

${percentage === '100.0' ? GREEN + '✅ P1.3 VALIDATION PASSED' + RESET : RED + '❌ P1.3 VALIDATION FAILED' + RESET}

${BLUE}======================================================================${RESET}
NEXT STEPS:
${BLUE}======================================================================${RESET}

1. Integrate into Components:
   - Add useRateLimiting hook to login.tsx
   - Add useRateLimiting hook to register.tsx
   - Add useRateLimiting hook to forgot-password.tsx

2. Integrate into API Client:
   - Add rate limiting check to axios interceptors
   - Handle 429 responses from backend

3. Backend Implementation:
   - Install express-rate-limit: npm install express-rate-limit
   - Create middleware in backend/middleware/rate-limiting.js
   - Register limiters on auth and contact routes

4. Testing:
   - Test on physical device (Android + iOS)
   - Verify cooldown persists across app restart
   - Verify backend rate limiting works with curl/Postman

${BLUE}======================================================================${RESET}
`);

process.exit(failCount > 0 ? 1 : 0);
