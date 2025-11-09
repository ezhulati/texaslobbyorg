import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';

/**
 * Update lobbyist subscription tier (admin only)
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Update Lobbyist Tier API] POST request received');

    // Get authenticated user
    const supabase = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Update Lobbyist Tier API] Not authenticated:', authError);
      return new Response(JSON.stringify({
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role
    const serverClient = createServerClient();
    const { data: currentUserData } = await serverClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (currentUserData?.role !== 'admin') {
      console.error('[Update Lobbyist Tier API] User is not admin');
      return new Response(JSON.stringify({
        error: 'Admin access required'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await request.json();
    const { lobbyistId, tier } = body;

    if (!lobbyistId || !tier) {
      return new Response(JSON.stringify({
        error: 'Lobbyist ID and tier are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate tier
    const validTiers = ['free', 'premium', 'featured'];
    if (!validTiers.includes(tier)) {
      return new Response(JSON.stringify({
        error: 'Invalid tier. Must be one of: free, premium, featured'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get lobbyist details
    const { data: lobbyist, error: fetchError } = await serverClient
      .from('lobbyists')
      .select('id, first_name, last_name, email, subscription_tier')
      .eq('id', lobbyistId)
      .single();

    if (fetchError || !lobbyist) {
      console.error('[Update Lobbyist Tier API] Lobbyist not found:', fetchError);
      return new Response(JSON.stringify({
        error: 'Lobbyist not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Update Lobbyist Tier API] Updating tier for lobbyist:', lobbyistId);

    // Update subscription tier
    const { error: updateError } = await serverClient
      .from('lobbyists')
      .update({
        subscription_tier: tier,
        updated_at: new Date().toISOString()
      })
      .eq('id', lobbyistId);

    if (updateError) {
      console.error('[Update Lobbyist Tier API] Error updating lobbyist:', updateError);
      return new Response(JSON.stringify({
        error: 'Failed to update subscription tier'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Update Lobbyist Tier API] Tier updated successfully:', lobbyistId);

    // Log audit trail
    try {
      await serverClient.rpc('log_admin_action', {
        p_admin_id: user.id,
        p_action_type: 'lobbyist_tier_updated',
        p_action_description: `Updated subscription tier for ${lobbyist.first_name} ${lobbyist.last_name} (${lobbyist.email})`,
        p_target_user_id: null,
        p_metadata: {
          lobbyist_id: lobbyistId,
          previous_tier: lobbyist.subscription_tier,
          new_tier: tier
        }
      });
    } catch (auditError) {
      console.warn('[Update Lobbyist Tier API] Failed to log audit trail:', auditError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Subscription tier updated to ${tier} for ${lobbyist.first_name} ${lobbyist.last_name}`,
      lobbyistId,
      tier
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Update Lobbyist Tier API] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error?.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
