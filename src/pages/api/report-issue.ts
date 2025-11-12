import type { APIRoute } from 'astro';
import { createServerClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { lobbyistId, lobbyistName, issueType, description, reporterEmail } = body;

    // Validate required fields
    if (!lobbyistId || !issueType || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const serverClient = createServerClient();

    // Insert report into database
    const { data, error } = await serverClient
      .from('profile_reports')
      .insert({
        lobbyist_id: lobbyistId,
        lobbyist_name: lobbyistName,
        issue_type: issueType,
        description,
        reporter_email: reporterEmail || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating report:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to submit report' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Send notification email to admin

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in report-issue endpoint:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
