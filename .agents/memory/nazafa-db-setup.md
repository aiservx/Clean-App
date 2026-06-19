---
name: Nazafa DB Auto-Setup
description: Single SQL file + admin panel auto-run button for database initialization
---

## The Rule
Always use `db/nazafa_complete_setup.sql` as the single source of truth for the database schema. Never run individual migration files in isolation again.

## How It Works
1. **SQL File**: `db/nazafa_complete_setup.sql` — idempotent, runs safely multiple times. Contains:
   - All 19 tables, enums, indexes
   - RLS policies (user + admin)
   - Triggers: handle_new_user, log_booking_status, fn_booking_status_notify, set_updated_at
   - Realtime subscriptions
   - Seed data: 19 categories, 40+ services, 3 sample offers, app_settings defaults

2. **API Endpoints** (in `artifacts/api-server/src/routes/setup.ts`):
   - `GET /api/admin/db-setup/sql` — returns the SQL file content + projectRef + length
   - `POST /api/admin/db-setup` — body: `{ managementKey: string }` → calls Supabase Management API

3. **Admin Panel** (`artifacts/admin/src/pages/Settings.tsx` → `DatabaseConfig()`):
   - Auto-fetches SQL preview from API on mount
   - "🚀 تهيئة تلقائية" button — user pastes Management API Key (from app.supabase.com/account/tokens)
   - Feedback: running / done / error states

## Supabase Management API
`POST https://api.supabase.com/v1/projects/{projectRef}/database/query`
- Header: `Authorization: Bearer {management_access_token}`  
- Body: `{ "query": "<full SQL>" }`
- The projectRef is derived from SUPABASE_URL env var automatically

**Why:** Supabase service_role key does NOT allow raw SQL execution. The Management API requires a separate personal access token from app.supabase.com/account/tokens.

## After Running Setup
Admin user must be created manually:
1. Create via Supabase Auth (email/password)
2. Run: `UPDATE profiles SET role='admin' WHERE email='admin@nadhafa.app';`
