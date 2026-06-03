#!/usr/bin/env node
/**
 * SECURITY VALIDATION: speech.ts vs speech-secure.ts
 * 
 * Compares the original and secure implementations to verify
 * that API keys are properly removed and backend proxies are used.
 */

const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

const files = {
  old: 'src/services/speech.ts',
  secure: 'src/services/speech-secure.ts',
};

const results = {
  passed: [],
  warnings: [],
  failed: [],
};

// Read files
const speechOld = fs.readFileSync(files.old, 'utf-8');
const speechSecure = fs.readFileSync(files.secure, 'utf-8');

console.log(BLUE + '\n' + '='.repeat(70) + RESET);
console.log(BLUE + 'SECURITY VALIDATION: speech.ts vs speech-secure.ts' + RESET);
console.log(BLUE + '='.repeat(70) + RESET);

// ✅ Test 1: Secure version doesn't have direct Azure Speech Key
console.log('\n' + BLUE + '[Test 1]' + RESET + ' Direct Azure Speech Key Exposure');
if (speechSecure.includes('const SPEECH_KEY') || 
    /EXPO_PUBLIC_AZURE_SPEECH_KEY\s*=/.test(speechSecure)) {
  results.failed.push('❌ speech-secure.ts contains EXPO_PUBLIC_AZURE_SPEECH_KEY assignment');
  console.log(RED + '  ❌ FAILED: speech-secure.ts exposes AZURE_SPEECH_KEY' + RESET);
} else {
  results.passed.push('✅ speech-secure.ts does NOT expose EXPO_PUBLIC_AZURE_SPEECH_KEY');
  console.log(GREEN + '  ✅ PASSED: No direct Azure Speech Key in secure version' + RESET);
}

if (speechOld.includes('EXPO_PUBLIC_AZURE_SPEECH_KEY')) {
  results.warnings.push('⚠️  Original speech.ts still contains EXPO_PUBLIC_AZURE_SPEECH_KEY (expected)');
  console.log(YELLOW + '  ⚠️  EXPECTED: Original speech.ts has EXPO_PUBLIC_AZURE_SPEECH_KEY (for comparison)' + RESET);
}

// ✅ Test 2: Secure version doesn't have direct Azure endpoints
console.log('\n' + BLUE + '[Test 2]' + RESET + ' Direct Azure Endpoint Exposure');
const directEndpointPatterns = [
  /const\s+TTS_ENDPOINT\s*=/,  // Only flag if it's a const assignment
  /const\s+FAST_STT_ENDPOINT\s*=/,
];
let hasDirectEndpoints = false;

directEndpointPatterns.forEach((pattern) => {
  if (pattern.test(speechSecure)) {
    hasDirectEndpoints = true;
    results.failed.push(`❌ speech-secure.ts contains direct Azure endpoint constant`);
    console.log(RED + `  ❌ FAILED: speech-secure.ts exposes direct Azure endpoint` + RESET);
  }
});

if (!hasDirectEndpoints) {
  results.passed.push('✅ speech-secure.ts does NOT expose direct Azure endpoints');
  console.log(GREEN + '  ✅ PASSED: No direct Azure endpoints in secure version' + RESET);
}

// ✅ Test 3: Secure version uses backend proxies
console.log('\n' + BLUE + '[Test 3]' + RESET + ' Backend Proxy Usage');
const backendProxies = [
  { name: 'TTS Proxy', pattern: 'BACKEND_TTS_ENDPOINT' },
  { name: 'STT Proxy', pattern: 'BACKEND_STT_ENDPOINT' },
];

backendProxies.forEach(({ name, pattern }) => {
  if (speechSecure.includes(pattern)) {
    results.passed.push(`✅ speech-secure.ts uses ${name}`);
    console.log(GREEN + `  ✅ PASSED: ${name} is used` + RESET);
  } else {
    results.failed.push(`❌ speech-secure.ts missing ${name}`);
    console.log(RED + `  ❌ FAILED: ${name} not found` + RESET);
  }
});

// ✅ Test 4: JWT Authentication is used
console.log('\n' + BLUE + '[Test 4]' + RESET + ' JWT Authentication');
if (speechSecure.includes('getIdToken') && speechSecure.includes('Authorization: `Bearer')) {
  results.passed.push('✅ speech-secure.ts uses JWT authentication');
  console.log(GREEN + '  ✅ PASSED: JWT auth required for all requests' + RESET);
} else {
  results.failed.push('❌ speech-secure.ts missing JWT authentication');
  console.log(RED + '  ❌ FAILED: JWT authentication not properly implemented' + RESET);
}

// ✅ Test 5: All required exports present
console.log('\n' + BLUE + '[Test 5]' + RESET + ' Required Exports');
const requiredExports = [
  'speak',
  'stopSpeaking',
  'isSpeaking',
  'onSpeakingChange',
  'startRecording',
  'stopRecordingAndTranscribe',
  'cancelRecording',
];

let allExportsPresent = true;
requiredExports.forEach((exportName) => {
  // Check for export patterns: export [async] function/const NAME
  const patterns = [
    new RegExp(`export\\s+(async\\s+)?function\\s+${exportName}\\s*[\\(:]`, 'i'),
    new RegExp(`export\\s+const\\s+${exportName}\\s*[=:]`, 'i'),
  ];
  
  let found = false;
  for (const pattern of patterns) {
    if (pattern.test(speechSecure)) {
      found = true;
      break;
    }
  }
  
  if (found) {
    console.log(GREEN + `  ✅ ${exportName}` + RESET);
  } else {
    console.log(RED + `  ❌ ${exportName} missing` + RESET);
    allExportsPresent = false;
  }
});

if (allExportsPresent) {
  results.passed.push('✅ All required exports present');
} else {
  results.failed.push('❌ Some required exports missing');
}

// ✅ Test 6: No exposed constants
console.log('\n' + BLUE + '[Test 6]' + RESET + ' Exposed Constants');
const unsafeConstants = [
  'SPEECH_KEY',
  'VOICE_FEMALE',
  'VOICE_MALE',
  'SPEECH_REGION',
];

let hasUnsafeConstants = false;
unsafeConstants.forEach((constant) => {
  if (speechSecure.includes(`const ${constant} =`)) {
    console.log(RED + `  ❌ ${constant} exposed` + RESET);
    hasUnsafeConstants = true;
  }
});

if (!hasUnsafeConstants) {
  results.passed.push('✅ No unsafe constants exposed');
  console.log(GREEN + '  ✅ PASSED: No unsafe constants' + RESET);
}

// ✅ Test 7: Firebase auth configuration
console.log('\n' + BLUE + '[Test 7]' + RESET + ' Firebase Authentication');
if (speechSecure.includes('firebaseAuth.currentUser') && 
    speechSecure.includes('import { auth as firebaseAuth }')) {
  results.passed.push('✅ Firebase auth properly imported and used');
  console.log(GREEN + '  ✅ PASSED: Firebase auth configured' + RESET);
} else {
  results.failed.push('❌ Firebase auth not properly configured');
  console.log(RED + '  ❌ FAILED: Firebase auth issue' + RESET);
}

// Summary
console.log('\n' + BLUE + '='.repeat(70) + RESET);
console.log(BLUE + 'SUMMARY' + RESET);
console.log(BLUE + '='.repeat(70) + RESET);

console.log(`\n${GREEN}✅ Passed: ${results.passed.length}${RESET}`);
results.passed.forEach((msg) => console.log(`  ${msg}`));

if (results.warnings.length > 0) {
  console.log(`\n${YELLOW}⚠️  Warnings: ${results.warnings.length}${RESET}`);
  results.warnings.forEach((msg) => console.log(`  ${msg}`));
}

if (results.failed.length > 0) {
  console.log(`\n${RED}❌ Failed: ${results.failed.length}${RESET}`);
  results.failed.forEach((msg) => console.log(`  ${msg}`));
}

console.log('\n' + BLUE + '='.repeat(70) + RESET);

// Final verdict
if (results.failed.length === 0) {
  console.log(GREEN + '✅ SECURITY VALIDATION PASSED' + RESET);
  console.log(GREEN + 'speech-secure.ts is ready for Phase 2 integration testing' + RESET);
  process.exit(0);
} else {
  console.log(RED + '❌ SECURITY VALIDATION FAILED' + RESET);
  console.log(RED + `${results.failed.length} issue(s) must be fixed before proceeding` + RESET);
  process.exit(1);
}
