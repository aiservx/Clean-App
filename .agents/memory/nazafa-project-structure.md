---
name: Nazafa project structure
description: PNPM monorepo structure, ports, startup, and key conventions for the Nazafa cleaning marketplace
---

**Nazafa** is a dual-sided cleaning services marketplace for Saudi Arabia.

## Monorepo Layout
- `artifacts/mobile/` — Expo React Native app (customers + providers), port 18115
- `artifacts/admin/` — React/Vite admin dashboard, port 5000, base path `/admin/`
- `artifacts/api-server/` — Express Node.js API, port 8080, base path `/api/`
- `lib/db/`, `lib/api-spec/`, `lib/api-zod/`, `lib/api-client-react/` — shared libraries

## Startup
```bash
bash scripts/start-all.sh
```
Kills ports 5000, 8080, 18115 then starts all three services in parallel.

## Auth Convention
**Username → Email hashing**: users log in with a username, which is deterministically hashed to `username@users.nazafa.app`. Never use Supabase email auth directly in mobile/customer flow.

Admin dashboard uses direct Supabase email + password (role must be `admin` in profiles table).

## Key Environment Variables
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — in `.replit` userenv (public)
- `SUPABASE_SERVICE_ROLE_KEY` — must be in Replit Secrets (for push notifications + provider sweep)
- `EXPO_TOKEN` — in Replit Secrets (for EAS builds)
- `EXPO_PUBLIC_API_URL` — baked into APK at build time, must be updated before each EAS build

## Why Supabase (not Replit DB)
This is a mature production app with 15+ tables, complex RLS policies, Supabase Realtime subscriptions, and Supabase Auth. Migrating to Replit DB would require rewriting the entire backend and mobile app.
