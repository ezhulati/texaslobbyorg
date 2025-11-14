import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const auth = createServerAuthClient(cookies);
    const { data: { user }, error } = await auth.auth.getUser();
    if (error || !user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const server = createServerClient();
    const { data, error: dbError } = await server
      .from('lobbyists')
      .select('id')
      .or(`user_id.eq.${user.id},claimed_by.eq.${user.id}`)
      .limit(1)
      .maybeSingle();

    if (dbError) {
      return new Response(JSON.stringify({ error: 'Failed to resolve lobbyist profile', details: dbError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!data) {
      return new Response(JSON.stringify({ lobbyistId: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ lobbyistId: data.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Unexpected error', details: e?.message || String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

