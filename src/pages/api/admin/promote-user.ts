import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';

/**
 * Promote a user to admin role
 * Only existing admins can promote users
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Promote User API] POST request received');

    // Get authenticated user using cookies
    const supabase = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Promote User API] Not authenticated:', authError);
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
      console.error('[Promote User API] User is not admin');
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

    // Prevent self-promotion (though already admin)
    if (targetUserId === user.id) {
      return new Response(JSON.stringify({
        error: 'You are already an admin'
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
      console.error('[Promote User API] User not found:', fetchError);
      return new Response(JSON.stringify({
        error: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if already admin
    if (targetUser.role === 'admin') {
      return new Response(JSON.stringify({
        error: 'User is already an admin'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Promote user to admin
    const { error: updateError } = await serverClient
      .from('users')
      .update({ role: 'admin' })
      .eq('id', targetUserId);

    if (updateError) {
      console.error('[Promote User API] Error promoting user:', updateError);
      return new Response(JSON.stringify({
        error: 'Failed to promote user'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Promote User API] User promoted successfully:', targetUserId);

    return new Response(JSON.stringify({
      success: true,
      message: `${targetUser.full_name || targetUser.email} has been promoted to admin`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        full_name: targetUser.full_name,
        role: 'admin'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Promote User API] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
