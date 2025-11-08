import type { APIRoute } from 'astro';
import { createServerAuthClient } from '@/lib/supabase';

const handleSignOut: APIRoute = async ({ cookies, redirect }) => {
  try {
    // Create auth client with cookie context
    const supabase = createServerAuthClient(cookies);

    // Sign out from Supabase
    await supabase.auth.signOut();

    // Clear session cookies
    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });

    console.log('[Signout] User signed out successfully');

    // Redirect to home page
    return redirect('/');
  } catch (error) {
    console.error('[Signout] Error:', error);
    // Still clear cookies even if signout fails
    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });
    return redirect('/');
  }
};

export const POST: APIRoute = handleSignOut;
export const GET: APIRoute = handleSignOut;
