# Branch Strategy

This repository uses a **two-branch strategy** to maintain both OAuth and non-OAuth versions of the Meraki MCP Server.

## Branches

### `main` - OAuth 2.1 Authentication

**Production-ready OAuth version with enterprise-grade security.**

**Authentication:** OAuth 2.1 with PKCE via Cloudflare Access for SaaS
**Use case:** Enterprise deployments requiring SSO integration (Okta, Google, Azure AD, etc.)

**Key features:**
- JWT Bearer token authentication (RFC 6750)
- JWKS-based signature verification with caching
- OAuth 2.1 discovery endpoints (RFC 8414, RFC 8707)
- Dynamic client registration (RFC 7591)
- Complete authentication middleware and test suite

**Files unique to this branch:**
- `src/middleware/auth.ts` - Authentication middleware
- `tests/auth.test.ts` - Authentication test suite (18 tests)
- `docs/oauth-authentication-flow.md` - Complete OAuth documentation

### `no-oauth` - Simple API Key Authentication

**Simplified version with direct Meraki API key authentication.**

**Authentication:** Meraki API key only (passed as Worker secret)
**Use case:** Development, testing, simpler deployments without SSO requirements

**Key features:**
- Direct Meraki API authentication
- No OAuth configuration required
- Lower barrier to entry
- Simpler codebase for learning/testing

**Files NOT in this branch:**
- No `src/middleware/` directory
- No authentication tests
- No OAuth documentation

## Switching Between Versions

Both branches deploy to the **same Cloudflare Worker** - only one version can be live at a time.

### Deploy OAuth Version

```bash
git checkout main
npm run deploy
```

Your Worker now uses OAuth 2.1 authentication at `https://meraki-mcp.macharpe.com`

### Deploy No-OAuth Version

```bash
git checkout no-oauth
npm run deploy
```

Your Worker now uses simple API key authentication at `https://meraki-mcp.macharpe.com`

## Local Development

### Working on OAuth Version

```bash
# Switch to main branch
git checkout main

# Your local files now show OAuth code
ls src/middleware/  # auth.ts exists
cat README.md       # Shows OAuth documentation

# Make changes
code src/middleware/auth.ts

# Test locally
npm run dev  # OAuth version on localhost:8787

# Commit and push
git add .
git commit -m "feat: improve OAuth error handling"
git push origin main
```

### Working on No-OAuth Version

```bash
# Switch to no-oauth branch
git checkout no-oauth

# Your local files now show simpler code
ls src/middleware/  # Directory doesn't exist
cat README.md       # Shows API key documentation

# Make changes
code src/index.ts

# Test locally
npm run dev  # No-OAuth version on localhost:8787

# Commit and push
git add .
git commit -m "fix: improve error messages"
git push origin no-oauth
```

## Maintenance Workflow

### Making Non-Auth Changes

For changes **not related to authentication** (e.g., new Meraki tools, bug fixes, performance improvements):

1. **Make the change on `main` first**
2. **Cherry-pick to `no-oauth`** (if applicable)

```bash
# Make change on main
git checkout main
git add .
git commit -m "feat: add new Meraki tool for device inventory"

# Cherry-pick to no-oauth
git checkout no-oauth
git cherry-pick <commit-hash>
git push origin no-oauth
```

### Making Auth-Specific Changes

For changes **specific to OAuth authentication**:

1. **Only modify `main` branch**
2. **No cherry-picking needed** (no-oauth doesn't have auth code)

```bash
git checkout main
git add src/middleware/auth.ts
git commit -m "fix: improve JWT verification error handling"
git push origin main
```

### Making No-OAuth-Specific Changes

For changes **specific to the no-oauth version**:

1. **Only modify `no-oauth` branch**
2. **No backporting needed**

```bash
git checkout no-oauth
git add src/index.ts
git commit -m "docs: clarify API key setup instructions"
git push origin no-oauth
```

## When to Use Which Branch

| Scenario | Branch | Reason |
|----------|--------|--------|
| Enterprise production deployment | `main` | Requires OAuth 2.1 with SSO |
| Development/testing | `no-oauth` | Simpler setup, faster iteration |
| Contributing new features | `main` first | Can cherry-pick to no-oauth if needed |
| Learning the codebase | `no-oauth` | Fewer authentication concepts |
| Production with custom auth | `no-oauth` | Add your own auth layer |

## Branch Protection

Both branches follow the same protection rules:
- Pull requests required for changes
- Status checks must pass (Semgrep, Cloudflare Workers build)
- No force pushes allowed

## README Differences

Each branch has its **own independent README.md**:
- **`main`:** Documents OAuth 2.1 authentication flow, enterprise setup
- **`no-oauth`:** Documents simple API key authentication

## Common Questions

### Can I run both versions simultaneously?

No - both deploy to the same Worker. To test both:
1. Deploy one version to production
2. Use `wrangler dev` to test the other locally

Or modify `wrangler.jsonc` to use different Worker names (not recommended for most use cases).

### Which branch should I contribute to?

Make your contribution to **`main`** first. If the change is useful for both versions and doesn't involve authentication, we can cherry-pick it to `no-oauth`.

### How do I know which branch I'm on?

```bash
git branch --show-current
```

Or check the README:
```bash
grep "OAuth" README.md | head -1
```

### What if I accidentally commit to the wrong branch?

```bash
# Save your commit
git log -1  # Note the commit hash

# Switch to correct branch
git checkout <correct-branch>

# Cherry-pick your commit
git cherry-pick <commit-hash>

# Go back and reset the wrong branch
git checkout <wrong-branch>
git reset --hard HEAD~1
```

## Getting Help

- **General MCP questions:** See README.md on either branch
- **OAuth authentication:** See `docs/oauth-authentication-flow.md` on `main` branch
- **Branch workflow:** This file (BRANCHES.md)
- **Issues:** https://github.com/macharpe/meraki-mcp-cloudflare/issues
