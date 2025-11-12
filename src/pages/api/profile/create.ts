import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';
import { slugify } from '@/lib/utils';
import { sendEmail, adminNewProfileEmail } from '@/lib/email';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Create Profile API] POST request received');

    // Get authenticated user
    const supabase = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Create Profile API] Not authenticated');
      return new Response(JSON.stringify({
        error: 'You must be logged in to create a profile'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { formData } = await request.json();
    console.log('[Create Profile API] User:', user.id, 'creating profile');

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email) {
      return new Response(JSON.stringify({
        error: 'First name, last name, and email are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use service role client for database operations
    const serverClient = createServerClient();

    // STEP 1: Check if user already has a profile
    const { data: existingProfile, error: existingError } = await serverClient
      .from('lobbyists')
      .select('id, slug, is_claimed')
      .eq('user_id', user.id)
      .single();

    if (!existingError && existingProfile) {
      console.error('[Create Profile API] User already has a profile:', existingProfile.id);
      return new Response(JSON.stringify({
        error: 'You already have a lobbyist profile',
        profileSlug: existingProfile.slug
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // STEP 2: Generate unique slug from name
    let slug = slugify(`${formData.firstName} ${formData.lastName}`);

    // Check if slug exists and make it unique if needed
    const { data: slugExists } = await serverClient
      .from('lobbyists')
      .select('id')
      .eq('slug', slug)
      .single();

    if (slugExists) {
      // Add random suffix to make slug unique
      slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`;
    }

    // STEP 3: Parse cities and subject areas
    // Handle both array (from multi-select) and string (legacy) formats
    const cities = formData.cities
      ? Array.isArray(formData.cities)
        ? formData.cities.filter((c: string) => c.length > 0)
        : formData.cities
            .split(',')
            .map((c: string) => c.trim())
            .filter((c: string) => c.length > 0)
      : [];

    const subjectAreas = formData.subjectAreas
      ? Array.isArray(formData.subjectAreas)
        ? formData.subjectAreas.filter((s: string) => s.length > 0)
        : formData.subjectAreas
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0)
      : [];

    // STEP 4: Create lobbyist profile with pending status
    const { data: newProfile, error: insertError } = await serverClient
      .from('lobbyists')
      .insert({
        user_id: user.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        slug,
        email: formData.email,
        phone: formData.phone || null,
        website: formData.website || null,
        linkedin_url: formData.linkedinUrl || null,
        bio: formData.bio || null,
        cities: cities.length > 0 ? cities : [],
        subject_areas: subjectAreas.length > 0 ? subjectAreas : [],
        id_verification_url: formData.idVerificationUrl || null,
        is_claimed: true,
        is_active: false, // Not active until approved by admin
        is_pending: true, // Awaiting admin review
        pending_reason: 'New lobbyist registration - ID verification required',
        subscription_tier: 'free',
      })
      .select('id, slug')
      .single();

    if (insertError) {
      console.error('[Create Profile API] Error creating profile:', insertError);
      return new Response(JSON.stringify({
        error: 'Failed to create profile. Please try again.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Create Profile API] Profile created:', newProfile.id);

    // STEP 5: Update user role to 'lobbyist'
    const { error: roleError } = await serverClient
      .from('users')
      .update({ role: 'lobbyist' })
      .eq('id', user.id);

    if (roleError) {
      console.error('[Create Profile API] Error updating user role:', roleError);
      // Don't fail the request - profile was created successfully
    }

    console.log('[Create Profile API] Profile created successfully, pending approval');

    // STEP 6: Send admin notification email
    try {
      const adminEmail = 'enrizhulati@gmail.com';
      const adminUrl = `${import.meta.env.PUBLIC_SITE_URL}/admin/pending-profiles`;
      const emailTemplate = adminNewProfileEmail(
        `${formData.firstName} ${formData.lastName}`,
        adminUrl
      );

      const emailResult = await sendEmail({
        to: adminEmail,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      });

      if (emailResult.error) {
        console.error('[Create Profile API] Error sending admin notification:', emailResult.error);
      } else {
        console.log('[Create Profile API] Admin notification sent to:', adminEmail);
      }
    } catch (emailError) {
      console.error('[Create Profile API] Admin email notification failed:', emailError);
      // Don't fail the profile creation if email fails
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Profile created successfully! Your profile is pending admin approval.',
      redirectTo: '/dashboard', // Send to dashboard with pending status
      profileSlug: newProfile.slug
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Create Profile API] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: error?.message || 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
