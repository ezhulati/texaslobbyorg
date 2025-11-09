import type { APIRoute } from 'astro';
import { createServerClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    // Validate required fields
    const { lobbyist_id, client_name, testimonial_text, client_company, client_title, rating } = body;

    if (!lobbyist_id || !client_name || !testimonial_text) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: lobbyist_id, client_name, testimonial_text'
        }),
        { status: 400 }
      );
    }

    // Validate testimonial text length
    if (testimonial_text.length < 10 || testimonial_text.length > 2000) {
      return new Response(
        JSON.stringify({
          error: 'Testimonial text must be between 10 and 2000 characters'
        }),
        { status: 400 }
      );
    }

    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      return new Response(
        JSON.stringify({
          error: 'Rating must be between 1 and 5'
        }),
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

    // Verify user owns this lobbyist profile
    const { data: lobbyist, error: lobbyistError } = await supabase
      .from('lobbyists')
      .select('id, subscription_tier')
      .eq('id', lobbyist_id)
      .eq('user_id', user.id)
      .single();

    if (lobbyistError || !lobbyist) {
      return new Response(
        JSON.stringify({ error: 'Lobbyist profile not found or unauthorized' }),
        { status: 404 }
      );
    }

    // Check testimonial count vs tier limits
    const { count, error: countError } = await supabase
      .from('testimonials')
      .select('*', { count: 'exact', head: true })
      .eq('lobbyist_id', lobbyist_id);

    if (countError) {
      return new Response(
        JSON.stringify({ error: 'Failed to check testimonial limit' }),
        { status: 500 }
      );
    }

    const limits = {
      free: 0,
      premium: 10,
      featured: 999999
    };

    const maxAllowed = limits[lobbyist.subscription_tier as keyof typeof limits];

    if ((count || 0) >= maxAllowed) {
      return new Response(
        JSON.stringify({
          error: `Testimonial limit reached for ${lobbyist.subscription_tier} tier (max: ${maxAllowed})`
        }),
        { status: 403 }
      );
    }

    // Insert testimonial
    const { data: testimonial, error: insertError } = await supabase
      .from('testimonials')
      .insert({
        lobbyist_id,
        client_name,
        client_company,
        client_title,
        testimonial_text,
        rating,
        is_approved: false // Requires admin approval
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating testimonial:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create testimonial' }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        testimonial,
        message: 'Testimonial created and pending approval'
      }),
      { status: 201 }
    );

  } catch (error) {
    console.error('Error in testimonials/create:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
