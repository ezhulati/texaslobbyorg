/**
 * POST /api/bills/[id]/increment-views
 *
 * Increment the view count for a bill.
 * Called when a user views a bill detail page.
 */

import type { APIRoute} from 'astro';
import { incrementBillViews } from '@/lib/api/bills';

export const POST: APIRoute = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Bill ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    await incrementBillViews(id);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Increment views API error:', error);

    // Don't fail the request if view increment fails
    // It's a non-critical operation
    return new Response(
      JSON.stringify({ success: false }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
