# 🔐 BACKEND SECURITY HEADERS IMPLEMENTATION
## Priority 2 - Add Security Headers

**For:** Backend Team (Node.js/Express.js on Azure App Service)  
**Time:** 2 hours  
**Status:** Ready to implement  

---

## 📋 What You Need to Do

Add security headers middleware to your Express.js backend. These headers prevent:
- MITM attacks (HSTS)
- MIME sniffing (X-Content-Type-Options)
- Clickjacking (X-Frame-Options)
- XSS attacks (X-XSS-Protection, CSP)

---

## 🔧 Implementation (Option A: Using Helmet - RECOMMENDED)

### Step 1: Install Helmet

```bash
npm install helmet
```

### Step 2: Add to app.ts / app.js (right after express initialization)

```typescript
import express from 'express';
import helmet from 'helmet';

const app = express();

// Add helmet BEFORE all other middleware
app.use(helmet());

// Then add your other middleware
app.use(cors(corsOptions));
app.use(express.json());
// ... rest of your app
```

**That's it!** Helmet handles all security headers automatically.

---

## 🔧 Implementation (Option B: Manual Headers - if no Helmet)

### Create file: `middleware/security-headers.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

export function addSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // Force HTTPS for all future visits (1 year in seconds)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Prevent browsers from MIME-sniffing responses
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Legacy XSS protection (older browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy
  // Restrict where content can be loaded from
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",  // Only allow same-origin by default
      "script-src 'self'",   // Only allow same-origin scripts
      "style-src 'self' 'unsafe-inline'",  // Styles (unsafe-inline needed for some frameworks)
      "img-src 'self' data: https:",  // Images from self, data URLs, and HTTPS
      "font-src 'self'",  // Fonts from same-origin
      "connect-src 'self' https://firebase.googleapis.com https://*.azure-api.net",  // API calls
      "media-src 'self'",  // Audio/video from same-origin
      "object-src 'none'"  // Disable plugins
    ].join('; ')
  );
  
  // Referrer Policy - control how much referrer info is sent
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (formerly Feature-Policy)
  // Control which browser features can be used
  res.setHeader(
    'Permissions-Policy',
    'microphone=(self), camera=(self), geolocation=(self), payment=()'
  );
  
  next();
}
```

### Add to your app.ts / app.js

```typescript
import { addSecurityHeaders } from './middleware/security-headers';

const app = express();

// Add security headers middleware FIRST (before other middleware)
app.use(addSecurityHeaders);

// Then add your other middleware
app.use(cors(corsOptions));
app.use(express.json());
// ... rest of your code
```

---

## ✅ Verification - Test That Headers Are Present

### Method 1: Using curl (from command line)

```bash
curl -I https://mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net

# Should show these headers:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Content-Security-Policy: ...
```

### Method 2: Using Online Tool

Visit: https://securityheaders.com/?q=mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net

Expected grade: **A+**

### Method 3: In Node.js / JavaScript

```typescript
import https from 'https';

const options = {
  hostname: 'mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net',
  port: 443,
  path: '/health',
  method: 'GET'
};

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  
  // Check for security headers
  const hasHSTS = res.headers['strict-transport-security'];
  const hasXContentType = res.headers['x-content-type-options'];
  const hasXFrame = res.headers['x-frame-options'];
  
  console.log('✓ HSTS:', hasHSTS ? 'PRESENT' : 'MISSING');
  console.log('✓ X-Content-Type-Options:', hasXContentType ? 'PRESENT' : 'MISSING');
  console.log('✓ X-Frame-Options:', hasXFrame ? 'PRESENT' : 'MISSING');
});

req.on('error', console.error);
req.end();
```

---

## 🎯 What Each Header Does

| Header | Purpose | Value |
|--------|---------|-------|
| `Strict-Transport-Security` | Force HTTPS | `max-age=31536000; includeSubDomains; preload` |
| `X-Content-Type-Options` | Prevent MIME sniffing | `nosniff` |
| `X-Frame-Options` | Prevent clickjacking | `DENY` |
| `X-XSS-Protection` | Legacy XSS protection | `1; mode=block` |
| `Content-Security-Policy` | Control resource loading | `default-src 'self'` + rules |
| `Referrer-Policy` | Control referrer info | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Control browser features | `microphone=(self), camera=(self)` |

---

## 🔍 CSP Explanation (Content-Security-Policy)

This is the most important header. It restricts where content can load from:

```
default-src 'self'              → Everything from same-origin only
script-src 'self'              → JavaScript from same-origin only
style-src 'self' 'unsafe-inline' → CSS (needs unsafe-inline for some frameworks)
img-src 'self' data: https:     → Images from self, data URLs, HTTPS
connect-src 'self' https://...  → API calls to same-origin + Azure/Firebase
```

**Example CSP violations (will be blocked):**

```html
<!-- ❌ BLOCKED: External script -->
<script src="https://evil.com/malware.js"></script>

<!-- ❌ BLOCKED: Inline script -->
<script>alert('XSS')</script>

<!-- ✅ ALLOWED: Load image from HTTPS -->
<img src="https://cdn.example.com/image.png">
```

---

## 🚨 Azure App Service Deployment

### If Using IIS (Windows Server):

Add to `web.config`:

```xml
<system.webServer>
  <httpProtocol>
    <customHeaders>
      <add name="Strict-Transport-Security" value="max-age=31536000; includeSubDomains; preload" />
      <add name="X-Content-Type-Options" value="nosniff" />
      <add name="X-Frame-Options" value="DENY" />
      <add name="X-XSS-Protection" value="1; mode=block" />
      <add name="Content-Security-Policy" value="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://firebase.googleapis.com https://*.azure-api.net" />
      <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
      <add name="Permissions-Policy" value="microphone=(self), camera=(self), geolocation=(self)" />
    </customHeaders>
  </httpProtocol>
</system.webServer>
```

### If Using Node.js on App Service:

Just add the middleware as shown above. Azure will automatically configure HTTPS.

---

## 📋 Deployment Checklist

- [ ] Install helmet: `npm install helmet`
- [ ] OR create security-headers middleware
- [ ] Add middleware to app.ts (before other middleware)
- [ ] Test with curl: `curl -I https://your-api.com`
- [ ] Verify all 7 headers present
- [ ] Check securityheaders.com → A+ grade
- [ ] Deploy to production
- [ ] Monitor for CSP violations in logs

---

## 🆘 Troubleshooting

### Issue: CSP is blocking legitimate resources

**Solution:** Add to CSP rules

```typescript
// If your app loads fonts from Google
res.setHeader(
  'Content-Security-Policy',
  "default-src 'self'; font-src 'self' https://fonts.googleapis.com"
);
```

### Issue: Headers appear twice

**Solution:** Only add middleware once, not multiple places

```typescript
// ❌ WRONG
app.use(addSecurityHeaders);
app.use(helmet());  // Don't use both!

// ✅ RIGHT
app.use(helmet());  // Use one or the other
```

### Issue: Azure App Service not using my headers

**Solution:** Restart the app service

```bash
az webapp restart --resource-group myResourceGroup --name myAppService
```

---

## 📊 Before/After

| Check | Before | After |
|-------|--------|-------|
| HSTS Header | ❌ Missing | ✅ Present |
| X-Content-Type | ❌ Missing | ✅ Present |
| X-Frame-Options | ❌ Missing | ✅ Present |
| CSP | ❌ Missing | ✅ Present |
| Security Grade | 🟡 C | 🟢 A+ |
| Vulnerability to MITM | ⚠️ High | ✅ Low |
| Vulnerability to XSS | ⚠️ High | ✅ Low |
| Vulnerability to Clickjacking | ⚠️ High | ✅ Low |

---

## 💾 Ready to Deploy?

1. Choose implementation (Helmet recommended)
2. Add to your app.ts
3. Test with curl
4. Deploy to production
5. Verify with securityheaders.com

**Time:** 15 minutes  
**Difficulty:** Easy  
**Impact:** Critical security improvement

---

**Questions?** Check `BACKEND_CORS_IMPLEMENTATION.md` for CORS configuration
