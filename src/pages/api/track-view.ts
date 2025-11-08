import type { APIRoute } from 'astro';
import { createServerClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { lobbyistId } = await request.json();

    if (!lobbyistId) {
      return new Response(JSON.stringify({ error: 'Lobbyist ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createServerClient();

    // Call the database function to increment view count
    const { error } = await supabase.rpc('increment_view_count', {
      lobbyist_id: lobbyistId,
    });

    if (error) {
      console.error('Error tracking view:', error);
      return new Response(JSON.stringify({ error: 'Failed to track view' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Track view error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Failed to track view' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
