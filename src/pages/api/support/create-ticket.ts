import type { APIRoute } from 'astro';
import { createServerClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { subject, message, category, contact_email, contact_name } = body;

    // Validate required fields
    if (!subject || !message || !category || !contact_email || !contact_name) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: subject, message, category, contact_email, contact_name'
        }),
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['technical', 'billing', 'profile', 'other'];
    if (!validCategories.includes(category)) {
      return new Response(
        JSON.stringify({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` }),
        { status: 400 }
      );
    }

    // Validate message length
    if (message.length < 10 || message.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Message must be between 10 and 5000 characters' }),
        { status: 400 }
      );
    }

    // Get current user session if authenticated
    let userId: string | null = null;
    let lobbyistId: string | null = null;

    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (user) {
        userId = user.id;

        // Check if user has a lobbyist profile
        const { data: lobbyist } = await supabase
          .from('lobbyists')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (lobbyist) {
          lobbyistId = lobbyist.id;
        }
      }
    }

    // Create ticket (priority will be auto-set based on lobbyist tier via trigger)
    const { data: ticket, error: insertError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId,
        lobbyist_id: lobbyistId,
        subject,
        message,
        category,
        contact_email,
        contact_name,
        status: 'open'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating support ticket:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create support ticket' }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        ticket,
        message: 'Support ticket created successfully'
      }),
      { status: 201 }
    );

  } catch (error) {
    console.error('Error in support/create-ticket:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
