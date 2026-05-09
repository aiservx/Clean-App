-- ============================================================
-- Migration v3: New Booking Statuses + Status Log Fix
-- نظافة — Nazafa Cleaning Services
--
-- تنفيذ يدوي في Supabase SQL Editor
-- Run manually in the Supabase SQL editor.
-- ============================================================

-- ── 1. إضافة القيم الجديدة إلى enum booking_status_t ─────────
-- PostgreSQL لا يسمح بإزالة قيم من enum، لكن يسمح بالإضافة

DO $$
BEGIN
  ALTER TYPE booking_status_t ADD VALUE IF NOT EXISTS 'arrived';
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE booking_status_t ADD VALUE IF NOT EXISTS 'started';
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

-- ── 2. تحديث عمود status في booking_status_log ──────────────
-- المشكلة: العمود يستخدم booking_status_t enum
-- والقيم الجديدة لن تُقبل في السجل إلا بعد commit للعملية أعلاه
-- الحل: تحويل العمود إلى text مع constraint للتحقق

ALTER TABLE booking_status_log
  ALTER COLUMN status TYPE text USING status::text;

ALTER TABLE booking_status_log
  DROP CONSTRAINT IF EXISTS booking_status_log_status_check;

ALTER TABLE booking_status_log
  ADD CONSTRAINT booking_status_log_status_check
  CHECK (status IN (
    'pending','accepted','on_the_way',
    'arrived','started','in_progress',
    'completed','cancelled','rejected'
  ));

-- ── 3. تحديث trigger دالة log_booking_status ────────────────
-- تحديث INSERT في trigger لاستخدام text بدلاً من enum

CREATE OR REPLACE FUNCTION public.log_booking_status()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO booking_status_log(booking_id, status)
    VALUES (NEW.id, NEW.status::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إعادة إنشاء trigger إذا لم يكن موجوداً
DROP TRIGGER IF EXISTS trg_log_booking_status ON bookings;
CREATE TRIGGER trg_log_booking_status
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_booking_status();

-- ── 4. تحديث trigger الإشعارات (إن وُجد) ─────────────────────
-- الإشعار عند تغيير الحالة يشمل الحالات الجديدة

CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
  _title text;
  _body  text;
  _type  text := 'booking_status';
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  CASE NEW.status::text
    WHEN 'accepted'   THEN _title := 'تم قبول طلبك ✓';      _body := 'تم قبول طلبك من قِبل المزود';
    WHEN 'on_the_way' THEN _title := 'المزود في الطريق 🚗'; _body := 'المزود على الطريق إليك';
    WHEN 'arrived'    THEN _title := 'المزود وصل 📍';        _body := 'وصل الفني إلى موقعك';
    WHEN 'started'    THEN _title := 'بدأت الخدمة 🧹';       _body := 'بدأ الفني تنفيذ الخدمة';
    WHEN 'in_progress'THEN _title := 'جاري التنفيذ 🔧';     _body := 'الخدمة قيد التنفيذ الآن';
    WHEN 'completed'  THEN _title := 'اكتملت الخدمة ✨';    _body := 'تمت الخدمة بنجاح. شاركنا تقييمك!';
    WHEN 'cancelled'  THEN _title := 'تم إلغاء الطلب';      _body := 'تم إلغاء طلبك';
    WHEN 'rejected'   THEN _title := 'تم رفض الطلب';        _body := 'تم رفض طلبك من قِبل المزود';
    ELSE RETURN NEW;
  END CASE;

  -- إشعار للمستخدم (غير المزود)
  INSERT INTO notifications(user_id, title, body, type, data)
  VALUES (
    NEW.user_id,
    _title,
    _body,
    _type,
    jsonb_build_object('booking_id', NEW.id, 'status', NEW.status)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_booking_status_notify ON bookings;
CREATE TRIGGER trg_booking_status_notify
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_status_change();

-- ── 5. indexes للحالات الجديدة ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_status ON bookings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_status ON bookings(provider_id, status);

-- ── 6. تحديث support_tickets لدعم هيكل API الجديد ──────────
-- schema.sql القديم يستخدم subject/body
-- الـ API الجديد يستخدم category/description
-- نضيف الأعمدة الجديدة مع الحفاظ على القديمة

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS category text
    CHECK (category IN ('service_quality','provider_behavior','payment','late_arrival','other'));

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL;

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS resolution text;

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Trigger: auto-update updated_at on support_tickets
CREATE OR REPLACE FUNCTION update_ticket_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_updated_at ON support_tickets;
CREATE TRIGGER trg_ticket_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_ticket_updated_at();

-- RLS policies for new structure
DROP POLICY IF EXISTS "users_select_own_tickets" ON support_tickets;
CREATE POLICY "users_select_own_tickets"
  ON support_tickets FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_insert_own_tickets" ON support_tickets;
CREATE POLICY "users_insert_own_tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_all_tickets" ON support_tickets;
CREATE POLICY "admins_all_tickets"
  ON support_tickets FOR ALL
  USING (public.is_admin());

-- indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user   ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- ── 7. تحديث جدول refund_requests ────────────────────────────
-- إضافة الجدول إن لم يكن موجوداً (بعض البيئات لا تملكه)

CREATE TABLE IF NOT EXISTS refund_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  amount       NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  reason       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','under_review','approved','rejected','processed')),
  notes        TEXT,
  processed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_refunds" ON refund_requests;
CREATE POLICY "users_select_own_refunds"
  ON refund_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_insert_own_refunds" ON refund_requests;
CREATE POLICY "users_insert_own_refunds"
  ON refund_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_all_refunds" ON refund_requests;
CREATE POLICY "admins_all_refunds"
  ON refund_requests FOR ALL
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION update_refund_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_refund_updated_at ON refund_requests;
CREATE TRIGGER trg_refund_updated_at
  BEFORE UPDATE ON refund_requests
  FOR EACH ROW EXECUTE FUNCTION update_refund_updated_at();

CREATE INDEX IF NOT EXISTS idx_refund_requests_user    ON refund_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_booking ON refund_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status  ON refund_requests(status);

-- ── 8. إضافة أعمدة مفقودة في providers ──────────────────────
ALTER TABLE providers ADD COLUMN IF NOT EXISTS services  text[] DEFAULT '{}';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS areas     text[] DEFAULT '{}';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS service_radius_km integer NOT NULL DEFAULT 20;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS working_hours jsonb DEFAULT NULL;

-- ── 9. إضافة أعمدة مفقودة في bookings ───────────────────────
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS response_deadline timestamptz DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type text DEFAULT 'instant'
  CHECK (booking_type IN ('instant','scheduled'));

-- ── 10. إضافة أعمدة مفقودة في addresses ─────────────────────
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS address text;

-- ── 11. إضافة قيمة 'rejected' في provider_status_t ──────────
DO $$
BEGIN
  ALTER TYPE provider_status_t ADD VALUE IF NOT EXISTS 'rejected';
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

-- ── تحقق نهائي بعد التنفيذ ────────────────────────────────────
-- شغّل هذه الاستعلامات للتحقق:
--
-- 1. تحقق من قيم enum:
-- SELECT enum_range(NULL::booking_status_t);
-- النتيجة يجب أن تشمل: pending, accepted, on_the_way, in_progress, completed, cancelled, rejected, arrived, started
--
-- 2. تحقق من عمود booking_status_log:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'booking_status_log' AND column_name = 'status';
-- النتيجة: data_type = 'text'
--
-- 3. تحقق من الـ triggers:
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE event_object_table IN ('bookings')
-- ORDER BY trigger_name;
--
-- 4. تحقق من support_tickets:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'support_tickets';
--
-- 5. تحقق من refund_requests:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name = 'refund_requests';
