import { supabase } from '@/lib/supabase';

export interface ClientOption {
  name: string;
  count: number;
}

/**
 * Get unique client names with lobbyist counts
 * Used to populate client filter dropdowns
 */
export async function getUniqueClients(params?: {
  onlyActive?: boolean;
  limit?: number;
}): Promise<ClientOption[]> {
  const { onlyActive = false, limit = 100 } = params || {};

  // Query to get unique client names with counts
  let query = supabase
    .from('clients')
    .select('name, lobbyist_id');

  // Filter for only current clients if specified
  if (onlyActive) {
    query = query.eq('is_current', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching clients:', error);
    return [];
  }

  // Count lobbyists per client name (same client name can have multiple lobbyists)
  const clientCounts: Record<string, Set<string>> = {};

  data?.forEach((client) => {
    if (!clientCounts[client.name]) {
      clientCounts[client.name] = new Set();
    }
    clientCounts[client.name].add(client.lobbyist_id);
  });

  // Convert to array and sort by count (most popular first)
  const clients: ClientOption[] = Object.entries(clientCounts)
    .map(([name, lobbyistIds]) => ({
      name,
      count: lobbyistIds.size
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return clients;
}

/**
 * Get clients for a specific city
 * Used for city page sidebar filters
 */
export async function getClientsByCity(cityName: string, limit: number = 10): Promise<ClientOption[]> {
  // Get all lobbyists in this city
  const { data: lobbyists } = await supabase
    .from('lobbyists')
    .select('id')
    .contains('cities', [cityName])
    .eq('is_active', true);

  if (!lobbyists || lobbyists.length === 0) {
    return [];
  }

  const lobbyistIds = lobbyists.map(l => l.id);

  // Get clients for these lobbyists
  const { data: clients } = await supabase
    .from('clients')
    .select('name, lobbyist_id')
    .in('lobbyist_id', lobbyistIds);

  if (!clients) {
    return [];
  }

  // Count unique clients
  const clientCounts: Record<string, Set<string>> = {};

  clients.forEach((client) => {
    if (!clientCounts[client.name]) {
      clientCounts[client.name] = new Set();
    }
    clientCounts[client.name].add(client.lobbyist_id);
  });

  // Sort by count and limit
  return Object.entries(clientCounts)
    .map(([name, lobbyistIds]) => ({
      name,
      count: lobbyistIds.size
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get clients for a specific subject area
 * Used for subject page sidebar filters
 */
export async function getClientsBySubject(subjectName: string, limit: number = 10): Promise<ClientOption[]> {
  // Get all lobbyists in this subject area
  const { data: lobbyists } = await supabase
    .from('lobbyists')
    .select('id')
    .contains('subject_areas', [subjectName])
    .eq('is_active', true);

  if (!lobbyists || lobbyists.length === 0) {
    return [];
  }

  const lobbyistIds = lobbyists.map(l => l.id);

  // Get clients for these lobbyists
  const { data: clients } = await supabase
    .from('clients')
    .select('name, lobbyist_id')
    .in('lobbyist_id', lobbyistIds);

  if (!clients) {
    return [];
  }

  // Count unique clients
  const clientCounts: Record<string, Set<string>> = {};

  clients.forEach((client) => {
    if (!clientCounts[client.name]) {
      clientCounts[client.name] = new Set();
    }
    clientCounts[client.name].add(client.lobbyist_id);
  });

  // Sort by count and limit
  return Object.entries(clientCounts)
    .map(([name, lobbyistIds]) => ({
      name,
      count: lobbyistIds.size
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ============================================================================
// Clients Directory Feature (001-clients-directory)
// ============================================================================

/**
 * Type definitions for client directory and detail pages
 */
export interface ClientSummary {
  name: string;
  slug: string;
  lobbyist_count: number;
  subject_areas: string[];
  top_subject_areas: string[];
}

export interface ClientSearchParams {
  sort?: 'lobbyist_count_desc' | 'lobbyist_count_asc' | 'name_asc' | 'name_desc';
  subjects?: string[];  // Subject area slugs
  limit?: number;
  offset?: number;
}

export interface LobbyistSummary {
  id: string;
  first_name: string;
  last_name: string;
  slug: string;
  profile_image_url: string | null;
  subject_areas: string[];
  subscription_tier: 'free' | 'premium' | 'featured';
}

export interface ClientDetail {
  name: string;
  slug: string;
  lobbyist_count: number;
  subject_areas: string[];
  lobbyists: {
    total_count: number;
    results: LobbyistSummary[];
  };
}

/**
 * Search clients with filters and sorting
 * Calls get_clients_directory Postgres function
 */
export async function searchClients(params: ClientSearchParams): Promise<ClientSummary[]> {
  const { sort = 'lobbyist_count_desc', subjects, limit = 50, offset = 0 } = params;

  // Convert subject slugs to names (if provided)
  let subjectNames: string[] | null = null;
  if (subjects && subjects.length > 0) {
    const { data: subjectData } = await supabase
      .from('subject_areas')
      .select('name')
      .in('slug', subjects);
    subjectNames = subjectData ? subjectData.map(s => s.name) : null;
  }

  const { data, error } = await (supabase.rpc as any)('get_clients_directory', {
    sort_by: sort,
    subject_filters: subjectNames,
    limit_count: limit,
    offset_count: offset,
  });

  if (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }

  return data as ClientSummary[];
}

/**
 * Get a single client by slug with paginated lobbyists
 * Calls get_client_detail Postgres function
 */
export async function getClientBySlug(
  slug: string,
  lobbyistLimit = 20,
  lobbyistOffset = 0
): Promise<ClientDetail | null> {
  const { data, error } = await (supabase.rpc as any)('get_client_detail', {
    client_slug_param: slug,
    lobbyist_limit: lobbyistLimit,
    lobbyist_offset: lobbyistOffset,
  });

  if (error) {
    console.error('Error fetching client:', error);
    return null;
  }

  // Postgres function returns an array with 1 result or empty array
  return data && data.length > 0 ? data[0] : null;
}

/**
 * Get total count of clients (for pagination)
 * Uses dedicated count function to avoid Supabase RPC row limits
 */
export async function getClientCount(params: ClientSearchParams): Promise<number> {
  const { subjects } = params;

  // Convert subject slugs to names
  let subjectNames: string[] | null = null;
  if (subjects && subjects.length > 0) {
    const { data: subjectData } = await supabase
      .from('subject_areas')
      .select('name')
      .in('slug', subjects);
    subjectNames = subjectData ? subjectData.map(s => s.name) : null;
  }

  // Call dedicated count function (returns single bigint, not rows)
  const { data, error } = await (supabase.rpc as any)('get_clients_count', {
    subject_filters: subjectNames,
  });

  if (error) {
    console.error('Error counting clients:', error);
    return 0;
  }

  // RPC returns the count directly as a number
  return typeof data === 'number' ? data : 0;
}
