import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { email, password, firstName, lastName } = await request.json();

    // Sign in with Supabase
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return new Response(JSON.stringify({ error: signInError.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!data.session) {
      return new Response(JSON.stringify({ error: 'No session created' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Store session tokens in HTTP-only cookies
    cookies.set('sb-access-token', data.session.access_token, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: data.session.expires_in,
    });

    cookies.set('sb-refresh-token', data.session.refresh_token, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Check if user record exists, create only if it doesn't (first login)
    const { data: existingUser, error: checkError } = await supabase
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

      const { error: insertError } = await supabase.from('users').insert({
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
