-- Fix bill search function to prioritize bill number matches

-- Drop existing function(s) if they exist
DROP FUNCTION IF EXISTS search_bills CASCADE;

CREATE OR REPLACE FUNCTION search_bills(
  search_query TEXT DEFAULT NULL,
  subject_filters TEXT[] DEFAULT NULL,
  session_filter TEXT DEFAULT NULL,
  chamber_filter TEXT DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  bill_number TEXT,
  title TEXT,
  summary TEXT,
  slug TEXT,
  session TEXT,
  chamber TEXT,
  current_status TEXT,
  subject_areas TEXT[],
  primary_author TEXT,
  co_authors TEXT[],
  filed_date DATE,
  status_date DATE,
  last_action TEXT,
  last_action_date DATE,
  full_text_url TEXT,
  view_count INTEGER,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.bill_number,
    b.title,
    b.summary,
    b.slug,
    b.session,
    b.chamber,
    b.current_status,
    b.subject_areas,
    b.primary_author,
    b.co_authors,
    b.filed_date,
    b.status_date,
    b.last_action,
    b.last_action_date,
    b.full_text_url,
    b.view_count,
    CASE
      -- Exact bill number match gets highest priority
      WHEN search_query IS NOT NULL AND UPPER(b.bill_number) = UPPER(search_query) THEN 100.0
      -- Bill number starts with search query (e.g., "HB 10" matches "HB 10" or "HB 100")
      WHEN search_query IS NOT NULL AND UPPER(b.bill_number) LIKE UPPER(search_query) || '%' THEN 50.0
      -- Bill number contains search query (e.g., "10" matches "HB 10")
      WHEN search_query IS NOT NULL AND b.bill_number ILIKE '%' || search_query || '%' THEN 25.0
      -- Full-text search on title and summary
      WHEN search_query IS NOT NULL AND b.search_vector IS NOT NULL THEN
        ts_rank(b.search_vector, websearch_to_tsquery('english', search_query)) * 10
      ELSE 1.0
    END AS rank
  FROM public.bills b
  WHERE
    -- Search filter: match bill number OR full-text search
    (
      search_query IS NULL
      OR b.bill_number ILIKE '%' || search_query || '%'
      OR (b.search_vector IS NOT NULL AND b.search_vector @@ websearch_to_tsquery('english', search_query))
    )
    -- Subject areas filter
    AND (subject_filters IS NULL OR b.subject_areas && subject_filters)
    -- Session filter
    AND (session_filter IS NULL OR b.session = session_filter)
    -- Chamber filter
    AND (chamber_filter IS NULL OR b.chamber = chamber_filter)
    -- Status filter
    AND (status_filter IS NULL OR b.current_status = status_filter)
  ORDER BY
    rank DESC,
    b.view_count DESC NULLS LAST,
    b.bill_number ASC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment explaining the function
COMMENT ON FUNCTION search_bills IS 'Search bills with prioritized ranking: exact bill number match > starts with > contains > full-text search';
