import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const GET: APIRoute = async ({ url }) => {
  const subjectSlug = url.searchParams.get('subject');
  const clientName = url.searchParams.get('client');

  try {
    // If we have filters, we need to find cities that have lobbyists matching those filters
    if (subjectSlug || clientName) {
      // Get subject name from slug
      let subjectName: string | null = null;
      if (subjectSlug) {
        const { data: subjectData } = await supabase
          .from('subject_areas')
          .select('name')
          .eq('slug', subjectSlug)
          .single();
        subjectName = subjectData?.name || null;
      }

      // Get lobbyists matching the filters
      let lobbyistQuery = supabase
        .from('lobbyists')
        .select('cities')
        .eq('is_active', true);

      if (subjectName) {
        lobbyistQuery = lobbyistQuery.contains('subject_areas', [subjectName]);
      }

      if (clientName) {
        // Get lobbyist IDs that represent this client
        const { data: clientData } = await supabase
          .from('clients')
          .select('lobbyist_id')
          .eq('name', clientName);

        const lobbyistIds = clientData?.map(c => c.lobbyist_id) || [];
        if (lobbyistIds.length > 0) {
          lobbyistQuery = lobbyistQuery.in('id', lobbyistIds);
        } else {
          // No lobbyists found for this client
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      const { data: lobbyists } = await lobbyistQuery;

      // Collect all unique cities
      const citySet = new Set<string>();
      lobbyists?.forEach(l => {
        l.cities?.forEach(c => citySet.add(c));
      });

      // Filter cities to only include those in our set
      const { data: cities } = await supabase
        .from('cities')
        .select('id, name, slug')
        .in('name', Array.from(citySet))
        .order('name');

      return new Response(JSON.stringify(cities || []), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // No filters - return all cities
    const { data: cities } = await supabase
      .from('cities')
      .select('id, name, slug')
      .order('name');

    return new Response(JSON.stringify(cities || []), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching filtered cities:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch cities' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
