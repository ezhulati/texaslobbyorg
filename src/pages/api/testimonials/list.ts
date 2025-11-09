import type { APIRoute } from 'astro';
import { createServerClient } from '@/lib/supabase';

export const GET: APIRoute = async ({ url, request }) => {
  try {
    const supabase = createServerClient();
    const lobbyist_id = url.searchParams.get('lobbyist_id');
    const include_unapproved = url.searchParams.get('include_unapproved') === 'true';

    if (!lobbyist_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: lobbyist_id' }),
        { status: 400 }
      );
    }

    let query = supabase
      .from('testimonials')
      .select('*')
      .eq('lobbyist_id', lobbyist_id)
      .order('created_at', { ascending: false });

    // If not requesting unapproved, only show approved testimonials
    if (!include_unapproved) {
      query = query.eq('is_approved', true);
    } else {
      // Verify user is authorized to see unapproved testimonials
      const authHeader = request.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);

        if (user) {
          // Check if user owns this lobbyist profile
          const { data: lobbyist } = await supabase
            .from('lobbyists')
            .select('id')
            .eq('id', lobbyist_id)
            .eq('user_id', user.id)
            .single();

          // If not the owner, only show approved
          if (!lobbyist) {
            query = query.eq('is_approved', true);
          }
        } else {
          query = query.eq('is_approved', true);
        }
      } else {
        query = query.eq('is_approved', true);
      }
    }

    const { data: testimonials, error } = await query;

    if (error) {
      console.error('Error fetching testimonials:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch testimonials' }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        testimonials: testimonials || [],
        count: testimonials?.length || 0
      }),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in testimonials/list:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
