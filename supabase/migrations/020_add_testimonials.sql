-- Create testimonials table for client reviews
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobbyist_id UUID NOT NULL REFERENCES public.lobbyists(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_company TEXT,
  client_title TEXT,
  testimonial_text TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_approved BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT testimonial_text_length CHECK (char_length(testimonial_text) >= 10 AND char_length(testimonial_text) <= 2000)
);

-- Create index for faster lookups
CREATE INDEX idx_testimonials_lobbyist_id ON public.testimonials(lobbyist_id);
CREATE INDEX idx_testimonials_approved ON public.testimonials(is_approved);
CREATE INDEX idx_testimonials_featured ON public.testimonials(is_featured);

-- Enable RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public can read approved testimonials
CREATE POLICY "Anyone can view approved testimonials"
  ON public.testimonials FOR SELECT
  USING (is_approved = true);

-- Lobbyists can view all their own testimonials
CREATE POLICY "Lobbyists can view their own testimonials"
  ON public.testimonials FOR SELECT
  USING (
    lobbyist_id IN (
      SELECT id FROM public.lobbyists
      WHERE user_id = auth.uid()
    )
  );

-- Lobbyists can insert testimonials (subject to approval)
CREATE POLICY "Lobbyists can add testimonials"
  ON public.testimonials FOR INSERT
  WITH CHECK (
    lobbyist_id IN (
      SELECT id FROM public.lobbyists
      WHERE user_id = auth.uid()
    )
  );

-- Lobbyists can update their own unapproved testimonials
CREATE POLICY "Lobbyists can update unapproved testimonials"
  ON public.testimonials FOR UPDATE
  USING (
    lobbyist_id IN (
      SELECT id FROM public.lobbyists
      WHERE user_id = auth.uid()
    )
    AND is_approved = false
  );

-- Lobbyists can delete their own testimonials
CREATE POLICY "Lobbyists can delete their own testimonials"
  ON public.testimonials FOR DELETE
  USING (
    lobbyist_id IN (
      SELECT id FROM public.lobbyists
      WHERE user_id = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all testimonials"
  ON public.testimonials FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Function to check testimonial limits based on subscription tier
CREATE OR REPLACE FUNCTION check_testimonial_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  tier TEXT;
  max_allowed INTEGER;
BEGIN
  -- Get the lobbyist's subscription tier
  SELECT subscription_tier INTO tier
  FROM public.lobbyists
  WHERE id = NEW.lobbyist_id;

  -- Determine max testimonials based on tier
  IF tier = 'featured' THEN
    max_allowed := 999999; -- Unlimited for featured
  ELSIF tier = 'premium' THEN
    max_allowed := 10;
  ELSE
    max_allowed := 0; -- Free tier gets no testimonials
  END IF;

  -- Count current testimonials for this lobbyist
  SELECT COUNT(*) INTO current_count
  FROM public.testimonials
  WHERE lobbyist_id = NEW.lobbyist_id;

  -- Check if limit would be exceeded
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Testimonial limit reached for % tier (max: %)', tier, max_allowed;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce testimonial limits
CREATE TRIGGER enforce_testimonial_limit
  BEFORE INSERT ON public.testimonials
  FOR EACH ROW
  EXECUTE FUNCTION check_testimonial_limit();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_testimonials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER testimonials_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW
  EXECUTE FUNCTION update_testimonials_updated_at();
