import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const GET: APIRoute = async ({ url }) => {
  const citySlug = url.searchParams.get('city');
  const subjectSlug = url.searchParams.get('subject');

  try {
    // If we have filters, we need to find clients whose lobbyists match those filters
    if (citySlug || subjectSlug) {
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
        .select('id')
        .eq('is_active', true);

      if (cityName) {
        lobbyistQuery = lobbyistQuery.contains('cities', [cityName]);
      }

      if (subjectName) {
        lobbyistQuery = lobbyistQuery.contains('subject_areas', [subjectName]);
      }

      const { data: lobbyists } = await lobbyistQuery;
      const lobbyistIds = lobbyists?.map(l => l.id) || [];

      if (lobbyistIds.length === 0) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Get clients for these lobbyists with counts
      const { data: clients } = await supabase
        .from('clients')
        .select('name')
        .in('lobbyist_id', lobbyistIds);

      // Count occurrences
      const clientCounts = new Map<string, number>();
      clients?.forEach(c => {
        clientCounts.set(c.name, (clientCounts.get(c.name) || 0) + 1);
      });

      // Convert to array and sort by count, then name
      const clientOptions = Array.from(clientCounts.entries())
        .map(([name, count]) => ({ label: name, value: name, count }))
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return a.label.localeCompare(b.label);
        })
        .slice(0, 100);

      return new Response(JSON.stringify(clientOptions), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // No filters - return top clients
    const { data: clients } = await supabase
      .from('clients')
      .select('name')
      .limit(10000);

    // Count occurrences
    const clientCounts = new Map<string, number>();
    clients?.forEach(c => {
      clientCounts.set(c.name, (clientCounts.get(c.name) || 0) + 1);
    });

    // Convert to array and sort by count, then name
    const clientOptions = Array.from(clientCounts.entries())
      .map(([name, count]) => ({ label: name, value: name, count }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.label.localeCompare(b.label);
      })
      .slice(0, 100);

    return new Response(JSON.stringify(clientOptions), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching filtered clients:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch clients' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
