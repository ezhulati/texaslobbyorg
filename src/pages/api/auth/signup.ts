import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Signup API] POST request received');
    const { email, password, firstName, lastName, userType } = await request.json();
    console.log('[Signup API] Attempting signup for email:', email, 'userType:', userType);

    // Use service role client for pre-signup checks
    const serverClient = createServerClient();

    // STEP 1: Check if email already exists in auth.users
    const { data: existingAuthUsers, error: listError } = await serverClient.auth.admin.listUsers();

    if (!listError && existingAuthUsers) {
      const emailExists = existingAuthUsers.users.some(u => u.email === email.toLowerCase());
      if (emailExists) {
        console.log('[Signup API] Email already registered:', email);
        return new Response(JSON.stringify({
          error: 'This email is already registered. Please log in instead.',
          code: 'EMAIL_EXISTS'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // STEP 2: If user selected "lobbyist", check for existing unclaimed profile
    let unclaimedProfile = null;
    if (userType === 'lobbyist') {
      const { data: profile, error: profileError } = await serverClient
        .from('lobbyists')
        .select('id, slug, first_name, last_name, email')
        .eq('email', email)
        .eq('is_claimed', false)
        .single();

      if (!profileError && profile) {
        console.log('[Signup API] Found unclaimed profile for email:', email, 'Profile ID:', profile.id);
        unclaimedProfile = profile;
      }
    }

    // STEP 3: Create the auth user
    const supabase = createServerAuthClient(cookies);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          user_type: userType,
        },
        emailRedirectTo: `${import.meta.env.PUBLIC_SITE_URL}/auth/verify`,
      },
    });

    if (signUpError) {
      console.error('[Signup API] Supabase sign up error:', signUpError.message);
      return new Response(JSON.stringify({ error: signUpError.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!data.user) {
      console.error('[Signup API] No user created');
      return new Response(JSON.stringify({ error: 'Failed to create user' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Signup API] User created:', data.user.id);

    // STEP 4: Create user record in database
    // If unclaimed profile exists, set role to 'lobbyist' automatically
    const userRole = unclaimedProfile ? 'lobbyist' : (userType as 'searcher' | 'lobbyist' | 'admin');

    const { error: insertError } = await serverClient.from('users').insert({
      id: data.user.id,
      email: data.user.email!,
      role: userRole,
      full_name: `${firstName} ${lastName}`.trim() || null,
    });

    if (insertError) {
      console.error('[Signup API] Error creating user record:', insertError);
      // Don't fail the request - user was created in auth
    } else {
      console.log('[Signup API] User record created in database with role:', userRole);
    }

    // STEP 5: Determine redirect URL based on user type and profile status
    let redirectTo: string;

    if (unclaimedProfile) {
      // Auto-route to claim profile with pre-filled email
      redirectTo = `/claim-profile?email=${encodeURIComponent(email)}&auto=true`;
      console.log('[Signup API] Unclaimed profile detected, redirecting to claim flow');
    } else if (userType === 'lobbyist') {
      // No existing profile, send to create new profile
      redirectTo = '/create-profile';
      console.log('[Signup API] No existing profile, redirecting to create profile');
    } else {
      // Searcher - send to directory
      redirectTo = '/lobbyists';
      console.log('[Signup API] Searcher account, redirecting to directory');
    }

    console.log('[Signup API] Signup complete, returning success with redirect:', redirectTo);
    return new Response(JSON.stringify({
      success: true,
      redirectTo,
      hasUnclaimedProfile: !!unclaimedProfile,
      user: {
        id: data.user.id,
        email: data.user.email,
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Signup API] Error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Signup failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
