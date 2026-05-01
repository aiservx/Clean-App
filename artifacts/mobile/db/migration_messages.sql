-- Migration: Add 'read' column to existing messages table (if not present)
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

alter table public.messages add column if not exists read boolean default false;

-- Index for fast room message lookup
create index if not exists messages_room_id_idx on public.messages(room_id);
create index if not exists messages_created_at_idx on public.messages(created_at desc);
create index if not exists chat_rooms_booking_id_idx on public.chat_rooms(booking_id);

-- Ensure RLS is enabled (may already be on from schema.sql)
alter table public.messages enable row level security;
alter table public.chat_rooms enable row level security;
