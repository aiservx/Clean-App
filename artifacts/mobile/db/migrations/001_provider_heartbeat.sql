-- Migration 001: Provider Heartbeat (location_updated_at)
-- Run this once in your Supabase SQL Editor.
-- Safe to run multiple times — uses IF NOT EXISTS.

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill existing rows so they don't get swept immediately
UPDATE providers
  SET location_updated_at = now()
  WHERE location_updated_at IS NULL;

-- Optional index for sweep performance
CREATE INDEX IF NOT EXISTS idx_providers_available_heartbeat
  ON providers (available, location_updated_at)
  WHERE available = true;
