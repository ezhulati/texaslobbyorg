# TexasLobby.org API Documentation

Complete REST API documentation for the TexasLobby.org platform.

## 📍 Access the Documentation

### Interactive Swagger UI
Visit the live, interactive API documentation:
- **Local Development:** http://localhost:4321/api-docs75205
- **Production:** https://texaslobby.org/api-docs75205

### OpenAPI Specification
Download the raw OpenAPI 3.0 spec:
- **File:** `/openapi.yaml`
- **Format:** YAML (OpenAPI 3.0.3)

---

## 🎯 API Overview

### Total Endpoints: 38

Organized into 9 functional categories:

| Category | Endpoints | Description |
|----------|-----------|-------------|
| **Authentication** | 3 | Login, signup, signout |
| **Profile** | 4 | Claim, create, update lobbyist profiles |
| **Favorites** | 3 | Add, remove, toggle favorites |
| **Filters** | 3 | Dynamic search filters (cities, subjects, clients) |
| **Stripe** | 4 | Payment processing, subscriptions, webhooks |
| **Onboarding** | 2 | Lobbyist onboarding workflow |
| **Account** | 7 | Account management, GDPR export, merges |
| **Admin** | 11 | Admin approval workflows |
| **Analytics** | 1 | Page view tracking |

---

## 🔐 Authentication

Most endpoints require authentication via **Supabase session cookies**.

### How it works:
1. User logs in via `POST /api/auth/login`
2. Supabase session cookie (`sb-access-token`) is set automatically
3. Subsequent requests include this cookie for authentication
4. Middleware checks `locals.isAuthenticated` and `locals.user`

### Cookie Details:
- **Name:** `sb-access-token`
- **Type:** HttpOnly, Secure, SameSite=Lax
- **Expires:** 7 days (Supabase default)

---

## 🚀 Base URLs

| Environment | Base URL |
|-------------|----------|
| **Production** | `https://texaslobby.org/api` |
| **Development** | `http://localhost:4321/api` |

---

## 📖 Key Endpoints

### Authentication

#### POST `/auth/login`
**Purpose:** Authenticate user and create session

**Smart Routing:**
- **Admin** → `/admin`
- **Lobbyist (with profile)** → `/dashboard`
- **Lobbyist (no profile)** → `/claim-profile`
- **Searcher (with favorites)** → `/favorites`
- **Searcher (no favorites)** → `/lobbyists`

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "firstName": "John",  // optional
  "lastName": "Doe"      // optional
}
```

**Response:**
```json
{
  "success": true,
  "redirectTo": "/dashboard",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "role": "lobbyist"
  }
}
```

---

#### POST `/auth/signup`
**Purpose:** Create new user account

**Request:**
```json
{
  "email": "jane@example.com",
  "password": "SecurePass123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "userType": "lobbyist"  // or "searcher"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Confirmation email sent to jane@example.com",
  "redirectTo": "/auth/verify"
}
```

---

### Profile Management

#### POST `/profile/claim`
**Purpose:** Submit claim request for existing profile (requires admin approval)

**Authentication:** Required

**Request:**
```json
{
  "lobbyistId": "uuid",
  "verificationDocumentUrl": "https://storage.supabase.co/..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Claim request submitted successfully!",
  "redirectTo": "/dashboard",
  "profileSlug": "john-doe"
}
```

**What Happens:**
1. Creates `profile_claim_requests` record with status `pending`
2. Sends email notification to admin
3. User waits for admin approval (target: 48 hours)
4. On approval: `lobbyists.claimed_by` = `user_id`, `is_claimed` = `true`

---

#### POST `/profile/update`
**Purpose:** Update claimed profile information

**Authentication:** Required (must own profile)

**Request:**
```json
{
  "phone": "(512) 555-0100",
  "email": "updated@example.com",
  "bio": "Experienced lobbyist specializing in healthcare policy...",
  "cities": ["Austin", "Dallas"],
  "subjectAreas": ["Healthcare", "Education"],
  "websiteUrl": "https://example.com",
  "linkedinUrl": "https://linkedin.com/in/johndoe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

---

### Favorites

#### POST `/favorites/toggle`
**Purpose:** Add or remove lobbyist from favorites (idempotent)

**Authentication:** Required

**Request:**
```json
{
  "lobbyistId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "lobbyistId": "uuid",
    "lobbyistName": "John Doe",
    "isFavorited": true,
    "action": "added"  // or "removed"
  },
  "message": "John Doe added to your favorites"
}
```

---

### Filters (Dynamic Search)

#### GET `/filters/cities?subject={slug}&client={name}`
**Purpose:** Get cities filtered by current search context

**Query Parameters:**
- `subject` (optional) - Subject area slug
- `client` (optional) - Client name

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Austin",
    "slug": "austin"
  },
  {
    "id": "uuid",
    "name": "Dallas",
    "slug": "dallas"
  }
]
```

**How it works:**
- No filters: Returns all cities from `cities` table
- With filters: Returns only cities where active lobbyists match the filters
- Example: `/filters/cities?subject=healthcare` returns cities with healthcare lobbyists

---

#### GET `/filters/subjects?city={slug}&client={name}`
**Purpose:** Get subject areas filtered by current search context

---

#### GET `/filters/clients?query={search}&limit={count}`
**Purpose:** Autocomplete search for client names

**Query Parameters:**
- `query` (required, min 2 chars) - Search term
- `limit` (optional, default 20) - Max results

**Response:**
```json
[
  {
    "name": "3M Company",
    "lobbyistCount": 5
  },
  {
    "name": "AT&T",
    "lobbyistCount": 12
  }
]
```

---

### Stripe Integration

#### POST `/stripe/create-checkout-session`
**Purpose:** Create Stripe checkout for subscription

**Request:**
```json
{
  "tier": "premium",  // or "featured"
  "userId": "uuid",
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/pay/cs_test_..."
}
```

**Subscription Tiers:**
- **Premium:** $297/month
- **Featured:** $597/month

---

#### POST `/stripe/webhook`
**Purpose:** Handle Stripe webhook events

**Events Supported:**
- `checkout.session.completed` - Activates subscription, updates `subscription_tier`
- `customer.subscription.updated` - Updates subscription status
- `customer.subscription.deleted` - Downgrades to free tier

**Webhook Signature Verification:** Required (`STRIPE_WEBHOOK_SECRET`)

---

### Admin Operations

#### POST `/admin/approve-claim`
**Purpose:** Approve pending profile claim request

**Authentication:** Required (admin role only)

**Request:**
```json
{
  "claimRequestId": "uuid"
}
```

**What it does:**
1. Updates `profile_claim_requests.status` = `approved`
2. Sets `lobbyists.claimed_by` = `user_id`
3. Sets `lobbyists.is_claimed` = `true`
4. Updates `users.role` = `lobbyist` if not already
5. Sends confirmation email to user

---

#### POST `/admin/reject-claim`
**Purpose:** Reject pending claim request

**Request:**
```json
{
  "claimRequestId": "uuid",
  "reason": "ID verification document does not match profile name"
}
```

---

### Analytics

#### POST `/track-view`
**Purpose:** Increment profile view count

**Request:**
```json
{
  "lobbyistId": "uuid"
}
```

**Response:**
```json
{
  "success": true
}
```

**Implementation:**
- Calls PostgreSQL function `increment_view_count(lobbyist_id)`
- Inserts row in `page_views` table
- Increments `lobbyists.view_count`
- Used for ranking in search results

---

## 🔒 Security & Error Handling

### Authentication Errors

```json
{
  "success": false,
  "error": "You must be logged in to perform this action",
  "code": "UNAUTHORIZED"
}
```

**HTTP Status:** `401 Unauthorized`

---

### Authorization Errors

```json
{
  "success": false,
  "error": "You do not have permission to access this resource",
  "code": "FORBIDDEN"
}
```

**HTTP Status:** `403 Forbidden`

---

### Validation Errors

```json
{
  "success": false,
  "error": "Invalid email format",
  "code": "INVALID_INPUT"
}
```

**HTTP Status:** `400 Bad Request`

---

### Not Found Errors

```json
{
  "success": false,
  "error": "Profile not found",
  "code": "NOT_FOUND"
}
```

**HTTP Status:** `404 Not Found`

---

### Server Errors

```json
{
  "success": false,
  "error": "An unexpected error occurred",
  "code": "INTERNAL_ERROR"
}
```

**HTTP Status:** `500 Internal Server Error`

---

## 🧪 Testing the API

### Using Swagger UI (Recommended)

1. Start dev server: `npm run dev`
2. Navigate to http://localhost:4321/api-docs
3. Click "Authorize" button (if endpoint requires auth)
4. Click "Try it out" on any endpoint
5. Fill in parameters and click "Execute"

---

### Using cURL

**Login:**
```bash
curl -X POST http://localhost:4321/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Get Filtered Cities:**
```bash
curl http://localhost:4321/api/filters/cities?subject=healthcare
```

**Toggle Favorite (requires session cookie):**
```bash
curl -X POST http://localhost:4321/api/favorites/toggle \
  -H "Content-Type: application/json" \
  -b "sb-access-token=YOUR_SESSION_TOKEN" \
  -d '{
    "lobbyistId": "uuid-here"
  }'
```

---

### Using Postman

1. Import `/openapi.yaml` into Postman
2. Create environment with `baseUrl` = `http://localhost:4321/api`
3. Login via `/auth/login` endpoint
4. Session cookie will be saved automatically
5. Test other endpoints

---

## 📊 Rate Limiting

**Current Status:** No rate limiting implemented

**Planned (post-launch):**
- **Anonymous users:** 100 requests/hour
- **Authenticated users:** 500 requests/hour
- **Premium/Featured:** 2000 requests/hour

**Implementation:** Middleware with Redis cache

---

## 🔄 Versioning

**Current Version:** v1 (no versioning in URLs yet)

**Future Versioning Strategy:**
- URL-based: `/api/v2/auth/login`
- Backwards compatibility maintained for 6 months after new version

---

## 📝 Response Format

All API responses follow this standard format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE"
}
```

---

## 🛠️ Development

### Adding a New Endpoint

1. **Create file:** `src/pages/api/your-endpoint.ts`
2. **Export HTTP method:**
```typescript
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  // Implementation
};
```
3. **Update OpenAPI spec:** Add endpoint to `openapi.yaml`
4. **Test:** Visit http://localhost:4321/api-docs75205

---

### Code Generation

Use the OpenAPI spec to generate client SDKs:

```bash
# JavaScript/TypeScript Client
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-axios \
  -o ./generated/client

# Python Client
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g python \
  -o ./generated/python-client
```

---

## 📚 Additional Resources

- **Astro API Routes:** https://docs.astro.build/en/core-concepts/endpoints/
- **Supabase Auth:** https://supabase.com/docs/guides/auth
- **OpenAPI Spec:** https://spec.openapis.org/oas/v3.0.3
- **Swagger UI:** https://swagger.io/tools/swagger-ui/

---

## 🤝 Support

**Issues:** Report API bugs or request features via GitHub issues

**Questions:** Check `CLAUDE.md` for architecture context

---

**Last Updated:** 2025-11-08
