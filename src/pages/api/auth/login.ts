import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Login API] POST request received');
    const { email, password, firstName, lastName } = await request.json();
    console.log('[Login API] Attempting login for email:', email);

    // Use SSR auth client - this handles cookies automatically
    const supabase = createServerAuthClient(cookies);

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

    console.log('[Login API] Sign in successful, cookies set automatically by SSR client');

    // Use service role client for database operations
    const serverClient = createServerClient();

    // Check if user record exists, create only if it doesn't (first login)
    const { data: existingUser, error: checkError } = await serverClient
      .from('users')
      .select('id, role')
      .eq('id', data.user.id)
      .single();

    let userRole: 'searcher' | 'lobbyist' | 'admin' = 'searcher';

    // Only create user record on first login
    if (checkError && checkError.code === 'PGRST116') {
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
        console.error('[Login API] Error creating user record:', insertError);
      }

      userRole = userType as 'searcher' | 'lobbyist' | 'admin';
    } else if (existingUser) {
      userRole = existingUser.role;
    }

    console.log('[Login API] User role:', userRole);

    // SMART ROUTING: Determine redirect based on user role and status
    let redirectTo: string;

    if (userRole === 'admin') {
      // Admins go to admin dashboard
      redirectTo = '/admin';
      console.log('[Login API] Admin user, redirecting to admin dashboard');
    } else if (userRole === 'lobbyist') {
      // Check if lobbyist has a profile
      const { data: lobbyistProfile, error: profileError } = await serverClient
        .from('lobbyists')
        .select('id, slug')
        .eq('user_id', data.user.id)
        .single();

      if (!profileError && lobbyistProfile) {
        // Has profile, send to dashboard
        redirectTo = '/dashboard';
        console.log('[Login API] Lobbyist with profile, redirecting to dashboard');
      } else {
        // No profile, send to claim profile page
        redirectTo = '/claim-profile';
        console.log('[Login API] Lobbyist without profile, redirecting to claim profile');
      }
    } else {
      // Searcher - check if they have favorites
      const { data: favorites, error: favError } = await serverClient
        .from('favorites')
        .select('id')
        .eq('user_id', data.user.id)
        .limit(1);

      if (!favError && favorites && favorites.length > 0) {
        // Has favorites, send to favorites page
        redirectTo = '/favorites';
        console.log('[Login API] Searcher with favorites, redirecting to favorites page');
      } else {
        // No favorites, send to directory
        redirectTo = '/lobbyists';
        console.log('[Login API] Searcher without favorites, redirecting to directory');
      }
    }

    console.log('[Login API] Login complete, returning success with redirect:', redirectTo);
    return new Response(JSON.stringify({
      success: true,
      redirectTo,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: userRole,
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
