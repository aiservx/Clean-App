-- ============================================================
-- نظافة (Nadhafa) — Complete Database Setup v3
-- Run ONCE in Supabase SQL Editor (or via Admin Panel auto-setup)
-- Idempotent: safe to re-run multiple times
-- Last updated: June 2026
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enum Types (safe multi-run) ───────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.role_t AS ENUM ('user', 'provider', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_status_t AS ENUM (
    'pending', 'accepted', 'on_the_way', 'arrived',
    'started', 'in_progress', 'completed', 'cancelled', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add new statuses if upgrading from older schema
DO $$ BEGIN ALTER TYPE public.booking_status_t ADD VALUE IF NOT EXISTS 'arrived';    EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.booking_status_t ADD VALUE IF NOT EXISTS 'started';    EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.booking_status_t ADD VALUE IF NOT EXISTS 'in_progress'; EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.provider_status_t AS ENUM ('pending', 'approved', 'suspended', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TYPE public.provider_status_t ADD VALUE IF NOT EXISTS 'rejected'; EXCEPTION WHEN others THEN NULL; END $$;

-- ── Tables ────────────────────────────────────────────────────

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.role_t DEFAULT 'user',
  full_name   text,
  phone       text,
  email       text,
  avatar_url  text,
  gender      text,
  username    text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- service_categories
CREATE TABLE IF NOT EXISTS public.service_categories (
  id        text PRIMARY KEY,
  title_ar  text NOT NULL,
  title_en  text,
  icon      text,
  color     text DEFAULT '#16C47F',
  sort      integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- services
CREATE TABLE IF NOT EXISTS public.services (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  text REFERENCES public.service_categories(id) ON DELETE SET NULL,
  title_ar     text NOT NULL,
  title_en     text,
  desc_ar      text,
  base_price   numeric NOT NULL DEFAULT 0,
  price_per_hour numeric DEFAULT 0,
  image_url    text,
  icon         text,
  duration_min integer DEFAULT 120,
  is_active    boolean DEFAULT true,
  sort         integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- providers
CREATE TABLE IF NOT EXISTS public.providers (
  id                  uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  bio                 text,
  status              public.provider_status_t DEFAULT 'pending',
  available           boolean DEFAULT false,
  rating              numeric DEFAULT 5.0,
  total_jobs          integer DEFAULT 0,
  total_bookings      integer DEFAULT 0,
  hourly_rate         numeric DEFAULT 50,
  vehicle             text,
  plate               text,
  current_lat         double precision,
  current_lng         double precision,
  service_ids         uuid[],
  services            text[] DEFAULT '{}',
  areas               text[] DEFAULT '{}',
  service_areas       text[] DEFAULT '{}',
  service_radius_km   numeric DEFAULT 10,
  working_hours       jsonb DEFAULT '{"start":"08:00","end":"20:00"}',
  experience_years    integer DEFAULT 0,
  acceptance_rate     numeric DEFAULT 100,
  iban                text,
  location_updated_at timestamptz DEFAULT now(),
  created_at          timestamptz DEFAULT now()
);

-- addresses
CREATE TABLE IF NOT EXISTS public.addresses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       text,
  street      text,
  district    text,
  city        text,
  region      text,
  address     text,
  address_line text,
  lat         double precision,
  lng         double precision,
  is_default  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id     uuid REFERENCES public.profiles(id),
  service_id      uuid REFERENCES public.services(id),
  address_id      uuid REFERENCES public.addresses(id),
  status          public.booking_status_t DEFAULT 'pending',
  scheduled_at    timestamptz,
  address_line    text,
  total           numeric NOT NULL DEFAULT 0,
  hours           numeric DEFAULT 1,
  payment_method  text DEFAULT 'cash',
  payment_status  text DEFAULT 'pending',
  notes           text,
  cancelled_by    text,
  cancel_reason   text,
  lat             double precision,
  lng             double precision,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- booking_status_log
CREATE TABLE IF NOT EXISTS public.booking_status_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  status      text,
  note        text,
  created_at  timestamptz DEFAULT now()
);

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       text,
  body        text,
  type        text,
  data        jsonb,
  read        boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- push_tokens
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  token       text UNIQUE NOT NULL,
  platform    text,
  created_at  timestamptz DEFAULT now()
);

-- favorites
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, provider_id)
);

-- reviews / ratings
CREATE TABLE IF NOT EXISTS public.reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES public.profiles(id),
  provider_id uuid REFERENCES public.profiles(id),
  rating      integer CHECK (rating BETWEEN 1 AND 5),
  comment     text,
  created_at  timestamptz DEFAULT now()
);

-- offers
CREATE TABLE IF NOT EXISTS public.offers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar    text,
  title_en    text,
  desc_ar     text,
  discount    integer,
  code        text,
  active      boolean DEFAULT true,
  expires_at  timestamptz,
  image_url   text,
  created_at  timestamptz DEFAULT now()
);

-- payouts
CREATE TABLE IF NOT EXISTS public.payouts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount      numeric NOT NULL,
  status      text DEFAULT 'pending',
  iban        text,
  notes       text,
  created_at  timestamptz DEFAULT now()
);

-- chat_rooms
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id  uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

-- messages
CREATE TABLE IF NOT EXISTS public.messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     uuid REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id   uuid REFERENCES public.profiles(id),
  body        text,
  read        boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject     text NOT NULL,
  body        text,
  priority    text DEFAULT 'normal',
  status      text DEFAULT 'open',
  created_at  timestamptz DEFAULT now()
);

-- refunds  
CREATE TABLE IF NOT EXISTS public.refunds (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  user_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount      numeric(10,2) NOT NULL DEFAULT 0,
  reason      text,
  status      text DEFAULT 'pending',
  notes       text,
  created_at  timestamptz DEFAULT now()
);

-- app_settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_at  timestamptz DEFAULT now()
);

-- wallet_transactions  
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id  uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  amount      numeric NOT NULL,
  type        text NOT NULL, -- 'earning', 'payout', 'bonus', 'deduction'
  description text,
  created_at  timestamptz DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS bookings_user_id_idx       ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS bookings_provider_id_idx   ON public.bookings(provider_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx        ON public.bookings(status);
CREATE INDEX IF NOT EXISTS bookings_created_at_idx    ON public.bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx  ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx     ON public.notifications(read);
CREATE INDEX IF NOT EXISTS messages_room_id_idx       ON public.messages(room_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx    ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS chat_rooms_booking_id_idx  ON public.chat_rooms(booking_id);
CREATE INDEX IF NOT EXISTS providers_available_idx    ON public.providers(available);
CREATE INDEX IF NOT EXISTS reviews_provider_id_idx    ON public.reviews(provider_id);

-- ── Enable RLS ────────────────────────────────────────────────
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_status_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions  ENABLE ROW LEVEL SECURITY;

-- ── is_admin() helper ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ── RLS Policies ─────────────────────────────────────────────

-- profiles
DROP POLICY IF EXISTS "public read profiles"     ON public.profiles;
DROP POLICY IF EXISTS "user updates own profile" ON public.profiles;
DROP POLICY IF EXISTS "insert own profile"       ON public.profiles;
DROP POLICY IF EXISTS "admin all profiles"       ON public.profiles;
CREATE POLICY "public read profiles"     ON public.profiles FOR SELECT USING (true);
CREATE POLICY "user updates own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "insert own profile"       ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "admin all profiles"       ON public.profiles FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- service_categories
DROP POLICY IF EXISTS "public read cats"    ON public.service_categories;
DROP POLICY IF EXISTS "admin all categories" ON public.service_categories;
CREATE POLICY "public read cats"     ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "admin all categories" ON public.service_categories FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- services
DROP POLICY IF EXISTS "public read services" ON public.services;
DROP POLICY IF EXISTS "admin all services"   ON public.services;
CREATE POLICY "public read services" ON public.services FOR SELECT USING (true);
CREATE POLICY "admin all services"   ON public.services FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- providers
DROP POLICY IF EXISTS "public read providers"   ON public.providers;
DROP POLICY IF EXISTS "provider self update"    ON public.providers;
DROP POLICY IF EXISTS "provider self insert"    ON public.providers;
DROP POLICY IF EXISTS "admin all providers"     ON public.providers;
CREATE POLICY "public read providers"   ON public.providers FOR SELECT USING (true);
CREATE POLICY "provider self update"    ON public.providers FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "provider self insert"    ON public.providers FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "admin all providers"     ON public.providers FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- addresses
DROP POLICY IF EXISTS "addr own"         ON public.addresses;
DROP POLICY IF EXISTS "admin all addresses" ON public.addresses;
CREATE POLICY "addr own"            ON public.addresses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin all addresses" ON public.addresses FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- bookings
DROP POLICY IF EXISTS "booking user select"      ON public.bookings;
DROP POLICY IF EXISTS "booking insert"           ON public.bookings;
DROP POLICY IF EXISTS "booking update participant" ON public.bookings;
DROP POLICY IF EXISTS "admin all bookings"       ON public.bookings;
CREATE POLICY "booking user select"       ON public.bookings FOR SELECT USING (auth.uid() = user_id OR auth.uid() = provider_id OR public.is_admin());
CREATE POLICY "booking insert"            ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "booking update participant" ON public.bookings FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = provider_id OR public.is_admin());
CREATE POLICY "admin all bookings"        ON public.bookings FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- booking_status_log
DROP POLICY IF EXISTS "booking_log read"        ON public.booking_status_log;
DROP POLICY IF EXISTS "booking_log insert"      ON public.booking_status_log;
DROP POLICY IF EXISTS "admin all booking_log"   ON public.booking_status_log;
CREATE POLICY "booking_log read"      ON public.booking_status_log FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.user_id = auth.uid() OR b.provider_id = auth.uid())) OR public.is_admin()
);
CREATE POLICY "booking_log insert"    ON public.booking_status_log FOR INSERT WITH CHECK (true);
CREATE POLICY "admin all booking_log" ON public.booking_status_log FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- notifications
DROP POLICY IF EXISTS "notif own"           ON public.notifications;
DROP POLICY IF EXISTS "notif insert any"    ON public.notifications;
DROP POLICY IF EXISTS "notif update own"    ON public.notifications;
DROP POLICY IF EXISTS "admin all notifications" ON public.notifications;
CREATE POLICY "notif own"             ON public.notifications FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "notif insert any"      ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notif update own"      ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin all notifications" ON public.notifications FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- favorites
DROP POLICY IF EXISTS "fav own"        ON public.favorites;
DROP POLICY IF EXISTS "admin all favorites" ON public.favorites;
CREATE POLICY "fav own"           ON public.favorites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin all favorites" ON public.favorites FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- reviews
DROP POLICY IF EXISTS "rev read"       ON public.reviews;
DROP POLICY IF EXISTS "rev insert"     ON public.reviews;
DROP POLICY IF EXISTS "admin all reviews" ON public.reviews;
CREATE POLICY "rev read"          ON public.reviews FOR SELECT USING (true);
CREATE POLICY "rev insert"        ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin all reviews" ON public.reviews FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- offers
DROP POLICY IF EXISTS "public read offers" ON public.offers;
DROP POLICY IF EXISTS "admin all offers"   ON public.offers;
CREATE POLICY "public read offers" ON public.offers FOR SELECT USING (true);
CREATE POLICY "admin all offers"   ON public.offers FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- payouts
DROP POLICY IF EXISTS "payout own"       ON public.payouts;
DROP POLICY IF EXISTS "admin all payouts" ON public.payouts;
CREATE POLICY "payout own"        ON public.payouts FOR ALL USING (auth.uid() = provider_id) WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "admin all payouts" ON public.payouts FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- push_tokens
DROP POLICY IF EXISTS "push own"       ON public.push_tokens;
DROP POLICY IF EXISTS "admin all push" ON public.push_tokens;
CREATE POLICY "push own"       ON public.push_tokens FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin all push" ON public.push_tokens FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- chat_rooms
DROP POLICY IF EXISTS "room participant"   ON public.chat_rooms;
DROP POLICY IF EXISTS "admin all rooms"    ON public.chat_rooms;
CREATE POLICY "room participant" ON public.chat_rooms FOR ALL USING (auth.uid() = user_id OR auth.uid() = provider_id) WITH CHECK (auth.uid() = user_id OR auth.uid() = provider_id);
CREATE POLICY "admin all rooms"  ON public.chat_rooms FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- messages
DROP POLICY IF EXISTS "msg participant"   ON public.messages;
DROP POLICY IF EXISTS "admin all messages" ON public.messages;
CREATE POLICY "msg participant" ON public.messages FOR ALL USING (
  EXISTS(SELECT 1 FROM public.chat_rooms r WHERE r.id = room_id AND (r.user_id = auth.uid() OR r.provider_id = auth.uid()))
) WITH CHECK (
  EXISTS(SELECT 1 FROM public.chat_rooms r WHERE r.id = room_id AND (r.user_id = auth.uid() OR r.provider_id = auth.uid()))
);
CREATE POLICY "admin all messages" ON public.messages FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- refunds
DROP POLICY IF EXISTS "user own refund"  ON public.refunds;
DROP POLICY IF EXISTS "admin all refunds" ON public.refunds;
CREATE POLICY "user own refund"   ON public.refunds FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "admin all refunds" ON public.refunds FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- support_tickets
DROP POLICY IF EXISTS "user own support"  ON public.support_tickets;
DROP POLICY IF EXISTS "admin all support" ON public.support_tickets;
CREATE POLICY "user own support"  ON public.support_tickets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin all support" ON public.support_tickets FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- app_settings
DROP POLICY IF EXISTS "public read settings" ON public.app_settings;
DROP POLICY IF EXISTS "admin all settings"   ON public.app_settings;
CREATE POLICY "public read settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "admin all settings"   ON public.app_settings FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- wallet_transactions
DROP POLICY IF EXISTS "provider own wallet"  ON public.wallet_transactions;
DROP POLICY IF EXISTS "admin all wallet"     ON public.wallet_transactions;
CREATE POLICY "provider own wallet" ON public.wallet_transactions FOR SELECT USING (auth.uid() = provider_id OR public.is_admin());
CREATE POLICY "admin all wallet"    ON public.wallet_transactions FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── Admin RPC ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_push_tokens_for_users(user_ids uuid[])
RETURNS TABLE(token text, user_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT pt.token, pt.user_id FROM public.push_tokens pt
  WHERE pt.user_id = ANY(user_ids);
$$;

-- ── Triggers / Functions ──────────────────────────────────────

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  _role_text text;
  _role      public.role_t;
BEGIN
  _role_text := COALESCE(NULLIF(TRIM(COALESCE(new.raw_user_meta_data->>'role','')),  ''), 'user');
  IF _role_text NOT IN ('user','provider','admin') THEN _role_text := 'user'; END IF;
  _role := _role_text::public.role_t;

  INSERT INTO public.profiles (id, full_name, phone, email, role)
  VALUES (
    new.id,
    NULLIF(TRIM(COALESCE(new.raw_user_meta_data->>'full_name','')), ''),
    NULLIF(TRIM(COALESCE(new.raw_user_meta_data->>'phone','')), ''),
    new.email,
    _role
  ) ON CONFLICT (id) DO NOTHING;

  IF _role = 'provider' THEN
    INSERT INTO public.providers (id) VALUES (new.id) ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
EXCEPTION WHEN others THEN
  RAISE WARNING 'handle_new_user failed uid=%: %', new.id, SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto log booking status changes
CREATE OR REPLACE FUNCTION public.log_booking_status()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.booking_status_log(booking_id, status)
    VALUES (NEW.id, NEW.status::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_status ON public.bookings;
CREATE TRIGGER trg_booking_status
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_booking_status();

-- Auto notify user/provider on booking status change
CREATE OR REPLACE FUNCTION public.fn_booking_status_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_title text; v_body text; v_type text;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_title := 'تم إنشاء طلب جديد 🎉'; v_body := 'رقم الطلب: ' || LEFT(new.id::text, 8); v_type := 'booking_created';
  ELSIF (TG_OP = 'UPDATE' AND new.status IS DISTINCT FROM old.status) THEN
    v_type := 'booking_status';
    CASE new.status
      WHEN 'accepted'    THEN v_title := 'تم قبول طلبك ✅';         v_body := 'الفنّي قَبِل طلبك وسيتواصل معك قريباً.';
      WHEN 'on_the_way'  THEN v_title := 'الفنّي في الطريق 🚗';      v_body := 'تابع موقع الفنّي من شاشة التتبع.';
      WHEN 'arrived'     THEN v_title := 'الفنّي وصل 📍';             v_body := 'الفنّي أمام بابك الآن.';
      WHEN 'started'     THEN v_title := 'بدأت الخدمة 🧹';            v_body := 'الفنّي بدأ العمل على طلبك.';
      WHEN 'in_progress' THEN v_title := 'جاري تنفيذ الخدمة 🔧';     v_body := 'الفنّي يعمل على طلبك حالياً.';
      WHEN 'completed'   THEN v_title := 'اكتملت الخدمة 🎉';          v_body := 'قيّم الفنّي لمساعدة العملاء الآخرين.';
      WHEN 'cancelled'   THEN v_title := 'تم إلغاء الطلب ❌';         v_body := 'تواصل مع الدعم إذا كنت بحاجة للمساعدة.';
      WHEN 'rejected'    THEN v_title := 'رُفض الطلب';               v_body := 'يمكنك البحث عن مزود آخر.';
      ELSE                    v_title := 'تحديث على الطلب';           v_body  := 'الحالة: ' || new.status;
    END CASE;
  ELSE
    RETURN new;
  END IF;

  IF new.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, type, data)
    VALUES (new.user_id, v_title, v_body, v_type,
            jsonb_build_object('booking_id', new.id, 'status', new.status));
  END IF;

  IF new.provider_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, type, data)
    VALUES (new.provider_id, v_title, v_body, v_type,
            jsonb_build_object('booking_id', new.id, 'status', new.status));
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_status_notify ON public.bookings;
CREATE TRIGGER trg_booking_status_notify
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.fn_booking_status_notify();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON public.bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Realtime subscriptions ───────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_status_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.providers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;

-- ── Seed Data ────────────────────────────────────────────────

-- App Settings defaults
INSERT INTO public.app_settings (key, value) VALUES
('app_name',        '"نظافة"'),
('support_phone',   '"+966500000000"'),
('currency',        '"SAR"'),
('vat_rate',        '0.15'),
('platform_fee',    '0.15'),
('min_booking_hrs', '1'),
('max_booking_hrs', '8'),
('dynamic_pricing', '{"enabled": false, "matrix": {}}')
ON CONFLICT (key) DO NOTHING;

-- Service Categories (19 categories)
INSERT INTO public.service_categories (id, title_ar, title_en, icon, color, sort) VALUES
('all',        'الكل',              'All',           'grid',                  '#16C47F',  0),
('homes',      'منازل',             'Homes',         'home',                  '#16C47F',  1),
('deep',       'تنظيف عميق',        'Deep Clean',    'shield-check',          '#2F80ED',  2),
('offices',    'مكاتب',             'Offices',       'briefcase',             '#F59E0B',  3),
('villas',     'فلل وقصور',         'Villas',        'home-city',             '#8B5CF6',  4),
('apartments', 'شقق',               'Apartments',    'home-modern',           '#06B6D4',  5),
('furniture',  'كنب وسجاد',         'Furniture',     'sofa',                  '#EC4899',  6),
('mattresses', 'مفروشات ومراتب',    'Mattresses',    'bed',                   '#F472B6',  7),
('kitchens',   'مطابخ',             'Kitchens',      'silverware-fork-knife', '#EF4444',  8),
('bathrooms',  'حمامات',            'Bathrooms',     'shower',                '#0EA5E9',  9),
('facades',    'واجهات وزجاج',      'Facades',       'window-closed',         '#10B981', 10),
('tanks',      'خزانات مياه',       'Water Tanks',   'water',                 '#3B82F6', 11),
('ac',         'مكيفات',            'AC Units',      'air-conditioner',       '#22D3EE', 12),
('postbuild',  'ما بعد البناء',     'Post-Build',    'hammer-wrench',         '#A855F7', 13),
('cars',       'غسيل سيارات',       'Car Wash',      'car-wash',              '#EAB308', 14),
('pools',      'مسابح',             'Pools',         'pool',                  '#14B8A6', 15),
('gardens',    'حدائق',             'Gardens',       'flower',                '#84CC16', 16),
('mosques',    'مساجد',             'Mosques',       'mosque',                '#16A34A', 17),
('schools',    'منشآت ومدارس',      'Schools',       'school',                '#7C3AED', 18)
ON CONFLICT (id) DO UPDATE SET
  title_ar = EXCLUDED.title_ar,
  title_en = EXCLUDED.title_en,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  sort = EXCLUDED.sort;

-- Services (40+ services across all categories)
DELETE FROM public.services WHERE id IN (SELECT id FROM public.services);
INSERT INTO public.services (category_id, title_ar, desc_ar, base_price, duration_min, sort) VALUES
-- منازل
('homes','تنظيف منزل عادي','تنظيف شامل لجميع الغرف والمداخل والممرات', 120, 180, 1),
('homes','تنظيف غرف معيشة وصالات','تلميع وتنظيف غرف الجلوس والصالات', 80, 120, 2),
('homes','تنظيف غرف نوم','تنظيف وتعقيم غرف النوم وتغيير الأغطية', 70, 90, 3),
('homes','جلي وتلميع رخام','جلي بلاط ورخام بمعدات احترافية', 200, 240, 4),
-- تنظيف عميق
('deep','تنظيف عميق منزل كامل','تعقيم وتنظيف عميق لكل التفاصيل', 350, 360, 1),
('deep','تنظيف وتعقيم بعد المرض','بروتوكول تعقيم متخصص بمواد طبية', 280, 240, 2),
('deep','إزالة دهون متراكمة','إزالة دهون قديمة من جميع الأسطح', 180, 180, 3),
-- مكاتب
('offices','تنظيف مكاتب يومي','جدول تنظيف يومي للمكاتب الإدارية', 150, 120, 1),
('offices','تنظيف شركات أسبوعي','عقد تنظيف أسبوعي للشركات', 400, 360, 2),
('offices','تنظيف عيادات','تنظيف وتعقيم متخصص للعيادات الطبية', 220, 180, 3),
-- فلل
('villas','تنظيف فيلا دورين','تنظيف شامل للأدوار والحدائق المرافقة', 450, 360, 1),
('villas','تنظيف قصور','خدمة كاملة للقصور والمنازل الكبيرة', 800, 480, 2),
('villas','تنظيف ملاحق وأستراحات','تنظيف الملاحق والاستراحات الخارجية', 250, 240, 3),
-- شقق
('apartments','تنظيف شقة 3 غرف','تنظيف شامل لشقة متوسطة الحجم', 180, 180, 1),
('apartments','تنظيف شقة عزاب','تنظيف سريع لشقق العزاب', 100, 120, 2),
('apartments','تنظيف شقة قبل الإيجار','تجهيز الشقة لمستأجر جديد', 220, 240, 3),
-- كنب وسجاد
('furniture','تنظيف كنب بالبخار','تنظيف عميق للكنب بالبخار الساخن', 150, 120, 1),
('furniture','تنظيف سجاد وموكيت','غسيل سجاد بمواد آمنة على الألوان', 120, 120, 2),
('furniture','تعقيم وإزالة بقع','إزالة البقع الصعبة والروائح', 100, 90, 3),
-- مفروشات
('mattresses','تنظيف مراتب وأسرّة','تنظيف وتعقيم المراتب وإزالة العث', 130, 90, 1),
('mattresses','تنظيف ستائر','إنزال وتنظيف وتعليق الستائر', 90, 90, 2),
-- مطابخ
('kitchens','تنظيف مطبخ كامل','تنظيف الخزائن والأجهزة والأرضيات', 180, 180, 1),
('kitchens','إزالة دهون شفاطات','تنظيف شفاط المطبخ والدهون المتراكمة', 120, 120, 2),
('kitchens','تنظيف فرن وموقد','تنظيف داخلي شامل للفرن والموقد', 90, 60, 3),
-- حمامات
('bathrooms','تنظيف حمامات وتعقيم','جلي وتعقيم حمام كامل', 80, 60, 1),
('bathrooms','إزالة الكلس والصدأ','إزالة الكلس من الصنابير والبلاط', 110, 90, 2),
-- واجهات
('facades','تنظيف واجهات زجاج','تنظيف زجاج خارجي بمعدات احترافية', 250, 240, 1),
('facades','تلميع واجهات أحجار','تنظيف الواجهات الحجرية والرخامية', 350, 300, 2),
-- خزانات
('tanks','غسيل وتعقيم خزانات مياه','تنظيف الخزانات السفلية والعلوية', 200, 180, 1),
('tanks','صيانة خزان وعزل','إصلاح وعزل الخزانات من التسرب', 350, 300, 2),
-- مكيفات
('ac','تنظيف مكيف سبليت','تنظيف وحدتي السبليت بالماء والمعقم', 100, 60, 1),
('ac','صيانة وغسيل مكيفات مركزية','تنظيف وفحص المكيفات المركزية', 280, 180, 2),
-- ما بعد البناء
('postbuild','تنظيف ما بعد البناء','إزالة مخلفات البناء وتجهيز للسكن', 500, 480, 1),
('postbuild','إزالة بقايا الدهان والإسمنت','تنظيف بقايا أعمال الدهان والإسمنت', 350, 360, 2),
-- سيارات
('cars','غسيل سيارة خارجي وداخلي','غسيل شامل خارجي وتلميع داخلي', 60, 60, 1),
('cars','تلميع وتنظيف مفروشات','تنظيف عميق للمقاعد والكراسي', 150, 120, 2),
-- مسابح
('pools','تنظيف مسبح وفلترة','تنظيف المسبح وفلترة المياه وتعقيمها', 250, 180, 1),
-- حدائق
('gardens','تنسيق وتنظيف حديقة','قص العشب وتنظيف الحديقة وترتيبها', 200, 240, 1),
-- مساجد
('mosques','تنظيف مساجد','تنظيف وتعقيم المساجد والسجاد', 350, 240, 1),
-- منشآت
('schools','تنظيف مدارس','تنظيف الفصول والساحات والمرافق', 600, 480, 1);

-- Sample Offers
INSERT INTO public.offers (title_ar, desc_ar, discount, active, code, expires_at) VALUES
('خصم الترحيب',    'خصم 20% على أول طلب لك',               20, true, 'WELCOME20', now() + interval '90 days'),
('نظافة عميقة',    'اطلب تنظيفاً عميقاً واحصل على خصم 15%', 15, true, 'DEEP15',    now() + interval '60 days'),
('عروض الصيف',     'خصومات حصرية على خدمات التبريد والمسابح', 10, true, 'SUMMER10',  now() + interval '30 days')
ON CONFLICT DO NOTHING;

-- ── Done ─────────────────────────────────────────────────────
-- ✅ Schema + Migrations + Policies + Triggers + Seed Data
-- Admin user must be created manually via Supabase Auth
-- then UPDATE profiles SET role='admin' WHERE email='admin@nadhafa.app';
