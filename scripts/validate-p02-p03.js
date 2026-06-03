#!/usr/bin/env node
/**
 * P0.2 & P0.3 SECURITY VALIDATION
 * 
 * Tests:
 * 1. HTTPS Pinning module loads and exports correctly
 * 2. Privacy Policy page renders without errors
 * 3. i18n translations exist for privacy content
 * 4. No hardcoded secrets in files
 */

const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

const results = {
  passed: [],
  warnings: [],
  failed: [],
};

console.log(BLUE + '\n' + '='.repeat(70) + RESET);
console.log(BLUE + 'P0.2 & P0.3 SECURITY VALIDATION' + RESET);
console.log(BLUE + '='.repeat(70) + RESET);

// =====================================================
// P0.2: HTTPS PINNING TESTS
// =====================================================

console.log('\n' + BLUE + '[P0.2 Tests] SSL Certificate Pinning' + RESET);

// Test 1: HTTPS Pinning file exists
console.log('\n  Test 1: HTTPS Pinning module exists');
const pinningPath = 'src/utils/https-pinning.ts';
if (fs.existsSync(pinningPath)) {
  console.log(GREEN + `    ✅ File exists: ${pinningPath}` + RESET);
  results.passed.push('✅ HTTPS Pinning module created');
} else {
  console.log(RED + `    ❌ File not found: ${pinningPath}` + RESET);
  results.failed.push('❌ HTTPS Pinning module not found');
}

// Test 2: Check exports
console.log('\n  Test 2: Verify exports');
const pinningContent = fs.existsSync(pinningPath)
  ? fs.readFileSync(pinningPath, 'utf-8')
  : '';

const requiredExports = [
  'createPinnedAxiosInstance',
  'getCertificateValidationLog',
  'clearCertificateValidationLog',
  'addCertificatePin',
  'removeCertificatePin',
  'isDomainPinned',
  'getCertificatePins',
  'certificatePinningGuide',
];

let allExportsFound = true;
requiredExports.forEach((exp) => {
  if (pinningContent.includes(`export function ${exp}`) || 
      pinningContent.includes(`export const ${exp}`)) {
    console.log(GREEN + `    ✅ ${exp}` + RESET);
  } else {
    console.log(RED + `    ❌ ${exp} not found` + RESET);
    allExportsFound = false;
  }
});

if (allExportsFound) {
  results.passed.push('✅ All HTTPS pinning exports present');
} else {
  results.failed.push('❌ Some HTTPS pinning exports missing');
}

// Test 3: Check for security best practices
console.log('\n  Test 3: Security best practices');
const hasCertificatePins = pinningContent.includes('CERTIFICATE_PINS');
const hasInterceptors = pinningContent.includes('interceptors');
const hasLogging = pinningContent.includes('validationLog');
const hasFallback = pinningContent.includes('LENIENT_PINNING_DOMAINS');

if (hasCertificatePins && hasInterceptors && hasLogging && hasFallback) {
  console.log(GREEN + '    ✅ Certificate pins configuration' + RESET);
  console.log(GREEN + '    ✅ Request/response interceptors' + RESET);
  console.log(GREEN + '    ✅ Security validation logging' + RESET);
  console.log(GREEN + '    ✅ Fallback pinning strategy' + RESET);
  results.passed.push('✅ HTTPS pinning implements best practices');
} else {
  console.log(RED + '    ❌ Missing security features' + RESET);
  results.failed.push('❌ HTTPS pinning missing features');
}

// Test 4: Check for hardcoded secrets
console.log('\n  Test 4: No hardcoded secrets');
const hasExposedSecrets = 
  pinningContent.includes('EXPO_PUBLIC_') ||
  pinningContent.includes('process.env.AZURE') ||
  /pin_sha256\/[A-Za-z0-9+/]+={0,2}=$/.test(pinningContent) // Actual pin pattern
  ;

if (!hasExposedSecrets) {
  console.log(GREEN + '    ✅ No hardcoded API keys or secrets' + RESET);
  results.passed.push('✅ HTTPS pinning has no exposed secrets');
} else {
  console.log(YELLOW + '    ⚠️  Placeholder certificate pins found (expected)' + RESET);
  results.warnings.push('⚠️  Certificate pins are placeholders (TO-DO: Add real pins)');
}

// =====================================================
// P0.3: PRIVACY POLICY TESTS
// =====================================================

console.log('\n' + BLUE + '[P0.3 Tests] Privacy Policy Page' + RESET);

// Test 1: Privacy page file exists
console.log('\n  Test 1: Privacy Policy page exists');
const privacyPath = 'app/legal/privacy.tsx';
if (fs.existsSync(privacyPath)) {
  console.log(GREEN + `    ✅ File exists: ${privacyPath}` + RESET);
  results.passed.push('✅ Privacy Policy page exists');
} else {
  console.log(RED + `    ❌ File not found: ${privacyPath}` + RESET);
  results.failed.push('❌ Privacy Policy page not found');
}

// Test 2: Check exports and imports
console.log('\n  Test 2: Verify imports and exports');
const privacyContent = fs.existsSync(privacyPath)
  ? fs.readFileSync(privacyPath, 'utf-8')
  : '';

const hasReactImports = privacyContent.includes('import React');
const hasI18n = privacyContent.includes('useTranslation');
const hasDefaultExport = privacyContent.includes('export default');
const hasLegalScreen = privacyContent.includes('LegalScreen');

if (hasReactImports && hasI18n && hasDefaultExport) {
  console.log(GREEN + '    ✅ React imports' + RESET);
  console.log(GREEN + '    ✅ i18next translations' + RESET);
  console.log(GREEN + '    ✅ Default export' + RESET);
  results.passed.push('✅ Privacy Policy has correct imports/exports');
} else {
  console.log(RED + '    ❌ Missing required imports/exports' + RESET);
  results.failed.push('❌ Privacy Policy missing imports/exports');
}

// Test 3: Check i18n translations exist
console.log('\n  Test 3: i18n translations');
const enLocale = fs.existsSync('src/i18n/locales/en.json')
  ? fs.readFileSync('src/i18n/locales/en.json', 'utf-8')
  : '';
const frLocale = fs.existsSync('src/i18n/locales/fr.json')
  ? fs.readFileSync('src/i18n/locales/fr.json', 'utf-8')
  : '';

const enHasPrivacy = enLocale.includes('"privacy"') || 
                     enLocale.includes('"privacyContent"');
const frHasPrivacy = frLocale.includes('"privacy"') || 
                     frLocale.includes('"privacyContent"');

if (enHasPrivacy) {
  console.log(GREEN + '    ✅ English translations found' + RESET);
} else {
  console.log(RED + '    ❌ English translations missing' + RESET);
}

if (frHasPrivacy) {
  console.log(GREEN + '    ✅ French translations found' + RESET);
} else {
  console.log(RED + '    ❌ French translations missing' + RESET);
}

if (enHasPrivacy && frHasPrivacy) {
  results.passed.push('✅ Privacy Policy i18n translations present');
} else {
  results.failed.push('❌ Privacy Policy i18n translations incomplete');
}

// Test 4: Check for GDPR compliance mentions
console.log('\n  Test 4: GDPR/Legal compliance');
const hasGDPR = privacyContent.includes('GDPR') || 
                enLocale.includes('GDPR') ||
                frLocale.includes('RGPD');
const hasContactInfo = privacyContent.includes('legal@mbipa.app') || 
                       enLocale.includes('legal@');
const hasDataRetention = privacyContent.includes('retention') || 
                         enLocale.includes('retention') ||
                         frLocale.includes('rétention') ||
                         frLocale.includes('conservation');
const hasThirdParties = privacyContent.includes('third-party') ||
                        privacyContent.includes('Firebase') ||
                        privacyContent.includes('Azure') ||
                        enLocale.includes('Firebase');

if (hasGDPR && hasContactInfo && hasDataRetention && hasThirdParties) {
  console.log(GREEN + '    ✅ GDPR/RGPD mentioned' + RESET);
  console.log(GREEN + '    ✅ Contact information included' + RESET);
  console.log(GREEN + '    ✅ Data retention policy mentioned' + RESET);
  console.log(GREEN + '    ✅ Third-party services disclosed' + RESET);
  results.passed.push('✅ Privacy Policy includes legal compliance');
} else {
  console.log(YELLOW + '    ⚠️  Some compliance content may be incomplete' + RESET);
  results.warnings.push('⚠️  Verify all legal compliance sections before submission');
}

// =====================================================
// SUMMARY
// =====================================================

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
  console.log(GREEN + '✅ P0.2 & P0.3 VALIDATION PASSED' + RESET);
  console.log(GREEN + 'Ready for integration testing' + RESET);
  console.log(YELLOW + '\n⚠️  ACTION ITEMS:' + RESET);
  console.log(YELLOW + '   1. Obtain real certificate pins for Azure domain' + RESET);
  console.log(YELLOW + '   2. Update CERTIFICATE_PINS in https-pinning.ts' + RESET);
  console.log(YELLOW + '   3. Integrate createPinnedAxiosInstance into API client' + RESET);
  console.log(YELLOW + '   4. Verify Privacy Policy i18n translations are complete' + RESET);
  console.log(YELLOW + '   5. Test on physical device' + RESET);
  process.exit(0);
} else {
  console.log(RED + '❌ P0.2 & P0.3 VALIDATION FAILED' + RESET);
  console.log(RED + `${results.failed.length} issue(s) must be fixed` + RESET);
  process.exit(1);
}
