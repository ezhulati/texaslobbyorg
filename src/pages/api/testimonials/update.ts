import type { APIRoute } from 'astro';
import { createServerClient } from '@/lib/supabase';

export const PUT: APIRoute = async ({ request }) => {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { id, client_name, client_company, client_title, testimonial_text, rating, is_approved, is_featured, display_order } = body;

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: id' }),
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
        JSON.stringify({ error: 'Unauthorized to update this testimonial' }),
        { status: 403 }
      );
    }

    // Build update object
    const updates: any = {};

    if (client_name !== undefined) updates.client_name = client_name;
    if (client_company !== undefined) updates.client_company = client_company;
    if (client_title !== undefined) updates.client_title = client_title;
    if (testimonial_text !== undefined) {
      if (testimonial_text.length < 10 || testimonial_text.length > 2000) {
        return new Response(
          JSON.stringify({ error: 'Testimonial text must be between 10 and 2000 characters' }),
          { status: 400 }
        );
      }
      updates.testimonial_text = testimonial_text;
    }
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return new Response(
          JSON.stringify({ error: 'Rating must be between 1 and 5' }),
          { status: 400 }
        );
      }
      updates.rating = rating;
    }

    // Only admins can change approval status
    if (isAdmin) {
      if (is_approved !== undefined) updates.is_approved = is_approved;
      if (is_featured !== undefined) updates.is_featured = is_featured;
      if (display_order !== undefined) updates.display_order = display_order;
    }

    // Owners can only update unapproved testimonials
    if (isOwner && !isAdmin && existing.is_approved) {
      return new Response(
        JSON.stringify({ error: 'Cannot update approved testimonials' }),
        { status: 403 }
      );
    }

    // Update testimonial
    const { data: updated, error: updateError } = await supabase
      .from('testimonials')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating testimonial:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update testimonial' }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        testimonial: updated
      }),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in testimonials/update:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
