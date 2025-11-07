import type { APIRoute } from 'astro';
import { signOut } from '@/lib/auth';

const handleSignOut: APIRoute = async ({ cookies, redirect }) => {
  try {
    // Sign out from Supabase
    await signOut();

    // Clear session cookies
    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });

    // Redirect to home page
    return redirect('/');
  } catch (error) {
    console.error('Sign out error:', error);
    return redirect('/');
  }
};

export const POST: APIRoute = handleSignOut;
export const GET: APIRoute = handleSignOut;
