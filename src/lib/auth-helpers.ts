import { supabase, createServerAuthClient, createServerClient } from './supabase';
import type { Database } from './database.types';

type UserRole = Database['public']['Enums']['user_role'];

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
}

/**
 * Get the currently authenticated user from cookies (server-side)
 * This should be called in Astro components, not client-side React
 */
export async function getCurrentUser(cookies?: any): Promise<CurrentUser | null> {
  try {
    // If we have cookies (Astro context), use server-side auth client
    // This properly reads auth session from HTTP-only cookies
    if (cookies) {
      const supabaseAuth = createServerAuthClient(cookies);
      const { data: { user }, error } = await supabaseAuth.auth.getUser();

      if (error || !user) {
        return null;
      }

      // Fetch user profile data including role using service role client
      const serverClient = createServerClient();
      const { data: profile, error: profileError } = await serverClient
        .from('users')
        .select('id, email, role, full_name')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        // User exists in auth but not in users table - shouldn't happen, but return default
        return {
          id: user.id,
          email: user.email!,
          role: 'searcher', // Default role
          full_name: null,
        };
      }

      return profile;
    }

    // Fallback to public client (for non-Astro contexts)
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Fetch user profile data including role
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, role, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // User exists in auth but not in users table - shouldn't happen, but return default
      return {
        id: user.id,
        email: user.email!,
        role: 'searcher', // Default role
        full_name: null,
      };
    }

    return profile;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get user role from database
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.role;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * Check if user has a claimed lobbyist profile
 */
export async function hasClaimedProfile(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('lobbyists')
      .select('id')
      .eq('user_id', userId)
      .eq('is_claimed', true)
      .single();

    return !error && data !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Get lobbyist profile slug for a user
 */
export async function getLobbyistSlug(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('lobbyists')
      .select('slug')
      .eq('user_id', userId)
      .eq('is_claimed', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data.slug;
  } catch (error) {
    return null;
  }
}
