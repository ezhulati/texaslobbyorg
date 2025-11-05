import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

/**
 * Sign up a new user with email and password
 */
export async function signUp(
  email: string,
  password: string,
  metadata?: { full_name?: string }
): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${import.meta.env.PUBLIC_SITE_URL}/auth/verify`,
    },
  });

  if (error) {
    return { user: null, session: null, error: { message: error.message, code: error.status } };
  }

  return { user: data.user, session: data.session, error: null };
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { user: null, session: null, error: { message: error.message, code: error.status } };
  }

  return { user: data.user, session: data.session, error: null };
}

/**
 * Sign in with magic link (passwordless)
 */
export async function signInWithMagicLink(email: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${import.meta.env.PUBLIC_SITE_URL}/auth/verify`,
    },
  });

  if (error) {
    return { error: { message: error.message, code: error.status } };
  }

  return { error: null };
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: { message: error.message } };
  }

  return { error: null };
}

/**
 * Get the current user session
 */
export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    return null;
  }

  return data.session;
}

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${import.meta.env.PUBLIC_SITE_URL}/auth/reset-password`,
  });

  if (error) {
    return { error: { message: error.message } };
  }

  return { error: null };
}

/**
 * Update password (must be called from reset password flow)
 */
export async function updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: { message: error.message } };
  }

  return { error: null };
}

/**
 * Check if user is authenticated (server-side)
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}

/**
 * Get user role from database
 */
export async function getUserRole(userId: string): Promise<'searcher' | 'lobbyist' | 'admin' | null> {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role;
}

/**
 * Check if user has access to lobbyist profile
 */
export async function canEditProfile(userId: string, lobbyistId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('lobbyists')
    .select('user_id')
    .eq('id', lobbyistId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.user_id === userId;
}
