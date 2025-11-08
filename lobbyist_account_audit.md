# TexasLobby.org Lobbyist Account System - End-to-End Audit

## System Overview

Two lobbyist types:
1. **Pre-seeded Lobbyists**: Already on platform from TEC 2025 registration data
2. **Self-registered Lobbyists**: Not in TEC data, creating new accounts

## Core User Flows

### Flow 1: Pre-seeded Lobbyist Claims Profile

**Entry Point**: Lobbyist discovers their profile exists on TexasLobby.org

**Steps**:
1. User clicks "Claim This Profile" button on their public profile page
2. System checks if user is logged in
   - If no: Redirect to sign-up/login with email pre-filled if available
   - If yes: Continue to claim process
3. User uploads verification document (front of driver's license, passport, or valid ID)
4. System creates `profile_claim_request` record:
   - `lobbyist_profile_id`
   - `user_id` (authenticated user making claim)
   - `verification_document_url` (Supabase Storage)
   - `status`: 'pending'
   - `submitted_at`: timestamp
5. System sends email to enrizhulati@gmail.com with:
   - Claimant name and email
   - Link to admin dashboard review page
   - Verification document preview
6. Admin dashboard shows pending claims
7. Admin approves/rejects within 48 hours:
   - **Approved**: Links `user_id` to `lobbyist_profile_id`, sets `claimed_at` timestamp
   - **Rejected**: Updates status, sends rejection email to user with reason
8. Once approved, user can edit their profile and subscribe to premium tiers

**Database Requirements**:
```sql
-- Profile claim requests table
CREATE TABLE profile_claim_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lobbyist_profile_id UUID REFERENCES lobbyist_profiles(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  verification_document_url TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  admin_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Add to lobbyist_profiles table
ALTER TABLE lobbyist_profiles ADD COLUMN claimed_by UUID REFERENCES auth.users(id);
ALTER TABLE lobbyist_profiles ADD COLUMN claimed_at TIMESTAMPTZ;
```

### Flow 2: New Lobbyist Self-Registration

**Entry Point**: Lobbyist not in TEC data wants to create account

**Steps**:
1. User clicks "Register as a Lobbyist" from homepage
2. System checks if user is logged in:
   - If yes and `user_type = 'searcher'`: Show modal "You have a searcher account. Would you like to also register as a lobbyist?" → Continue
   - If yes and `user_type = 'lobbyist'`: Redirect to their dashboard with message "You already have a lobbyist account"
   - If no: Start registration
3. User enters:
   - Full name
   - Email
   - Password
   - Phone number
   - Firm name (if applicable)
   - Areas of expertise (multi-select)
   - Bio
   - LinkedIn profile (optional)
   - Website (optional)
4. System checks for duplicate email:
   - If email exists: Show error "An account with this email already exists. Please log in or use a different email."
5. Upon submission:
   - Creates `auth.users` record with email verification required
   - Creates `lobbyist_profiles` record linked to user
   - Sets `profile_status = 'pending_verification'`
   - User receives email verification link
6. After email verification:
   - User can log in and access dashboard
   - Profile is publicly visible but marked as "Unverified"
   - User can subscribe to premium tiers immediately
7. Optional: Admin review process for new self-registered lobbyists
   - Flag suspicious accounts
   - Verify legitimacy before allowing premium features

**Database Requirements**:
```sql
-- Add to lobbyist_profiles table
ALTER TABLE lobbyist_profiles ADD COLUMN profile_status TEXT 
  CHECK (profile_status IN ('active', 'pending_verification', 'suspended')) 
  DEFAULT 'active';
ALTER TABLE lobbyist_profiles ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE lobbyist_profiles ADD COLUMN verification_source TEXT 
  CHECK (verification_source IN ('tec_import', 'self_registered', 'claimed'));
```

## Edge Cases & Solutions

### Edge Case 1: Lobbyist Creates Account, Then Discovers Pre-seeded Profile

**Scenario**: User registers new lobbyist account, then finds their pre-seeded profile exists

**Solution**:
1. User can initiate "Merge Accounts" from either profile dashboard
2. System detects potential duplicate:
   - Name match (fuzzy matching)
   - Email domain match (if work email)
   - Phone number match
3. User submits merge request with verification document
4. Admin reviews and approves merge:
   - Keeps TEC-sourced data as primary
   - Merges user-submitted data (bio, photo, etc.)
   - Transfers any subscriptions to primary profile
   - Deletes duplicate profile
   - Preserves user authentication record

**Database Requirements**:
```sql
CREATE TABLE account_merge_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  primary_profile_id UUID REFERENCES lobbyist_profiles(id) NOT NULL,
  duplicate_profile_id UUID REFERENCES lobbyist_profiles(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  verification_document_url TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);
```

### Edge Case 2: Duplicate Email on New Registration

**Scenario**: User tries to create account with email already in system

**Solution**:
1. System detects email exists during registration
2. Show message: "An account with this email already exists."
3. Offer options:
   - "Log in to existing account"
   - "Reset password if you've forgotten it"
   - "Contact support if you believe this is an error"
4. Prevent account creation

**Implementation**: Email uniqueness constraint in Supabase Auth (default behavior)

### Edge Case 3: Lobbyist Account → Searcher Account (Same Email)

**Scenario**: User has lobbyist account, tries to create searcher account with same email

**Solution**:
1. System detects email exists
2. Show message: "You already have an account. You can use your existing account to search for lobbyists."
3. All accounts have dual access:
   - Lobbyists can search for other lobbyists
   - Searchers can't create lobbyist profiles
4. Add `account_type` field with options:
   - `searcher_only`: Can only search
   - `lobbyist`: Can search AND has lobbyist profile
   - `admin`: Full access

**Database Requirements**:
```sql
-- Add to users table (if using custom users table)
-- OR store in user_metadata in auth.users
ALTER TABLE public.users ADD COLUMN account_type TEXT 
  CHECK (account_type IN ('searcher', 'lobbyist', 'admin')) 
  DEFAULT 'searcher';
```

### Edge Case 4: Searcher Account → Lobbyist Account (Same Email)

**Scenario**: User has searcher account, wants to upgrade to lobbyist account

**Solution**:
1. Add "Become a Lobbyist" button in searcher dashboard
2. User clicks, goes through lobbyist onboarding (Flow 2)
3. System updates `account_type` from `searcher` to `lobbyist`
4. Creates associated `lobbyist_profiles` record
5. User retains same login credentials
6. Dashboard now shows lobbyist features + search capabilities

**Implementation**: Account type upgrade flow, not new account creation

### Edge Case 5: Email Typo on Self-Registration

**Scenario**: User registers with typo in email, can't verify

**Solution**:
1. Provide "Resend Verification Email" option
2. Allow email change before verification:
   - User requests email update
   - Admin approves email change
   - New verification email sent
3. After 7 days of no verification, send reminder email to registered address
4. After 30 days, flag account for potential deletion

### Edge Case 6: Claimed Profile but User Loses Access

**Scenario**: Lobbyist claims profile, then loses account access (forgot password, email changed, etc.)

**Solution**:
1. Standard password reset flow
2. If email no longer accessible:
   - User submits support request with verification document
   - Admin manually updates email after verification
   - User receives new verification email
3. Store backup contact info during claim process (phone number)

### Edge Case 7: Multiple People Claim Same Profile

**Scenario**: Two people try to claim the same lobbyist profile

**Solution**:
1. System allows multiple pending claims for same profile
2. Admin reviews all claims simultaneously
3. Admin approves legitimate claimant based on verification documents
4. System rejects other claims with message: "This profile has been claimed by its verified owner"
5. Rejected claimants can appeal with additional proof

**Database Schema**: `profile_claim_requests` already supports this (multiple requests per profile)

### Edge Case 8: Lobbyist Leaves Profession

**Scenario**: Lobbyist no longer practicing, wants to remove/deactivate profile

**Solution**:
1. Two options in dashboard:
   - **Deactivate Profile**: Hides from public search, preserves data, can reactivate
   - **Delete Account**: Permanent removal (GDPR compliance)
2. Deactivation process:
   - User clicks "Deactivate Profile"
   - Confirmation modal with explanation
   - Profile set to `status = 'inactive'`
   - Removed from public listings
   - User can still log in and reactivate
3. Deletion process:
   - User clicks "Delete Account"
   - Confirmation modal with serious warning
   - User must type "DELETE" to confirm
   - 30-day grace period before permanent deletion
   - Email sent with reactivation link
   - After 30 days: Full data deletion (except required legal records)

**Database Requirements**:
```sql
-- Add to lobbyist_profiles
ALTER TABLE lobbyist_profiles ADD COLUMN status TEXT 
  CHECK (status IN ('active', 'inactive', 'pending_deletion')) 
  DEFAULT 'active';
ALTER TABLE lobbyist_profiles ADD COLUMN deactivated_at TIMESTAMPTZ;
ALTER TABLE lobbyist_profiles ADD COLUMN deletion_requested_at TIMESTAMPTZ;

-- Deletion requests table (for audit trail)
CREATE TABLE account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  lobbyist_profile_id UUID REFERENCES lobbyist_profiles(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_deletion_at TIMESTAMPTZ NOT NULL,
  cancellation_token UUID DEFAULT uuid_generate_v4(),
  status TEXT CHECK (status IN ('pending', 'cancelled', 'completed')) DEFAULT 'pending'
);
```

### Edge Case 9: Subscription Active During Account Deletion

**Scenario**: Lobbyist has active paid subscription, wants to delete account

**Solution**:
1. System checks for active Stripe subscription
2. Show warning: "You have an active subscription that will be cancelled"
3. Require explicit acknowledgment
4. On deletion request:
   - Cancel Stripe subscription immediately
   - Process prorated refund (or let subscription run to end of period)
   - Send confirmation email with cancellation details
5. Wait for subscription period to end before final deletion
6. Store subscription history for tax/legal records even after deletion

### Edge Case 10: Lobbyist Profile Claimed by Wrong Person (Fraud)

**Scenario**: Someone fraudulently claims another person's profile

**Solution**:
1. Real lobbyist discovers their profile is claimed by someone else
2. Report button on profile: "Report Fraudulent Claim"
3. System creates fraud investigation ticket:
   - Suspends claimed profile immediately
   - Notifies admin
   - Emails current account holder about investigation
4. Real lobbyist submits verification documents
5. Admin reviews both sets of documents
6. Admin actions:
   - Revoke fraudulent claim
   - Restore profile to unclaimed state or assign to real lobbyist
   - Ban fraudulent user account
   - Consider legal action if necessary

**Database Requirements**:
```sql
CREATE TABLE fraud_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lobbyist_profile_id UUID REFERENCES lobbyist_profiles(id) NOT NULL,
  reported_by UUID REFERENCES auth.users(id),
  report_type TEXT CHECK (report_type IN ('fraudulent_claim', 'impersonation', 'other')),
  description TEXT,
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')) DEFAULT 'open',
  resolution_notes TEXT
);
```

## Missing Edge Cases You Haven't Considered

### Edge Case 11: Company/Firm Account vs Individual Lobbyist

**Scenario**: Lobbying firm wants one account for multiple lobbyists

**Current Gap**: Your system assumes 1 lobbyist = 1 account

**Solution Needed**:
1. Create "Firm Account" type
2. Firm admin can manage multiple lobbyist profiles under one subscription
3. Firm-level billing, individual lobbyist logins
4. Profit-sharing logic for lead distribution if firm-wide premium subscription

### Edge Case 12: Lobbyist Registered in Multiple States

**Scenario**: Lobbyist registered in Texas and other states

**Current Gap**: No handling of multi-state lobbyists

**Solution Needed**:
1. Allow lobbyists to indicate other state registrations
2. Display "Also registered in: [states]" on profile
3. Future expansion: Partner with other states' lobbying directories

### Edge Case 13: TEC Data Updates Mid-Year

**Scenario**: TEC publishes updated lobbyist data, your site is out of sync

**Current Gap**: No clear refresh strategy

**Solution Needed**:
1. Scheduled data sync (monthly or quarterly)
2. Detect changes: new lobbyists, removed lobbyists, updated info
3. For claimed profiles: Don't overwrite user-edited data
4. For unclaimed profiles: Update with new TEC data
5. Notify claimed lobbyists of discrepancies: "TEC shows you at [new firm], update your profile?"

### Edge Case 14: Lobbyist Email Changes

**Scenario**: Lobbyist changes email address after claiming profile

**Current Gap**: Email tied to authentication

**Solution Needed**:
1. Allow email change in account settings
2. Require re-verification of new email
3. Send confirmation to old email: "Email change requested. Click to cancel if not you."
4. Security cooldown period (24-48 hours) before email change takes effect

### Edge Case 15: Inactive Lobbyists (No Longer Registered with TEC)

**Scenario**: Lobbyist in your system but not in latest TEC data

**Current Gap**: No expiration/renewal handling

**Solution Needed**:
1. Flag profiles not in current year's TEC data
2. Email lobbyist: "We noticed you're not in 2025 TEC data. Update your status?"
3. Options:
   - "I'm still active, I'll update my TEC registration"
   - "I'm no longer lobbying, deactivate my profile"
   - "I'm taking a temporary break, keep my profile but mark as inactive"
4. Auto-deactivate after 6 months of no TEC registration + no response

### Edge Case 16: Suspicious Activity Detection

**Scenario**: Unusual account behavior suggesting compromise or fraud

**Gaps to Monitor**:
1. Multiple failed login attempts → Lock account, require password reset
2. Rapid profile changes after claim → Flag for admin review
3. Subscription churning (multiple rapid subscribe/cancel cycles) → Flag potential fraud
4. Multiple accounts from same IP claiming different profiles → Investigate
5. Payment disputes/chargebacks → Suspend premium features, investigate

**Solution Needed**: Build automated fraud detection rules + admin alert system

## Account Deletion Requirements (GDPR/CCPA Compliance)

### What Must Be Deleted:
1. User authentication credentials (email, password hash)
2. Personal contact information (phone, personal email)
3. Uploaded documents (verification photos)
4. Bio, photo, custom profile content
5. Account activity logs (after retention period)
6. Subscription payment methods (coordinate with Stripe)

### What Must Be Retained (Legal Requirements):
1. Transaction history (tax records): 7 years
2. Subscription invoices and payments: 7 years
3. Fraud investigation records: 7 years
4. Basic audit trail: "User ID [UUID] deleted on [date]"

### Deletion Process:
1. User requests deletion → 30-day grace period
2. During grace period:
   - Profile hidden from public
   - User can cancel deletion
   - Email reminder sent at day 7, 14, 21, 28
3. After 30 days:
   - Anonymize personal data: Replace with "Deleted User [UUID]"
   - Remove contact info
   - Delete uploaded files from Supabase Storage
   - Mark profile as `deleted`
   - Revoke Supabase Auth credentials
4. Retain financial records with anonymized user reference

**Database Requirements**:
```sql
-- Function to anonymize deleted user data
CREATE OR REPLACE FUNCTION anonymize_deleted_user(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE lobbyist_profiles
  SET 
    first_name = 'Deleted',
    last_name = 'User',
    email = CONCAT('deleted_', user_uuid, '@deleted.local'),
    phone = NULL,
    bio = NULL,
    photo_url = NULL,
    linkedin_url = NULL,
    website_url = NULL,
    status = 'deleted'
  WHERE claimed_by = user_uuid;
  
  DELETE FROM profile_claim_requests WHERE user_id = user_uuid;
  DELETE FROM account_merge_requests WHERE user_id = user_uuid;
  
  -- Note: Keep subscription records but anonymize user reference
  UPDATE subscriptions
  SET anonymized = TRUE
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;
```

## Email Notification Requirements

### Admin Email to enrizhulati@gmail.com:
1. **Profile Claim Request**: Immediate
   - Subject: "New Profile Claim Request - [Lobbyist Name]"
   - Body: Name, email, link to review in dashboard
2. **Account Merge Request**: Immediate
   - Subject: "Account Merge Request - [Lobbyist Name]"
3. **Fraud Report**: Immediate
   - Subject: "URGENT: Fraud Report - [Lobbyist Name]"
4. **Pending Claims Reminder**: Daily digest if any are >24 hours old
   - Subject: "Pending Profile Claims Need Review ([count])"

### User Emails:
1. **Email Verification**: Immediate after registration
2. **Claim Approved**: Within 1 hour of admin approval
3. **Claim Rejected**: Within 1 hour of admin rejection (include reason)
4. **Account Merge Approved**: After admin approval
5. **Subscription Confirmation**: After successful payment
6. **Subscription Renewal**: 7 days before auto-renewal
7. **Subscription Cancellation**: Immediate
8. **Account Deletion Scheduled**: Immediate after request
9. **Account Deletion Reminders**: Days 7, 14, 21, 28 of grace period
10. **Account Deletion Completed**: After final deletion
11. **Password Reset**: Immediate after request
12. **Email Change Confirmation**: To both old and new email
13. **Suspicious Activity Alert**: If fraud detected

## Critical Implementation Gaps to Verify

### Must Confirm Exists:
- [ ] Onboarding flow for self-registered lobbyists (you said "I think has already been coded")
- [ ] Profile claim button on public lobbyist profiles
- [ ] File upload for verification documents (Supabase Storage configured?)
- [ ] Admin dashboard with pending claims queue
- [ ] Email service configured (Resend.com? SendGrid?)
- [ ] Stripe subscription integration for premium tiers
- [ ] User authentication with role-based access (Supabase Auth)

### Must Build If Missing:
- [ ] Account merge request system
- [ ] Fraud reporting mechanism
- [ ] Account deletion with grace period
- [ ] Email change workflow with security checks
- [ ] Automated email notifications to admin
- [ ] Duplicate detection on registration
- [ ] Account type upgrade (searcher → lobbyist)
- [ ] Profile status management (active/inactive/deleted)
- [ ] TEC data sync/refresh strategy
- [ ] Subscription cancellation handling during deletion

## Recommended Admin Dashboard Views

1. **Pending Claims Queue**
   - Sort by: submission date (oldest first)
   - Show: Claimant name, email, profile name, verification doc, days pending
   - Actions: Approve, Reject (with reason), Request More Info

2. **Merge Requests Queue**
   - Show: Both profiles, user details, verification doc
   - Side-by-side comparison of profile data
   - Actions: Approve Merge, Reject, Request More Info

3. **Fraud Reports**
   - Priority queue (fraud reports at top)
   - Show: Reporter, reported profile, claim details, investigation status
   - Actions: Suspend Account, Revoke Claim, Dismiss Report

4. **Pending Deletions**
   - Show: User email, deletion scheduled date, days remaining
   - Actions: View Details, Cancel Deletion (if user requests)

5. **New Self-Registered Lobbyists**
   - Optional review queue for new profiles
   - Show: Profile completeness, verification status
   - Actions: Approve, Request Verification, Flag Suspicious

## Security Considerations

1. **Rate Limiting**:
   - Profile claims: Max 3 attempts per email per day
   - Account creation: Max 5 per IP per hour
   - Password reset: Max 5 per email per day

2. **Document Verification**:
   - Accept only: JPG, PNG, PDF
   - Max file size: 10MB
   - Scan for malware before storage
   - Automatic PII redaction (blur all but name on ID)

3. **Admin Authentication**:
   - 2FA required for admin accounts
   - Admin actions logged with IP and timestamp
   - Separate admin.texaslobby.org subdomain (optional)

4. **Data Encryption**:
   - Verification documents encrypted at rest (Supabase Storage handles this)
   - Sensitive fields encrypted in database (SSN if collected, payment info)

5. **Audit Trails**:
   - Log all claim approvals/rejections with admin ID
   - Log all account merges and deletions
   - Log all subscription changes
   - Retain logs for 7 years

## Next Steps

1. **Code Audit**: Review existing codebase against this document
2. **Identify Gaps**: List what's missing vs. what exists
3. **Prioritize**: High priority = blocking user flows, Medium = edge cases, Low = nice-to-haves
4. **Build Missing Components**: Start with core flows, then edge cases
5. **Test**: Create test accounts for every scenario in this document
6. **Document**: Add all edge case handling to user-facing help docs

## Questions for You

1. Is the onboarding flow for self-registered lobbyists actually coded? Where can I find it?
2. Have you configured Supabase Storage for document uploads?
3. What email service are you using? Is it configured to send to your personal email?
4. Does your Stripe integration handle subscription cancellations and refunds?
5. Do you have Supabase Row Level Security (RLS) policies in place for user data?
6. Is there any existing admin dashboard, or does that need to be built from scratch?
7. What's your preferred approach for fraud prevention: manual review or automated rules?
8. Should firm accounts (multiple lobbyists under one billing) be in MVP or v2?
