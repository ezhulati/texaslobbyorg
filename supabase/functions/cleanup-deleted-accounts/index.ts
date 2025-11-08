/**
 * Supabase Edge Function: Cleanup Deleted Accounts
 *
 * This function should be scheduled to run daily (e.g., via cron job)
 * It permanently deletes accounts whose grace period has expired
 *
 * Setup Instructions:
 * 1. Deploy this function: supabase functions deploy cleanup-deleted-accounts
 * 2. Set up a cron job (external service like cron-job.org or GitHub Actions)
 * 3. Call this endpoint daily: POST https://[project-ref].supabase.co/functions/v1/cleanup-deleted-accounts
 * 4. Include Authorization header with service role key
 *
 * Alternative: Use Supabase's pg_cron extension (if available in your plan)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify authorization (service role key required)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call the cleanup function
    const { data, error } = await supabase.rpc('cleanup_expired_accounts');

    if (error) {
      console.error('Cleanup error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Cleanup completed:', data);

    return new Response(
      JSON.stringify({
        success: true,
        result: data,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
