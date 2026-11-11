# SkyFare frontend

The Next.js App Router frontend is a responsive implementation of the SkyFare
homepage design, with an honest development-only search preview. It does not
connect to live flight availability, create bookings, authenticate users, or
process payments.

## Run locally

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open <http://localhost:3000>. The homepage can be used without the backend.
`NEXT_PUBLIC_API_BASE_URL` is configured for future API integration; the
homepage preview does not call it.

## Routes in this phase

- `/` — Responsive SkyFare homepage, flight criteria form, illustrative
  destination cards, and preview membership section.
- `/flights/search` — Displays submitted search criteria and explains that no
  live search or results are available.

## Checks

```powershell
npm run lint
npm run typecheck
npm run test:e2e
npm run build
```

The Playwright configuration starts the frontend automatically. Browser
fixtures and displayed fare examples are isolated in
`src/features/homepage/data/homepage-fixtures.ts` and are never live inventory.
Regenerate API types from a running backend with `npm run api:types`.
