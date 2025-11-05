-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE subscription_tier AS ENUM ('free', 'premium', 'featured');
CREATE TYPE user_role AS ENUM ('searcher', 'lobbyist', 'admin');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'searcher',
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cities table
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  county TEXT,
  population INTEGER,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subject areas table
CREATE TABLE public.subject_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lobbyists table
CREATE TABLE public.lobbyists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- Basic info (from Texas Ethics Commission data)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  email TEXT,
  phone TEXT,
  website TEXT,

  -- Profile info (user-editable after claiming)
  bio TEXT,
  profile_image_url TEXT,
  years_experience INTEGER,

  -- Location
  cities TEXT[] DEFAULT '{}',

  -- Expertise
  subject_areas TEXT[] DEFAULT '{}',

  -- Subscription info
  subscription_tier subscription_tier NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  subscription_started_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,

  -- Metadata
  is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  view_count INTEGER NOT NULL DEFAULT 0,
  featured_order INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(first_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(last_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(bio, '')), 'B')
  ) STORED
);

-- Clients table (lobbyist client relationships)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobbyist_id UUID NOT NULL REFERENCES public.lobbyists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  year_started INTEGER,
  year_ended INTEGER,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Favorites table (users can save lobbyists)
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lobbyist_id UUID NOT NULL REFERENCES public.lobbyists(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, lobbyist_id)
);

-- Page views tracking
CREATE TABLE public.page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobbyist_id UUID NOT NULL REFERENCES public.lobbyists(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_id TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_lobbyists_search_vector ON public.lobbyists USING GIN(search_vector);
CREATE INDEX idx_lobbyists_cities ON public.lobbyists USING GIN(cities);
CREATE INDEX idx_lobbyists_subject_areas ON public.lobbyists USING GIN(subject_areas);
CREATE INDEX idx_lobbyists_subscription_tier ON public.lobbyists(subscription_tier);
CREATE INDEX idx_lobbyists_slug ON public.lobbyists(slug);
CREATE INDEX idx_clients_lobbyist_id ON public.clients(lobbyist_id);
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_lobbyist_id ON public.favorites(lobbyist_id);
CREATE INDEX idx_page_views_lobbyist_id ON public.page_views(lobbyist_id);
CREATE INDEX idx_page_views_created_at ON public.page_views(created_at);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lobbyists_updated_at BEFORE UPDATE ON public.lobbyists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobbyists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Cities policies (public read)
CREATE POLICY "Cities are viewable by everyone" ON public.cities
  FOR SELECT USING (true);

-- Subject areas policies (public read)
CREATE POLICY "Subject areas are viewable by everyone" ON public.subject_areas
  FOR SELECT USING (true);

-- Lobbyists policies
CREATE POLICY "Lobbyists are viewable by everyone" ON public.lobbyists
  FOR SELECT USING (is_active = true);

CREATE POLICY "Lobbyists can update own profile" ON public.lobbyists
  FOR UPDATE USING (
    auth.uid() = user_id AND is_claimed = true
  );

-- Clients policies
CREATE POLICY "Clients are viewable by everyone" ON public.clients
  FOR SELECT USING (true);

CREATE POLICY "Lobbyists can manage own clients" ON public.clients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.lobbyists
      WHERE lobbyists.id = clients.lobbyist_id
      AND lobbyists.user_id = auth.uid()
    )
  );

-- Favorites policies
CREATE POLICY "Users can view own favorites" ON public.favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own favorites" ON public.favorites
  FOR ALL USING (auth.uid() = user_id);

-- Page views policies
CREATE POLICY "Anyone can insert page views" ON public.page_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own page views" ON public.page_views
  FOR SELECT USING (auth.uid() = user_id);

-- Functions for search
CREATE OR REPLACE FUNCTION search_lobbyists(
  search_query TEXT DEFAULT NULL,
  city_filters TEXT[] DEFAULT NULL,
  subject_filters TEXT[] DEFAULT NULL,
  tier_filter subscription_tier DEFAULT NULL,
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
