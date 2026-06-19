---
name: Nazafa analytics & dispatch features added
description: New features added to the Nazafa project — analytics dashboard, auto-dispatch API, enhanced dashboard
---

## Features Added

### Admin Dashboard Enhancements
- **Analytics page** (`artifacts/admin/src/pages/Analytics.tsx`) — full recharts dashboard with:
  - Daily revenue area chart (configurable 7/30/90 days)
  - Booking status pie chart
  - Top services horizontal bar chart
  - Hourly demand heatmap
  - Provider leaderboard table
  - 8 KPI cards with trend indicators
  - CSV export button
- **Enhanced Dashboard** (`artifacts/admin/src/pages/Dashboard.tsx`) — added:
  - Sparkline mini-charts in KPI cards (using recharts AreaChart)
  - Mini revenue bar chart (last 7 days)
  - Quick Actions panel
  - Live status banner for pending bookings
  - Support tickets count
  - Link to full analytics page
- **Nav** — Added "📈 التحليلات" entry in sidebar pointing to `/analytics`
- **App.tsx** — Added `/analytics` route

### API Server New Endpoints
- `GET /api/analytics/summary` — overall KPIs
- `GET /api/analytics/revenue?days=30` — daily revenue breakdown
- `GET /api/analytics/providers/top` — ranked provider leaderboard
- `GET /api/analytics/services/top` — top services by bookings/revenue
- `GET /api/analytics/hourly` — hourly booking distribution
- `GET /api/dispatch/suggest?lat=&lng=` — smart provider suggestions (scored)
- `POST /api/dispatch/auto-assign` — auto-assign best provider to a booking

### Auto-Dispatch Algorithm
Weighted scoring: proximity 40% + rating 30% + acceptance rate 20% + load 10%
Filters out providers outside their service_radius_km.

### Development Plan
Created `DEVELOPMENT_PLAN.md` at project root with full roadmap.
