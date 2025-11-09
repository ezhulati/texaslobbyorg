# API Quick Reference

**Total Endpoints:** 38

---

## Authentication (3)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | ❌ | User login with smart routing |
| POST | `/api/auth/signup` | ❌ | Create new user account |
| POST | `/api/auth/signout` | ❌ | Sign out user |

---

## Profile Management (4)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/profile/claim` | ✅ | Submit claim request (requires admin approval) |
| POST | `/api/profile/create` | ✅ | Create new profile (requires admin approval) |
| POST | `/api/profile/update` | ✅ | Update claimed profile |
| POST | `/api/profile/update-field` | ✅ | Update single profile field |

---

## Favorites (3)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/favorites/toggle` | ✅ | Add or remove favorite |
| POST | `/api/favorites/add` | ✅ | Add to favorites |
| POST | `/api/favorites/remove` | ✅ | Remove from favorites |

---

## Filters (3)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/filters/cities` | ❌ | Get cities (filtered by subject/client) |
| GET | `/api/filters/subjects` | ❌ | Get subject areas (filtered by city/client) |
| GET | `/api/filters/clients` | ❌ | Autocomplete client search |

---

## Stripe (4)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/stripe/create-checkout-session` | ❌ | Create subscription checkout |
| POST | `/api/stripe/cancel-subscription` | ✅ | Cancel subscription |
| POST | `/api/stripe/create-portal-session` | ✅ | Create customer portal session |
| POST | `/api/stripe/webhook` | ❌ | Handle Stripe webhooks |

---

## Onboarding (2)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/onboarding/update-step` | ✅ | Save onboarding step progress |
| POST | `/api/onboarding/submit` | ✅ | Submit completed onboarding |

---

## Account Management (7)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/account/update-profile` | ✅ | Update account info |
| POST | `/api/account/update-password` | ✅ | Change password |
| POST | `/api/account/delete` | ✅ | Soft-delete account |
| POST | `/api/account/recover` | ❌ | Recover deleted account |
| POST | `/api/account/export-data` | ✅ | GDPR data export |
| POST | `/api/account/request-merge` | ✅ | Request account merge |
| POST | `/api/account/request-role-upgrade` | ✅ | Request role upgrade |

---

## Admin (11)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin/approve-claim` | 👑 | Approve profile claim |
| POST | `/api/admin/reject-claim` | 👑 | Reject profile claim |
| POST | `/api/admin/approve-profile` | 👑 | Approve new profile |
| POST | `/api/admin/reject-profile` | 👑 | Reject new profile |
| POST | `/api/admin/approve-merge` | 👑 | Approve account merge |
| POST | `/api/admin/reject-merge` | 👑 | Reject account merge |
| POST | `/api/admin/approve-role-upgrade` | 👑 | Approve role upgrade |
| POST | `/api/admin/reject-role-upgrade` | 👑 | Reject role upgrade |

---

## Analytics (1)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/track-view` | ❌ | Track profile view |

---

## Legend

- **✅** = Requires authentication (Supabase session cookie)
- **❌** = Public endpoint (no auth required)
- **👑** = Admin role required

---

## Common Query Parameters

### `/api/filters/cities`
- `subject` - Subject area slug (optional)
- `client` - Client name (optional)

### `/api/filters/subjects`
- `city` - City slug (optional)
- `client` - Client name (optional)

### `/api/filters/clients`
- `query` - Search term (required, min 2 chars)
- `limit` - Max results (optional, default 20)

---

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (wrong role) |
| 404 | Not Found |
| 500 | Server Error |

---

## Base URLs

- **Production:** `https://texaslobby.org/api`
- **Development:** `http://localhost:4321/api`

---

## Interactive Docs

Visit **http://localhost:4321/api-docs75205** for full Swagger UI interface
