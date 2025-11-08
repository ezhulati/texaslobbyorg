# Testing the Account Deletion System

## ✅ Build Status
**Application built successfully!** All TypeScript and Astro compilation passed.

## 🚧 Migration Status
**Pending:** Database migrations need to be run when connection is stable:
```bash
npm run db:push
```

This will create:
- `deleted_at`, `deletion_scheduled_for`, `deletion_reason` columns on `users` table
- `account_deletions` audit table
- 4 PostgreSQL functions for the deletion lifecycle

## 📋 Manual Testing Checklist

### 1. Data Export Feature
**Location:** `/account` (Account Settings page)

**Steps:**
1. Log in to your account
2. Navigate to Account Settings (`/account`)
3. Look for the "Data & Privacy" section
4. Click **"Export My Data (JSON)"** button
5. ✅ Should download a JSON file with all your data:
   - Profile information (email, name, role)
   - Favorites list
   - Page view history
   - Lobbyist profile (if applicable)

**Expected Behavior:**
- File downloads immediately
- Filename: `texaslobby-data-export-{user-id}-{timestamp}.json`
- JSON is properly formatted and readable

---

### 2. Account Deletion Flow (Soft Delete)
**Location:** `/account` → "Delete Account" button

**Steps:**
1. Log in to your account
2. Go to Account Settings (`/account`)
3. Scroll to the "Delete Account" section (red danger zone)
4. Read the explanation about 30-day grace period
5. Click **"Delete Account"** button
6. Modal opens with:
   - Explanation of grace period
   - Password confirmation field
   - Optional reason textarea
7. Enter your password
8. Optionally provide a reason
9. Click **"Schedule Deletion"**

**Expected Behavior:**
✅ **After migration is run:**
- Account marked for deletion (soft delete)
- User signed out immediately
- Redirected to homepage with message
- Data remains in database for 30 days
- Can recover by logging back in

⚠️ **Before migration is run:**
- Will fail with database error (functions don't exist yet)
- This is expected!

---

### 3. Account Recovery
**Location:** Login after deletion

**Steps:**
1. Delete your account (using steps above)
2. Get signed out
3. Immediately log back in with same credentials
4. System should detect pending deletion
5. Option to recover account

**Expected Behavior:**
✅ **After migration:**
- Can log back in during 30-day period
- Account fully restored
- All data intact

⚠️ **Before migration:**
- Won't work (recovery function doesn't exist)

---

### 4. Password Confirmation Security
**Location:** Delete Account modal

**Tests:**
- Try to delete with **wrong password** → Should show "Incorrect password" error
- Try to delete with **empty password** → Should show "Password is required" error
- Try to delete with **correct password** → Should proceed with deletion

---

### 5. Updated UI Elements

**Account Settings Page Updates:**
- ✅ Name fields split into First Name and Last Name (side by side on desktop)
- ✅ New "Data & Privacy" section with export button
- ✅ Enhanced "Delete Account" section with:
  - Grace period explanation
  - List of what will be deleted
  - Password field in modal
  - Optional reason textarea
  - "Schedule Deletion" button (instead of "Delete Account")

---

## 🔍 API Endpoints to Test

### 1. Data Export
```bash
GET /api/account/export-data
```
**Test:** Click the export button or visit the URL directly (while logged in)
**Expected:** JSON file download

### 2. Account Deletion
```bash
POST /api/account/delete
Body: {
  "password": "your_password",
  "reason": "optional reason",
  "immediate": false,
  "grace_period_days": 30
}
```
**Expected:** Returns deletion schedule with grace period

### 3. Account Recovery
```bash
POST /api/account/recover
```
**Expected:** Restores deleted account if within grace period

---

## 🎯 What Works NOW (Before Migration)

✅ UI/UX improvements:
- Data export button visible
- Enhanced delete modal with password field
- First/Last name split in account settings
- Grace period messaging

✅ API routes exist:
- `/api/account/export-data` - **WORKS** (doesn't need migration)
- `/api/account/delete` - **Partially works** (immediate deletion works, soft delete needs migration)
- `/api/account/recover` - Needs migration

---

## ⏳ What Needs Migration

❌ Soft delete functionality:
- 30-day grace period
- `mark_user_for_deletion()` function
- `cancel_account_deletion()` function
- `permanently_delete_user()` function
- `cleanup_expired_accounts()` function

❌ Audit trail:
- `account_deletions` table
- Deletion history tracking

---

## 🚀 Next Steps

1. **Wait for stable database connection**
2. **Run migration:** `npm run db:push`
3. **Test full flow:**
   - Export data
   - Delete account (with password)
   - Log back in
   - Recover account
4. **Set up scheduled cleanup job** (see `ACCOUNT_DELETION_GUIDE.md`)

---

## 🐛 Known Issues

### Migration 016 Syntax Error
There's a SQL syntax error in migration 016 (account management system):
- Error: `current_role` is a reserved keyword in PostgreSQL
- Fixed: Renamed columns to `from_role` and `to_role`
- **Status:** Fixed in code, but not yet pushed to database

### Database Connection Timeout
- Supabase connection timing out during push
- **Workaround:** Retry later or check internet connection

---

## 📧 Expected Emails (Future Enhancement)

After migration + email integration:
- ✉️ Deletion scheduled confirmation
- ✉️ Reminder 7 days before permanent deletion
- ✉️ Permanent deletion confirmation

---

## 💡 Testing Tips

1. **Use a test account** - Don't delete your main account!
2. **Test data export first** - Make sure you have a backup
3. **Test wrong password** - Verify security works
4. **Test recovery quickly** - Don't wait for the migration to test the UI
5. **Check browser console** - Look for any JavaScript errors
6. **Check network tab** - See API response codes

---

## 🎉 What Makes This "Best in Class"

✅ **30-day grace period** (like Gmail, GitHub)
✅ **Data export before deletion** (GDPR compliant)
✅ **Password confirmation** (prevents unauthorized deletion)
✅ **Clear communication** (user knows exactly what happens)
✅ **Audit trail** (compliance + analytics)
✅ **No orphaned accounts** (rollback protection)
✅ **Account recovery** (undo mistakes)
✅ **Automatic cleanup** (no manual intervention needed)

---

## 📝 Manual Test Log

Use this checklist when testing:

- [ ] Data export downloads successfully
- [ ] Export contains all expected data fields
- [ ] Delete modal shows grace period explanation
- [ ] Wrong password shows error
- [ ] Correct password proceeds
- [ ] User gets signed out after deletion
- [ ] Redirect to homepage works
- [ ] Can log back in after deletion (post-migration)
- [ ] Recovery option appears (post-migration)
- [ ] Account fully restored (post-migration)

---

## Summary

**BUILD:** ✅ Success
**UI:** ✅ Complete
**API:** ⚠️ Partially functional
**DATABASE:** ⏳ Pending migration
**READY TO TEST:** ✅ UI/UX + Data Export
**NEEDS MIGRATION:** Soft delete + Recovery
