/**
 * Bill Tag API Route
 *
 * PATCH  /api/bills/[billId]/tags/[tagId] - Update a tag
 * DELETE /api/bills/[billId]/tags/[tagId] - Delete a tag
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

function createServerClient() {
  const supabaseUrl = import.meta.env.SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient<Database>(supabaseUrl, supabaseKey);
}

export const PATCH: APIRoute = async ({ params, request }) => {
  const { billId, tagId } = params;

  if (!billId || !tagId) {
    return new Response(
      JSON.stringify({ error: 'Bill ID and Tag ID are required' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body = await request.json();
    const { tag_type, notes, is_public, show_on_profile } = body;

    const supabase = createServerClient();

    const updateData: any = {};
    if (tag_type) updateData.tag_type = tag_type;
    if (notes !== undefined) updateData.notes = notes;
    if (is_public !== undefined) updateData.is_public = is_public;
    if (show_on_profile !== undefined) updateData.show_on_profile = show_on_profile;

    let { data, error } = await supabase
      .from('bill_tags')
      .update(updateData)
      .eq('id', tagId)
      .eq('bill_id', billId)
      .select()
      .single();

    if (error) {
      const msg = String(error.message || '');
      const fallbackUpdate: any = { ...updateData };
      if (msg.includes('column "notes"')) {
        fallbackUpdate.context_notes = fallbackUpdate.notes;
        delete fallbackUpdate.notes;
      }
      // Always omit show_on_profile for older schemas
      delete fallbackUpdate.show_on_profile;
      const retry = await supabase
        .from('bill_tags')
        .update(fallbackUpdate)
        .eq('id', tagId)
        .eq('bill_id', billId)
        .select()
        .single();
      data = retry.data as any;
      error = retry.error as any;
      if (error) throw error;
    }

    if (!data) {
      return new Response(JSON.stringify({ error: 'Tag not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ tag: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating bill tag:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to update bill tag',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  const { billId, tagId } = params;

  if (!billId || !tagId) {
    return new Response(
      JSON.stringify({ error: 'Bill ID and Tag ID are required' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const supabase = createServerClient();

    const { error } = await supabase
      .from('bill_tags')
      .delete()
      .eq('id', tagId)
      .eq('bill_id', billId);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting bill tag:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to delete bill tag',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
