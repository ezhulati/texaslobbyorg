-- Function to increment view count atomically
CREATE OR REPLACE FUNCTION increment_view_count(lobbyist_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.lobbyists
  SET view_count = view_count + 1
  WHERE id = lobbyist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
