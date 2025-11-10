import type { APIRoute } from 'astro';
import { createServerAuthClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Create auth client with cookie context
    const supabase = createServerAuthClient(cookies);

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('[Update Profile] Authentication error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get request body
    const body = await request.json();
    const { first_name, last_name } = body;

    // Validate input
    if (!first_name || typeof first_name !== 'string' || first_name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'First name is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare update data
    const updateData: { first_name: string; last_name: string | null; full_name: string } = {
      first_name: first_name.trim(),
      last_name: last_name && typeof last_name === 'string' ? last_name.trim() : null,
      full_name: `${first_name.trim()} ${last_name?.trim() || ''}`.trim(),
    };

    // Update user profile in the users table
    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update profile' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Also update lobbyist profile if user is a lobbyist
    // Check both user_id and claimed_by fields
    const { error: lobbyistUpdateError } = await supabase
      .from('lobbyists')
      .update({
        first_name: updateData.first_name,
        last_name: updateData.last_name,
      })
      .or(`user_id.eq.${user.id},claimed_by.eq.${user.id}`);

    if (lobbyistUpdateError) {
      console.error('Error updating lobbyist profile:', lobbyistUpdateError);
      // Don't fail the whole request, just log the error
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Profile updated successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in update-profile:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
