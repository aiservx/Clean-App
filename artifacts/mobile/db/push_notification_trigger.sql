-- ══════════════════════════════════════════════════════════════════════════════
-- Push Notification Auto-Trigger via pg_net
-- Run this in Supabase Dashboard → SQL Editor
-- This fires every time a notification row is inserted → sends push via Expo API
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Enable pg_net extension (already enabled on Supabase by default)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Function: fires on notifications INSERT, sends Expo push for each token
CREATE OR REPLACE FUNCTION public.auto_send_expo_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token   text;
  v_channel text;
  v_payload text;
BEGIN
  -- Map notification type → Android channel
  v_channel := CASE NEW.type
    WHEN 'booking_created'  THEN 'new_booking'
    WHEN 'booking_update'   THEN 'booking_status'
    WHEN 'booking_accepted' THEN 'booking_status'
    WHEN 'message'          THEN 'chat'
    ELSE                        'default'
  END;

  -- Loop over every push token for this user and fire a separate HTTP request
  FOR v_token IN
    SELECT token FROM public.push_tokens WHERE user_id = NEW.user_id
  LOOP
    v_payload := json_build_object(
      'to',        v_token,
      'title',     NEW.title,
      'body',      NEW.body,
      'data',      COALESCE(NEW.data, '{}'::jsonb),
      'sound',     'default',
      'priority',  'high',
      'channelId', v_channel
    )::text;

    PERFORM extensions.http_post(
      url     := 'https://exp.host/--/api/v2/push/send',
      headers := '{"Content-Type":"application/json","Accept":"application/json","Accept-Encoding":"gzip, deflate"}'::jsonb,
      body    := v_payload
    );
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the insert — push failure is non-fatal
  RAISE WARNING 'auto_send_expo_push error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 3. Attach trigger to notifications table
DROP TRIGGER IF EXISTS trg_auto_push ON public.notifications;
CREATE TRIGGER trg_auto_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_send_expo_push();

-- 4. Grant execute so the trigger can run under RLS bypass
GRANT EXECUTE ON FUNCTION public.auto_send_expo_push() TO service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- TEST: Insert a test notification and verify pg_net fires
-- (Replace the user_id with a real UUID from your profiles table)
-- ══════════════════════════════════════════════════════════════════════════════
-- INSERT INTO public.notifications (user_id, type, title, body, data, read)
-- VALUES (
--   'YOUR-USER-UUID-HERE',
--   'booking_created',
--   '🔔 اختبار الإشعار',
--   'إذا وصلك هذا الإشعار فالنظام يعمل بشكل صحيح',
--   '{"test": true}'::jsonb,
--   false
-- );
