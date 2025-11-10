-- Add SEO metadata fields to bills table
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS title_tag TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS intro_hook TEXT,
  ADD COLUMN IF NOT EXISTS excerpt TEXT;

-- Add indexes for SEO fields
CREATE INDEX IF NOT EXISTS idx_bills_title_tag ON public.bills(title_tag) WHERE title_tag IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.bills.title_tag IS 'SEO title tag (55-60 characters)';
COMMENT ON COLUMN public.bills.meta_description IS 'SEO meta description (155-160 characters)';
COMMENT ON COLUMN public.bills.intro_hook IS 'Engaging first sentence for bill page';
COMMENT ON COLUMN public.bills.excerpt IS 'Concise summary for previews (25-35 words)';
