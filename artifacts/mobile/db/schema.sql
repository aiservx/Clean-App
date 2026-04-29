-- ============= NAZAFA SCHEMA =============
create extension if not exists "pgcrypto";

do $$ begin
  create type role_t as enum ('user','provider','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status_t as enum ('pending','accepted','on_the_way','in_progress','completed','cancelled','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type provider_status_t as enum ('pending','approved','suspended');
exception when duplicate_object then null; end $$;

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  role role_t default 'user',
  full_name text,
  phone text,
  email text,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists service_categories (
  id text primary key,
  title_ar text not null,
  icon text,
  color text,
  sort int default 0
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  category_id text references service_categories(id) on delete set null,
  title_ar text not null,
  desc_ar text,
  base_price numeric not null,
  image_url text,
  duration_min int default 120,
  is_active bool default true,
  sort int default 0
);

create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text,
  street text,
  district text,
  city text,
  region text,
  lat double precision,
  lng double precision,
  is_default bool default false,
  created_at timestamptz default now()
);

create table if not exists providers (
  id uuid primary key references profiles(id) on delete cascade,
  bio text,
  status provider_status_t default 'pending',
  available bool default false,
  rating numeric default 0,
  total_jobs int default 0,
  hourly_rate numeric default 0,
  vehicle text,
  plate text,
  current_lat double precision,
  current_lng double precision,
  service_ids uuid[],
  experience_years int default 0,
  iban text
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  provider_id uuid references profiles(id),
  service_id uuid references services(id),
  address_id uuid references addresses(id),
  scheduled_at timestamptz,
  status booking_status_t default 'pending',
  total numeric not null default 0,
  payment_method text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists booking_status_log (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  status booking_status_t,
  note text,
  created_at timestamptz default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text,
  body text,
  type text,
  data jsonb,
  read bool default false,
  created_at timestamptz default now()
);

create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  token text unique not null,
  platform text,
  created_at timestamptz default now()
);

create table if not exists favorites (
  user_id uuid references profiles(id) on delete cascade,
  provider_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, provider_id)
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  user_id uuid references profiles(id),
  provider_id uuid references profiles(id),
  rating int,
  comment text,
  created_at timestamptz default now()
);

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  title_ar text,
  desc_ar text,
  discount int,
  active bool default true,
  expires_at timestamptz,
  image_url text,
  created_at timestamptz default now()
);

create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references profiles(id) on delete cascade,
  amount numeric not null,
  status text default 'pending',
  iban text,
  created_at timestamptz default now()
);

create table if not exists chat_rooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  provider_id uuid references profiles(id) on delete cascade,
  booking_id uuid references bookings(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references chat_rooms(id) on delete cascade,
  sender_id uuid references profiles(id),
  body text,
  created_at timestamptz default now()
);

-- ============== RLS ==============
alter table profiles enable row level security;
alter table service_categories enable row level security;
alter table services enable row level security;
alter table addresses enable row level security;
alter table providers enable row level security;
alter table bookings enable row level security;
alter table booking_status_log enable row level security;
alter table notifications enable row level security;
alter table favorites enable row level security;
alter table reviews enable row level security;
alter table offers enable row level security;
alter table payouts enable row level security;
alter table push_tokens enable row level security;
alter table chat_rooms enable row level security;
alter table messages enable row level security;

drop policy if exists "public read cats" on service_categories;
create policy "public read cats" on service_categories for select using (true);
drop policy if exists "public read services" on services;
create policy "public read services" on services for select using (true);
drop policy if exists "public read offers" on offers;
create policy "public read offers" on offers for select using (true);
drop policy if exists "public read providers" on providers;
create policy "public read providers" on providers for select using (true);
drop policy if exists "public read profiles" on profiles;
create policy "public read profiles" on profiles for select using (true);
drop policy if exists "user updates own profile" on profiles;
create policy "user updates own profile" on profiles for update using (auth.uid() = id);
drop policy if exists "insert own profile" on profiles;
create policy "insert own profile" on profiles for insert with check (auth.uid() = id);
drop policy if exists "addr own" on addresses;
create policy "addr own" on addresses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "booking user select" on bookings;
create policy "booking user select" on bookings for select using (auth.uid() = user_id or auth.uid() = provider_id);
drop policy if exists "booking insert" on bookings;
create policy "booking insert" on bookings for insert with check (auth.uid() = user_id);
drop policy if exists "booking update participant" on bookings;
create policy "booking update participant" on bookings for update using (auth.uid() = user_id or auth.uid() = provider_id);
drop policy if exists "booking_log read" on booking_status_log;
create policy "booking_log read" on booking_status_log for select using (
  exists(select 1 from bookings b where b.id = booking_id and (b.user_id = auth.uid() or b.provider_id = auth.uid()))
);
drop policy if exists "booking_log insert" on booking_status_log;
create policy "booking_log insert" on booking_status_log for insert with check (true);
drop policy if exists "notif own" on notifications;
create policy "notif own" on notifications for select using (auth.uid() = user_id);
drop policy if exists "notif insert any" on notifications;
create policy "notif insert any" on notifications for insert with check (true);
drop policy if exists "provider self update" on providers;
create policy "provider self update" on providers for update using (auth.uid() = id);
drop policy if exists "provider self insert" on providers;
create policy "provider self insert" on providers for insert with check (auth.uid() = id);
drop policy if exists "fav own" on favorites;
create policy "fav own" on favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "rev read" on reviews;
create policy "rev read" on reviews for select using (true);
drop policy if exists "rev insert" on reviews;
create policy "rev insert" on reviews for insert with check (auth.uid() = user_id);
drop policy if exists "push own" on push_tokens;
create policy "push own" on push_tokens for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "room participant" on chat_rooms;
create policy "room participant" on chat_rooms for all using (auth.uid() = user_id or auth.uid() = provider_id) with check (auth.uid() = user_id or auth.uid() = provider_id);
drop policy if exists "msg participant" on messages;
create policy "msg participant" on messages for all using (
  exists(select 1 from chat_rooms r where r.id = room_id and (r.user_id = auth.uid() or r.provider_id = auth.uid()))
) with check (
  exists(select 1 from chat_rooms r where r.id = room_id and (r.user_id = auth.uid() or r.provider_id = auth.uid()))
);
drop policy if exists "payout own" on payouts;
create policy "payout own" on payouts for all using (auth.uid() = provider_id) with check (auth.uid() = provider_id);

-- =========== TRIGGERS ===========
create or replace function public.handle_new_user()
returns trigger as $$
declare _role role_t;
begin
  _role := coalesce((new.raw_user_meta_data->>'role')::role_t, 'user'::role_t);
  insert into public.profiles (id, full_name, phone, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', new.phone),
    new.email,
    _role
  ) on conflict (id) do nothing;
  if _role = 'provider' then
    insert into public.providers (id) values (new.id) on conflict (id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.log_booking_status()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') or (OLD.status is distinct from NEW.status) then
    insert into booking_status_log(booking_id, status) values (NEW.id, NEW.status);
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_booking_status on bookings;
create trigger trg_booking_status
  after insert or update on bookings
  for each row execute function public.log_booking_status();

-- enable realtime
alter publication supabase_realtime add table bookings;
alter publication supabase_realtime add table booking_status_log;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table providers;
alter publication supabase_realtime add table messages;
