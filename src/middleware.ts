import { defineMiddleware } from 'astro:middleware';
import { createServerAuthClient, createServerClient } from './lib/supabase';
import type { CurrentUser } from './lib/auth-helpers';

// Define types for Astro.locals
declare global {
  namespace App {
    interface Locals {
      user: CurrentUser | null;
      isAuthenticated: boolean;
    }
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  try {
    // Create auth client with cookies - this runs BEFORE response is sent
    const supabaseAuth = createServerAuthClient(context.cookies);
    const { data: { user }, error } = await supabaseAuth.auth.getUser();

    if (error || !user) {
      // No authenticated user
      context.locals.user = null;
      context.locals.isAuthenticated = false;
      return next();
    }

    // Fetch user profile from database using service role client
    const serverClient = createServerClient();
    const { data: profile, error: profileError } = await serverClient
      .from('users')
      .select('id, email, role, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // User exists in auth but not in users table
      context.locals.user = {
        id: user.id,
        email: user.email!,
        role: 'searcher',
        full_name: null,
      };
      context.locals.isAuthenticated = true;
    } else {
      // User found in database
      context.locals.user = profile;
      context.locals.isAuthenticated = true;
    }
  } catch (error) {
    console.error('[Middleware] Error getting user:', error);
    context.locals.user = null;
    context.locals.isAuthenticated = false;
  }

  return next();
});
