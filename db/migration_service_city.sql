-- ============================================================
-- Migration: Add service_city + service_district to providers
--            + Drop duplicate push notification trigger
-- Run manually in the Supabase SQL editor.
-- ============================================================

-- 1. Add city/district columns used by provider-service-area.tsx
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS service_city     TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS service_district TEXT DEFAULT NULL;

COMMENT ON COLUMN providers.service_city     IS 'City the provider covers (free text)';
COMMENT ON COLUMN providers.service_district IS 'District inside the city the provider covers (free text)';

-- 2. Drop the pg_net push trigger.
--    The app already sends push notifications via the API server (api-server/src/routes/push.ts).
--    Having both the DB trigger AND the JS sendPushNotification() call active causes every
--    notification to be delivered TWICE.  Dropping the trigger makes the API-server the
--    single, authoritative push path.
DROP TRIGGER IF EXISTS trg_auto_push ON public.notifications;

-- Verification:
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'providers' AND column_name IN ('service_city','service_district');
-- SELECT trigger_name FROM information_schema.triggers
--   WHERE event_object_table = 'notifications' AND trigger_name = 'trg_auto_push';
-- (should return 0 rows after running this migration)
