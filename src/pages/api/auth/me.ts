import type { APIRoute } from 'astro';
import { createServerAuthClient } from '@/lib/supabase';

export const GET: APIRoute = async ({ cookies }) => {
  const auth = createServerAuthClient(cookies);
  const { data: { user }, error } = await auth.auth.getUser();
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!user) {
    return new Response(JSON.stringify({ userId: null, role: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ userId: user.id, role: user.user_metadata?.user_type || null }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

