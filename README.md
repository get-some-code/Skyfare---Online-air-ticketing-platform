# SkyFare

SkyFare is a flight-booking and executive-aviation platform. The repository
keeps its Next.js frontend and FastAPI backend in separate applications.
Design reference screenshots are preserved in [`skyfare/design-references/`](./skyfare/design-references/).

## Frontend implementation status

The shared responsive layout and homepage are implemented from the supplied
design references. `/flights/search` still shows the captured criteria only;
it does not call the API yet. The FastAPI service now provides account
authentication, a seeded flight catalog, search, and unpaid reservations.
Card payments, live airline inventory, and email delivery are not included.

## Requirements

- Node.js 20.9 or newer and npm
- Python 3.11 or newer
- PostgreSQL 14 or newer

## Frontend

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open <http://localhost:3000>. Other useful commands:

```powershell
npm run lint
npm run typecheck
npm run test:e2e
```

The typed API client reads `NEXT_PUBLIC_API_BASE_URL`; it must point to the
backend's versioned API, for example `http://localhost:8000/api/v1`.

### OpenAPI types

Start the backend, then run this from `frontend/`:

```powershell
npm run api:types
```

This fetches FastAPI's `/openapi.json` and writes generated types under
`src/lib/api/`. Set `SKYFARE_OPENAPI_URL` to use a different OpenAPI URL.
Generated types are build outputs and should be regenerated when the API
contract changes.

## Backend

Create and activate a virtual environment from `backend/`:

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
Copy-Item .env.example .env
```

Set the values in `backend/.env` for your local PostgreSQL instance and replace
the JWT placeholder with a random secret before implementing or enabling
authentication. Generate a development secret with:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Apply migrations, load the development catalog, and start the API:

```powershell
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In `APP_ENV=development` the API also seeds the catalog on startup when the
airport table is empty. Authentication stays disabled until `JWT_SECRET_KEY`
is replaced with a random secret.

Authenticated routes expect `Authorization: Bearer <access_token>`.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | Create an account and a member profile |
| POST | `/api/v1/auth/login` | Issue access and refresh tokens |
| POST | `/api/v1/auth/refresh` | Rotate a refresh token |
| POST | `/api/v1/auth/logout` | Revoke a refresh token |
| GET, PATCH | `/api/v1/auth/me` | Read or update the signed-in profile |
| GET, POST | `/api/v1/auth/membership` | Read miles or join Privilege Club |
| GET | `/api/v1/airports` | Airport directory |
| GET | `/api/v1/destinations` | Featured destination cards |
| GET | `/api/v1/flights/search` | Search seeded fares |
| POST, GET | `/api/v1/bookings` | Reserve seats or list your bookings |
| GET | `/api/v1/bookings/{reference}` | Read one of your bookings |
| POST | `/api/v1/bookings/{reference}/cancel` | Cancel a reservation and release seats |

OpenAPI docs are at <http://localhost:8000/docs>. Liveness and readiness
endpoints are `/api/v1/health` and `/api/v1/ready`.

Run backend tests and lint:

```powershell
pytest
ruff check .
```

## PostgreSQL configuration

Create a database and a dedicated local role, then set `DATABASE_URL` in
`backend/.env` using the `postgresql+psycopg` SQLAlchemy URL scheme:

```text
postgresql+psycopg://skyfare:YOUR_LOCAL_PASSWORD@localhost:5432/skyfare
```

For example, from `psql` as a PostgreSQL administrator:

```sql
CREATE ROLE skyfare WITH LOGIN PASSWORD 'choose-a-local-password';
CREATE DATABASE skyfare OWNER skyfare;
```

The URL shown in `.env.example` is a placeholder for local setup, not a
credential. Do not commit `.env` files, production credentials, signing keys,
or provider secrets. The readiness check returns HTTP 503 when PostgreSQL is
unavailable; liveness remains available so the application can report its
process health independently.

## Project structure

```text
frontend/                 Next.js App Router application
  src/app/                Routes and root layout
    flights/search/       Non-live search criteria preview
  src/components/site/    Shared navigation, footer and currency context
  src/components/ui/      Reusable icons and preview dialogs
  src/features/homepage/  Homepage sections and isolated fixtures
  src/lib/api/             REST client and generated OpenAPI types
  src/schemas/             Client-side validation schemas
  src/types/               Frontend types
  tests/                  Playwright smoke tests
backend/                  FastAPI application
  app/api/v1/              Versioned REST routers
  app/core/                Settings, logging and error handling
  app/db/                  SQLAlchemy engine, session and declarative base
  app/models/              SQLAlchemy models (added with domain phases)
  app/repositories/        Persistence access layer
  app/schemas/             Pydantic API contracts
  app/services/            Business use cases
  migrations/              Alembic configuration and revisions
  tests/                   Pytest tests
skyfare/design-references/ Preserved visual references
```
