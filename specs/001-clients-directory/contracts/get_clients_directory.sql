-- Contract: get_clients_directory Postgres Function
-- Feature: 001-clients-directory
-- Purpose: Retrieve paginated, filtered, sorted list of clients for directory page
-- Date: 2025-11-11

/**
 * get_clients_directory
 *
 * Returns aggregated client data for the directory page with filtering, sorting,
 * and pagination support.
 *
 * @param sort_by Sort order (lobbyist_count_desc, lobbyist_count_asc, name_asc, name_desc)
 * @param subject_filters Array of subject area names for filtering (OR logic)
 * @param limit_count Number of results to return
 * @param offset_count Number of results to skip (for pagination)
 *
 * @returns TABLE with client summary data
 */

CREATE OR REPLACE FUNCTION get_clients_directory(
  sort_by text DEFAULT 'lobbyist_count_desc',
  subject_filters text[] DEFAULT NULL,
  limit_count int DEFAULT 50,
  offset_count int DEFAULT 0
)
RETURNS TABLE (
  name text,
  slug text,
  lobbyist_count bigint,
  subject_areas text[],
  top_subject_areas text[]
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH client_aggregates AS (
    -- Aggregate clients with their lobbyist counts and subject areas
    SELECT
      c.name AS client_name,
      -- Generate slug: lowercase, replace non-alphanumeric with hyphens
      lower(regexp_replace(
        regexp_replace(c.name, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      )) AS client_slug,
      COUNT(DISTINCT c.lobbyist_id) AS lobbyist_count,
      -- Collect all unique subject areas from associated lobbyists
      ARRAY_AGG(DISTINCT subj) FILTER (WHERE subj IS NOT NULL) AS all_subject_areas,
      -- Collect lobbyist IDs for potential future use
      ARRAY_AGG(DISTINCT c.lobbyist_id) AS lobbyist_ids
    FROM clients c
    JOIN lobbyists l ON c.lobbyist_id = l.id
    LEFT JOIN UNNEST(l.subject_areas) AS subj ON true
    WHERE
      -- Only current client relationships
      c.is_current = true
      -- Only active, approved lobbyists
      AND l.is_active = true
      AND l.approval_status = 'approved'
      -- Apply subject area filters if provided (OR logic)
      AND (
        subject_filters IS NULL
        OR l.subject_areas && subject_filters  -- Array overlap operator
      )
    GROUP BY c.name
    -- Exclude clients with zero lobbyists (shouldn't happen with current filters)
    HAVING COUNT(DISTINCT c.lobbyist_id) > 0
  ),
  subject_frequencies AS (
    -- Calculate frequency of each subject area per client for ranking
    SELECT
      c.name AS client_name,
      subj AS subject_name,
      COUNT(*) AS freq
    FROM clients c
    JOIN lobbyists l ON c.lobbyist_id = l.id
    CROSS JOIN UNNEST(l.subject_areas) AS subj
    WHERE
      c.is_current = true
      AND l.is_active = true
      AND l.approval_status = 'approved'
      AND (subject_filters IS NULL OR l.subject_areas && subject_filters)
    GROUP BY c.name, subj
  ),
  top_subjects AS (
    -- Get top 3 most frequent subjects per client
    SELECT
      client_name,
      ARRAY_AGG(subject_name ORDER BY freq DESC)
        FILTER (WHERE rn <= 3) AS top_3_subjects
    FROM (
      SELECT
        client_name,
        subject_name,
        freq,
        ROW_NUMBER() OVER (PARTITION BY client_name ORDER BY freq DESC) AS rn
      FROM subject_frequencies
    ) ranked
    WHERE rn <= 3
    GROUP BY client_name
  )
  SELECT
    ca.client_name AS name,
    ca.client_slug AS slug,
    ca.lobbyist_count,
    ca.all_subject_areas AS subject_areas,
    COALESCE(ts.top_3_subjects, ARRAY[]::text[]) AS top_subject_areas
  FROM client_aggregates ca
  LEFT JOIN top_subjects ts ON ca.client_name = ts.client_name
  ORDER BY
    CASE
      WHEN sort_by = 'lobbyist_count_desc' THEN ca.lobbyist_count
      WHEN sort_by = 'lobbyist_count_asc' THEN -ca.lobbyist_count
      ELSE NULL
    END DESC NULLS LAST,
    CASE
      WHEN sort_by = 'name_asc' THEN ca.client_name
      WHEN sort_by = 'name_desc' THEN NULL
      ELSE NULL
    END ASC NULLS LAST,
    CASE
      WHEN sort_by = 'name_desc' THEN ca.client_name
      ELSE NULL
    END DESC NULLS LAST,
    -- Default fallback: sort by name ascending
    ca.client_name ASC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Grant execute permissions to authenticated and anon roles
GRANT EXECUTE ON FUNCTION get_clients_directory TO authenticated, anon;

-- Example usage:
-- SELECT * FROM get_clients_directory('lobbyist_count_desc', NULL, 50, 0);
-- SELECT * FROM get_clients_directory('name_asc', ARRAY['Healthcare', 'Energy'], 20, 0);

-- Performance notes:
-- - Uses JOIN instead of subqueries for better query plan
-- - Leverages existing GIN index on lobbyists.subject_areas for array overlap
-- - Considers adding index on clients.name for GROUP BY if query plan shows table scan
-- - Considers adding index on clients.is_current for WHERE filter

-- Test query (verify no duplicate slugs):
-- SELECT slug, COUNT(*) FROM get_clients_directory() GROUP BY slug HAVING COUNT(*) > 1;
-- Expected: 0 rows (no duplicate slugs)
