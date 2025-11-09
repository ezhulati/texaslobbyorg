import type { APIRoute } from 'astro';
import { createServerClient } from '@/lib/supabase';

export const DELETE: APIRoute = async ({ request, url }) => {
  try {
    const supabase = createServerClient();
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: id' }),
        { status: 400 }
      );
    }

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

    // Get existing testimonial
    const { data: existing, error: fetchError } = await supabase
      .from('testimonials')
      .select('*, lobbyists!inner(user_id)')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return new Response(
        JSON.stringify({ error: 'Testimonial not found' }),
        { status: 404 }
      );
    }

    // Check if user is admin or owns the lobbyist profile
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userData?.role === 'admin';
    const isOwner = existing.lobbyists.user_id === user.id;

    if (!isAdmin && !isOwner) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized to delete this testimonial' }),
        { status: 403 }
      );
    }

    // Delete testimonial
    const { error: deleteError } = await supabase
      .from('testimonials')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting testimonial:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete testimonial' }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Testimonial deleted successfully'
      }),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in testimonials/delete:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
