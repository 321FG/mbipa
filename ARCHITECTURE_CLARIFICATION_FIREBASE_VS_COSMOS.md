# Mbipa Architecture: Firebase vs Azure Cosmos DB

**Status:** Clarification Document  
**Created:** May 26, 2025  

---

## ✅ Your Architecture is CORRECT

You have TWO separate storage systems, and they **DO NOT CONFLICT**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Mbipa React Native App                        │
└────────┬───────────────────────────────────────────────┬─────────┘
         │                                               │
         │ Firebase Auth (OAuth)                         │ Backend APIs
         │ - Sign in/Register                            │ (JWT Token)
         │ - Email verification                          │
         │ - Get ID token                                │
         ▼                                               ▼
   ┌──────────────┐                            ┌─────────────────────┐
   │ Firebase     │                            │  Backend Server     │
   │              │                            │  (Node/Express)     │
   │ - Auth only  │                            │                     │
   │ - No data    │                            │ Validates JWT token │
   │   stored     │                            │ from Firebase       │
   └──────────────┘                            └────────┬────────────┘
                                                        │
                                                        ▼
                                              ┌─────────────────────┐
                                              │ Azure Cosmos DB     │
                                              │                     │
                                              │ Stores:             │
                                              │ - User profiles     │
                                              │ - Therapy history   │
                                              │ - Subscriptions     │
                                              │ - Assessments       │
                                              │ - Sessions          │
                                              └─────────────────────┘
```

---

## What Firebase Rules Protect

The `firestore.rules` file I created protects **Firestore**, which is a SEPARATE database from your Cosmos DB.

```javascript
// These rules protect FIRESTORE collections:
match /users/{userId} { ... }         // ← Firestore (NOT your Cosmos DB)
match /chat/{conversationId} { ... }  // ← Firestore (NOT your Cosmos DB)
match /assessments/{assessmentId} { } // ← Firestore (NOT your Cosmos DB)
```

### Do You Currently Use Firestore?

**NO** - Your codebase shows you're using:
1. **Firebase Auth** - Authentication only ✅
2. **Backend APIs** (Express) - For data operations ✅
3. **Azure Cosmos DB** - For data storage ✅

You're NOT currently using **Firestore** for data storage.

---

## Current Data Flow (What You Have Now)

```
1. User signs in via Firebase Auth
   └→ Firebase returns JWT ID token

2. Frontend sends request to Backend API with JWT token
   └→ Authorization: Bearer <firebase-jwt>

3. Backend validates JWT token
   └→ Extracts user ID from token

4. Backend stores/retrieves data from Azure Cosmos DB
   └→ All user data stays in Cosmos DB
```

**This is SECURE and CORRECT.** ✅

---

## What Are Firestore Rules For?

Firestore rules are ONLY needed if you use **Firestore as your database**:

### Option A: Current Setup (What You Have) ✅
```
Firebase Auth → Backend APIs → Azure Cosmos DB
- Firebase rules NOT needed (you don't use Firestore)
- Backend handles authentication validation
- Cosmos DB has no direct client access
```

### Option B: Firebase-First Setup (Alternative)
```
Firebase Auth → Firestore (with rules)
- Firestore rules needed (protect direct client access)
- Firebase rules DO the authorization
- No backend needed for authentication
```

**You are using Option A.** ✅

---

## Should You Deploy the Firestore Rules?

**Answer:** It depends on your data storage strategy.

### ✅ Deploy Firestore Rules IF:
1. You want to use Firestore for real-time data (chat, notifications, etc.)
2. You want to replace Cosmos DB with Firestore
3. You want client apps to write directly to Firestore (without backend)
4. You want real-time sync across devices

### ❌ Skip Firestore Rules IF:
1. You're keeping Azure Cosmos DB as your main database
2. All data access goes through Backend APIs
3. You don't plan to use Firestore for data storage
4. Firebase is ONLY for authentication

---

## Your Backend API Security (What You SHOULD Focus On)

Since you're using Backend APIs + Cosmos DB, your security depends on:

### 1. Backend JWT Validation ✅
```javascript
// Backend validates Firebase JWT
const decodedToken = await admin.auth().verifyIdToken(token);
const uid = decodedToken.uid;
```

### 2. Backend Authorization ✅
```javascript
// Backend checks user owns the data
if (request.body.userId !== uid) {
  return 403 Forbidden;
}

// Backend fetches from Cosmos DB
const userData = await cosmosDB.users.read(uid);
```

### 3. Cosmos DB Access Control ✅
```
- Only Backend API can access Cosmos DB
- No direct client access
- Connection strings kept secure on server
- Backend enforces user partitioning
```

**This is MORE SECURE than Firestore.** ✅

---

## Recommendation: Update Firestore Rules

**To be safe**, update the rules to clarify that you don't use Firestore for user data:

```javascript
// ====================================================================
// FIRESTORE SECURITY RULES
// ====================================================================
// NOTE: Mbipa uses Azure Cosmos DB for primary data storage
// Firestore is OPTIONAL for:
// - Real-time chat (optional)
// - Notifications (optional)
// - Presence indicators (optional)
//
// If using Firestore for data, deploy these rules
// If NOT using Firestore, you can skip deployment
// ====================================================================
```

---

## Answer to Your Question

**Q:** I save users in Azure Cosmos DB. Firebase only handles login/register. Will Firestore rules cause issues?

**A:** **NO**, because:

1. ✅ **You don't use Firestore** - Rules only protect Firestore
2. ✅ **You use Backend APIs** - Backend handles authorization
3. ✅ **Cosmos DB is separate** - Not affected by Firestore rules
4. ✅ **No conflict** - Two different systems

**The rules are optional.** Deploy them ONLY IF you start using Firestore for data.

---

## What You Actually Need to Secure (P1.5 for your setup)

Instead of Firestore rules, focus on:

### 1. ✅ Backend API Security
- JWT validation (Firebase tokens)
- User ownership checks
- Rate limiting (already done in P1.3 ✅)
- Input validation
- Cosmos DB queries filtered by user

### 2. ✅ Cosmos DB Security
- Connection strings in environment variables
- Cosmos DB firewall rules
- Shared access policies with least privilege
- Audit logging enabled
- Encryption at rest & in transit

### 3. ✅ Firebase Auth Security
- Email verification (already enforced)
- Password policies
- 2FA support (optional)
- Session management

---

## Revised P1.5 Scope for Your Architecture

Instead of "Firebase Security Rules", P1.5 should be:

**"Backend API Authorization & Cosmos DB Access Control"**

This would include:
- [ ] Verify all Backend API endpoints validate JWT tokens
- [ ] Verify all Cosmos DB queries filter by user
- [ ] Verify Cosmos DB connection strings are not in code
- [ ] Verify Cosmos DB firewall rules are configured
- [ ] Verify audit logging is enabled
- [ ] Verify input validation on all endpoints

---

## Summary

| Component | Your Setup | P1.5 Firestore Rules |
|-----------|-----------|---------------------|
| Authentication | Firebase Auth ✅ | Not needed |
| User Data Storage | Azure Cosmos DB ✅ | Not needed |
| Backend APIs | Express ✅ | Focus here! |
| Firestore | NOT USED | Not needed |
| Authorization | Backend handles ✅ | Backend handles |

**Firestore Rules:** Optional (only deploy if you use Firestore)  
**Backend Security:** CRITICAL (focus here for your setup)

---

## Next Steps

### Option 1: Keep Current Setup (Recommended)
- Skip Firestore deployment
- Focus P1.5 on Backend API security
- Use what you have now (secure & proven)

### Option 2: Add Firestore Later
- Deploy Firestore rules now (future-proof)
- Use for real-time features (chat, notifications)
- Run alongside Cosmos DB

### Option 3: Migrate to Firestore
- Refactor to use Firestore directly
- Remove Backend APIs for data (keep auth)
- Simpler, more cost-effective, but less control

---

**Recommendation:** Keep Option 1 (current setup). Your architecture is secure. P1.5 should focus on Backend API security, not Firestore.

Would you like me to create a **Backend API Security Audit (P1.5 Revised)** instead?
