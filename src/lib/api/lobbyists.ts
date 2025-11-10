import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Lobbyist = Database['public']['Tables']['lobbyists']['Row'];

export interface SearchParams {
  query?: string;
  cities?: string[];
  subjects?: string[];
  clients?: string[];  // Filter by client names
  tier?: 'free' | 'premium' | 'featured';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  first_name: string;
  last_name: string;
  slug: string;
  bio: string | null;
  profile_image_url: string | null;
  cities: string[];
  subject_areas: string[];
  subscription_tier: 'free' | 'premium' | 'featured';
  view_count: number;
  rank: number;
}

/**
 * Search lobbyists with filters
 */
export async function searchLobbyists(params: SearchParams) {
  const { query, cities, subjects, clients, tier, limit = 50, offset = 0 } = params;

  // Convert city slugs to names
  let cityNames: string[] | null = null;
  if (cities && cities.length > 0) {
    const { data: cityData } = await supabase
      .from('cities')
      .select('name')
      .in('slug', cities);
    cityNames = cityData ? cityData.map(c => c.name) : null;
  }

  // Convert subject slugs to names
  let subjectNames: string[] | null = null;
  if (subjects && subjects.length > 0) {
    const { data: subjectData } = await supabase
      .from('subject_areas')
      .select('name')
      .in('slug', subjects);
    subjectNames = subjectData ? subjectData.map(s => s.name) : null;
  }

  // Client names are used directly (no slug conversion needed)
  const clientNames: string[] | null = clients && clients.length > 0 ? clients : null;

  const { data, error } = await (supabase.rpc as any)('search_lobbyists', {
    search_query: query || null,
    city_filters: cityNames,
    subject_filters: subjectNames,
    client_filters: clientNames,
    tier_filter: tier || null,
    limit_count: limit,
    offset_count: offset,
  });

  if (error) {
    console.error('Error searching lobbyists:', error);
    throw error;
  }

  return data as SearchResult[];
}

/**
 * Get a single lobbyist by slug
 */
export async function getLobbyistBySlug(slug: string) {
  const { data, error } = await supabase
    .from('lobbyists')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .single();

  if (error) {
    console.error('Error fetching lobbyist:', error);
    return null;
  }

  return data as Lobbyist;
}

/**
 * Get clients for a lobbyist
 */
export async function getLobbyistClients(lobbyistId: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('lobbyist_id', lobbyistId)
    .order('is_current', { ascending: false })
    .order('year_started', { ascending: false });

  if (error) {
    console.error('Error fetching clients:', error);
    return [];
  }

  return data;
}

/**
 * Increment view count for a lobbyist
 */
export async function trackLobbyistView(
  lobbyistId: string,
  userId?: string,
  sessionId?: string,
  referrer?: string
) {
  // Insert page view
  const { error: viewError } = await (supabase.from('page_views').insert as any)({
    lobbyist_id: lobbyistId,
    user_id: userId || null,
    session_id: sessionId || null,
    referrer: referrer || null,
  });

  if (viewError) {
    console.error('Error tracking view:', viewError);
  }

  // Increment view count on lobbyist
  const { error: updateError } = await (supabase.rpc as any)('increment_view_count', {
    lobbyist_id: lobbyistId,
  });

  if (updateError) {
    console.error('Error incrementing view count:', updateError);
  }
}

/**
 * Get total count of lobbyists (for pagination)
 */
export async function getLobbyistCount(params: SearchParams) {
  const { cities, subjects, tier } = params;

  let queryBuilder = supabase
    .from('lobbyists')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('approval_status', 'approved');

  // Convert city slugs to names
  if (cities && cities.length > 0) {
    const { data: cityData } = await supabase
      .from('cities')
      .select('name')
      .in('slug', cities);
    const cityNames = cityData ? cityData.map(c => c.name) : [];
    if (cityNames.length > 0) {
      queryBuilder = queryBuilder.overlaps('cities', cityNames);
    }
  }

  // Convert subject slugs to names
  if (subjects && subjects.length > 0) {
    const { data: subjectData } = await supabase
      .from('subject_areas')
      .select('name')
      .in('slug', subjects);
    const subjectNames = subjectData ? subjectData.map(s => s.name) : [];
    if (subjectNames.length > 0) {
      queryBuilder = queryBuilder.overlaps('subject_areas', subjectNames);
    }
  }

  if (tier) {
    queryBuilder = queryBuilder.eq('subscription_tier', tier);
  }

  const { count, error } = await queryBuilder;

  if (error) {
    console.error('Error counting lobbyists:', error);
    return 0;
  }

  return count || 0;
}
