import type { APIRoute } from 'astro';
import { createServerClient } from '@/lib/supabase';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const supabase = createServerClient();

    // Get current user session
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    // Get lobbyist profile for this user
    const { data: lobbyist, error: lobbyistError } = await supabase
      .from('lobbyists')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (lobbyistError || !lobbyist) {
      return new Response(
        JSON.stringify({ error: 'Lobbyist profile not found' }),
        { status: 404 }
      );
    }

    // Get query parameters
    const days = parseInt(url.searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get total views
    const { count: totalViews, error: totalError } = await supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .eq('lobbyist_id', lobbyist.id);

    if (totalError) {
      console.error('Error fetching total views:', totalError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch analytics' }),
        { status: 500 }
      );
    }

    // Get recent views (last N days)
    const { count: recentViews, error: recentError } = await supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .eq('lobbyist_id', lobbyist.id)
      .gte('viewed_at', startDate.toISOString());

    if (recentError) {
      console.error('Error fetching recent views:', recentError);
    }

    // Get views by day for charting
    const { data: viewsByDay, error: viewsByDayError } = await supabase
      .from('page_views')
      .select('viewed_at')
      .eq('lobbyist_id', lobbyist.id)
      .gte('viewed_at', startDate.toISOString())
      .order('viewed_at', { ascending: true });

    if (viewsByDayError) {
      console.error('Error fetching views by day:', viewsByDayError);
    }

    // Aggregate views by day
    const viewsPerDay: Record<string, number> = {};
    viewsByDay?.forEach((view) => {
      const date = new Date(view.viewed_at).toISOString().split('T')[0];
      viewsPerDay[date] = (viewsPerDay[date] || 0) + 1;
    });

    // Convert to array format for charting
    const chartData = Object.entries(viewsPerDay).map(([date, count]) => ({
      date,
      views: count
    }));

    // Get referrer statistics
    const { data: referrers, error: referrersError } = await supabase
      .from('page_views')
      .select('referrer')
      .eq('lobbyist_id', lobbyist.id)
      .gte('viewed_at', startDate.toISOString())
      .not('referrer', 'is', null);

    // Aggregate referrers
    const referrerCounts: Record<string, number> = {};
    referrers?.forEach((ref) => {
      const referrer = ref.referrer || 'Direct';
      referrerCounts[referrer] = (referrerCounts[referrer] || 0) + 1;
    });

    const topReferrers = Object.entries(referrerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([referrer, count]) => ({ referrer, count }));

    return new Response(
      JSON.stringify({
        success: true,
        analytics: {
          totalViews: totalViews || 0,
          recentViews: recentViews || 0,
          period: `${days} days`,
          chartData,
          topReferrers
        }
      }),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in analytics/views:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
