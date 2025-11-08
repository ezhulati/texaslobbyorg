import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';

/**
 * Export all user data in JSON format (GDPR compliance)
 * Returns user profile, favorites, page views, and lobbyist data if applicable
 */
export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Create auth client with cookie context
    const authClient = createServerAuthClient(cookies);

    // Get the current user
    const { data: { user }, error: userError } = await authClient.auth.getUser();

    if (userError || !user) {
      console.error('[Export Data] Authentication error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use service role client to fetch all data
    const supabase = createServerClient();

    // Fetch user profile
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userDataError) {
      console.error('[Export Data] Error fetching user:', userDataError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user data' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch favorites
    const { data: favorites } = await supabase
      .from('favorites')
      .select(`
        id,
        created_at,
        lobbyist:lobbyists(
          id,
          first_name,
          last_name,
          email,
          slug
        )
      `)
      .eq('user_id', user.id);

    // Fetch lobbyist profile if user is a lobbyist
    let lobbyistProfile = null;
    if (userData.role === 'lobbyist') {
      const { data: lobbyist } = await supabase
        .from('lobbyists')
        .select('*')
        .eq('user_id', user.id)
        .single();
      lobbyistProfile = lobbyist;
    }

    // Fetch page view history (as viewer)
    const { data: pageViews } = await supabase
      .from('page_views')
      .select('id, created_at, lobbyist_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    // Compile all data
    const exportData = {
      exported_at: new Date().toISOString(),
      user: {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        first_name: userData.first_name,
        last_name: userData.last_name,
        full_name: userData.full_name,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
      },
      favorites: favorites || [],
      lobbyist_profile: lobbyistProfile,
      page_view_history: pageViews || [],
      metadata: {
        total_favorites: favorites?.length || 0,
        total_page_views: pageViews?.length || 0,
        has_lobbyist_profile: !!lobbyistProfile,
      },
    };

    // Return as downloadable JSON file
    const fileName = `texaslobby-data-export-${user.id}-${Date.now()}.json`;

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('[Export Data] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
