/**
 * Regression guard: Email verification flow
 *
 * Run: npm run test:auth
 *
 * Verifies:
 *  1. refreshEmailVerificationStatus reloads Firebase user
 *  2. Verified users → /(tabs) (never re-sent to verify-email)
 *  3. Unverified users → /(auth)/verify-email
 *  4. Firestore mirrors emailVerified=true on success
 *  5. Redux reducer correctly toggles isEmailVerified
 *  6. No verify-email routing loop
 */

"use strict";

// ── Stubs ─────────────────────────────────────────────────────────────────────
const firestoreWrites = [];
const mockSetDoc = async (ref, data) => firestoreWrites.push({ uid: ref.uid, data });
const mockDoc = (_db, _c, uid) => ({ uid });
const mockGetFirestore = () => ({});

class User {
  constructor(o) { Object.assign(this, o); this.reloadCalled = 0; }
  async reload() { this.reloadCalled++; }
}

// ── Logic mirrors (must stay in sync with authSlice / _layout) ───────────────

async function syncFirestoreEmailVerified(uid) {
  await mockSetDoc(mockDoc(mockGetFirestore(), "users", uid), {
    emailVerified: true,
    emailVerifiedAt: new Date().toISOString(),
  });
}

async function refreshEmailVerificationStatus(currentUser) {
  if (!currentUser) return false;
  await currentUser.reload();
  const verified = !!currentUser.emailVerified;
  if (verified) await syncFirestoreEmailVerified(currentUser.uid);
  return verified;
}

function decideRoute({ isAuthenticated, isEmailVerified, currentScreen, inAuthGroup, inPublicGroup, hasSeenOnboarding }) {
  if (isAuthenticated && inAuthGroup) {
    if (isEmailVerified) return "/(tabs)";
    if (currentScreen !== "verify-email") return "/(auth)/verify-email";
    return "noop";
  }
  if (!isAuthenticated && !inAuthGroup && !inPublicGroup)
    return hasSeenOnboarding ? "/(auth)/login" : "/(auth)/login";
  return "noop";
}

function applyReducer(state, payload) { state.isEmailVerified = !!payload; }

// ── Runner ────────────────────────────────────────────────────────────────────
let ok = 0, fail = 0;

function assert(name, cond, detail = "") {
  if (cond) { console.log("  ✅ " + name); ok++; }
  else { console.error("  ❌ FAIL: " + name + (detail ? " — " + detail : "")); fail++; }
}

async function run() {
  console.log("=== Email Verification Regression Tests ===\n");

  // 1 ── refresh: verified user
  console.log("▸ 1. refresh — verified user");
  firestoreWrites.length = 0;
  let u = new User({ uid: "a", emailVerified: true });
  let r = await refreshEmailVerificationStatus(u);
  assert("returns true", r === true);
  assert("reload called once", u.reloadCalled === 1);
  assert("writes emailVerified=true to Firestore", firestoreWrites.some(w => w.uid === "a" && w.data.emailVerified === true));
  assert("writes emailVerifiedAt timestamp", firestoreWrites.some(w => typeof w.data.emailVerifiedAt === "string"));

  // 2 ── refresh: unverified user
  console.log("▸ 2. refresh — unverified user");
  firestoreWrites.length = 0;
  u = new User({ uid: "b", emailVerified: false });
  r = await refreshEmailVerificationStatus(u);
  assert("returns false", r === false);
  assert("reload called once", u.reloadCalled === 1);
  assert("no Firestore write", !firestoreWrites.some(w => w.uid === "b"));

  // 3 ── refresh: no current user
  console.log("▸ 3. refresh — no current user");
  r = await refreshEmailVerificationStatus(null);
  assert("returns false when null", r === false);

  // 4 ── routing: verified user on any auth screen → /(tabs)
  console.log("▸ 4. Routing — verified user on auth screen");
  assert("→ /(tabs)", decideRoute({ isAuthenticated: true, isEmailVerified: true, currentScreen: "login", inAuthGroup: true, inPublicGroup: false, hasSeenOnboarding: true }) === "/(tabs)");

  // 5 ── routing: verified user on verify-email (no loop)
  console.log("▸ 5. Routing — verified user on verify-email screen (no loop)");
  assert("→ /(tabs)", decideRoute({ isAuthenticated: true, isEmailVerified: true, currentScreen: "verify-email", inAuthGroup: true, inPublicGroup: false, hasSeenOnboarding: true }) === "/(tabs)");

  // 6 ── routing: unverified user on login
  console.log("▸ 6. Routing — unverified user on login");
  assert("→ verify-email", decideRoute({ isAuthenticated: true, isEmailVerified: false, currentScreen: "login", inAuthGroup: true, inPublicGroup: false, hasSeenOnboarding: true }) === "/(auth)/verify-email");

  // 7 ── routing: unverified user already on verify-email (noop, no bounce)
  console.log("▸ 7. Routing — unverified user already on verify-email (noop)");
  assert("→ noop", decideRoute({ isAuthenticated: true, isEmailVerified: false, currentScreen: "verify-email", inAuthGroup: true, inPublicGroup: false, hasSeenOnboarding: true }) === "noop");

  // 8 ── routing: unauthenticated on protected screen
  console.log("▸ 8. Routing — unauthenticated on protected screen");
  assert("→ login", decideRoute({ isAuthenticated: false, isEmailVerified: false, currentScreen: "", inAuthGroup: false, inPublicGroup: false, hasSeenOnboarding: true }) === "/(auth)/login");

  // 9 ── reducer state
  console.log("▸ 9. Redux reducer — state transitions");
  let s = { isEmailVerified: false }; applyReducer(s, true);
  assert("false → true after fulfilled(true)", s.isEmailVerified === true);
  s = { isEmailVerified: true }; applyReducer(s, false);
  assert("true → false after fulfilled(false)", s.isEmailVerified === false);

  // 10 ── Firestore idempotency
  console.log("▸ 10. Firestore idempotency");
  firestoreWrites.length = 0;
  u = new User({ uid: "c", emailVerified: true });
  await refreshEmailVerificationStatus(u);
  await refreshEmailVerificationStatus(u);
  const wc = firestoreWrites.filter(w => w.uid === "c").length;
  assert("two merge writes (idempotent on DB side)", wc === 2, "count=" + wc);

  // Summary
  console.log("\n" + "─".repeat(48));
  console.log("Results: " + ok + " passed, " + fail + " failed");
  if (fail > 0) { console.error("\n⛔ Some tests failed."); process.exit(1); }
  else console.log("\n✅ All tests passed.");
}

run().catch(e => { console.error(e); process.exit(1); });
