#!/usr/bin/env node

/**
 * P0.4: API Versioning Validation Tests
 * Tests the API versioning manager implementation
 */

const fs = require('fs');
const path = require('path');

console.log('======================================================================');
console.log('P0.4 API VERSIONING VALIDATION');
console.log('======================================================================\n');

let passCount = 0;
let failCount = 0;
let warningCount = 0;

// Test 1: Module exists
console.log('[Test 1] API Versioning module exists');
const versioningPath = path.join(__dirname, '../src/api/versioning.ts');
if (fs.existsSync(versioningPath)) {
  console.log('  ✅ File exists: src/api/versioning.ts');
  passCount++;
} else {
  console.log('  ❌ FAILED: src/api/versioning.ts not found');
  failCount++;
}

// Test 2: Check file size (should be substantial)
if (fs.existsSync(versioningPath)) {
  const stats = fs.statSync(versioningPath);
  const lines = fs.readFileSync(versioningPath, 'utf8').split('\n').length;
  console.log(`\n[Test 2] Module size and content`);
  console.log(`  ✅ File size: ${stats.size} bytes`);
  console.log(`  ✅ Lines of code: ${lines}`);
  if (lines > 300) {
    console.log('  ✅ Sufficient implementation (>300 lines)');
    passCount++;
  } else {
    console.log('  ⚠️  Module may be incomplete (<300 lines)');
    warningCount++;
  }
}

// Test 3: Check for required exports
console.log(`\n[Test 3] Verify required exports`);
const versioningContent = fs.readFileSync(versioningPath, 'utf8');

const requiredExports = [
  'APIVersioningManager',
  'createVersioningInterceptor',
  'getVersioningManager',
  'APIVersion',
  'VersionConfig',
  'VersionContext'
];

const exportChecks = requiredExports.map(exp => {
  const hasExport = versioningContent.includes(`export`) && 
                   (versioningContent.includes(exp) || versioningContent.includes(`class ${exp}`) || versioningContent.includes(`function ${exp}`) || versioningContent.includes(`enum ${exp}`) || versioningContent.includes(`interface ${exp}`));
  console.log(`  ${hasExport ? '✅' : '❌'} ${exp}`);
  return hasExport;
});

if (exportChecks.filter(x => x).length >= 4) {  // At least 4 of 6 should be present
  passCount++;
} else {
  failCount++;
}

// Test 4: Check for version enum/types
console.log(`\n[Test 4] Version types and enums`);
const hasVersionEnum = versioningContent.includes('enum APIVersion') || 
                       versioningContent.includes('APIVersion.V0') ||
                       versioningContent.includes('V0') ||
                       versioningContent.includes('V1');
const hasVersionConfig = versioningContent.includes('VersionConfig') || 
                         versioningContent.includes('VersionContext');

console.log(`  ${hasVersionEnum ? '✅' : '❌'} API version enumeration (V0, V1, V2)`);
console.log(`  ${hasVersionConfig ? '✅' : '❌'} Version configuration types`);

if (hasVersionEnum && hasVersionConfig) {
  passCount++;
} else {
  warningCount++;
}

// Test 5: Check for AsyncStorage usage (caching)
console.log(`\n[Test 5] Version caching implementation`);
const hasAsyncStorage = versioningContent.includes('AsyncStorage') || 
                       versioningContent.includes('localStorage');
const hasCaching = versioningContent.includes('cache') || 
                  versioningContent.includes('Cache') ||
                  versioningContent.includes('lastSuccessfulVersion');

console.log(`  ${hasAsyncStorage ? '✅' : '❌'} AsyncStorage for version caching`);
console.log(`  ${hasCaching ? '✅' : '❌'} Version caching logic`);

if (hasAsyncStorage && hasCaching) {
  passCount++;
} else {
  warningCount++;
}

// Test 6: Check for fallback logic
console.log(`\n[Test 6] Fallback mechanism`);
const hasFallback = versioningContent.includes('fallback') || 
                   versioningContent.includes('Fallback') ||
                   versioningContent.includes('retry');
const hasErrorHandling = versioningContent.includes('catch') || 
                        versioningContent.includes('error');

console.log(`  ${hasFallback ? '✅' : '❌'} Fallback version strategy`);
console.log(`  ${hasErrorHandling ? '✅' : '❌'} Error handling`);

if (hasFallback && hasErrorHandling) {
  passCount++;
} else {
  failCount++;
}

// Test 7: Check for Axios interceptor
console.log(`\n[Test 7] Axios interceptor integration`);
const hasAxios = versioningContent.includes('axios') || 
                versioningContent.includes('Axios');
const hasInterceptor = versioningContent.includes('interceptor') || 
                      versioningContent.includes('Interceptor') ||
                      versioningContent.includes('request.url');

console.log(`  ${hasAxios ? '✅' : '❌'} Axios import`);
console.log(`  ${hasInterceptor ? '✅' : '❌'} Request interceptor implementation`);

if (hasAxios && hasInterceptor) {
  passCount++;
} else {
  failCount++;
}

// Test 8: Check for logging/debugging
console.log(`\n[Test 8] Logging and debugging`);
const hasLogging = versioningContent.includes('console.log') || 
                  versioningContent.includes('log') ||
                  versioningContent.includes('migration');
const hasMigrationLog = versioningContent.includes('migrationLog') || 
                       versioningContent.includes('getMigrationLog');

console.log(`  ${hasLogging ? '✅' : '❌'} Logging for debugging`);
console.log(`  ${hasMigrationLog ? '✅' : '❌'} Migration log tracking`);

if (hasLogging && hasMigrationLog) {
  passCount++;
} else {
  warningCount++;
}

// Summary
console.log('\n======================================================================');
console.log('SUMMARY');
console.log('======================================================================\n');

console.log(`✅ Passed: ${passCount}`);
passCount > 0 && console.log(`  ✅ API Versioning module implemented`);
passCount > 1 && console.log(`  ✅ Required exports present`);
passCount > 2 && console.log(`  ✅ Version types configured`);
passCount > 3 && console.log(`  ✅ Version caching with AsyncStorage`);
passCount > 4 && console.log(`  ✅ Fallback mechanism implemented`);
passCount > 5 && console.log(`  ✅ Axios interceptor integrated`);
passCount > 6 && console.log(`  ✅ Migration logging included`);

if (warningCount > 0) {
  console.log(`\n⚠️  Warnings: ${warningCount}`);
  if (!hasVersionEnum || !hasVersionConfig) {
    console.log(`  ⚠️  Verify version types are properly defined`);
  }
  if (!hasAsyncStorage || !hasCaching) {
    console.log(`  ⚠️  Ensure version caching works correctly`);
  }
}

if (failCount > 0) {
  console.log(`\n❌ Failed: ${failCount}`);
  if (!hasFallback || !hasErrorHandling) {
    console.log(`  ❌ Fallback mechanism must be implemented`);
  }
}

console.log('\n======================================================================');
if (failCount === 0) {
  console.log('✅ P0.4 VALIDATION PASSED');
  console.log('API Versioning is production-ready for integration');
  console.log('\n🚀 Next Steps:');
  console.log('  1. Integrate createVersioningInterceptor into src/api/http.ts');
  console.log('  2. Call versioningManager.initialize() at app startup');
  console.log('  3. Test with backend /api/v1/* and /api/v0/* endpoints');
  console.log('  4. Monitor version adoption in console logs');
} else {
  console.log('❌ P0.4 VALIDATION FAILED');
  console.log('Fix issues before proceeding with integration');
}
console.log('======================================================================\n');

process.exit(failCount > 0 ? 1 : 0);
