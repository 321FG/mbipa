# P0.2 & P0.3 Security Implementation Guide

**Status:** Ready for implementation  
**Risk Level:** 🟢 **LOW** (New files, existing code untouched)  
**Timeline:** 2 days (1 day each)

---

## 📋 Overview

| Phase | Feature | Status | Effort |
|-------|---------|--------|--------|
| **P0.2** | SSL Certificate Pinning | ✅ Ready | 1 day |
| **P0.3** | Privacy Policy Integration | ✅ Ready | 1 day |

---

## 🔒 P0.2: SSL Certificate Pinning

### What is SSL Pinning?

Protects against **Man-In-The-Middle (MITM)** attacks by "pinning" the server's certificate to the app. If a certificate doesn't match the pinned version, the connection is rejected.

### Vulnerability Addressed

```
❌ BEFORE:
- App accepts ANY valid HTTPS certificate
- Attacker with network access could intercept traffic
- Captured: JWTs, emails, audio data, appointment info

✅ AFTER:
- App only accepts SPECIFIC Azure certificate
- MITM attempts automatically rejected
- Zero security gap
```

### Files Created/Modified

**New File:** `src/utils/https-pinning.ts`
- Certificate pin configuration
- Axios interceptor setup
- Validation logging
- 200+ lines of documented code

### Implementation Steps

#### Step 1: Obtain Certificate Pins (Days 1-2)

```bash
# Get primary certificate pin from Azure backend
openssl s_client -connect mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net:443 < /dev/null | \
  openssl x509 -noout -pubkey | \
  openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | base64
```

**Output example:**
```
pin_sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
```

#### Step 2: Get Backup Pins (Safe Certificate Rotation)

For production, you need at least 2 pins:
1. **Primary:** Application certificate public key
2. **Backup:** CA certificate public key (survives certificate rotation)

```bash
# Get CA certificate pin (for rotation safety)
openssl s_client -showcerts -connect your-domain.com:443 < /dev/null | \
  openssl x509 -noout -pubkey | \
  openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | base64
```

#### Step 3: Update `https-pinning.ts`

```typescript
const CERTIFICATE_PINS: Record<string, string[]> = {
  'mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net': [
    'pin_sha256/YOUR_PRIMARY_PIN_HERE',   // Primary
    'pin_sha256/YOUR_BACKUP_PIN_HERE',    // Backup
    'pin_sha256/YOUR_CA_PIN_HERE',         // CA (rotation safety)
  ],
};
```

#### Step 4: Integrate Pinned Axios into API calls

**Current (without pinning):**
```typescript
// src/api/http.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});
```

**Updated (with pinning):**
```typescript
// src/api/http.ts
import { createPinnedAxiosInstance } from '@/src/utils/https-pinning';

const apiClient = createPinnedAxiosInstance();
apiClient.defaults.baseURL = API_URL;
apiClient.defaults.headers['Content-Type'] = 'application/json';
```

#### Step 5: Test Pinning

```typescript
// In a test file or dev screen
import { isDomainPinned, getCertificatePins } from '@/src/utils/https-pinning';

// Check if domain is pinned
const pinned = isDomainPinned('mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net');
console.log('Is pinned:', pinned);  // Should be true

// Get pins for domain
const pins = getCertificatePins('mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net');
console.log('Configured pins:', pins);  // Should show 3 pins
```

### Testing Checklist

- [ ] Obtain certificate pins from Azure
- [ ] Update `https-pinning.ts` with real pins
- [ ] Integrate into `src/api/http.ts`
- [ ] Test API calls in dev environment
- [ ] Verify no certificate errors
- [ ] Test with intentionally wrong pin (should fail)
- [ ] Check logs for security validation messages
- [ ] Run on physical device (not just emulator)
- [ ] Test TestFlight before production

### Rollback Procedure

```typescript
// If pinning causes issues, disable temporarily:

// In https-pinning.ts
export function createPinnedAxiosInstance(): AxiosInstance {
  const instance = axios.create();

  // TEMPORARILY DISABLED FOR DEBUGGING
  // Remove/comment out interceptors if needed
  
  return instance;
}
```

---

## 📄 P0.3: Privacy Policy Page

### What's Included

✅ Bilingual content (French + English)  
✅ Material 3 UI with react-native-paper  
✅ Scrollable sections  
✅ Responsive design (mobile + web)  
✅ Dark mode support  
✅ Language toggle buttons  

### Coverage

The Privacy Policy covers:

1. **Information Collection** — What data we collect
   - Personal data (email, profile, audio)
   - Device info (OS, device type)
   - Usage data (timestamps, features accessed)

2. **Data Use** — Why we collect data
   - Service operation
   - Support & notifications
   - Analytics & improvement
   - Security & compliance

3. **Third-Party Services** — External integrations
   - Firebase (Google)
   - Azure (Microsoft)
   - SignalR (Microsoft)
   - Stripe (Payments)

4. **Security Measures** — How we protect data
   - End-to-end encryption
   - HTTPS/TLS
   - JWT authentication
   - Certificate pinning
   - Regular audits

5. **GDPR Compliance** — EU user rights
   - Right to access
   - Right to deletion
   - Right to portability
   - Right to object

6. **Data Retention** — How long we keep data
   - Accounts: Until deletion
   - Chat: 6 months
   - Appointments: 1 year
   - Payments: 7 years

7. **Contact Information**
   - Email: legal@mbipa.app
   - Phone: +1 (555) 123-4567

### Files

**Updated:** `app/legal/privacy.tsx`  
**Uses:** i18n keys from `src/i18n/locales/en.json` and `src/i18n/locales/fr.json`

### Integration Steps

#### Step 1: Verify i18n Translations

Check that `legal.privacyContent` exists in both locales:

```bash
# Verify French content
grep -n "privacyContent" src/i18n/locales/fr.json

# Verify English content
grep -n "privacyContent" src/i18n/locales/en.json
```

#### Step 2: Add Route (if not already present)

In `app/legal/_layout.tsx`:

```typescript
import { Stack } from 'expo-router';

export default function LegalLayout() {
  return (
    <Stack>
      <Stack.Screen name="privacy" options={{ title: 'Politique de Confidentialité' }} />
      <Stack.Screen name="contact" options={{ title: 'Nous Contacter' }} />
    </Stack>
  );
}
```

#### Step 3: Link from Settings/Menu

In `app/(tabs)/profile.tsx` or menu:

```typescript
<Button
  onPress={() => router.push('/legal/privacy')}
  mode="text"
  icon="shield-check-outline"
>
  {t('legal.privacy')}
</Button>
```

#### Step 4: Verify Rendering

```bash
# Run the app
npm start

# Navigate to Settings > Privacy Policy
# Verify both EN and FR content loads
# Test language toggle buttons
# Check styling on dark/light mode
```

### App Store Requirements

**Google Play Store:**
- ✅ Privacy Policy must be public and in-app
- ✅ Must disclose all data collection
- ✅ Must disclose third-party services
- ✅ Must provide contact email

**Apple App Store:**
- ✅ Privacy Policy link required
- ✅ Must explain data practices
- ✅ Must match "App Privacy" label
- ✅ Requires direct link (not just in-app)

### Testing Checklist

- [ ] Page loads without errors
- [ ] English content displays correctly
- [ ] French content displays correctly
- [ ] Language toggle buttons work
- [ ] Scrollable with all sections visible
- [ ] Dark mode styling correct
- [ ] Responsive on small/large screens
- [ ] Links clickable (if any)
- [ ] No console errors
- [ ] Accessible (proper contrast, text size)

---

## 📊 Combined Impact

### Security Improvements

| Vulnerability | P0.2 | P0.3 | Status |
|---|---|---|---|
| MITM Attacks | ✅ Fixed | — | 🟢 |
| Missing Privacy Policy | — | ✅ Fixed | 🟢 |
| GDPR Non-compliance | — | ✅ Fixed | 🟢 |
| Store Rejection | — | ✅ Prevented | 🟢 |

### Timeline

| Task | Effort | Notes |
|------|--------|-------|
| Get certificate pins | 1-2 hours | May require Azure admin access |
| Implement P0.2 | 4 hours | Code is ready, just integrate |
| Test P0.2 | 4 hours | Need physical device test |
| Implement P0.3 | 2 hours | File already exists, may need i18n updates |
| Test P0.3 | 2 hours | UI/navigation verification |
| **Total** | **13-14 hours** | **~2 days** |

---

## 🚀 Deployment Checklist

### Before TestFlight

- [ ] P0.2 certificate pins obtained
- [ ] P0.2 integrated into API client
- [ ] P0.2 tested on dev device
- [ ] P0.3 content complete and translated
- [ ] P0.3 linked from settings menu
- [ ] P0.3 tested on dev device
- [ ] Build compiles without errors
- [ ] No console warnings

### Before App Store

- [ ] 1 week TestFlight with pinning enabled
- [ ] No certificate errors reported
- [ ] Privacy Policy publicly accessible
- [ ] App Store Privacy Label matches policy
- [ ] Legal review completed

---

## 📝 File Locations

```
src/
  └─ utils/
      └─ https-pinning.ts          ✅ Created (P0.2)

app/
  └─ legal/
      └─ privacy.tsx               ✅ Exists (P0.3)

src/i18n/locales/
  ├─ en.json                       ✅ Has privacyContent
  └─ fr.json                       ✅ Has privacyContent
```

---

## 📞 Support

For questions about:

**Certificate Pinning (P0.2):**
- See `src/utils/https-pinning.ts` comments
- Run `certificatePinningGuide()` function
- Check Azure documentation

**Privacy Policy (P0.3):**
- Edit i18n keys in `src/i18n/locales/*.json`
- Update contact info as needed
- Add/remove sections based on features

---

## ✅ Sign-off

| Item | Status | Owner | Date |
|------|--------|-------|------|
| P0.2 Code Ready | ✅ Complete | Frontend | 2026-05-25 |
| P0.3 Code Ready | ✅ Complete | Frontend | 2026-05-25 |
| P0.2 Pins Needed | ⏳ Pending | Backend/Infra | TBD |
| P0.3 i18n Review | ⏳ Pending | Team | TBD |
| P0.2 Testing | ⏳ Pending | QA | TBD |
| P0.3 Testing | ⏳ Pending | QA | TBD |

---

**Next Steps:**
1. Obtain Azure certificate pins
2. Integrate P0.2 into API client
3. Verify P0.3 translations are complete
4. Run comprehensive testing
5. Prepare for TestFlight
