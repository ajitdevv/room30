# Room30

Monthly rental marketplace. Search rooms / PGs / flats by location, chat with owners,
unlock contacts with paid plans.

## Architecture

```
Room30/
├── schema.sql       Supabase SQL — run once in the SQL Editor
├── backend/         Express API (uses SUPABASE_SERVICE_ROLE_KEY)
└── frontend/        Next.js 16 + Tailwind v4 (uses NEXT_PUBLIC_* only)
```

Backend holds the service role key, Razorpay secret, and plan/unlock logic.
Frontend only gets the anon key and talks to Supabase Auth directly + our backend
for anything that needs a trusted server.

## Prerequisites

- Node.js 20.9+
- A Supabase project
- A Razorpay account (test mode is free)

## 1. Database

1. Open your Supabase project → **SQL Editor** → paste `schema.sql` → Run.
2. Verify: `select name, price from public.plans;` should return 3 rows.

## 2. Backend

```bash
cd backend
cp .env.example .env      # then fill in real values
npm install
npm run dev               # http://localhost:4000
```

Health check: `curl http://localhost:4000/health`

`.env` keys:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- `FRONTEND_ORIGIN` (default `http://localhost:3000`)

## 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local   # then fill in real values
npm install
npm run dev                         # http://localhost:3000
```

`.env.local` keys:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` (the backend URL)
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` (test key)

## Core flows

- **Signup / login** — handled directly by Supabase Auth in the browser.
- **Search** — frontend calls `GET /api/search/suggest?q=…` for autocomplete,
  then `GET /api/properties?q=…` for the results grid.
- **Chat** — first conversation is free. Subsequent owners need an active plan;
  backend enforces this in `services/planCheck.js`.
- **Payments** — backend creates a Razorpay order, frontend opens Checkout,
  backend verifies the signature before activating the subscription.

## Test cards (Razorpay test mode)

- Card: `4111 1111 1111 1111`
- CVV: any 3 digits
- Expiry: any future date
- OTP: `1234`

## Scripts

| Where      | Command           | What it does                      |
|------------|-------------------|-----------------------------------|
| `backend/` | `npm run dev`     | Start API with file-watch         |
| `backend/` | `npm start`       | Start API (production)            |
| `frontend/`| `npm run dev`     | Start Next.js dev server          |
| `frontend/`| `npm run build`   | Production build                  |
| `frontend/`| `npm start`       | Run production build              |
