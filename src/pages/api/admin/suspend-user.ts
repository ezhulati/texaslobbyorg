import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';

/**
 * Suspend a user account (admin only)
 * Supports temporary or permanent suspensions
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Suspend User API] POST request received');

    // Get authenticated user using cookies
    const supabase = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Suspend User API] Not authenticated:', authError);
      return new Response(JSON.stringify({
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role using service client
    const serverClient = createServerClient();
    const { data: currentUserData } = await serverClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (currentUserData?.role !== 'admin') {
      console.error('[Suspend User API] User is not admin');
      return new Response(JSON.stringify({
        error: 'Admin access required'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await request.json();
    const {
      userId: targetUserId,
      reason,
      reasonCategory = 'other',
      duration, // number of days, or "permanent"
      internalNotes
    } = body;

    // Validate inputs
    if (!targetUserId) {
      return new Response(JSON.stringify({
        error: 'User ID is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!reason || reason.trim().length < 10) {
      return new Response(JSON.stringify({
        error: 'Suspension reason must be at least 10 characters'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validCategories = ['spam', 'abuse', 'terms_violation', 'fraud', 'other'];
    if (!validCategories.includes(reasonCategory)) {
      return new Response(JSON.stringify({
        error: 'Invalid reason category'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // CRITICAL: Prevent self-suspension
    if (targetUserId === user.id) {
      console.error('[Suspend User API] Admin attempting to suspend themselves');
      return new Response(JSON.stringify({
        error: 'You cannot suspend your own account'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get target user details
    const { data: targetUser, error: fetchError } = await serverClient
      .from('users')
      .select('id, email, full_name, role, is_suspended')
      .eq('id', targetUserId)
      .single();

    if (fetchError || !targetUser) {
      console.error('[Suspend User API] User not found:', fetchError);
      return new Response(JSON.stringify({
        error: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if already suspended
    if (targetUser.is_suspended) {
      return new Response(JSON.stringify({
        error: 'User is already suspended',
        isAlreadySuspended: true
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // CRITICAL: Check if suspending last admin
    if (targetUser.role === 'admin') {
      const { count: adminCount } = await serverClient
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('is_suspended', false);

      if (adminCount === 1) {
        console.error('[Suspend User API] Cannot suspend last admin');
        return new Response(JSON.stringify({
          error: 'Cannot suspend the last admin account. Promote another user to admin first.',
          isLastAdmin: true
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Calculate expiration date
    let expiresAt: string | null = null;
    if (duration && duration !== 'permanent') {
      const days = parseInt(duration);
      if (!isNaN(days) && days > 0) {
        const expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + days);
        expiresAt = expireDate.toISOString();
      }
    }

    console.log('[Suspend User API] Suspending user:', targetUserId, 'until:', expiresAt || 'permanent');

    // STEP 1: Create suspension record
    const { data: suspension, error: suspensionError } = await serverClient
      .from('user_suspensions')
      .insert({
        user_id: targetUserId,
        suspended_by: user.id,
        reason: reason.trim(),
        reason_category: reasonCategory,
        internal_notes: internalNotes || null,
        expires_at: expiresAt,
        is_active: true
      })
      .select('id, suspended_at, expires_at')
      .single();

    if (suspensionError) {
      console.error('[Suspend User API] Error creating suspension:', suspensionError);
      return new Response(JSON.stringify({
        error: 'Failed to create suspension record'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // STEP 2: Update user suspended flag
    const { error: updateError } = await serverClient
      .from('users')
      .update({
        is_suspended: true,
        suspended_at: suspension.suspended_at
      })
      .eq('id', targetUserId);

    if (updateError) {
      console.error('[Suspend User API] Error updating user:', updateError);
      // Rollback: delete suspension record
      await serverClient
        .from('user_suspensions')
        .delete()
        .eq('id', suspension.id);

      return new Response(JSON.stringify({
        error: 'Failed to suspend user account'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // STEP 3: Invalidate user sessions (force logout)
    // This requires admin.signOut which we'll do via service role
    try {
      await serverClient.auth.admin.signOut(targetUserId);
    } catch (signOutError) {
      // Non-critical if this fails - user will be blocked on next request
      console.warn('[Suspend User API] Could not force logout:', signOutError);
    }

    console.log('[Suspend User API] User suspended successfully:', targetUserId);

    // Log audit trail
    try {
      await serverClient.rpc('log_admin_action', {
        p_admin_id: user.id,
        p_action_type: 'user_suspended',
        p_action_description: `Suspended user ${targetUser.email}${expiresAt ? ' until ' + new Date(expiresAt).toLocaleDateString() : ' permanently'}`,
        p_target_user_id: targetUserId,
        p_metadata: {
          reason,
          reason_category: reasonCategory,
          duration: expiresAt ? 'temporary' : 'permanent',
          expires_at: expiresAt
        }
      });
    } catch (auditError) {
      console.warn('[Suspend User API] Failed to log audit trail:', auditError);
    }

    // Format response
    const isPermanent = !suspension.expires_at;
    const expiresAtFormatted = suspension.expires_at
      ? new Date(suspension.expires_at).toLocaleDateString()
      : null;

    return new Response(JSON.stringify({
      success: true,
      message: `User ${targetUser.full_name || targetUser.email} has been suspended ${isPermanent ? 'permanently' : 'until ' + expiresAtFormatted}`,
      suspension: {
        id: suspension.id,
        userId: targetUserId,
        suspended_at: suspension.suspended_at,
        expires_at: suspension.expires_at,
        is_permanent: isPermanent
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Suspend User API] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error?.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
