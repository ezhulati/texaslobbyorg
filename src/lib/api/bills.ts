/**
 * Bill API Helper Functions
 *
 * Server-side helper functions for bill-related database operations.
 * These are used by API routes and Astro pages (server-side only).
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import type {
  Bill,
  BillSearchFilters,
  BillSearchResult,
  WatchlistEntry,
  BillTag,
} from '@/lib/types/bills';

/**
 * Create Supabase client with service role key (bypasses RLS)
 * Use only on server-side (API routes, Astro pages)
 */
export function createServerClient() {
  const supabaseUrl = import.meta.env.SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient<Database>(supabaseUrl, supabaseKey);
}

/**
 * Search bills using full-text search with filters
 */
export async function searchBills(filters: BillSearchFilters) {
  const supabase = createServerClient();

  const {
    query,
    subjects,
    session,
    chamber,
    status,
    limit = 20,
    offset = 0,
  } = filters;

  // Use the search_bills PostgreSQL function for optimized search
  const { data, error } = await supabase.rpc('search_bills', {
    search_query: query || null,
    subject_filters: subjects || null,
    session_filter: session || null,
    chamber_filter: chamber || null,
    status_filter: status || null,
    limit_count: limit,
    offset_count: offset,
  });

  if (error) {
    console.error('Bill search error:', error);
    throw new Error(`Failed to search bills: ${error.message}`);
  }

  return data as BillSearchResult[];
}

/**
 * Get bill by ID
 */
export async function getBillById(billId: string) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('id', billId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get bill: ${error.message}`);
  }

  return data as Bill;
}

/**
 * Get bill by slug
 */
export async function getBillBySlug(slug: string) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get bill: ${error.message}`);
  }

  return data as Bill;
}

/**
 * Get bill updates/history for a bill (fetches in batches if needed)
 */
export async function getBillUpdates(billId: string) {
  const supabase = createServerClient();

  // Fetch in batches to overcome 1000 row limit
  const batchSize = 1000;
  let offset = 0;
  let hasMore = true;
  let allUpdates: any[] = [];

  while (hasMore) {
    const { data, error } = await supabase
      .from('bill_updates')
      .select('*')
      .eq('bill_id', billId)
      .order('action_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (error) {
      throw new Error(`Failed to get bill updates: ${error.message}`);
    }

    if (!data || data.length === 0) break;

    allUpdates = [...allUpdates, ...data];
    hasMore = data.length === batchSize;
    offset += batchSize;
  }

  return allUpdates;
}

/**
 * Increment bill view count
 */
export async function incrementBillViews(billId: string) {
  const supabase = createServerClient();

  const { error } = await supabase.rpc('increment_view_count', {
    row_id: billId,
    table_name: 'bills',
    column_name: 'view_count',
  });

  if (error) {
    console.error('Failed to increment view count:', error);
    // Don't throw - view count increment is non-critical
  }
}

/**
 * Get user's watchlist
 */
export async function getUserWatchlist(userId: string) {
  const supabase = createServerClient();

  const { data, error } = await supabase.rpc('get_user_watchlist', {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(`Failed to get watchlist: ${error.message}`);
  }

  return data;
}

/**
 * Add bill to user's watchlist
 */
export async function addToWatchlist(
  userId: string,
  billId: string,
  preferences?: Partial<WatchlistEntry>
) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('watchlist_entries')
    .insert({
      user_id: userId,
      bill_id: billId,
      notifications_enabled: preferences?.notifications_enabled ?? true,
      notification_types: preferences?.notification_types || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      // Duplicate entry - bill already in watchlist
      throw new Error('Bill is already in your watchlist');
    }
    throw new Error(`Failed to add to watchlist: ${error.message}`);
  }

  return data;
}

/**
 * Remove bill from watchlist
 */
export async function removeFromWatchlist(userId: string, billId: string) {
  const supabase = createServerClient();

  const { error } = await supabase
    .from('watchlist_entries')
    .delete()
    .eq('user_id', userId)
    .eq('bill_id', billId);

  if (error) {
    throw new Error(`Failed to remove from watchlist: ${error.message}`);
  }
}

/**
 * Get lobbyists associated with a bill (by subject areas or tags)
 */
export async function getBillLobbyists(billId: string) {
  const supabase = createServerClient();

  // First get bill to access subject_areas
  const bill = await getBillById(billId);
  if (!bill) {
    return [];
  }

  // Get lobbyists who have tagged this bill
  const { data: tags, error: tagsError } = await supabase
    .from('bill_tags')
    .select(`
      *,
      lobbyist:lobbyists!inner (
        id,
        first_name,
        last_name,
        email,
        phone,
        cities,
        subject_areas,
        subscription_tier,
        slug,
        view_count
      )
    `)
    .eq('bill_id', billId)
    .order('created_at', { ascending: false });

  if (tagsError) {
    console.error('Error fetching bill lobbyists:', tagsError);
    return [];
  }

  // Also get lobbyists who specialize in this bill's subject areas
  if (bill.subject_areas && bill.subject_areas.length > 0) {
    const { data: specialists, error: specialistsError } = await supabase
      .from('lobbyists')
      .select('*')
      .overlaps('subject_areas', bill.subject_areas)
      .eq('is_active', true)
      .order('subscription_tier', { ascending: false })
      .order('view_count', { ascending: false })
      .limit(10);

    if (!specialistsError && specialists) {
      // Merge tagged lobbyists and specialists, removing duplicates
      const taggedLobbyistIds = new Set(tags?.map(t => (t as any).lobbyist.id) || []);
      const uniqueSpecialists = specialists.filter(l => !taggedLobbyistIds.has(l.id));

      return [
        ...(tags?.map(t => ({ ...(t as any).lobbyist, bill_tag: t })) || []),
        ...uniqueSpecialists.map(l => ({ ...l, is_specialist: true })),
      ];
    }
  }

  return tags?.map(t => ({ ...(t as any).lobbyist, bill_tag: t })) || [];
}

/**
 * Get bill tags (lobbyist insights)
 */
export async function getBillTags(billId: string) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('bill_tags')
    .select(`
      *,
      lobbyist:lobbyists (
        id,
        first_name,
        last_name,
        slug,
        email,
        phone,
        subject_areas,
        subscription_tier
      )
    `)
    .eq('bill_id', billId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get bill tags: ${error.message}`);
  }

  return data;
}

/**
 * Get available subject areas from bills (fetches in batches to overcome 1000 row limit)
 */
export async function getBillSubjectAreas() {
  const supabase = createServerClient();

  // Fetch in batches to overcome 1000 row limit
  const batchSize = 1000;
  let offset = 0;
  let hasMore = true;
  const allSubjects = new Set<string>();

  while (hasMore) {
    const { data, error } = await supabase
      .from('bills')
      .select('subject_areas')
      .not('subject_areas', 'is', null)
      .range(offset, offset + batchSize - 1);

    if (error) {
      throw new Error(`Failed to get subject areas: ${error.message}`);
    }

    if (!data || data.length === 0) break;

    // Flatten and add to set
    data.forEach(bill => {
      if (bill.subject_areas) {
        bill.subject_areas.forEach((subject: string) => allSubjects.add(subject));
      }
    });

    hasMore = data.length === batchSize;
    offset += batchSize;
  }

  return Array.from(allSubjects).sort();
}

/**
 * Get available legislative sessions
 */
export async function getLegislativeSessions() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('legislative_sessions')
    .select('*')
    .order('start_date', { ascending: false })
    .limit(100); // Unlikely to have more than 100 sessions, but set limit just in case

  if (error) {
    throw new Error(`Failed to get legislative sessions: ${error.message}`);
  }

  return data;
}

/**
 * Get bills tagged by a lobbyist (fetches in batches if needed)
 */
export async function getLobbyistTaggedBills(lobbyistId: string) {
  const supabase = createServerClient();

  // Fetch in batches to overcome 1000 row limit
  const batchSize = 1000;
  let offset = 0;
  let hasMore = true;
  let allTags: any[] = [];

  while (hasMore) {
    const { data, error } = await supabase
      .from('bill_tags')
      .select(`
        *,
        bill:bills (
          id,
          bill_number,
          title,
          slug,
          current_status,
          chamber,
          session_id,
          subject_areas,
          last_action,
          last_action_date,
          view_count
        )
      `)
      .eq('lobbyist_id', lobbyistId)
      .order('created_at', { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (error) {
      throw new Error(`Failed to get tagged bills: ${error.message}`);
    }

    if (!data || data.length === 0) break;

    allTags = [...allTags, ...data];
    hasMore = data.length === batchSize;
    offset += batchSize;
  }

  return allTags;
}
