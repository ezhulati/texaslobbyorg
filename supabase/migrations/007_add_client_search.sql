-- Add client filtering to search_lobbyists function
-- Migration: 007_add_client_search

-- Add GIN index on client names for better search performance
CREATE INDEX IF NOT EXISTS idx_clients_name_gin
ON public.clients USING gin(to_tsvector('english', name));

-- Drop existing function
DROP FUNCTION IF EXISTS search_lobbyists(TEXT, TEXT[], TEXT[], subscription_tier, INTEGER, INTEGER);

-- Recreate with client_filters parameter
CREATE OR REPLACE FUNCTION search_lobbyists(
  search_query TEXT DEFAULT NULL,
  city_filters TEXT[] DEFAULT NULL,
  subject_filters TEXT[] DEFAULT NULL,
  tier_filter subscription_tier DEFAULT NULL,
  client_filters TEXT[] DEFAULT NULL,  -- NEW: Filter by client names
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  slug TEXT,
  email TEXT,
  phone TEXT,
  bio TEXT,
  profile_image_url TEXT,
  cities TEXT[],
  subject_areas TEXT[],
  subscription_tier subscription_tier,
  view_count INTEGER,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.first_name,
    l.last_name,
    l.slug,
    l.email,
    l.phone,
    l.bio,
    l.profile_image_url,
    l.cities,
    l.subject_areas,
    l.subscription_tier,
    l.view_count,
    CASE
      WHEN search_query IS NOT NULL THEN
        ts_rank(l.search_vector, websearch_to_tsquery('english', search_query))
      ELSE 0
    END AS rank
  FROM public.lobbyists l
  WHERE
    l.is_active = true
    AND (search_query IS NULL OR l.search_vector @@ websearch_to_tsquery('english', search_query))
    AND (city_filters IS NULL OR l.cities && city_filters)
    AND (subject_filters IS NULL OR l.subject_areas && subject_filters)
    AND (tier_filter IS NULL OR l.subscription_tier = tier_filter)
    AND (
      client_filters IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.clients c
        WHERE c.lobbyist_id = l.id
        AND c.name = ANY(client_filters)
      )
    )
  ORDER BY
    CASE WHEN l.subscription_tier = 'featured' THEN 1 ELSE 2 END,
    CASE WHEN l.subscription_tier = 'premium' THEN 1 ELSE 2 END,
    rank DESC,
    l.view_count DESC,
    l.last_name ASC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment for documentation
COMMENT ON FUNCTION search_lobbyists IS 'Search lobbyists with filters for text, cities, subjects, tier, and clients. Uses full-text search with ranking.';
