-- Migration: Add Client Count Function
-- Purpose: Efficiently count total clients without hitting Supabase row limits
-- Date: 2025-11-11

/**
 * get_clients_count
 *
 * Returns the total count of unique clients matching the given filters
 * without fetching all rows (avoids Supabase 1,000 row RPC limit)
 *
 * @param subject_filters Array of subject area names for filtering (OR logic)
 * @returns INTEGER count of matching clients
 */

CREATE OR REPLACE FUNCTION get_clients_count(
  subject_filters text[] DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  client_count bigint;
BEGIN
  WITH client_aggregates AS (
    SELECT
      c.name AS client_name
    FROM clients c
    JOIN lobbyists l ON c.lobbyist_id = l.id
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
  )
  SELECT COUNT(*) INTO client_count
  FROM client_aggregates;

  RETURN client_count;
END;
$$;

-- Grant execute permissions to authenticated and anon roles
GRANT EXECUTE ON FUNCTION get_clients_count TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION get_clients_count IS 'Returns count of unique clients matching subject filters without fetching all rows';
