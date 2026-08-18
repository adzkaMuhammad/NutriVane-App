# NutriVane — PRD

## Original Problem Statement
Mobile-first web app (React + FastAPI + MongoDB) for Indonesian teens/santri (13–18) to understand nutrition, manage mood, and cook healthier. Full spec covers 9 features across 5 phases; competition MVP focus.

## User Choices (this build)
- Scope: **Phase 1-2 first** — Auth, Profile + nutrition calculator, AI Food Scan, Nutrition Dashboard.
- Vision AI: **Gemini 3 Flash** (`gemini-3-flash-preview`) via Emergent LLM key.
- Weekly analysis AI (future): Claude Haiku 4.5.
- **Demo account** pre-filled for judges.
- **Parental consent** checkbox on signup.

## Architecture
- Backend: FastAPI `/app/backend/server.py`, MongoDB (users, foods, food_logs). JWT Bearer auth + bcrypt.
- Frontend: React (CRA/craco), Tailwind, recharts, framer-motion, sonner. `@/` alias. Mobile phone-frame (max-w-md). i18n ID/EN context.
- AI: emergentintegrations LlmChat, Gemini vision for /api/scan/food and /api/scan/spice.

## Personas
- Primary: santri/teens 13-18. Secondary: general users tracking Indonesian-food nutrition.

## Implemented (2026-06)
- Auth: register (with parental consent), login, /me, demo login. JWT Bearer token in localStorage.
- Profile + Mifflin-St Jeor BMR → TDEE → calorie/macro targets, BMI. PUT /api/profile.
- Seed: 16 popular Indonesian foods; demo user (demo@nutrivane.app / demo1234) with 5 days of logs.
- AI Food Scan: Gemini 3 Flash vision → items (name ID/EN, portion, kcal, macros, sodium, sugar) + confidence; manual edit; save to daily log.
- Spice estimation endpoint (experimental) — backend ready, UI not yet surfaced.
- Nutrition Dashboard: calorie ring, macro bars (orange over-limit), BMI card, weekly bar (calories) + line (sodium/sugar) charts, WHO sodium/sugar warning banner.
- History: per-date food logs, delete.
- Bilingual ID/EN toggle across UI. Bottom tab bar w/ central Scan button.
- Verified: testing agent 100% backend + frontend.

## Backlog (P0/P1/P2)
- P1: Measuring Spices UI (experimental beta + disclaimer + manual fallback) — backend exists.
- P1: Mood tracker (emoji 5-scale + calendar) — Phase 3.
- P1: Journal with photo upload (object storage) — Phase 3.
- P2: Weekly AI analysis (Claude Haiku 4.5) — Phase 4.
- P2: Healthy recommendations (recipes seed + LLM variations).
- P2: PWA install, object storage for scan photos, USDA fallback DB, larger food seed (100-150).

## Next Tasks
- Add Spice measurement screen; add Mood + Journal tabs; Weekly AI report.
