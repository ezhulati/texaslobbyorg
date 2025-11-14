/**
 * Bill Tags API Route
 *
 * GET  /api/bills/[billId]/tags - Get all tags for a bill
 * POST /api/bills/[billId]/tags - Create a new tag
 */

import type { APIRoute } from 'astro';
import { getBillTags } from '@/lib/api/bills';
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

export const GET: APIRoute = async ({ params, url }) => {
  const { billId } = params;

  if (!billId) {
    return new Response(JSON.stringify({ error: 'Bill ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const lobbyistId = url.searchParams.get('lobbyist_id');
    const tags = await getBillTags(billId);

    // Filter by lobbyist if specified
    const filteredTags = lobbyistId
      ? tags.filter((t: any) => t.lobbyist_id === lobbyistId)
      : tags;

    return new Response(JSON.stringify({ tags: filteredTags }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching bill tags:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch bill tags',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const POST: APIRoute = async ({ params, request }) => {
  const { billId } = params;

  if (!billId) {
    return new Response(JSON.stringify({ error: 'Bill ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { lobbyist_id, tag_type, notes, is_public, show_on_profile } = body;

    if (!lobbyist_id || !tag_type) {
      return new Response(
        JSON.stringify({ error: 'Lobbyist ID and tag type are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createServerClient();

    // First attempt: use modern columns
    let { data, error } = await supabase
      .from('bill_tags')
      .insert({
        bill_id: billId,
        lobbyist_id,
        tag_type: tag_type || 'monitoring',
        notes: notes || null,
        is_public: is_public ?? true,
        show_on_profile: show_on_profile ?? true,
      })
      .select()
      .single();

    // Fallbacks for older schemas
    if (error) {
      if (error.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'You have already tagged this bill' }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      const msg = String(error.message || '');
      let insertPayload: any = {
        bill_id: billId,
        lobbyist_id,
        tag_type: tag_type || 'monitoring',
        is_public: is_public ?? true,
      };
      if (msg.includes('column "notes"')) {
        insertPayload.context_notes = notes || null;
      } else {
        insertPayload.notes = notes || null;
      }
      // Do not include show_on_profile in fallback to support older schemas
      const retry = await supabase
        .from('bill_tags')
        .insert(insertPayload)
        .select()
        .single();
      data = retry.data as any;
      error = retry.error as any;
      if (error) throw error;
    }

    return new Response(JSON.stringify({ tag: data }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating bill tag:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to create bill tag',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
