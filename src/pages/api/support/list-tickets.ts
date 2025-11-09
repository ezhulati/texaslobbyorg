import type { APIRoute} from 'astro';
import { createServerClient } from '@/lib/supabase';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const supabase = createServerClient();

    // Get current user session
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userData?.role === 'admin';

    // Build query based on role
    let query = supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by parameters
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');
    const category = url.searchParams.get('category');

    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (category) query = query.eq('category', category);

    // Non-admins can only see their own tickets
    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { data: tickets, error } = await query;

    if (error) {
      console.error('Error fetching support tickets:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch support tickets' }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        tickets: tickets || [],
        count: tickets?.length || 0
      }),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in support/list-tickets:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
