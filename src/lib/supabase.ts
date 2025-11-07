import { createClient } from '@supabase/supabase-js';
import { createServerClient as createSSRClient } from '@supabase/ssr';
import type { Database } from './database.types';
import type { AstroCookies } from 'astro';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client-side Supabase client (for browser usage)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Server-side client with service role (for admin operations)
export const createServerClient = () => {
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('Missing Supabase service role key');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

/**
 * Create a Supabase client for server-side use with cookie-based auth
 * This should be used in Astro pages/API routes to access authenticated user sessions
 */
export const createServerAuthClient = (cookies: AstroCookies) => {
  return createSSRClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookies.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookies.delete(name, options);
        },
      },
    }
  );
};
