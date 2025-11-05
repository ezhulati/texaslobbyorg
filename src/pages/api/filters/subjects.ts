import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const GET: APIRoute = async ({ url }) => {
  const citySlug = url.searchParams.get('city');
  const clientName = url.searchParams.get('client');

  try {
    // Start with base query
    let query = supabase
      .from('subject_areas')
      .select('id, name, slug')
      .order('name');

    // If we have filters, we need to find subjects that have lobbyists matching those filters
    if (citySlug || clientName) {
      // Get city name from slug
      let cityName: string | null = null;
      if (citySlug) {
        const { data: cityData } = await supabase
          .from('cities')
          .select('name')
          .eq('slug', citySlug)
          .single();
        cityName = cityData?.name || null;
      }

      // Get lobbyists matching the filters
      let lobbyistQuery = supabase
        .from('lobbyists')
        .select('subject_areas')
        .eq('is_active', true);

      if (cityName) {
        lobbyistQuery = lobbyistQuery.contains('cities', [cityName]);
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

      // Collect all unique subject areas
      const subjectSet = new Set<string>();
      lobbyists?.forEach(l => {
        l.subject_areas?.forEach(s => subjectSet.add(s));
      });

      // Filter subject_areas to only include those in our set
      const { data: subjects } = await supabase
        .from('subject_areas')
        .select('id, name, slug')
        .in('name', Array.from(subjectSet))
        .order('name');

      return new Response(JSON.stringify(subjects || []), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // No filters - return all subjects
    const { data: subjects } = await query;

    return new Response(JSON.stringify(subjects || []), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching filtered subjects:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch subjects' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
