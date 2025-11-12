# Security Documentation

This document outlines the security measures implemented in TexasLobby.org.

## Overview

TexasLobby.org implements multiple layers of security to protect user data and prevent abuse:

1. **Rate Limiting** - Prevents API abuse
2. **Input Validation** - Validates all API inputs with Zod schemas
3. **CORS Configuration** - Controls cross-origin access
4. **Security Headers** - HTTP headers for enhanced security
5. **Database Security** - Row Level Security (RLS) policies
6. **Authentication** - Supabase Auth with secure session management

---

## 1. Rate Limiting

### Implementation
Location: `src/lib/security/rateLimiter.ts`

### Features
- **In-memory tracking** by IP address
- **Automatic cleanup** of expired entries
- **Suspicious activity detection**
- **Temporary IP blocking**
- **Custom rate limits** per endpoint

### Rate Limit Tiers

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| AI Search | 10 req/min | 60s | Expensive Claude API calls |
| Report Issue | 10 req/min | 60s | Prevent spam reports |
| Regular Search | 60 req/min | 60s | Standard search operations |
| General API | 100 req/min | 60s | Default for other endpoints |

### Headers Returned
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1699564800000
Retry-After: 45
```

### Usage Example
```typescript
import { rateLimiter, getClientIP, RATE_LIMITS } from '@/lib/security/rateLimiter';

const clientIP = getClientIP(request);
const result = rateLimiter.check(
  clientIP,
  RATE_LIMITS.AI_SEARCH.limit,
  RATE_LIMITS.AI_SEARCH.windowMs
);

if (!result.allowed) {
  return new Response('Too many requests', { status: 429 });
}
```

---

## 2. Input Validation

### Implementation
Location: `src/lib/security/validation.ts`

### Features
- **Zod schemas** for type-safe validation
- **Custom error messages**
- **Automatic sanitization**
- **Detailed validation errors**

### Validation Schemas

#### Profile Report
```typescript
reportIssueSchema = z.object({
  lobbyistId: z.string().uuid(),
  lobbyistName: z.string().min(1).max(200),
  issueType: z.enum(['incorrect_info', 'outdated_clients', ...]),
  description: z.string().min(10).max(5000),
  reporterEmail: z.string().email().optional(),
});
```

#### AI Search
```typescript
aiSearchSchema = z.object({
  query: z.string().min(3).max(500),
  context: z.string().optional(),
});
```

### Usage Example
```typescript
import { validateRequest, ValidationError } from '@/lib/security/validation';

try {
  const data = await validateRequest(request, reportIssueSchema);
  // data is now type-safe and validated
} catch (error) {
  if (error instanceof ValidationError) {
    return createValidationErrorResponse(error);
  }
}
```

### Error Response Format
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "description",
      "message": "Description must be at least 10 characters"
    }
  ]
}
```

---

## 3. CORS Configuration

### Implementation
Location: `src/lib/security/cors.ts`

### Environment-Based Configuration

**Production:**
- Allowed origins: `https://texaslobby.org`, `https://www.texaslobby.org`
- Credentials: Enabled
- Methods: GET, POST, PUT, DELETE, OPTIONS

**Development:**
- Allowed origins: `*` (all origins)
- Credentials: Disabled
- Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS

### Usage Example
```typescript
import { withCORS, getCORSConfig } from '@/lib/security/cors';

export const POST = withCORS(async (request) => {
  // Your handler logic
  return new Response(JSON.stringify({ success: true }));
}, getCORSConfig());
```

---

## 4. Security Headers

### Implementation
Location: `netlify.toml`

### Headers Applied

#### Content Security Policy (CSP)
Prevents XSS and injection attacks:
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: https: blob:;
connect-src 'self' https://*.supabase.co https://api.stripe.com;
```

#### HTTP Strict Transport Security (HSTS)
Forces HTTPS:
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

#### Other Security Headers
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer info
- `Permissions-Policy` - Restricts browser features

### Verification
Check headers in production:
```bash
curl -I https://texaslobby.org
```

---

## 5. Database Security

### Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:

#### Public Tables
- **lobbyists**: Public read, authenticated write
- **cities**: Public read-only
- **subject_areas**: Public read-only
- **bills**: Public read-only

#### Protected Tables
- **users**: Own data only + admin access
- **profile_reports**: Anyone can create, only admins can view
- **clients**: Owner only + admin access
- **testimonials**: Owner approval required

### Service Role Key Protection
- **Never exposed** to client-side code
- **Only used** in server-side API routes
- **Bypasses RLS** for admin operations

```typescript
// ❌ Never do this in client components
import { createServerClient } from '@/lib/supabase';

// ✅ Only in API routes or Astro server code
const serverClient = createServerClient();
```

---

## 6. API Authentication

### Pattern
All sensitive endpoints check authentication:

```typescript
export const POST: APIRoute = async ({ request, cookies }) => {
  // Get authenticated user
  const supabase = createServerAuthClient(cookies);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Check admin role if needed
  const serverClient = createServerClient();
  const { data: userData } = await serverClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userData?.role !== 'admin') {
    return new Response('Forbidden', { status: 403 });
  }

  // Process request...
};
```

---

## 7. Sensitive Data Protection

### Environment Variables

**Public (client-safe):**
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `PUBLIC_SITE_URL`

**Private (server-only):**
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`

### Git Protection
`.gitignore` includes:
```
.env
.env.local
.env.production
.env.*.local
```

---

## 8. Monitoring & Alerts

### Rate Limiter Stats
```typescript
const stats = rateLimiter.getStats();
// Returns:
// {
//   activeEntries: 42,
//   blockedIPs: 2,
//   suspiciousIPs: 5,
//   totalTracked: 156
// }
```

### Suspicious Activity Detection
IPs that repeatedly hit rate limits are flagged:
```typescript
if (rateLimiter.isSuspicious(clientIP)) {
  // Log, alert, or block
  rateLimiter.block(clientIP, 60 * 60 * 1000); // Block for 1 hour
}
```

---

## 9. Production Checklist

Before deploying to production, verify:

- [ ] All `.env` variables set in Netlify
- [ ] Security headers showing in browser dev tools
- [ ] CORS working for allowed origins
- [ ] Rate limits returning proper headers
- [ ] Validation errors showing detailed feedback
- [ ] No API keys in client-side bundles
- [ ] RLS policies tested
- [ ] SSL certificate active (HTTPS)
- [ ] CSP not blocking legitimate resources

---

## 10. Security Best Practices

### For Developers

1. **Never commit secrets** - Use `.env` files
2. **Validate all inputs** - Use Zod schemas
3. **Check authentication** - On all sensitive endpoints
4. **Use prepared statements** - Supabase handles this
5. **Rate limit expensive operations** - AI, email, etc.
6. **Log security events** - Failed auth, rate limits, etc.
7. **Keep dependencies updated** - `npm audit` regularly

### For Operations

1. **Monitor rate limit violations**
2. **Review access logs** for patterns
3. **Update security headers** as needed
4. **Rotate API keys** periodically
5. **Test CORS** after domain changes
6. **Backup database** regularly
7. **Review RLS policies** for new tables

---

## 11. Incident Response

If a security issue is discovered:

1. **Assess impact** - What data/systems affected?
2. **Contain immediately** - Block IPs, revoke keys, disable endpoints
3. **Investigate** - Check logs, identify root cause
4. **Fix vulnerability** - Patch code, update configs
5. **Notify affected users** - If PII exposed
6. **Document learnings** - Update this doc

---

## 12. Contact

For security concerns or to report vulnerabilities:

**Email:** enrizhulati@gmail.com
**Response Time:** Within 24 hours

**Do not** disclose security issues publicly until they're resolved.

---

## Last Updated
December 2024

## Version
1.0.0
