-- Create support tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  lobbyist_id UUID REFERENCES public.lobbyists(id) ON DELETE SET NULL,

  -- Ticket details
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('technical', 'billing', 'profile', 'other')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),

  -- Contact info (in case user is not logged in)
  contact_email TEXT NOT NULL,
  contact_name TEXT NOT NULL,

  -- Admin fields
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  admin_notes TEXT,
  resolution_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT message_length CHECK (char_length(message) >= 10 AND char_length(message) <= 5000)
);

-- Create indexes
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_lobbyist_id ON public.support_tickets(lobbyist_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created_at ON public.support_tickets(created_at DESC);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own tickets
CREATE POLICY "Users can view their own tickets"
  ON public.support_tickets FOR SELECT
  USING (user_id = auth.uid());

-- Users can create tickets
CREATE POLICY "Anyone can create tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (true);

-- Users can update their own open tickets
CREATE POLICY "Users can update their own open tickets"
  ON public.support_tickets FOR UPDATE
  USING (user_id = auth.uid() AND status != 'closed');

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
  ON public.support_tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can update all tickets
CREATE POLICY "Admins can update all tickets"
  ON public.support_tickets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Function to auto-assign priority based on subscription tier
CREATE OR REPLACE FUNCTION set_ticket_priority()
RETURNS TRIGGER AS $$
DECLARE
  tier TEXT;
BEGIN
  -- If user has a lobbyist profile, get their tier
  IF NEW.lobbyist_id IS NOT NULL THEN
    SELECT subscription_tier INTO tier
    FROM public.lobbyists
    WHERE id = NEW.lobbyist_id;

    -- Set priority based on tier
    IF tier = 'featured' THEN
      NEW.priority := 'urgent'; -- Featured gets urgent priority
    ELSIF tier = 'premium' THEN
      NEW.priority := 'high'; -- Premium gets high priority
    ELSE
      NEW.priority := 'normal'; -- Free tier gets normal priority
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set priority on ticket creation
CREATE TRIGGER set_support_ticket_priority
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_priority();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();

  -- Set resolved_at when status changes to resolved
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at = now();
  END IF;

  -- Set closed_at when status changes to closed
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    NEW.closed_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_tickets_updated_at();

-- Create support_ticket_messages table for ticket conversations
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT message_text_length CHECK (char_length(message) >= 1 AND char_length(message) <= 5000)
);

-- Create index for ticket messages
CREATE INDEX idx_support_ticket_messages_ticket_id ON public.support_ticket_messages(ticket_id);
CREATE INDEX idx_support_ticket_messages_created_at ON public.support_ticket_messages(created_at);

-- Enable RLS on messages
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages for their tickets
CREATE POLICY "Users can view their ticket messages"
  ON public.support_ticket_messages FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE user_id = auth.uid()
    )
  );

-- Users can add messages to their tickets
CREATE POLICY "Users can add messages to their tickets"
  ON public.support_ticket_messages FOR INSERT
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE user_id = auth.uid()
    )
  );

-- Admins can view all messages
CREATE POLICY "Admins can view all ticket messages"
  ON public.support_ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can add messages to all tickets
CREATE POLICY "Admins can add messages to all tickets"
  ON public.support_ticket_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
