# RescueLink

RescueLink is a real-time, hyperlocal emergency coordination platform. It connects people who need help with nearby volunteers, community-reported hazards, and time-sensitive alerts in one calm operational workspace.

## Problem

During floods, storms, outages, and other local emergencies, information is fragmented across chat groups and social networks. People cannot easily see what is nearby, which reports are trustworthy, or whether a request has already been claimed.

## Solution

RescueLink provides a location-aware request board, volunteer resource offers, hazard reporting with community confirmation, temporary live-location sharing, emergency alerts, and a clear request lifecycle from `OPEN` to `RESOLVED`.

## Key features

- Role-aware accounts for citizens, volunteers, and administrators.
- Help requests and resource offers with category, urgency, capacity, status, and location.
- Atomic volunteer acceptance to prevent two volunteers claiming one request.
- Leaflet/OpenStreetMap map for requests, resources, and hazards.
- PostGIS-ready nearby searches using `ST_DWithin` and `ST_Distance`.
- Community hazard confirmation and admin verification queues.
- HTTP-only cookie sessions, bcrypt password hashing, Zod validation, Helmet, CORS, rate limiting, and consistent API errors.
- Socket.IO event foundation for request, hazard, alert, and temporary location updates.
- Responsive React UI with loading, empty, error, toast, and privacy states.

## Architecture

```text
React + TypeScript + Leaflet
            ↓ REST / Socket.IO
Express modular monolith + Zod
            ↓
PostgreSQL + PostGIS (or demo memory store locally)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the request lifecycle, matching score, data model, privacy decisions, and scaling notes.

## Tech stack

- Frontend: React, TypeScript, Vite, React Router, Tailwind CSS, Leaflet, Axios.
- Backend: Node.js, Express, TypeScript, Socket.IO, Zod.
- Data: PostgreSQL, PostGIS, `pg` query layer.
- Quality: TypeScript strict mode, Vitest, Supertest, Docker Compose, GitHub Actions.

## Local development

```bash
npm install
copy .env.example .env
npm run dev
```

The frontend runs at `http://localhost:5173`. The API runs at `http://localhost:4000`. Without a `DATABASE_URL`, the API uses a clearly marked in-memory development store so the interface can be explored without infrastructure. For persistent geospatial data, run `docker compose up --build`.

Demo sign-in: use any non-empty email and an 8+ character password when the API is not connected. The UI will label the session as a demo workspace.

## Docker setup

```bash
docker compose up --build
```

This starts PostGIS, the API, and an Nginx-served frontend. The SQL files in `database/` create the schema, spatial indexes, constraints, and realistic seed data on the first database startup.

## Testing

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The backend tests cover registration, duplicate accounts, password authentication, request validation, role authorization, and the race-safe claim path.

## API overview

Authentication uses the `rescue_session` HTTP-only cookie. API responses follow `{ success, data }` on success and `{ success: false, error: { code, message } }` on failure.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create a citizen or volunteer account |
| POST | `/api/auth/login` | Start a session |
| POST | `/api/auth/logout` | Clear a session |
| GET | `/api/auth/me` | Read the current user |
| GET/POST | `/api/requests` | Paginated request list and creation |
| POST | `/api/requests/:id/accept` | Volunteer/admin atomic claim |
| PATCH | `/api/requests/:id/status` | Update request lifecycle status |
| GET/POST | `/api/offers` | List and create resource offers |
| GET/POST | `/api/hazards` | List and create hazard reports |
| POST | `/api/hazards/:id/vote` | Confirm or dispute a hazard once per user |
| GET/POST | `/api/alerts` | Read alerts or create admin alerts |
| GET | `/api/live-locations` | Read active temporary locations (volunteer/admin) |
| POST | `/api/live-locations/start` | Start a 5–15 minute temporary share |
| POST | `/api/live-locations/stop` | Stop the current user's share |

Full request/response examples are in [docs/api.md](docs/api.md).

## Security and privacy

Passwords are never stored in plain text. Authentication failures are intentionally generic. Exact live locations are permission-based, short-lived, and not shown publicly by default. Phone/WhatsApp contact preferences are only intended for an assigned responder, not a public feed. Community confirmation is explicitly not described as government verification.

## Future improvements

Production deployment would add a managed PostGIS instance, Redis-backed Socket.IO scaling, background cleanup for expired live locations, stronger audit reporting, automated accessibility checks, and an operations runbook for emergency partners.
