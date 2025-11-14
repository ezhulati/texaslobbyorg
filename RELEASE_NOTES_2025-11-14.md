Release Notes — 2025-11-14

- Tagging: separate visibility controls (`is_public` and `show_on_profile`) for bill tags; UI adds second checkbox; API supports new schema and falls back when needed
- Migration: adds `show_on_profile` column and index to `bill_tags`; run in Supabase (already applied for dev)
- Bill page UX: actions moved to header; Back to Bills positioned left; added spacing before Summary; tag status pill remains clear
- Auth flow: login guards for Tag and Watchlist; redirect back with intent; auto-open tag modal and auto-add watchlist after login
- Watchlist page: now uses real Supabase auth, fetches entries for current user, and wires removal to actual `userId`
- Lobbyist profile: “Bills I’m Tracking” filters by `show_on_profile` (fallback to `is_public`); notes use `notes` with legacy fallback
- API additions: `/api/auth/me` (session user id) and `/api/lobbyist/me` (current lobbyist id by `user_id` or `claimed_by`)
- Reliability: API tag create/update now tolerant to schema differences (handles `notes` vs `context_notes`, omits `show_on_profile` when absent)

Developer Notes

- Production migration: ensure `show_on_profile` exists in `bill_tags`; apply SQL in Supabase or run CLI push after linking project
- Redirect intent: Tag=`intent=tag&billId=<id>`; Watchlist=`intent=watchlist&billId=<id>`; login page preserves `redirect` and returns users to the originating bill
- New endpoints are SSR-cookies aware and safe for client use to resolve ids

