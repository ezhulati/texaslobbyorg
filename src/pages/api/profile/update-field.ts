import type { APIRoute } from 'astro';
import { createServerClient } from '@/lib/supabase';

// Allowed fields for update (security whitelist)
const ALLOWED_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'website',
  'linkedin_url',
  'bio',
  'years_experience',
  'cities',
  'subject_areas',
] as const;

type AllowedField = typeof ALLOWED_FIELDS[number];

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Get session from cookies
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not authenticated' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await request.json();
    const { fieldName, value } = body;

    // Validate field name
    if (!ALLOWED_FIELDS.includes(fieldName as AllowedField)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid field name' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create server client with session
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate value based on field type
    let processedValue: any = value;

    // Handle array fields
    if (fieldName === 'cities' || fieldName === 'subject_areas') {
      if (!Array.isArray(value)) {
        return new Response(
          JSON.stringify({ success: false, error: `${fieldName} must be an array` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle number fields
    if (fieldName === 'years_experience') {
      if (value !== null && value !== '') {
        const num = Number(value);
        if (isNaN(num) || num < 0 || num > 70) {
          return new Response(
            JSON.stringify({ success: false, error: 'Years experience must be between 0 and 70' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        processedValue = num;
      } else {
        processedValue = null;
      }
    }

    // Handle URL fields
    if (fieldName === 'website' || fieldName === 'linkedin_url') {
      if (value && typeof value === 'string') {
        try {
          new URL(value);
        } catch {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid URL format' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Handle email field
    if (fieldName === 'email') {
      if (value && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid email format' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Update the lobbyist profile
    const { error: updateError } = await supabase
      .from('lobbyists')
      .update({ [fieldName]: processedValue })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update profile' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, fieldName, value: processedValue }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
