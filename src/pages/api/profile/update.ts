import type { APIRoute } from 'astro';
import { createServerAuthClient } from '@/lib/supabase';

const ALLOWED_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'website',
  'linkedin_url',
  'years_experience',
  'bio',
  'cities',
  'subject_areas',
] as const;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const updates: Record<string, any> = {};

    // Validate and process each field
    for (const [field, value] of Object.entries(body)) {
      if (!ALLOWED_FIELDS.includes(field as any)) {
        return new Response(
          JSON.stringify({ success: false, error: `Field '${field}' is not allowed to be updated` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Validate specific field types
      if (field === 'years_experience') {
        const num = value ? Number(value) : null;
        if (num !== null && (isNaN(num) || num < 0 || num > 70)) {
          return new Response(
            JSON.stringify({ success: false, error: 'Years of experience must be between 0 and 70' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        updates[field] = num;
      } else if (field === 'website' || field === 'linkedin_url') {
        if (value && value.trim()) {
          try {
            new URL(value);
            updates[field] = value.trim();
          } catch {
            return new Response(
              JSON.stringify({ success: false, error: `Invalid URL format for ${field}` }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
          }
        } else {
          updates[field] = null;
        }
      } else if (field === 'cities' || field === 'subject_areas') {
        // Validate array fields
        if (Array.isArray(value)) {
          updates[field] = value;
        } else {
          return new Response(
            JSON.stringify({ success: false, error: `${field} must be an array` }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } else {
        updates[field] = value && typeof value === 'string' ? value.trim() : value;
      }
    }

    // Update the lobbyist profile (check both user_id and claimed_by)
    const { error: updateError } = await supabase
      .from('lobbyists')
      .update(updates)
      .or(`user_id.eq.${user.id},claimed_by.eq.${user.id}`);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update profile' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
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
