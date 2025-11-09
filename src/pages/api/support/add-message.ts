import type { APIRoute } from 'astro';
import { createServerClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { ticket_id, message } = body;

    if (!ticket_id || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: ticket_id, message' }),
        { status: 400 }
      );
    }

    // Validate message length
    if (message.length < 1 || message.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Message must be between 1 and 5000 characters' }),
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

    // Get ticket to verify ownership
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('user_id')
      .eq('id', ticket_id)
      .single();

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ error: 'Ticket not found' }),
        { status: 404 }
      );
    }

    // Check if user is admin or ticket owner
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userData?.role === 'admin';
    const isOwner = ticket.user_id === user.id;

    if (!isAdmin && !isOwner) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized to add messages to this ticket' }),
        { status: 403 }
      );
    }

    // Add message
    const { data: newMessage, error: insertError } = await supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id,
        user_id: user.id,
        message,
        is_admin: isAdmin
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error adding message:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to add message' }),
        { status: 500 }
      );
    }

    // If user is adding a message, update ticket status to 'waiting' if it was 'in_progress'
    if (isOwner && !isAdmin) {
      await supabase
        .from('support_tickets')
        .update({ status: 'waiting', updated_at: new Date().toISOString() })
        .eq('id', ticket_id)
        .eq('status', 'in_progress');
    }

    // If admin is adding a message, update ticket status to 'in_progress' if it was 'waiting'
    if (isAdmin) {
      await supabase
        .from('support_tickets')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', ticket_id)
        .eq('status', 'waiting');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: newMessage
      }),
      { status: 201 }
    );

  } catch (error) {
    console.error('Error in support/add-message:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
