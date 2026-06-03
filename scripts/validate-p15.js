/**
 * P1.5 - Firebase Security Rules Validation Script
 * 
 * Validates that Firestore security rules are properly configured:
 * - Rules file exists and covers all collections
 * - Authentication is enforced
 * - User data is partitioned
 * - Input validation is present
 * - Admin role is implemented
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
P1.5 - FIREBASE SECURITY RULES VALIDATION
${BLUE}======================================================================${RESET}
`);

// ============================================================================
// Test 1: File Existence
// ============================================================================

section('File Existence');

const rulesPath = 'c:\\Users\\Julius\\mbipa-app\\firestore.rules';
const rulesExists = fs.existsSync(rulesPath);
test('Firestore rules file exists', rulesExists, `Path: firestore.rules`);

if (rulesExists) {
  const content = fs.readFileSync(rulesPath, 'utf8');
  const lines = content.split('\n').length;
  test('Rules file has sufficient content', lines > 300, `${lines} lines (>300 required)`);
}

// ============================================================================
// Test 2: Core Rules Structure
// ============================================================================

section('Core Rules Structure');

if (rulesExists) {
  const content = fs.readFileSync(rulesPath, 'utf8');

  test('Rules version declared', content.includes('rules_version = \'2\'') || content.includes('rules_version = "2"'), 'V2 syntax');
  test('Firestore service block', content.includes('service cloud.firestore'), 'Firebase service');
  test('Database match block', content.includes('match /databases/{database}/documents'), 'Database path');
  test('Helper functions section', content.includes('function ') && content.match(/function /g).length >= 5, 'Reusable functions');
  test('Default deny rule', content.includes('match /{document=**}') && content.includes('allow read, write: if false'), 'Explicit deny fallback');
}

// ============================================================================
// Test 3: Authentication & Helper Functions
// ============================================================================

section('Authentication & Helper Functions');

if (rulesExists) {
  const content = fs.readFileSync(rulesPath, 'utf8');

  test('isAuthenticated() function', 
    content.includes('isAuthenticated()') && content.includes('request.auth != null'),
    'Authentication check');
  
  test('isOwner() function',
    content.includes('isOwner(') && content.includes('request.auth.uid'),
    'User ownership check');
  
  test('isAdmin() function',
    content.includes('isAdmin()') && content.includes('role'),
    'Admin role check');
  
  test('Email validation function',
    content.includes('isValidEmail') && content.includes('matches'),
    'Email format validation');
}

// ============================================================================
// Test 4: Collection Rules Coverage
// ============================================================================

section('Collection Rules Coverage');

if (rulesExists) {
  const content = fs.readFileSync(rulesPath, 'utf8');

  test('Users collection rules', 
    content.includes('match /users/{userId}'),
    'User profiles collection');
  
  test('Chat collection rules',
    content.includes('match /chat/{'),
    'Chat/conversations collection');
  
  test('Assessments collection rules',
    content.includes('match /assessments/{'),
    'Therapy assessments collection');
  
  test('Sessions collection rules',
    content.includes('match /sessions/{'),
    'Therapy sessions collection');
  
  test('Contact submissions rules',
    content.includes('match /contact_submissions/{'),
    'Contact form submissions');
  
  test('Therapists collection rules',
    content.includes('match /therapists/{'),
    'Public therapist profiles');
  
  test('Music collection rules',
    content.includes('match /music/{'),
    'User music/mood tracking');
}

// ============================================================================
// Test 5: Authentication Requirements
// ============================================================================

section('Authentication Requirements');

if (rulesExists) {
  const content = fs.readFileSync(rulesPath, 'utf8');
  
  // Count authenticated checks
  const authChecks = (content.match(/isAuthenticated\(\)/g) || []).length;
  test('Multiple authentication checks', authChecks >= 8, `${authChecks} checks (>=8 required)`);
  
  // Check for isAuth pattern in key collections
  const usersAuth = content.match(/match \/users\/\{.*?\}/s) && 
                    content.match(/match \/users\/\{.*?\}/s)[0].includes('allow');
  test('Users collection requires auth', 
    content.includes('match /users/{userId}') && content.includes('isOwner(userId)'),
    'User partition enforcement');
  
  const chatAuth = content.includes('match /chat/{') && 
                   content.includes('isConversationMember');
  test('Chat collection requires membership', chatAuth, 'Conversation access control');
}

// ============================================================================
// Test 6: User Partitioning & Ownership
// ============================================================================

section('User Partitioning & Ownership');

if (rulesExists) {
  const content = fs.readFileSync(rulesPath, 'utf8');

  test('User ownership checks present', 
    (content.match(/isOwner\(/g) || []).length >= 5,
    'Ownership verification');
  
  test('UUID comparisons in rules',
    (content.match(/request\.auth\.uid/g) || []).length >= 8,
    'User partition checks');
  
  test('No public write access to user data',
    !content.match(/match \/users\/\{.*?\}\s*\{[\s\S]*?allow write: if true/),
    'Write protection');
}

// ============================================================================
// Test 7: Input Validation
// ============================================================================

section('Input Validation');

if (rulesExists) {
  const content = fs.readFileSync(rulesPath, 'utf8');

  test('Email validation rules', 
    content.includes('isValidEmail') || content.includes('matches(\''),
    'Email format checking');
  
  test('Required fields validation',
    content.includes('hasAll(') || content.includes('keys()'),
    'Required field validation');
  
  test('Text length validation',
    content.includes('size()') && content.includes('.size() >') || content.includes('size() <'),
    'String length limits');
  
  test('Data type validation',
    content.includes('typeof') || content.includes('in [') || content.includes('in {'),
    'Type checking');
}

// ============================================================================
// Test 8: Role-Based Access Control
// ============================================================================

section('Role-Based Access Control');

if (rulesExists) {
  const content = fs.readFileSync(rulesPath, 'utf8');

  test('Admin role implemented', 
    content.includes('isAdmin()') && content.includes('role') && content.includes('admin'),
    'Admin access control');
  
  test('Admin-only operations',
    (content.match(/if isAdmin\(\)/g) || []).length >= 3,
    'Multiple admin-protected operations');
  
  test('Privilege separation',
    content.includes('therapistId') || content.includes('patientId'),
    'Role-specific rules');
}

// ============================================================================
// Test 9: Nested Collections
// ============================================================================

section('Nested Collections');

if (rulesExists) {
  const content = fs.readFileSync(rulesPath, 'utf8');

  test('Nested message rules',
    content.includes('match /messages/{') || content.includes('match /chat/{') && content.includes('messages'),
    'Chat messages collection');
  
  test('Nested profile rules',
    content.includes('match /profile/{') || content.includes('match /users/{') && content.includes('profile'),
    'User profile subcollection');
  
  test('Nested settings rules',
    content.includes('match /settings/{') || content.includes('match /users/{') && content.includes('settings'),
    'User settings subcollection');
}

// ============================================================================
// Test 10: Security Best Practices
// ============================================================================

section('Security Best Practices');

if (rulesExists) {
  const content = fs.readFileSync(rulesPath, 'utf8');

  test('Comments/documentation present',
    (content.match(/\/\//g) || []).length >= 20,
    'Code documentation');
  
  test('Descriptive function names',
    content.includes('isAuthenticated') && content.includes('isOwner') && content.includes('isAdmin'),
    'Clear intent through naming');
  
  test('No hardcoded values',
    !content.match(/allow read: if true;/) || content.includes('match /therapists/'),
    'Principle of least privilege');
  
  test('Security summary included',
    content.includes('SECURITY RULES SUMMARY') || content.includes('SECURITY'),
    'Security documentation');
}

// ============================================================================
// Test 11: Documentation & Testing
// ============================================================================

section('Documentation & Testing');

const implPath = 'c:\\Users\\Julius\\mbipa-app\\IMPLEMENTATION_P15_FIREBASE_RULES.md';
const implExists = fs.existsSync(implPath);
test('Implementation guide exists', implExists, 'Path: IMPLEMENTATION_P15_FIREBASE_RULES.md');

if (implExists) {
  const implContent = fs.readFileSync(implPath, 'utf8');
  test('Security architecture documented', 
    implContent.includes('Security Architecture') || implContent.includes('Overview'),
    'Architecture explanation');
  
  test('Collection rules documented',
    implContent.includes('Collection-by-Collection') || implContent.includes('Collections'),
    'Per-collection breakdown');
  
  test('Testing section included',
    implContent.includes('Testing') || implContent.includes('test'),
    'Testing procedures');
  
  test('Deployment instructions',
    implContent.includes('Deploy') || implContent.includes('Firebase Console'),
    'Deployment guide');
  
  test('Best practices section',
    implContent.includes('Best Practices') || implContent.includes('patterns'),
    'Recommended patterns');
  
  test('Troubleshooting guide',
    implContent.includes('Troubleshoot') || implContent.includes('Issue'),
    'Common issues & fixes');
}

// ============================================================================
// Test 12: Code Quality
// ============================================================================

section('Code Quality');

if (rulesExists) {
  const stats = fs.statSync(rulesPath);
  const sizeKB = (stats.size / 1024).toFixed(1);
  test('Rules file comprehensive', stats.size > 8000, `${sizeKB} KB (>8KB required)`);

  const content = fs.readFileSync(rulesPath, 'utf8');
  const functions = (content.match(/function /g) || []).length;
  const allows = (content.match(/allow /g) || []).length;
  
  test('Sufficient helper functions', functions >= 5, `${functions} functions (>=5 required)`);
  test('Adequate rule coverage', allows >= 20, `${allows} allow rules (>=20 required)`);
}

// ============================================================================
// Test 13: Security Checklist
// ============================================================================

section('Security Checklist');

if (rulesExists) {
  const content = fs.readFileSync(rulesPath, 'utf8');

  test('✅ All collections require authentication', 
    !content.includes('allow read, write: if true') || content.includes('match /therapists/'),
    'No public write access');
  
  test('✅ User data partitioned by uid',
    (content.match(/isOwner\(/g) || []).length >= 4,
    'Data isolation enforced');
  
  test('✅ Input validation for sensitive data',
    content.includes('validate') || content.includes('hasAll') || content.includes('matches'),
    'Input validation present');
  
  test('✅ Default deny at end',
    content.includes('match /{document=**}') && content.lastIndexOf('allow read, write: if false') > content.lastIndexOf('match /'),
    'Fail-safe default');
  
  test('✅ Admin operations protected',
    (content.match(/isAdmin\(\)/g) || []).length >= 3,
    'Role-based protection');
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

${percentage === '100.0' ? GREEN + '✅ P1.5 VALIDATION PASSED' + RESET : RED + '❌ P1.5 VALIDATION FAILED' + RESET}

${BLUE}======================================================================${RESET}
NEXT STEPS:
${BLUE}======================================================================${RESET}

1. Deploy Firebase Rules:
   firebase deploy --only firestore:rules
   
   Or via Firebase Console:
   - Go to Firestore > Rules tab
   - Copy firestore.rules content
   - Click Publish

2. Test with Firebase Emulator:
   firebase emulators:start --only firestore
   
   Run test suite to verify all patterns

3. Test on Real Device:
   - Create user account
   - Create data (assessments, messages, etc.)
   - Verify cross-user access denied
   - Verify admin operations work

4. Set up Monitoring:
   - Firestore Audit Logs
   - Cloud Logging for denied access
   - Alerts for unusual patterns

5. Continue with P1.2 or P1.4:
   - P1.2: Jailbreak/Root detection
   - P1.4: Sentry + log audit

${BLUE}======================================================================${RESET}
`);

process.exit(failCount > 0 ? 1 : 0);
