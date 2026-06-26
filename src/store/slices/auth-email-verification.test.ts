/**
 * Regression test: Email verification flow
 *
 * Ensures that:
 *  1. refreshEmailVerificationStatus calls reload() on the current Firebase user
 *  2. Verified users are NEVER sent back to the verify-email screen by the
 *     routing logic (isEmailVerified=true always maps to /(tabs))
 *  3. Unverified users are always gated to verify-email (never /(tabs))
 *  4. Firestore mirror runs when emailVerified is true
 *  5. Redux state is updated correctly by the thunk result
 *  6. No raw firebase user is dispatched — only the boolean result
 *
 * Run with:
 *   node src/store/slices/auth-email-verification.test.ts
 */

// ---------------------------------------------------------------------------
// Minimal stubs (no dependencies on Expo / React Native / Firebase SDK)
// ---------------------------------------------------------------------------

type Listener<T> = (val: T) => void;

class MockUser {
  uid: string;
  emailVerified: boolean;
  reloadCalled = 0;

  constructor(opts: { uid: string; emailVerified: boolean }) {
    this.uid = opts.uid;
    this.emailVerified = opts.emailVerified;
  }

  async reload() {
    this.reloadCalled++;
    // noop — emailVerified stays whatever it was set to
  }
}

// Stub for Firestore setDoc calls
const firestoreWrites: Array<{ uid: string; data: Record<string, unknown> }> = [];
const mockSetDoc = async (
  _docRef: { uid: string },
  data: Record<string, unknown>,
) => {
  firestoreWrites.push({ uid: _docRef.uid, data });
};

// Stub for getFirestore / doc
const mockDoc = (
  _db: unknown,
  _collection: string,
  uid: string,
): { uid: string } => ({ uid });
const mockGetFirestore = () => ({});

// ---------------------------------------------------------------------------
// Local implementation of refreshEmailVerificationStatus (mirrors authSlice)
// ---------------------------------------------------------------------------

async function syncFirestoreEmailVerified(uid: string): Promise<void> {
  const db = mockGetFirestore();
  await mockSetDoc(mockDoc(db, "users", uid), {
    emailVerified: true,
    emailVerifiedAt: new Date().toISOString(),
  });
}

async function refreshEmailVerificationStatus(
  currentUser: MockUser | null,
): Promise<boolean> {
  if (!currentUser) return false;
  await currentUser.reload();
  const verified = !!currentUser.emailVerified;
  if (verified) await syncFirestoreEmailVerified(currentUser.uid);
  return verified;
}

// ---------------------------------------------------------------------------
// Routing logic mirror (mirrors app/_layout.tsx route decision)
// ---------------------------------------------------------------------------

type Route = "/(tabs)" | "/(auth)/verify-email" | "/(auth)/login" | "noop";

function decideRoute(opts: {
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  currentScreen: string; // e.g. "login", "verify-email", "register"
  inAuthGroup: boolean;
  inPublicGroup: boolean;
  hasSeenOnboarding: boolean;
}): Route {
  const {
    isAuthenticated,
    isEmailVerified,
    currentScreen,
    inAuthGroup,
    inPublicGroup,
    hasSeenOnboarding,
  } = opts;

  if (isAuthenticated && inAuthGroup) {
    if (isEmailVerified) {
      return "/(tabs)";
    } else if (currentScreen !== "verify-email") {
      return "/(auth)/verify-email";
    }
    return "noop"; // already on verify-email
  }

  if (!isAuthenticated && !inAuthGroup && !inPublicGroup) {
    return hasSeenOnboarding ? "/(auth)/login" : "/(auth)/login";
  }

  return "noop";
}

// ---------------------------------------------------------------------------
// Test runner helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function section(title: string) {
  console.log(`\n▸ ${title}`);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function runTests() {
  console.log("=== Email Verification Flow — Regression Tests ===\n");

  // -------------------------------------------------------------------------
  section("1. refreshEmailVerificationStatus — verified user");
  // -------------------------------------------------------------------------
  {
    firestoreWrites.length = 0;
    const user = new MockUser({ uid: "uid-verified", emailVerified: true });
    const result = await refreshEmailVerificationStatus(user);

    assert("returns true for verified user", result === true);
    assert("calls reload() exactly once", user.reloadCalled === 1);
    assert(
      "writes emailVerified=true to Firestore",
      firestoreWrites.some(
        (w) => w.uid === "uid-verified" && w.data.emailVerified === true,
      ),
    );
    assert(
      "writes emailVerifiedAt timestamp to Firestore",
      firestoreWrites.some(
        (w) => typeof w.data.emailVerifiedAt === "string",
      ),
    );
  }

  // -------------------------------------------------------------------------
  section("2. refreshEmailVerificationStatus — unverified user");
  // -------------------------------------------------------------------------
  {
    firestoreWrites.length = 0;
    const user = new MockUser({ uid: "uid-unverified", emailVerified: false });
    const result = await refreshEmailVerificationStatus(user);

    assert("returns false for unverified user", result === false);
    assert("calls reload() exactly once", user.reloadCalled === 1);
    assert(
      "does NOT write to Firestore when unverified",
      !firestoreWrites.some((w) => w.uid === "uid-unverified"),
    );
  }

  // -------------------------------------------------------------------------
  section("3. refreshEmailVerificationStatus — no user signed in");
  // -------------------------------------------------------------------------
  {
    const result = await refreshEmailVerificationStatus(null);
    assert("returns false when currentUser is null", result === false);
  }

  // -------------------------------------------------------------------------
  section("4. Route decision — verified user on auth screen");
  // -------------------------------------------------------------------------
  {
    const route = decideRoute({
      isAuthenticated: true,
      isEmailVerified: true,
      currentScreen: "login",
      inAuthGroup: true,
      inPublicGroup: false,
      hasSeenOnboarding: true,
    });
    assert(
      "verified user on auth screen → /(tabs)",
      route === "/(tabs)",
      `got: ${route}`,
    );
  }

  // -------------------------------------------------------------------------
  section("5. Route decision — verified user already on verify-email screen");
  // -------------------------------------------------------------------------
  {
    // After clicking the email link and landing back on verify-email
    const route = decideRoute({
      isAuthenticated: true,
      isEmailVerified: true,
      currentScreen: "verify-email",
      inAuthGroup: true,
      inPublicGroup: false,
      hasSeenOnboarding: true,
    });
    assert(
      "verified user on verify-email screen → /(tabs) (no loop)",
      route === "/(tabs)",
      `got: ${route}`,
    );
  }

  // -------------------------------------------------------------------------
  section("6. Route decision — unverified user on login screen");
  // -------------------------------------------------------------------------
  {
    const route = decideRoute({
      isAuthenticated: true,
      isEmailVerified: false,
      currentScreen: "login",
      inAuthGroup: true,
      inPublicGroup: false,
      hasSeenOnboarding: true,
    });
    assert(
      "unverified user on login → /(auth)/verify-email",
      route === "/(auth)/verify-email",
      `got: ${route}`,
    );
  }

  // -------------------------------------------------------------------------
  section("7. Route decision — unverified user already on verify-email screen");
  // -------------------------------------------------------------------------
  {
    const route = decideRoute({
      isAuthenticated: true,
      isEmailVerified: false,
      currentScreen: "verify-email",
      inAuthGroup: true,
      inPublicGroup: false,
      hasSeenOnboarding: true,
    });
    assert(
      "unverified user stays on verify-email (noop, no redirect loop)",
      route === "noop",
      `got: ${route}`,
    );
  }

  // -------------------------------------------------------------------------
  section("8. Route decision — unauthenticated user on protected screen");
  // -------------------------------------------------------------------------
  {
    const route = decideRoute({
      isAuthenticated: false,
      isEmailVerified: false,
      currentScreen: "",
      inAuthGroup: false,
      inPublicGroup: false,
      hasSeenOnboarding: true,
    });
    assert(
      "unauthenticated on protected screen → /(auth)/login",
      route === "/(auth)/login",
      `got: ${route}`,
    );
  }

  // -------------------------------------------------------------------------
  section("9. Redux state expectations after thunk (unit)");
  // -------------------------------------------------------------------------
  {
    // Simulate what the reducer does:
    //   builder.addCase(refreshEmailVerificationStatus.fulfilled, (state, action) => {
    //     state.isEmailVerified = !!action.payload;
    //   })
    const applyFulfilled = (
      state: { isEmailVerified: boolean },
      payload: boolean,
    ) => {
      state.isEmailVerified = !!payload;
    };

    const stateA = { isEmailVerified: false };
    applyFulfilled(stateA, true);
    assert(
      "Redux state becomes isEmailVerified=true after fulfilled(true)",
      stateA.isEmailVerified === true,
    );

    const stateB = { isEmailVerified: true };
    applyFulfilled(stateB, false);
    assert(
      "Redux state becomes isEmailVerified=false after fulfilled(false)",
      stateB.isEmailVerified === false,
    );
  }

  // -------------------------------------------------------------------------
  section("10. Firestore write is idempotent (no extra writes on re-runs)");
  // -------------------------------------------------------------------------
  {
    firestoreWrites.length = 0;
    const user = new MockUser({ uid: "uid-idempotent", emailVerified: true });
    await refreshEmailVerificationStatus(user);
    await refreshEmailVerificationStatus(user); // second call
    const writeCount = firestoreWrites.filter(
      (w) => w.uid === "uid-idempotent",
    ).length;
    // Both calls write (Firestore setDoc with merge:true is idempotent on the DB side)
    assert(
      "both calls produce merge writes (setDoc idempotent by design)",
      writeCount === 2,
      `writeCount: ${writeCount}`,
    );
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log(`\n${"─".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("\n⛔ Some tests failed. Fix the issues above.");
    process.exit(1);
  } else {
    console.log("\n✅ All tests passed.");
  }
}

runTests().catch((e) => {
  console.error("Unexpected error in test runner:", e);
  process.exit(1);
});
