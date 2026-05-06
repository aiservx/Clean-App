-- ============================================================
-- Migration: Support Tickets + Refund Requests
-- Run manually in the Supabase SQL editor.
-- ============================================================

-- ── Support Tickets ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id  UUID REFERENCES bookings(id) ON DELETE SET NULL,
  category    TEXT NOT NULL CHECK (category IN ('service_quality','provider_behavior','payment','late_arrival','other')),
  description TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  priority    TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolution  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user   ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Users: view and create own tickets
CREATE POLICY "users_select_own_tickets"
  ON support_tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins: full access
CREATE POLICY "admins_all_tickets"
  ON support_tickets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_ticket_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_updated_at ON support_tickets;
CREATE TRIGGER trg_ticket_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_ticket_updated_at();

-- ── Refund Requests ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refund_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  amount       NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  reason       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','under_review','approved','rejected','processed')),
  notes        TEXT,             -- admin notes
  processed_at TIMESTAMPTZ,      -- when refund was actually processed
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_user    ON refund_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_booking ON refund_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status  ON refund_requests(status);

ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

-- Users: view and create own requests
CREATE POLICY "users_select_own_refunds"
  ON refund_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_refunds"
  ON refund_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins: full access
CREATE POLICY "admins_all_refunds"
  ON refund_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_refund_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_refund_updated_at ON refund_requests;
CREATE TRIGGER trg_refund_updated_at
  BEFORE UPDATE ON refund_requests
  FOR EACH ROW EXECUTE FUNCTION update_refund_updated_at();

-- ── Verification queries ──────────────────────────────────────

-- After running, confirm tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_name IN ('support_tickets','refund_requests');
