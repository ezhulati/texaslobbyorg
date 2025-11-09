import React, { useEffect, useState } from 'react';
import { Eye, TrendingUp, Calendar, ExternalLink } from 'lucide-react';

interface AnalyticsData {
  totalViews: number;
  recentViews: number;
  period: string;
  chartData: Array<{ date: string; views: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
}

interface AnalyticsDashboardProps {
  subscriptionTier: 'free' | 'premium' | 'featured';
}

export default function AnalyticsDashboard({ subscriptionTier }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (subscriptionTier !== 'free') {
      fetchAnalytics();
    } else {
      setLoading(false);
    }
  }, [days, subscriptionTier]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('supabase_token');
      const response = await fetch(`/api/analytics/views?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (subscriptionTier === 'free') {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
        <div className="flex items-start gap-4">
          <Eye className="h-8 w-8 text-yellow-600" />
          <div>
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">Upgrade to View Analytics</h3>
            <p className="text-yellow-800 mb-4">
              Detailed analytics dashboards are available with Premium ($297/mo) and Featured ($597/mo) plans.
            </p>
            <p className="text-sm text-yellow-700 mb-4">
              Track profile views, referral sources, and viewer trends over time.
            </p>
            <a
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-md bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-700"
            >
              View Pricing Plans
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-texas-blue-500 border-r-transparent"></div>
        <p className="mt-2 text-gray-600">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  const maxViews = Math.max(...analytics.chartData.map(d => d.views), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-texas-blue-100 p-2">
              <Eye className="h-5 w-5 text-texas-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Total Profile Views</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{analytics.totalViews.toLocaleString()}</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-green-100 p-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Recent Views</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{analytics.recentViews.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">{analytics.period}</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-purple-100 p-2">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Avg. Daily Views</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {analytics.chartData.length > 0
              ? Math.round(analytics.recentViews / analytics.chartData.length)
              : 0}
          </p>
        </div>
      </div>

      {/* Views Chart */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Views Over Time</h3>
        {analytics.chartData.length > 0 ? (
          <div className="space-y-2">
            {analytics.chartData.map((item) => (
              <div key={item.date} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-24">{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                  <div
                    className="bg-texas-blue-500 h-full rounded-full flex items-center justify-end pr-2 transition-all"
                    style={{ width: `${(item.views / maxViews) * 100}%` }}
                  >
                    {item.views > 0 && (
                      <span className="text-xs font-semibold text-white">{item.views}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No view data for selected period</p>
        )}
      </div>

      {/* Top Referrers */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Referral Sources</h3>
        {analytics.topReferrers.length > 0 ? (
          <div className="space-y-3">
            {analytics.topReferrers.map((referrer, index) => (
              <div key={index} className="flex items-center justify-between pb-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-900 font-medium truncate max-w-md">{referrer.referrer}</span>
                </div>
                <span className="text-sm font-semibold text-texas-blue-600">{referrer.count} views</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No referrer data available</p>
        )}
      </div>
    </div>
  );
}
