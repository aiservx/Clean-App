-- ============================================================
-- Migration: Provider Service Area + Working Hours
-- Run manually in the Supabase SQL editor.
-- ============================================================

-- Add service radius to providers (default 20 km)
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS service_radius_km INTEGER NOT NULL DEFAULT 20;

-- Add working_hours JSONB (null = open all day every day)
-- Structure: { "0": { "enabled": true, "open": "08:00", "close": "22:00" }, ... }
-- Keys 0-6 = Sunday(0) through Saturday(6)
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT NULL;

-- Add response_deadline to bookings (set to NOW + 5 min on booking creation)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMPTZ DEFAULT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_providers_radius   ON providers(service_radius_km);
CREATE INDEX IF NOT EXISTS idx_bookings_deadline  ON bookings(response_deadline) WHERE response_deadline IS NOT NULL;

-- Comments
COMMENT ON COLUMN providers.service_radius_km IS 'Max travel distance (km) the provider will accept for a job';
COMMENT ON COLUMN providers.working_hours      IS 'JSON working hours per weekday: { "0": { "enabled": true, "open": "08:00", "close": "22:00" }, ... }. NULL means available 24/7.';
COMMENT ON COLUMN bookings.response_deadline   IS 'Deadline for assigned provider to accept/reject (creation + 5 min). Client-side timer auto-rejects when expired.';

-- Verification:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'providers' AND column_name IN ('service_radius_km','working_hours');
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'bookings' AND column_name = 'response_deadline';
