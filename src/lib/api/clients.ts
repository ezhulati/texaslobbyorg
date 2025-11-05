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
