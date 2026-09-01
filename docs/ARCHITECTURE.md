# RescueLink architecture

## Frontend

The React client is organized by product responsibility: reusable visual primitives live in `components`, route screens live in `pages`, API calls live in `services/api.ts`, and the small `AppContext` holds authenticated identity, cached demo data, optimistic mutations, and toast messages. React Router protects the workspace shell and keeps admin routes role-aware.

The map is a focused component. It accepts requests, offers, and hazards as data and reports a selected marker to a side panel. This keeps map rendering separate from request or hazard business rules.

## Backend

Express is a modular monolith. Routes describe HTTP boundaries, validators reject untrusted input, middleware handles authentication/roles/errors, repositories handle storage, and services contain explainable business logic such as volunteer matching and temporary location TTLs. The API can use PostgreSQL when `DATABASE_URL` is set; otherwise it uses a memory store for local UI exploration and tests.

## Database

PostgreSQL stores relational ownership and lifecycle data. PostGIS stores coordinates as `geography(Point,4326)` so distance is measured in meters. GIST indexes support nearby searches. Common filter fields—status, category, urgency, role, owners, expiry, and notification read state—also have indexes.

## Request lifecycle

1. An authenticated user submits a validated request, which starts as `OPEN`.
2. A nearby volunteer sees it through normal filters or a PostGIS radius query.
3. The volunteer calls `POST /api/requests/:id/accept`.
4. The database updates the row only when its status is still `OPEN` or `MATCHED`. The affected-row count is the concurrency check; a second claim receives a conflict response.
5. A volunteer or admin moves the request through `IN_PROGRESS` and `RESOLVED`. Citizens can only cancel their own request in the complete authorization layer.

## Real-time flow

Socket.IO is attached to the same HTTP server. Clients can join an area room. Request, hazard, and alert route handlers are the natural places to emit scoped events such as `request:accepted` or `hazard:new`. Temporary location updates are broadcast only to relevant connected peers and include a server-side expiry.

## Matching algorithm

The matching service is intentionally rule-based: category compatibility contributes 50 points, distance contributes up to 30 points, active availability contributes 15 points, and urgency contributes 1–5 points. Offers outside their declared radius are discarded. The score is explainable and easy to adjust; it is not presented as machine learning.

## Authentication and authorization

Registration hashes passwords with bcrypt. Login issues a signed JWT in an HTTP-only cookie. `requireAuth` loads the current user from the database, and `requireRole` protects volunteer/admin operations at the API boundary. The frontend only improves the user experience; it is never the security boundary.

## Privacy

Approximate neighborhood context is used for discovery. Exact live location requires an explicit start action, is held for a 5–15 minute TTL, and can be stopped. Public cards do not expose phone numbers. Hazard reports show community confirmation counts separately from admin verification.

## Scaling considerations

The first deployment is a single modular backend. If usage grows, the next practical steps are connection pooling, Redis adapter support for multiple Socket.IO instances, background cleanup of expired locations, read replicas for map discovery, and an immutable audit trail for moderation actions. The domain can remain a modular monolith until those pressures are real.
