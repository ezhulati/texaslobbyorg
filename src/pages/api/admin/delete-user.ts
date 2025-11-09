import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';

/**
 * Permanently delete a user account (admin only)
 * WARNING: This is a hard delete and cannot be undone
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Delete User API] POST request received');

    // Get authenticated user using cookies
    const supabase = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Delete User API] Not authenticated:', authError);
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
      console.error('[Delete User API] User is not admin');
      return new Response(JSON.stringify({
        error: 'Admin access required'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get target user ID from request
    const body = await request.json();
    const { userId: targetUserId } = body;

    if (!targetUserId) {
      return new Response(JSON.stringify({
        error: 'User ID is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // CRITICAL: Prevent self-deletion
    if (targetUserId === user.id) {
      console.error('[Delete User API] Admin attempting to delete themselves');
      return new Response(JSON.stringify({
        error: 'You cannot delete your own account. Use Account Settings instead.'
      }), {
        status: 403,
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
      console.error('[Delete User API] User not found:', fetchError);
      return new Response(JSON.stringify({
        error: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // CRITICAL: Check if deleting last admin
    if (targetUser.role === 'admin') {
      const { count: adminCount } = await serverClient
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .is('deleted_at', null);

      if (adminCount === 1) {
        console.error('[Delete User API] Cannot delete last admin');
        return new Response(JSON.stringify({
          error: 'Cannot delete the last admin account. Promote another user to admin first.',
          isLastAdmin: true
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('[Delete User API] Starting hard delete for user:', targetUserId);

    // STEP 1: Delete user data from database (cascades to related tables)
    const { error: deleteDbError } = await serverClient
      .from('users')
      .delete()
      .eq('id', targetUserId);

    if (deleteDbError) {
      console.error('[Delete User API] Error deleting user data:', deleteDbError);
      return new Response(JSON.stringify({
        error: 'Failed to delete user data from database'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // STEP 2: Delete auth user
    const { error: deleteAuthError } = await serverClient.auth.admin.deleteUser(targetUserId);

    if (deleteAuthError) {
      console.error('[Delete User API] Error deleting auth user:', deleteAuthError);
      // Try to rollback by recreating user record
      await serverClient.from('users').insert({
        id: targetUserId,
        email: targetUser.email,
        full_name: targetUser.full_name,
        role: targetUser.role,
      });

      return new Response(JSON.stringify({
        error: 'Failed to delete authentication account. User data has been restored.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Delete User API] User permanently deleted:', targetUserId);

    return new Response(JSON.stringify({
      success: true,
      message: `User ${targetUser.full_name || targetUser.email} has been permanently deleted`,
      deletedUser: {
        id: targetUser.id,
        email: targetUser.email,
        full_name: targetUser.full_name,
        role: targetUser.role
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Delete User API] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error?.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
