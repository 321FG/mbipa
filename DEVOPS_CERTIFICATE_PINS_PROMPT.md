# 🔐 DevOps/Infrastructure Implementation Guide - P0.2 Certificate Pinning

**For:** DevOps / Infrastructure / Security Team  
**Date:** May 25, 2026  
**Priority:** 🔴 **CRITICAL** (blocks app store submission)  
**Timeline:** 1-2 hours  
**Effort:** Low (straightforward openssl commands)

---

## 📋 Executive Summary

Your frontend team has implemented **SSL Certificate Pinning** to prevent Man-In-The-Middle (MITM) attacks. Your job is to provide the **certificate pins** for your Azure backend so the frontend can validate HTTPS connections.

**What you need to do:** Extract and share certificate pins using openssl.

---

## 🎯 What Is Certificate Pinning?

Certificate pinning is a security measure where the app validates that the backend's SSL certificate matches a known, trusted certificate. This prevents attackers from intercepting traffic with fake certificates.

**Why it matters:**
```
Without pinning:
  Phone ← HTTPS → Attacker's fake cert → Azure Backend
  ❌ Attacker can intercept JWTs, audio, payment info
  
With pinning:
  Phone checks: "Is this cert in my trusted list?"
  ✅ If attacker presents fake cert, connection is rejected
  ✅ User data stays encrypted end-to-end
```

---

## 🔍 What You Need to Extract

The frontend needs **3 certificate pins**:

1. **Primary Pin** — Your app's SSL certificate
2. **Backup Pin** — The CA (Certificate Authority) certificate  
3. **Fallback Pin** — Extra pin for safety during certificate rotation

---

## ⚙️ Implementation Steps

### Step 1: Identify Your Azure Backend FQDN

Your backend URL should look like:
```
mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net
```

This is your **fully qualified domain name (FQDN)**.

### Step 2: Extract Certificate Pins

Run this command to extract the **primary pin** (your app certificate):

```bash
openssl s_client -connect mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net:443 < /dev/null | \
  openssl x509 -noout -pubkey | \
  openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | base64
```

**Expected output:**
```
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
(Just one line of base64 text)
```

**Copy this value — this is your PRIMARY PIN.**

---

### Step 3: Extract Backup Pin (CA Certificate)

The CA certificate is usually intermediate or root. Run:

```bash
openssl s_client -connect mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net:443 -showcerts < /dev/null | \
  grep "^-----BEGIN CERTIFICATE-----" -A 100 | \
  head -n 101 | \
  openssl x509 -noout -pubkey | \
  openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | base64
```

If that gives you the same pin as primary, try the next certificate in the chain:

```bash
openssl s_client -connect mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net:443 -showcerts < /dev/null | \
  awk '/^-----BEGIN CERTIFICATE-----/,/^-----END CERTIFICATE-----/' | \
  tail -n +102 | \
  openssl x509 -noout -pubkey 2>/dev/null | \
  openssl pkey -pubin -outform DER 2>/dev/null | \
  openssl dgst -sha256 -binary 2>/dev/null | base64
```

**Expected output:**
```
BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=
(Different from primary pin)
```

**Copy this value — this is your BACKUP PIN.**

---

### Step 4: Generate Fallback Pin (Optional but Recommended)

For maximum safety during certificate rotation, have a fallback pin. This could be:
- Another intermediate CA pin
- Or a new pin you'll generate in the future

For now, you can use the same as backup:
```
CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=
```

---

## 📝 Certificate Pin Format

Pins should be formatted as:

```
pin_sha256/{base64_encoded_pin}
```

**Examples:**
```
pin_sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
pin_sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=
pin_sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=
```

---

## 🗂️ Where Pins Go

### Share Pins with Frontend Lead

Once extracted, share pins in this format:

```
Backend FQDN: mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net

Primary Pin (Your App Certificate):
pin_sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=

Backup Pin (CA Certificate):
pin_sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=

Fallback Pin (Extra safety):
pin_sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=

Extraction Date: 2026-05-25
Certificate Expiration: YYYY-MM-DD
Rotation Policy: [Your policy here]
```

### Frontend Integration

Frontend team will update this file:
```
src/utils/https-pinning.ts
```

With the pins:
```typescript
const CERTIFICATE_PINS = {
  'mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net': [
    'pin_sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',  // Primary
    'pin_sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',  // Backup
    'pin_sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=',   // Fallback
  ],
};
```

---

## 🔄 Certificate Rotation Process

Certificate pinning requires a rotation strategy because certificates expire. Here's the recommended process:

### Before Certificate Expiration (60 days ahead)

```
1. Get new certificate from Azure
2. Extract new pin
3. Add new pin to CERTIFICATE_PINS (as fallback)
4. Deploy updated code with new pin
5. App now trusts both old AND new certificate
```

### After Successful Rollout (1 week later)

```
1. Remove old pin from CERTIFICATE_PINS
2. Keep only the new pin (or have another backup)
3. Deploy updated code
```

### If Certificate Rotates Unexpectedly

```
1. Extract new pin immediately
2. Add to CERTIFICATE_PINS as fallback
3. Deploy hotfix to app stores
4. Monitor for app update adoption
```

---

## ✅ Implementation Checklist

- [ ] Identify your Azure backend FQDN
- [ ] Extract primary certificate pin (openssl command 1)
- [ ] Extract backup certificate pin (openssl command 2)
- [ ] Generate or identify fallback pin
- [ ] Format all pins as `pin_sha256/{base64}`
- [ ] Document certificate expiration dates
- [ ] Share pins with frontend lead
- [ ] Document rotation policy in team wiki
- [ ] Set calendar reminder for certificate rotation (60 days before expiration)
- [ ] Test certificate pin validation in staging

---

## 🧪 Verification

### Verify Pin Extraction Was Successful

Check that:
1. All pins are different (or very few duplicates is OK)
2. Each pin is ~88 characters of base64
3. Pins start with valid base64 characters (A-Z, a-z, 0-9, +, /, =)

**Bad pin (wrong):**
```
pin_sha256/xxxxxx  ← Too short
pin_sha256/!!!@@@  ← Invalid base64
```

**Good pin (correct):**
```
pin_sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=  ← ~88 chars
```

### Verify Pins Work

After frontend deploys with your pins:

1. Open app in dev environment
2. Go to Chat and click audio button
3. Check browser console for "Certificate validation passed"
4. If no errors, pins are working ✅
5. If "Certificate validation failed", pins are wrong ❌

---

## 🆘 Troubleshooting

### "openssl command not found"
```bash
# Install openssl
# Windows (via Git Bash or WSL):
apt-get install openssl

# macOS (via Homebrew):
brew install openssl

# Linux (Ubuntu/Debian):
sudo apt-get install openssl
```

### "Certificate chain issue"
```bash
# View full certificate chain to understand structure:
openssl s_client -connect your-domain.com:443 -showcerts < /dev/null
```

### "All pins are the same"
This can happen if you extract the same certificate twice. Try:
1. Get the leaf certificate (your app cert) — this is primary
2. Get the intermediate CA (next in chain)
3. Get the root CA (top of chain)

---

## 📊 Certificate Chain Anatomy

```
Root CA Certificate (oldest, least likely to rotate)
    ↓
Intermediate CA Certificate (middle layer)
    ↓
Leaf Certificate (your app's certificate, rotates annually)
```

For pinning, you typically need:
- **Primary:** Leaf (your app cert)
- **Backup:** Intermediate CA (won't change as often)
- **Fallback:** Root CA or new intermediate (for rotation)

---

## 📅 Timeline & Scheduling

```
Today (May 25):
  ✅ Extract pins (10 minutes)
  ✅ Share with frontend (5 minutes)

Frontend Integration (May 26):
  ✅ Frontend team updates code with pins
  ✅ Staging environment testing

Production (May 27+):
  ✅ Deploy to production
  ✅ Monitor certificate validation logs

Certificate Rotation Reminder:
  📅 Set calendar alert 60 days before expiration
  📅 Repeat process in that month
```

---

## 🔐 Security Considerations

### Do's
✅ Store pins securely (no hardcoding in logs)
✅ Rotate pins before certificates expire
✅ Keep backup pins for smooth rotation
✅ Monitor certificate expiration dates
✅ Test pins in staging before production

### Don'ts
❌ Don't share raw certificate files
❌ Don't expose private keys
❌ Don't log pins to console
❌ Don't forget about pin rotation
❌ Don't use same pin for primary and backup

---

## 📞 Communication Plan

### Share Results With

**Frontend Lead:**
```
Subject: Certificate Pins for SSL Pinning Implementation
Attachment: Certificate pins (formatted as above)
Timeline: Available immediately
```

**Security Team:**
```
Certificate pinning implemented for HTTPS validation
All pins extracted via secure openssl process
Rotation policy established
```

**Team Wiki:**
```
Document in team documentation:
- FQDN of backend
- Pin extraction process
- Certificate expiration date
- Rotation schedule
```

---

## 📈 Success Criteria

✅ Pins extracted successfully  
✅ Pins shared with frontend team  
✅ Pins validated in staging environment  
✅ App connects to backend without certificate errors  
✅ Certificate validation logs show success  
✅ Rotation policy documented  
✅ Calendar reminder set for next rotation  

---

## 🎯 Expected Output

When frontend team tests with your pins, they should see:

**Console (debug mode):**
```
[Security] Certificate validation: ✅ PASSED
[Security] Domain: mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net
[Security] Pin: pin_sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
[Security] Validation timestamp: 2026-05-25T14:32:15Z
```

**No certificate errors:**
```
❌ NOT EXPECTED:
[Error] Certificate validation failed
[Error] CERTIFICATE_VERIFY_FAILED
[Error] SSL: SSLV3_ALERT_BAD_CERTIFICATE
```

---

## 📚 Reference Material

- [RFC 7469 - Certificate Pinning](https://tools.ietf.org/html/rfc7469)
- [OWASP - Certificate Pinning](https://cheatsheetseries.owasp.org/cheatsheets/Pinning_Cheat_Sheet.html)
- [Azure Certificate Management](https://docs.microsoft.com/en-us/azure/app-service/manage-custom-dns-buy-domain)

---

## ✨ Next Steps

1. **Now:** Extract certificate pins (10 minutes)
2. **Today:** Share pins with frontend team (5 minutes)
3. **Tomorrow:** Frontend deploys with pins and tests in staging
4. **Day 3:** App Store submission ready with certificate pinning

---

## 🚀 You're Almost Done!

This is the final piece of P0.2 (SSL Certificate Pinning).

**Status:**
- ✅ Frontend code: Complete
- ⏳ Certificate pins: Your task (this document)
- ⏳ Integration: Frontend team (1 hour after you share pins)

**Blocking:** Nothing — you can start now!

---

**Questions?** Reference:
- `SECURITY_HARDENING_P0_COMPREHENSIVE_REPORT.md` (project overview)
- `IMPLEMENTATION_P02_P03.md` (frontend integration guide)
- `P0_SECURITY_QUICK_REFERENCE.md` (team checklist)

**Ready? Let's secure this app! 🔒**
