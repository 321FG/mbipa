# 📦 NPM AUDIT & DEPENDENCY SECURITY
## Priority 2 - Run npm audit

**For:** Backend Team & DevOps  
**Time:** 1 hour  
**Impact:** Find and fix vulnerable dependencies

---

## 📋 What is npm audit?

`npm audit` scans your dependencies for known security vulnerabilities (CVEs). It checks against the npm advisory database.

---

## 🚀 Quick Start

```bash
# See vulnerabilities
npm audit

# Auto-fix what can be fixed
npm audit fix

# See detailed report in JSON
npm audit --json > audit-report.json

# See what would be fixed
npm audit fix --dry-run
```

---

## 🔍 Understanding Output

```
found 5 vulnerabilities (2 moderate, 3 high)
│ 2 vulnerabilities require manual review
└─ and some require updating

┌───────────────┬──────────────────────────────────────┐
│ High          │ Prototype Pollution                  │
├───────────────┼──────────────────────────────────────┤
│ Package       │ lodash                               │
├───────────────┼──────────────────────────────────────┤
│ Patched in    │ >=4.17.21                            │
├───────────────┼──────────────────────────────────────┤
│ Dependency of │ express [dev]                        │
└───────────────┴──────────────────────────────────────┘
```

**What this means:**
- **lodash** has a vulnerability
- **Fix available:** Update to 4.17.21+
- **Cause:** lodash is a dependency of express

---

## ✅ Step-by-Step Guide

### Step 1: Run audit

```bash
cd /path/to/backend
npm audit
```

### Step 2: Review results

```
found 3 vulnerabilities (1 moderate, 2 high) in 150 packages
├─ 2 vulnerabilities require manual review. See the above output for details.
└─ To address issues that do not require manual review, run:
  npm audit fix
```

**Severity Levels:**
- 🟢 **Low:** Can usually ignore
- 🟡 **Moderate:** Fix in next sprint
- 🔴 **High:** Fix immediately
- 🟣 **Critical:** Fix before production

### Step 3: Try auto-fix

```bash
npm audit fix
```

This updates package.json and package-lock.json.

### Step 4: Test that nothing broke

```bash
npm test
npm run build
npm start  # Try running your app
```

### Step 5: If auto-fix breaks something

```bash
# Revert
git checkout package.json package-lock.json

# Update only one package
npm update vulnerable-package@latest
npm test
```

### Step 6: Commit

```bash
git add package.json package-lock.json
git commit -m "security: fix npm vulnerabilities"
git push
```

---

## 🎯 Common Vulnerabilities & Fixes

### Example 1: Lodash Prototype Pollution

```
High | Prototype Pollution in lodash | lodash <4.17.21

npm audit fix  → Automatically updates to 4.17.21+
```

### Example 2: Express Dependency Issue

```
High | Denial of service in express | qs <6.7.0

npm update qs@latest
npm test
```

### Example 3: Axios SSRF

```
Critical | SSRF vulnerability in axios | axios <0.21.2

npm update axios@latest
npm test
```

---

## 📊 Full Audit Report (JSON)

```bash
npm audit --json > audit-report.json
```

Returns:

```json
{
  "vulnerabilities": {
    "lodash": {
      "name": "lodash",
      "severity": "high",
      "vulnerable_versions": "<4.17.21",
      "firstPatched": "4.17.21",
      "recommendation": "Upgrade to 4.17.21",
      "cwe": ["CWE-1321"],
      "cve": ["CVE-2021-23337"]
    }
  },
  "metadata": {
    "vulnerabilities": {
      "info": 0,
      "low": 0,
      "moderate": 1,
      "high": 2,
      "critical": 0
    },
    "dependencies": 150,
    "devDependencies": 23,
    "optionalDependencies": 0,
    "totalDependencies": 173
  }
}
```

---

## 🔧 Handling Manual Review Issues

Some vulnerabilities need manual review:

```
2 vulnerabilities require manual review
```

### Example: Custom vulnerability

```bash
npm audit --detailed

# Shows:
# Package: custom-auth-lib
# Severity: HIGH
# Fix: This requires code changes
```

**How to fix:**

1. Visit the advisory: `npm audit --detailed` shows the URL
2. Read what changed
3. Update your code
4. Test thoroughly

---

## 📋 Backend Team Checklist

### Before Each Deploy

- [ ] Run `npm audit`
- [ ] Fix all **High** and **Critical** vulnerabilities
- [ ] Run `npm audit fix`
- [ ] Run tests: `npm test`
- [ ] Run build: `npm run build`
- [ ] Test locally: `npm start`
- [ ] Commit: `git commit -m "security: fix npm vulnerabilities"`
- [ ] Create PR with changes
- [ ] Get code review
- [ ] Merge and deploy

### Weekly Maintenance

- [ ] Run `npm outdated` to see available updates
- [ ] Run `npm audit` to check for new advisories
- [ ] Update non-critical packages: `npm update`

### Monthly Maintenance

- [ ] Full security review
- [ ] Check GitHub for dependency alerts
- [ ] Plan major version upgrades (breaking changes)

---

## 🆘 Troubleshooting

### Issue: npm audit fix doesn't resolve all issues

**Solution:** Some require major version updates

```bash
# See what needs updating
npm outdated

# Update specific package
npm install lodash@latest  # Instead of @^4.17.21

# Or use force flag (risky!)
npm audit fix --force
```

### Issue: npm audit fix breaks app

**Solution:** Revert and update manually

```bash
# Revert
git checkout package.json package-lock.json
npm install

# Update one package at a time
npm update lodash
npm test
npm update axios
npm test
```

### Issue: Audit says package is not vulnerable but it is

**Solution:** npm database might be out of date

```bash
# Update npm
npm install -g npm@latest

# Clear cache
npm cache clean --force

# Try again
npm audit
```

---

## 🚀 Continuous Security

### In CI/CD Pipeline

Add to your GitHub Actions / Azure Pipelines:

```yaml
# .github/workflows/security.yml
name: Security Checks

on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm audit --audit-level=moderate
        # Fails if there are moderate or higher vulnerabilities
```

This prevents merging PRs with vulnerabilities.

---

## 📊 Audit Output Example

```bash
$ npm audit

                                 === npm audit security report ===

Found 4 vulnerabilities in 173 dependencies

┌──────────────────────────────────────────────────────────────────────────────┐
│ High │ Prototype Pollution                                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│ Package      │ lodash                                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│ Patched in   │ >=4.17.21                                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ Dependency of│ express [dev]                                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ More info    │ https://www.npmjs.com/advisories/1674                         │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ High │ Denial of Service                                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│ Package      │ qs                                                             │
├──────────────────────────────────────────────────────────────────────────────┤
│ Patched in   │ >=6.7.0                                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Dependency of│ express > body-parser > qs                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ More info    │ https://www.npmjs.com/advisories/1213                         │
└──────────────────────────────────────────────────────────────────────────────┘

run `npm audit fix` to fix these vulnerabilities, or `npm audit` for more detail
```

---

## 💾 Quick Commands

```bash
# Check for vulnerabilities
npm audit

# Auto-fix vulnerabilities
npm audit fix

# See what would be fixed (dry-run)
npm audit fix --dry-run

# Force major version updates (risky!)
npm audit fix --force

# Get JSON report
npm audit --json > report.json

# Only fail on high/critical
npm audit --audit-level=high

# Update all packages (including major versions)
npm outdated          # See what's outdated
npm update            # Updates to compatible versions
npm install package@latest  # Update to latest (may break)
```

---

## 📞 Questions?

Check the npm documentation: https://docs.npmjs.com/auditing-package-dependencies-for-security-vulnerabilities

---

**Next Steps:**
1. Run `npm audit` in your backend
2. Run `npm audit fix`
3. Test your app
4. Commit changes
5. Read `BACKEND_PENETRATION_TESTS_GUIDE.md` for testing

---

**Status:** Ready to execute  
**Time:** 30 minutes  
**Difficulty:** Very easy
