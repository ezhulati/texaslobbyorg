import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';

  if (code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Error exchanging code for session:', error);
        return redirect('/login?error=auth_failed');
      }

      if (data.session) {
        // Set session cookies
        cookies.set('sb-access-token', data.session.access_token, {
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 1 week
        });

        cookies.set('sb-refresh-token', data.session.refresh_token, {
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        // Create or update user record
        if (data.user) {
          const { error: upsertError } = await supabase.from('users').upsert({
            id: data.user.id,
            email: data.user.email!,
            role: 'searcher',
            full_name: data.user.user_metadata?.full_name || null,
          });

          if (upsertError) {
            console.error('Error creating user record:', upsertError);
          }
        }

        return redirect(next);
      }
    } catch (err) {
      console.error('Auth callback error:', err);
      return redirect('/login?error=server_error');
    }
  }

  // If no code, redirect to login
  return redirect('/login');
};
