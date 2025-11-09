import type { APIRoute } from 'astro';
import { createServerClient } from '@/lib/supabase';

export const PUT: APIRoute = async ({ request }) => {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { id, status, priority, assigned_to, admin_notes, resolution_notes } = body;

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

    // Get existing ticket
    const { data: existing, error: fetchError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return new Response(
        JSON.stringify({ error: 'Ticket not found' }),
        { status: 404 }
      );
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userData?.role === 'admin';
    const isOwner = existing.user_id === user.id;

    // Build update object
    const updates: any = {};

    // Admin-only fields
    if (isAdmin) {
      if (status !== undefined) {
        const validStatuses = ['open', 'in_progress', 'waiting', 'resolved', 'closed'];
        if (!validStatuses.includes(status)) {
          return new Response(
            JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }),
            { status: 400 }
          );
        }
        updates.status = status;
      }
      if (priority !== undefined) {
        const validPriorities = ['low', 'normal', 'high', 'urgent'];
        if (!validPriorities.includes(priority)) {
          return new Response(
            JSON.stringify({ error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` }),
            { status: 400 }
          );
        }
        updates.priority = priority;
      }
      if (assigned_to !== undefined) updates.assigned_to = assigned_to;
      if (admin_notes !== undefined) updates.admin_notes = admin_notes;
      if (resolution_notes !== undefined) updates.resolution_notes = resolution_notes;
    }

    // Owners can only close their own tickets
    if (isOwner && !isAdmin) {
      if (status && status !== 'closed') {
        return new Response(
          JSON.stringify({ error: 'You can only close your own tickets' }),
          { status: 403 }
        );
      }
      if (status === 'closed') {
        updates.status = 'closed';
      }
    }

    // If neither admin nor owner, deny access
    if (!isAdmin && !isOwner) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized to update this ticket' }),
        { status: 403 }
      );
    }

    // If no updates, return error
    if (Object.keys(updates).length === 0) {
      return new Response(
        JSON.stringify({ error: 'No updates provided' }),
        { status: 400 }
      );
    }

    // Update ticket
    const { data: updated, error: updateError } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating ticket:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update ticket' }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        ticket: updated
      }),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in support/update-ticket:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
