# P1.5 - Firebase Security Rules Implementation Guide

**Status:** ✅ Complete  
**Priority:** 🔴 Critical  
**Estimated Time:** 4 hours  
**Phase:** Prevents unauthorized access to Firestore data

---

## Overview

Firebase Security Rules protect your Firestore database by:

1. **Enforcing Authentication** - All reads/writes require logged-in user
2. **Partitioning Data** - Users can only access their own documents
3. **Validating Input** - Rejects malformed or malicious data
4. **Role-Based Access** - Different permissions for admins vs users
5. **Preventing Enumeration** - Attackers can't discover other users

**Why Critical:** Without proper rules, anyone can:
- Read all user data (emails, phone numbers, therapy notes)
- Write to other users' documents
- Escalate privileges to admin
- Delete critical data
- Spam the database

---

## What Was Created

### 1. Firestore Rules File
**File:** `firestore.rules` (400+ lines)

**Security Coverage:**
- ✅ Users collection (authenticated, user-partitioned)
- ✅ Chat collection (conversation-member only)
- ✅ Assessments (user-partitioned)
- ✅ Sessions (therapist/patient only)
- ✅ Contact submissions (authenticated)
- ✅ Music history (user-partitioned)
- ✅ Therapists (read-only public)
- ✅ Analytics (write-only)
- ✅ Helper functions (reusable validation)
- ✅ Default deny (explicit security)

**Key Features:**
- Authentication checks on every collection
- User ownership validation
- Input data validation
- Admin role support
- Nested collection rules
- Helper functions for code reuse

---

## Security Architecture

### Authentication Requirement
```javascript
// All collections require authenticated user
function isAuthenticated() {
  return request.auth != null;
}
```

### User Partitioning
```javascript
// Users only access their own documents
function isOwner(userId) {
  return isAuthenticated() && request.auth.uid == userId;
}

match /users/{userId} {
  allow read: if isOwner(userId);        // Can only read own
  allow write: if isOwner(userId);       // Can only write own
}
```

### Validation
```javascript
// Validate required fields, types, formats
function validateUserData() {
  let newData = request.resource.data;
  let hasRequiredFields = newData.keys().hasAll(['email', 'displayName']);
  let validEmail = isValidEmail(newData.email);
  return hasRequiredFields && validEmail;
}
```

### Admin Role
```javascript
// Some operations require admin
function isAdmin() {
  return isAuthenticated() && 
         get(/databases/$(database)/documents/users/$(request.auth.uid))
         .data.role == 'admin';
}

match /contact_submissions/{docId} {
  allow read: if isAdmin();    // Only admins see submissions
  allow write: if isAuthenticated();
  allow delete: if isAdmin();
}
```

---

## Collection-by-Collection Rules

### Users Collection
```
Path: /users/{userId}
Access: User can read/write own document only
Validation: Email format, required fields, uid cannot be changed
Operations: Create, Read, Update (no Delete - use cloud function)
```

**Example:**
```javascript
// ✅ Allowed: User reading own document
db.collection('users').doc(auth.currentUser.uid).get()

// ❌ Denied: User reading another user's document
db.collection('users').doc('other-user-id').get()

// ❌ Denied: User writing invalid data
db.collection('users').doc(auth.currentUser.uid).set({
  email: 'invalid-email',  // Fails validation
  displayName: 'Test'
})
```

### Chat Collection
```
Path: /chat/{conversationId}/messages/{messageId}
Access: Only conversation participants
Validation: Message format, sender verification, text length limits
Operations: Create messages, Read conversation
```

**Example:**
```javascript
// ✅ Allowed: Conversation member sending message
db.collection('chat').doc(conversationId).collection('messages')
  .add({
    text: 'Hello',
    senderId: auth.currentUser.uid,  // Must match auth user
    createdAt: serverTimestamp()
  })

// ❌ Denied: Non-member trying to read conversation
// Rule checks: participantIds.hasAny([auth.currentUser.uid])
```

### Assessments Collection
```
Path: /assessments/{assessmentId}
Access: User can read/write own assessments only
Validation: Assessment type (initial, progress, outcome)
Operations: Create, Read, Update, Delete
```

### Sessions Collection
```
Path: /sessions/{sessionId}
Access: Therapist writes, both therapist/patient read
Validation: Valid therapist/patient IDs, scheduled time
Operations: Create (therapist), Read (both)
```

### Contact Submissions
```
Path: /contact_submissions/{submissionId}
Access: Authenticated users submit, admins review
Validation: Email format, required fields
Operations: Create (users), Read/Delete (admin)
```

### Therapists Collection
```
Path: /therapists/{therapistId}
Access: Public read (for discovery), therapist write
Validation: Specializations, credentials
Operations: Create, Read, Update (therapist), Delete (admin)
```

---

## Deployment Instructions

### Step 1: Deploy Rules via Firebase Console

**Option A: Web Console (Easiest)**
1. Go to https://console.firebase.google.com
2. Select your project
3. Go to **Firestore Database** > **Rules** tab
4. Copy contents of `firestore.rules` file
5. Paste into the rules editor
6. Click **Publish**

**Option B: Firebase CLI (Recommended for CI/CD)**
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Deploy rules
firebase deploy --only firestore:rules

# Verify deployment
firebase rules:list
```

### Step 2: Test Rules with Emulator

```bash
# Install/start Firebase Emulator
firebase emulators:start --only firestore

# In your test code, use emulator:
const db = firebase.firestore();
db.useEmulator('localhost', 8080);

# Run tests
npm test
```

### Step 3: Verify in Firebase Console

1. Go to **Firestore Database** > **Rules** tab
2. Verify rules are published
3. Check deployment history
4. Monitor rule violations in logs

---

## Testing the Rules

### Unit Tests (with Firebase Emulator)

```javascript
const firebase = require('firebase');
const assert = require('assert');

const db = firebase.firestore();
db.useEmulator('localhost', 8080);

describe('Firestore Rules', () => {
  
  it('Should allow user to read own document', async () => {
    const uid = 'user123';
    const userRef = db.collection('users').doc(uid);
    
    // Test read
    const doc = await userRef.get();
    assert(doc.exists);
  });
  
  it('Should deny user reading another user document', async () => {
    try {
      await db.collection('users').doc('other-user').get();
      assert.fail('Should have been denied');
    } catch (e) {
      assert(e.code === 'permission-denied');
    }
  });
  
  it('Should validate email format', async () => {
    try {
      await db.collection('users').doc(uid).set({
        email: 'invalid-email',
        displayName: 'Test'
      });
      assert.fail('Should have rejected invalid email');
    } catch (e) {
      assert(e.code === 'permission-denied');
    }
  });
});
```

### Manual Testing

**Test 1: Cross-User Access Denied**
```
1. Sign in as user@example.com (uid: abc123)
2. Try to read /users/xyz789 (different user)
3. ❌ Expected: Permission denied
```

**Test 2: User Can Read Own Data**
```
1. Sign in as user@example.com (uid: abc123)
2. Try to read /users/abc123
3. ✅ Expected: Data returned
```

**Test 3: Invalid Data Rejected**
```
1. Sign in
2. Try to write { email: 'not-an-email' }
3. ❌ Expected: Permission denied (validation fails)
```

**Test 4: Admin Can Read Contact Submissions**
```
1. Sign in as user with role: 'admin'
2. Try to read /contact_submissions
3. ✅ Expected: Data returned
```

**Test 5: Regular User Cannot Read Contact Submissions**
```
1. Sign in as regular user
2. Try to read /contact_submissions
3. ❌ Expected: Permission denied
```

---

## Helper Functions Explained

### `isAuthenticated()`
Checks if user is logged in.
```javascript
return request.auth != null;
```

### `isOwner(userId)`
Checks if current user owns the document.
```javascript
return isAuthenticated() && request.auth.uid == userId;
```

### `isAdmin()`
Checks if user has admin role.
```javascript
return isAuthenticated() && 
       get(/databases/$(database)/documents/users/$(request.auth.uid))
       .data.role == 'admin';
```

### `isValidEmail(email)`
Validates email format.
```javascript
return email != null && 
       email.matches('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$');
```

### `hasActiveSubscription(userId)`
Checks if user has paid subscription.
```javascript
let userDoc = get(/databases/$(database)/documents/users/$(userId));
return userDoc.data.subscription != null && 
       userDoc.data.subscription.status == 'active';
```

---

## Common Patterns

### Pattern 1: User-Owned Document
```javascript
match /assessments/{docId} {
  allow read: if request.auth.uid == resource.data.userId;
  allow write: if request.auth.uid == request.resource.data.userId;
}
```

### Pattern 2: Admin-Only Access
```javascript
match /admin_config/{docId} {
  allow read, write, delete: if isAdmin();
}
```

### Pattern 3: Public Read, Owner Write
```javascript
match /therapists/{therapistId} {
  allow read: if true;  // Public
  allow write: if request.auth.uid == therapistId;
}
```

### Pattern 4: Conversation-Based Access
```javascript
match /chat/{conversationId} {
  allow read, write: if 
    get(/databases/$(database)/documents/chat/$(conversationId))
    .data.participantIds.hasAny([request.auth.uid]);
}
```

### Pattern 5: Nested Collection Inheritance
```javascript
match /users/{userId} {
  allow read, write: if isOwner(userId);
  
  match /posts/{postId} {
    // Inherits parent rules (user-owned)
    allow read, write: if isOwner(userId);
  }
}
```

---

## Best Practices

1. ✅ **Default Deny** - Start with `allow read, write: if false`
2. ✅ **Explicit Allow** - Only allow what's needed
3. ✅ **User Partition** - Always partition by user when storing personal data
4. ✅ **Validate Input** - Check format, type, required fields
5. ✅ **Role-Based** - Use roles (admin, moderator, user) for different access
6. ✅ **Helper Functions** - Create reusable functions for common checks
7. ✅ **Test Thoroughly** - Test with Firebase Emulator before deploying
8. ✅ **Document Rules** - Comment why each rule exists
9. ✅ **Monitor** - Set up alerts for denied access patterns
10. ✅ **Version Control** - Keep firestore.rules in git with app code

---

## Troubleshooting

### Issue: "Permission denied" on valid operation

**Cause:** Rules are too restrictive

**Solution:**
1. Check user is authenticated (`request.auth != null`)
2. Check helper functions return correct values
3. Test with Firebase Emulator to debug
4. Add logging: `console.log(request.auth.uid)` (use emulator)

### Issue: Invalid data is being written

**Cause:** Validation function is too permissive

**Solution:**
1. Check all required fields are validated
2. Check email/URL formats if applicable
3. Check data types match expected
4. Test validation function with emulator

### Issue: Cross-user access working (CRITICAL BUG)

**Cause:** Missing user ownership check

**Solution:**
1. Immediately update rules
2. Add `isOwner()` check
3. Deploy immediately: `firebase deploy --only firestore:rules`
4. Audit database for unauthorized access

### Issue: Admin cannot perform operation

**Cause:** Admin check is failing

**Solution:**
1. Verify user document has `role: 'admin'` field
2. Check path to user document is correct
3. Test admin check with emulator
4. Debug: Check user doc exists and has role field

---

## Integration Checklist

- [ ] Copy `firestore.rules` to project root
- [ ] Review all collections in rules match your schema
- [ ] Update helper functions if needed (email format, etc.)
- [ ] Test with Firebase Emulator (all patterns)
- [ ] Deploy with Firebase CLI: `firebase deploy --only firestore:rules`
- [ ] Verify in Firebase Console
- [ ] Test on physical device (login, create data, verify access)
- [ ] Set up Firestore Audit Logs
- [ ] Monitor for denied access patterns
- [ ] Document any custom rules

---

## Deployment Checklist

Before going to production:

- [ ] Rules tested with Emulator
- [ ] All collections have authentication checks
- [ ] User data partitioned by uid
- [ ] Admin operations protected
- [ ] Input validation present
- [ ] Default deny at end of rules
- [ ] Helper functions documented
- [ ] Team reviewed rules
- [ ] Monitoring configured
- [ ] Backup/restore plan documented

---

## Monitoring & Alerts

### Firebase Console
1. **Firestore Database** > **Rules** tab - View rules
2. **Firestore Database** > **Data** tab - Check data integrity
3. **Analytics** > **Realtime** - Monitor access patterns

### Cloud Logging
```bash
# View Firestore rule denials
gcloud logging read "resource.type=cloud_firestore_database AND severity>=WARNING" \
  --project=your-project-id
```

### Alerts
Set up alerts for:
- Unusual number of denied reads/writes
- Large batch writes
- Quota exceeded errors
- Repeated permission denied from same IP

---

## Security Benefits

✅ **Prevents Unauthorized Access** - Only authenticated users can access data  
✅ **Enforces Data Isolation** - Users only see their own data  
✅ **Validates Input** - Rejects malformed/malicious data  
✅ **Role-Based Control** - Different access for different user types  
✅ **Audit Trail** - Firestore logs all access for compliance  
✅ **Protection at DB Level** - Rules enforced before data stored  

---

## Next Steps

1. **Deploy Rules** - Use Firebase CLI or console
2. **Test Thoroughly** - Use Emulator for all patterns
3. **Monitor Access** - Set up Firestore audit logs
4. **Document** - Keep rules in version control
5. **Continue P1** - Move to P1.2 or P1.4

---

**Status:** ✅ Configuration Complete  
**Next:** Test with Firebase Emulator & Deploy  
**Production Ready:** Yes (after testing)
