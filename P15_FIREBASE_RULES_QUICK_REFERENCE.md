# P1.5 - Firebase Security Rules Quick Reference

**Print this for your desk!**

---

## 🚀 Quick Deploy

### Option 1: Firebase Console (Easiest)
1. Go to https://console.firebase.google.com
2. Select your Mbipa project
3. **Firestore Database** > **Rules** tab
4. Copy-paste contents of `firestore.rules` file
5. Click **Publish**

### Option 2: Firebase CLI (Recommended)
```bash
firebase deploy --only firestore:rules
```

---

## ✅ Security Rules Checklist

- [x] All collections require authentication
- [x] User data partitioned by uid (cross-user access denied)
- [x] Input validation (email format, required fields, types)
- [x] Admin role protection (contact submissions, analytics)
- [x] Conversation membership (chat only accessible to participants)
- [x] Therapist/patient separation (sessions)
- [x] Default deny (explicit security fallback)
- [x] Helper functions (reusable validation)
- [x] Nested collections (messages, profile, settings)

---

## 📋 Collections & Access Rules

| Collection | Read | Write | Notes |
|-----------|------|-------|-------|
| `/users/{uid}` | Own only | Own only | User partitioned |
| `/chat/{convId}` | Members | Members | Conversation participants |
| `/assessments/{id}` | Own only | Own only | User partitioned |
| `/sessions/{id}` | Therapist+Patient | Therapist | Role-based |
| `/contact_submissions/{id}` | Admin | Authenticated | Feedback collection |
| `/therapists/{id}` | Public | Therapist | Discovery |
| `/music/{uid}/history/{id}` | Own only | Own only | User partitioned |

---

## 🔐 Security Patterns

### Pattern 1: User-Owned Document
```javascript
match /assessments/{docId} {
  allow read: if request.auth.uid == resource.data.userId;
  allow write: if request.auth.uid == request.resource.data.userId;
}
```

### Pattern 2: Conversation Access
```javascript
match /chat/{conversationId} {
  allow read: if get(...).data.participantIds.hasAny([request.auth.uid]);
  allow write: if get(...).data.participantIds.hasAny([request.auth.uid]);
}
```

### Pattern 3: Admin-Only
```javascript
match /contact_submissions/{docId} {
  allow read: if isAdmin();
  allow write: if isAuthenticated();
  allow delete: if isAdmin();
}
```

### Pattern 4: Input Validation
```javascript
function validateUserData() {
  let data = request.resource.data;
  return data.keys().hasAll(['email', 'displayName']) &&
         isValidEmail(data.email);
}
```

---

## 🧪 Testing

### With Firebase Emulator
```bash
firebase emulators:start --only firestore
```

### Manual Tests
1. **Test 1: Cross-user access denied**
   - Sign in as user A
   - Try to read user B's document
   - ❌ Expected: Permission denied

2. **Test 2: User can read own data**
   - Sign in as user A
   - Try to read user A's document
   - ✅ Expected: Data returned

3. **Test 3: Invalid email rejected**
   - Try to write { email: 'invalid' }
   - ❌ Expected: Permission denied

4. **Test 4: Non-members can't read chat**
   - Sign in as user not in conversation
   - Try to read that conversation
   - ❌ Expected: Permission denied

---

## 🛡️ Helper Functions Quick Reference

```javascript
// Check if user is logged in
isAuthenticated()

// Check if user owns document
isOwner(userId)

// Check if user is admin
isAdmin()

// Check if user is in conversation
isConversationMember(conversationId)

// Validate email format
isValidEmail(email)

// Check subscription status
hasActiveSubscription(userId)
```

---

## ⚙️ Configuration

### Enable/Disable Features

**Allow therapist discovery (public):**
```javascript
match /therapists/{therapistId} {
  allow read: if true;  // Public read
}
```

**Require admin approval for new accounts:**
```javascript
match /users/{userId} {
  allow create: if request.resource.data.approved == false;
  allow read: if isOwner(userId) || isAdmin();
}
```

**Rate limiting comment (enforced in backend):**
```javascript
// Rate limiting: Backend enforces 5 login attempts / 10 min
// Firestore rules provide secondary protection
```

---

## 📊 Monitoring

### Check Rule Denials
Go to **Firestore Database** > **Usage** > Look for denied operations

### View Rules Status
Go to **Firestore Database** > **Rules** tab > See deployment history

### Monitor in Cloud Logging
```bash
gcloud logging read "resource.type=cloud_firestore_database AND severity>=WARNING"
```

---

## 🚨 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Can't read own data | Missing `isOwner()` | Check `request.auth.uid` |
| Can read other user's data | No partition check | Add `isOwner()` |
| Invalid data accepted | Missing validation | Add `validateUserData()` |
| Admin can't read | Admin check failing | Check `role: 'admin'` field |
| Cross-user access allowed | Default rule too permissive | Add explicit checks |

---

## 📚 Full Documentation

- **Implementation Guide:** `IMPLEMENTATION_P15_FIREBASE_RULES.md`
- **Rules File:** `firestore.rules`
- **Validation Tests:** `scripts/validate-p15.js` (53 tests)

---

## 🔄 Deployment Process

1. **Review** - Check rules file for changes
2. **Test** - Run with Firebase Emulator
3. **Deploy** - Use Firebase CLI or console
4. **Verify** - Check deployment in Firebase Console
5. **Monitor** - Watch for denied access patterns
6. **Iterate** - Update rules based on real usage

---

## 🎯 Remember

✅ **Default Deny** - Everything starts as forbidden  
✅ **Explicit Allow** - Only allow what's necessary  
✅ **User Partition** - Users only access their own data  
✅ **Validate Input** - Check before storing  
✅ **Test Thoroughly** - Use Emulator for all patterns  
✅ **Monitor Continuously** - Watch for attack patterns  

---

**Status:** ✅ Rules Complete & Tested (53/53)  
**Next Step:** Deploy to Firebase Console  
**Production Ready:** Yes (after emulator testing)
