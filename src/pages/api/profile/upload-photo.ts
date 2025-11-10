import type { APIRoute } from 'astro';
import { createServerClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const currentPhotoUrl = formData.get('currentPhotoUrl') as string | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'Invalid file type. Please upload JPG, PNG, or WebP' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ error: 'File size must be less than 5MB' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Use server client with service role (bypasses RLS)
    const supabase = createServerClient();

    // Generate filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/profile.${fileExt}`;

    // Delete old photo if exists
    if (currentPhotoUrl) {
      try {
        const oldPath = currentPhotoUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('profile-photos').remove([oldPath]);
      } catch (err) {
        console.error('Error removing old photo:', err);
        // Continue anyway
      }
    }

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload new photo
    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, buffer, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName);

    // Update lobbyist profile (use profile_image_url to match database schema)
    const { data: updateData, error: updateError } = await supabase
      .from('lobbyists')
      .update({ profile_image_url: publicUrl })
      .or(`user_id.eq.${user.id},claimed_by.eq.${user.id}`)
      .select();

    if (updateError) {
      console.error('Profile update error:', updateError);
      console.error('User ID:', user.id);
      return new Response(JSON.stringify({
        error: 'Failed to update profile',
        details: updateError.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!updateData || updateData.length === 0) {
      console.error('No lobbyist profile found for user:', user.id);
      return new Response(JSON.stringify({
        error: 'No lobbyist profile found. Please create a profile first.'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      photoUrl: publicUrl
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Upload photo error:', error);
    return new Response(JSON.stringify({
      error: error?.message || 'Failed to upload photo'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
