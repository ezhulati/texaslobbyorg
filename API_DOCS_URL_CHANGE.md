# API Documentation URL Change

## What Changed

Only the **API documentation page URL** has been changed to make it less discoverable.

### API Documentation Page:
- **Old URL:** `http://localhost:4321/api-docs`
- **New URL:** `http://localhost:4321/api-docs75205`

### API Endpoints (UNCHANGED):
All API endpoints remain at their original URLs:
- `https://texaslobby.org/api/*`
- `http://localhost:4321/api/*`

Examples:
- Login: `POST /api/auth/login` ✅ (unchanged)
- Favorites: `POST /api/favorites/toggle` ✅ (unchanged)
- Profile: `POST /api/profile/claim` ✅ (unchanged)
- Stripe: `POST /api/stripe/webhook` ✅ (unchanged)

---

## Files Changed

### 1. Documentation Page Renamed
- **File:** `src/pages/api-docs.astro` → `src/pages/api-docs75205.astro`
- **Added:** `<meta name="robots" content="noindex, nofollow">` to prevent search engine indexing

### 2. Documentation Updated
- `API_DOCUMENTATION.md` - Updated references to new docs URL
- `API_QUICK_REFERENCE.md` - Updated link to Swagger UI

---

## How to Access

### Interactive Swagger UI:
- **Local:** http://localhost:4321/api-docs75205
- **Production:** https://texaslobby.org/api-docs75205 (after deploy)

### Old URL:
- ❌ `http://localhost:4321/api-docs` - No longer exists
- ❌ `https://texaslobby.org/api-docs` - Will 404 after deploy

---

## Security Benefits

This change provides **minimal security through obscurity**:

✅ **Benefits:**
- Makes documentation less discoverable by automated scanners
- Reduces casual discovery by competitors
- No impact on API functionality
- Search engines won't index it (`noindex` meta tag)

❌ **Limitations:**
- Anyone with the URL can still access it
- Does not protect actual API endpoints
- Not a substitute for proper authentication

---

## Testing

The docs page should work exactly as before, just at a new URL:

```bash
# Start dev server
npm run dev

# Visit new URL
open http://localhost:4321/api-docs75205

# Old URL should 404
open http://localhost:4321/api-docs
```

---

## Rollback (If Needed)

To revert this change:

```bash
# Rename file back
mv src/pages/api-docs75205.astro src/pages/api-docs.astro

# Update documentation
sed -i '' 's|/api-docs75205|/api-docs|g' API_DOCUMENTATION.md
sed -i '' 's|/api-docs75205|/api-docs|g' API_QUICK_REFERENCE.md
```

---

## No Stripe Changes Needed

Since the API endpoints themselves didn't change, your Stripe webhook URL remains:
- ✅ `https://texaslobby.org/api/stripe/webhook` (no changes needed)

---

**Created:** 2025-11-08
**Type:** Documentation URL obscurity
**Impact:** Low (cosmetic change only)
