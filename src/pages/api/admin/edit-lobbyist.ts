import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';

/**
 * Update lobbyist profile fields (admin only)
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Edit Lobbyist API] POST request received');

    // Get authenticated user
    const supabase = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Edit Lobbyist API] Not authenticated:', authError);
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
      console.error('[Edit Lobbyist API] User is not admin');
      return new Response(JSON.stringify({
        error: 'Admin access required'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await request.json();
    const { lobbyistId, ...updates } = body;

    if (!lobbyistId) {
      return new Response(JSON.stringify({
        error: 'Lobbyist ID is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get lobbyist details for audit log
    const { data: lobbyist, error: fetchError } = await serverClient
      .from('lobbyists')
      .select('id, first_name, last_name, email')
      .eq('id', lobbyistId)
      .single();

    if (fetchError || !lobbyist) {
      console.error('[Edit Lobbyist API] Lobbyist not found:', fetchError);
      return new Response(JSON.stringify({
        error: 'Lobbyist not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Edit Lobbyist API] Updating lobbyist:', lobbyistId, 'with:', updates);

    // Build update object - only include provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    // Basic info fields
    if (updates.first_name !== undefined) updateData.first_name = updates.first_name;
    if (updates.last_name !== undefined) updateData.last_name = updates.last_name;
    if (updates.email !== undefined) updateData.email = updates.email || null;
    if (updates.phone !== undefined) updateData.phone = updates.phone || null;
    if (updates.website !== undefined) updateData.website = updates.website || null;
    if (updates.linkedin_url !== undefined) updateData.linkedin_url = updates.linkedin_url || null;
    if (updates.bio !== undefined) updateData.bio = updates.bio || null;
    if (updates.years_experience !== undefined) updateData.years_experience = updates.years_experience ? parseInt(updates.years_experience) : null;

    // Array fields
    if (updates.cities !== undefined) updateData.cities = updates.cities;
    if (updates.subject_areas !== undefined) updateData.subject_areas = updates.subject_areas;

    // Update lobbyist
    const { error: updateError } = await serverClient
      .from('lobbyists')
      .update(updateData)
      .eq('id', lobbyistId);

    if (updateError) {
      console.error('[Edit Lobbyist API] Error updating lobbyist:', updateError);
      return new Response(JSON.stringify({
        error: 'Failed to update lobbyist'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Edit Lobbyist API] Lobbyist updated successfully:', lobbyistId);

    // Log audit trail
    try {
      await serverClient.rpc('log_admin_action', {
        p_admin_id: user.id,
        p_action_type: 'lobbyist_edited',
        p_action_description: `Edited profile for ${lobbyist.first_name} ${lobbyist.last_name} (${lobbyist.email})`,
        p_target_user_id: null,
        p_metadata: { lobbyist_id: lobbyistId, updated_fields: Object.keys(updateData) }
      });
    } catch (auditError) {
      console.warn('[Edit Lobbyist API] Failed to log audit trail:', auditError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Lobbyist updated successfully',
      lobbyistId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Edit Lobbyist API] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error?.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
