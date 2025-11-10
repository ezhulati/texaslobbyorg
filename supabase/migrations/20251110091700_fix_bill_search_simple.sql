-- Fix bill search function to prioritize bill number matches (v3 - return all columns)

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
RETURNS SETOF bills AS $$
BEGIN
  RETURN QUERY
  SELECT b.*
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
    -- Session filter (note: this filters by session_id UUID, may need adjustment)
    AND (session_filter IS NULL OR b.session_id::text = session_filter)
    -- Chamber filter
    AND (chamber_filter IS NULL OR b.chamber = chamber_filter)
    -- Status filter
    AND (status_filter IS NULL OR b.current_status = status_filter)
  ORDER BY
    -- Exact bill number match gets highest priority
    CASE WHEN search_query IS NOT NULL AND UPPER(b.bill_number) = UPPER(search_query) THEN 1 ELSE 2 END,
    -- Bill number starts with search query
    CASE WHEN search_query IS NOT NULL AND UPPER(b.bill_number) LIKE UPPER(search_query) || '%' THEN 1 ELSE 2 END,
    -- Bill number contains search query
    CASE WHEN search_query IS NOT NULL AND b.bill_number ILIKE '%' || search_query || '%' THEN 1 ELSE 2 END,
    -- View count for popularity
    b.view_count DESC NULLS LAST,
    -- Alphabetical by bill number
    b.bill_number ASC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment explaining the function
COMMENT ON FUNCTION search_bills IS 'Search bills with prioritized ranking: exact bill number match > starts with > contains > alphabetical';
