import type { APIRoute } from 'astro';
import { createServerClient } from '@/lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

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

    // Insert report into database (graceful degradation if table doesn't exist)
    let reportId = 'email-only';
    try {
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

      if (!error && data) {
        reportId = data.id;
      }
    } catch (dbError) {
      console.warn('Database insert failed, continuing with email-only:', dbError);
    }

    // Send email notification to admin
    const issueTypeLabels: Record<string, string> = {
      incorrect_info: 'Incorrect Information',
      outdated_clients: 'Outdated Client List',
      fraudulent_claims: 'Fraudulent Claims',
      duplicate_profile: 'Duplicate Profile',
      inappropriate_content: 'Inappropriate Content',
      other: 'Other Issue',
    };

    try {
      await resend.emails.send({
        from: 'TexasLobby.org <reports@texaslobby.org>',
        to: 'enrizhulati@gmail.com',
        subject: `🚨 Profile Report: ${issueTypeLabels[issueType] || issueType}`,
        html: `
          <h2>New Profile Issue Report</h2>

          <p><strong>Report ID:</strong> ${reportId}</p>
          <p><strong>Lobbyist:</strong> ${lobbyistName}</p>
          <p><strong>Lobbyist ID:</strong> ${lobbyistId}</p>
          <p><strong>Issue Type:</strong> ${issueTypeLabels[issueType] || issueType}</p>

          <h3>Description:</h3>
          <p>${description.replace(/\n/g, '<br>')}</p>

          ${reporterEmail ? `
            <h3>Reporter Contact:</h3>
            <p><a href="mailto:${reporterEmail}">${reporterEmail}</a></p>
          ` : '<p><em>Anonymous report (no email provided)</em></p>'}

          <hr>

          <p><strong>Actions:</strong></p>
          <ul>
            <li><a href="${import.meta.env.PUBLIC_SITE_URL}/lobbyists/${lobbyistId}">View Profile</a></li>
            <li><a href="${import.meta.env.PUBLIC_SITE_URL}/admin/lobbyists/${lobbyistId}">Admin Panel</a></li>
          </ul>

          <p style="color: #666; font-size: 12px;">
            Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}
          </p>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the request if email fails
    }

    return new Response(
      JSON.stringify({ success: true, reportId }),
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
