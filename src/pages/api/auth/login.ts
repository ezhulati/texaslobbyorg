import type { APIRoute } from 'astro';
import { supabase, createServerClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Login API] POST request received');
    const { email, password, firstName, lastName } = await request.json();
    console.log('[Login API] Attempting login for email:', email);

    // Sign in with Supabase (use public client for auth)
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('[Login API] Supabase sign in error:', signInError.message);
      return new Response(JSON.stringify({ error: signInError.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!data.session) {
      console.error('[Login API] No session created');
      return new Response(JSON.stringify({ error: 'No session created' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Login API] Sign in successful, setting cookies');
    // Store session tokens in HTTP-only cookies
    const isProduction = import.meta.env.PROD || process.env.NODE_ENV === 'production';
    console.log('[Login API] Is production:', isProduction, 'Secure cookies:', isProduction);

    cookies.set('sb-access-token', data.session.access_token, {
      path: '/',
      httpOnly: true,
      secure: isProduction, // Only require HTTPS in production
      sameSite: 'lax',
      maxAge: data.session.expires_in,
    });

    cookies.set('sb-refresh-token', data.session.refresh_token, {
      path: '/',
      httpOnly: true,
      secure: isProduction, // Only require HTTPS in production
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Use service role client for database operations
    const serverClient = createServerClient();

    // Check if user record exists, create only if it doesn't (first login)
    const { data: existingUser, error: checkError } = await serverClient
      .from('users')
      .select('id')
      .eq('id', data.user.id)
      .single();

    // Only create user record on first login, don't update role on subsequent logins
    if (checkError && checkError.code === 'PGRST116') {
      // User doesn't exist, create new record
      const userFirstName = firstName || data.user.user_metadata?.first_name || null;
      const userLastName = lastName || data.user.user_metadata?.last_name || null;
      const userType = data.user.user_metadata?.user_type || 'searcher';

      const { error: insertError } = await serverClient.from('users').insert({
        id: data.user.id,
        email: data.user.email!,
        role: userType as 'searcher' | 'lobbyist' | 'admin',
        full_name: userFirstName && userLastName ? `${userFirstName} ${userLastName}`.trim() : null,
      });

      if (insertError) {
        console.error('Error creating user record:', insertError);
        // Continue even if insert fails - user is authenticated
      }
    }
    // If user exists, don't modify their role

    // Return success
    console.log('[Login API] Login complete, returning success response');
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Login failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
