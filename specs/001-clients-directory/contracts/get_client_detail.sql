-- Contract: get_client_detail Postgres Function
-- Feature: 001-clients-directory
-- Purpose: Retrieve single client's full details with paginated lobbyist list
-- Date: 2025-11-11

/**
 * get_client_detail
 *
 * Returns detailed client information including full lobbyist roster with pagination.
 * Used for individual client detail pages (/clients/[slug]).
 *
 * @param client_slug_param URL-safe slug for the client (e.g., 'att', 'heb')
 * @param lobbyist_limit Number of lobbyists to return
 * @param lobbyist_offset Number of lobbyists to skip (for pagination)
 *
 * @returns TABLE with single row containing client details and lobbyist array
 */

CREATE OR REPLACE FUNCTION get_client_detail(
  client_slug_param text,
  lobbyist_limit int DEFAULT 20,
  lobbyist_offset int DEFAULT 0
)
RETURNS TABLE (
  name text,
  slug text,
  lobbyist_count bigint,
  subject_areas text[],
  lobbyists jsonb
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  client_name_var text;
  total_lobbyist_count bigint;
BEGIN
  -- First, find the client name from the slug
  -- Note: This assumes slug is computed as lower(regexp_replace(name, ...))
  -- For MVP, we'll match by reverse-engineering the slug from names
  -- TODO: If performance is an issue, add a 'slug' column to clients table

  SELECT DISTINCT c.name INTO client_name_var
  FROM clients c
  WHERE lower(regexp_replace(
    regexp_replace(c.name, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  )) = client_slug_param
  LIMIT 1;

  -- If client not found, return empty result
  IF client_name_var IS NULL THEN
    RETURN;
  END IF;

  -- Get total lobbyist count for pagination metadata
  SELECT COUNT(DISTINCT c.lobbyist_id) INTO total_lobbyist_count
  FROM clients c
  JOIN lobbyists l ON c.lobbyist_id = l.id
  WHERE c.name = client_name_var
    AND c.is_current = true
    AND l.is_active = true
    AND l.approval_status = 'approved';

  -- Return client details with paginated lobbyist list
  RETURN QUERY
  WITH client_lobbyists AS (
    -- Get all lobbyists representing this client
    SELECT DISTINCT
      l.id,
      l.first_name,
      l.last_name,
      l.slug AS lobbyist_slug,
      l.profile_image_url,
      l.subject_areas,
      l.subscription_tier,
      -- Sort order: featured > premium > free, then by last name
      CASE l.subscription_tier
        WHEN 'featured' THEN 1
        WHEN 'premium' THEN 2
        WHEN 'free' THEN 3
        ELSE 4
      END AS tier_order
    FROM clients c
    JOIN lobbyists l ON c.lobbyist_id = l.id
    WHERE c.name = client_name_var
      AND c.is_current = true
      AND l.is_active = true
      AND l.approval_status = 'approved'
    ORDER BY tier_order ASC, l.last_name ASC, l.first_name ASC
    LIMIT lobbyist_limit
    OFFSET lobbyist_offset
  ),
  all_subject_areas AS (
    -- Aggregate all unique subject areas from lobbyists
    SELECT ARRAY_AGG(DISTINCT subj) AS subjects
    FROM clients c
    JOIN lobbyists l ON c.lobbyist_id = l.id
    CROSS JOIN UNNEST(l.subject_areas) AS subj
    WHERE c.name = client_name_var
      AND c.is_current = true
      AND l.is_active = true
      AND l.approval_status = 'approved'
  )
  SELECT
    client_name_var AS name,
    client_slug_param AS slug,
    total_lobbyist_count AS lobbyist_count,
    COALESCE(asa.subjects, ARRAY[]::text[]) AS subject_areas,
    jsonb_build_object(
      'total_count', total_lobbyist_count,
      'results', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', cl.id,
              'first_name', cl.first_name,
              'last_name', cl.last_name,
              'slug', cl.lobbyist_slug,
              'profile_image_url', cl.profile_image_url,
              'subject_areas', cl.subject_areas,
              'subscription_tier', cl.subscription_tier
            )
          )
          FROM client_lobbyists cl
        ),
        '[]'::jsonb
      )
    ) AS lobbyists
  FROM all_subject_areas asa;
END;
$$;

-- Grant execute permissions to authenticated and anon roles
GRANT EXECUTE ON FUNCTION get_client_detail TO authenticated, anon;

-- Example usage:
-- SELECT * FROM get_client_detail('att', 20, 0);
-- SELECT * FROM get_client_detail('heb', 10, 0);

-- Example result structure:
/*
{
  "name": "AT&T",
  "slug": "att",
  "lobbyist_count": 47,
  "subject_areas": ["Telecommunications", "Energy", "Healthcare"],
  "lobbyists": {
    "total_count": 47,
    "results": [
      {
        "id": "uuid-here",
        "first_name": "John",
        "last_name": "Doe",
        "slug": "john-doe",
        "profile_image_url": "https://...",
        "subject_areas": ["Telecommunications", "Energy"],
        "subscription_tier": "premium"
      },
      ...
    ]
  }
}
*/

-- Performance notes:
-- - Slug lookup is done by reverse-engineering from names (acceptable for MVP)
-- - For production at scale, consider adding indexed 'slug' column to clients table
-- - Lobbyist sorting prioritizes subscription tier for featured placement
-- - JSONB aggregation allows easy pagination on client side

-- Test query (verify client exists):
-- SELECT slug, name, lobbyist_count FROM get_client_detail('att', 5, 0);
-- Expected: 1 row with AT&T data, lobbyists array length <= 5
