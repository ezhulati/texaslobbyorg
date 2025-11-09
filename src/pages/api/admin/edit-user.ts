import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';

/**
 * Edit user information (admin only)
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Edit User API] POST request received');

    // Get authenticated user using cookies
    const supabase = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Edit User API] Not authenticated:', authError);
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
      console.error('[Edit User API] User is not admin');
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
      full_name,
      email,
      role
    } = body;

    if (!targetUserId) {
      return new Response(JSON.stringify({
        error: 'User ID is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate email if changed
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({
        error: 'Invalid email format'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate role
    const validRoles = ['admin', 'lobbyist', 'searcher'];
    if (role && !validRoles.includes(role)) {
      return new Response(JSON.stringify({
        error: 'Invalid role. Must be: admin, lobbyist, or searcher'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get target user details
    const { data: targetUser, error: fetchError } = await serverClient
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', targetUserId)
      .single();

    if (fetchError || !targetUser) {
      console.error('[Edit User API] User not found:', fetchError);
      return new Response(JSON.stringify({
        error: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // CRITICAL: If changing role FROM admin, check if last admin
    if (targetUser.role === 'admin' && role && role !== 'admin') {
      const { count: adminCount } = await serverClient
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('is_suspended', false);

      if (adminCount === 1) {
        console.error('[Edit User API] Cannot demote last admin');
        return new Response(JSON.stringify({
          error: 'Cannot demote the last admin account. Promote another user to admin first.',
          isLastAdmin: true
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('[Edit User API] Updating user:', targetUserId);

    // Build update object (only include fields that were provided)
    const updates: any = {};
    if (full_name !== undefined) updates.full_name = full_name?.trim() || null;
    if (email !== undefined) updates.email = email.trim();
    if (role !== undefined) updates.role = role;

    // Update user
    const { error: updateError } = await serverClient
      .from('users')
      .update(updates)
      .eq('id', targetUserId);

    if (updateError) {
      console.error('[Edit User API] Error updating user:', updateError);

      // Check if email conflict
      if (updateError.code === '23505') {
        return new Response(JSON.stringify({
          error: 'Email already in use by another account'
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        error: 'Failed to update user information'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Edit User API] User updated successfully:', targetUserId);

    // Log audit trail
    try {
      const changes: any = {};
      if (full_name !== undefined && full_name !== targetUser.full_name) {
        changes.full_name = { old: targetUser.full_name, new: full_name };
      }
      if (email !== undefined && email !== targetUser.email) {
        changes.email = { old: targetUser.email, new: email };
      }
      if (role !== undefined && role !== targetUser.role) {
        changes.role = { old: targetUser.role, new: role };
      }

      if (Object.keys(changes).length > 0) {
        await serverClient.rpc('log_admin_action', {
          p_admin_id: user.id,
          p_action_type: 'user_updated',
          p_action_description: `Updated user information for ${targetUser.email}`,
          p_target_user_id: targetUserId,
          p_metadata: changes
        });
      }
    } catch (auditError) {
      console.warn('[Edit User API] Failed to log audit trail:', auditError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `User information updated successfully`,
      userId: targetUserId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Edit User API] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error?.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
