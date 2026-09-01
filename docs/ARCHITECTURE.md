# RescueLink architecture

RescueLink is a modular monolith. It keeps the domain in one understandable backend while separating storage, validation, business rules, and delivery concerns.

```text
Browser
  │
  ├── REST / Axios ───────┐
  └── Socket.IO ──────────┤
                          ▼
                 Express + TypeScript
                 ├─ authentication / RBAC
                 ├─ request lifecycle service
                 ├─ matching service
                 ├─ notification persistence
                 └─ scoped realtime rooms
                          ▼
                 PostgreSQL + PostGIS
```

## Frontend structure

- `frontend/src/pages` contains route-level screens for the dashboard, requests, offers, hazards, map, alerts, activity, profile, and admin tools.
- `frontend/src/components` contains reusable cards, forms, map rendering, and shell elements.
- `frontend/src/services/api.ts` owns HTTP calls, consistent error conversion, response normalization, and pagination compatibility.
- `frontend/src/context/AppContext.tsx` owns the authenticated user, hydrated workspace data, optimistic mutations, realtime updates, and toast messages.
- The client may use the memory-backed demo only when the API is unavailable. HTTP errors such as 403, 409, and 422 remain visible to the user instead of being converted into fake success.

## Backend structure

- `routes/` defines HTTP boundaries and delegates after validation and authorization.
- `validators/` uses Zod to validate bodies, query strings, and route parameters.
- `middleware/` handles authentication, roles, common success/error responses, and security boundaries.
- `services/requestService.ts` owns lifecycle rules, actor permissions, optimistic-concurrency checks, and participant notifications.
- `services/matching.ts` owns the explainable offer score and filters incompatible, inactive, and out-of-radius offers.
- `services/liveLocation.ts` owns the short-lived location contract.
- `database/repository.ts` is a small storage facade. Domain SQL lives in `database/repositories/` modules for users, requests, offers, hazards, alerts, notifications, live locations, dashboard aggregates, and shared pagination helpers.
- `sockets/` authenticates Socket.IO connections and controls room membership and event scope.

## Database and PostGIS

PostgreSQL stores ownership, lifecycle, votes, assignments, alerts, notifications, and audit-ready records. Coordinates are stored as `geography(Point,4326)`. GIST indexes support spatial lookups; ordinary indexes cover status, category, urgency, type, verification, ownership, creation time, expiry, and notification read state.

Nearby list queries construct one parameterized point with `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography`. PostgreSQL applies `ST_DWithin(entity.location, point, radiusMetres)` before applying `LIMIT/OFFSET`. `ST_Distance` supplies `distanceKm`, and the query orders by that value. The Node process does not load all PostgreSQL rows to calculate or filter distances.

Requests, offers, and hazards expose nearby endpoints as aliases of their normal list routes. Their relevant filters and pagination are applied in the same database query. List responses always use:

```json
{ "items": [], "pagination": { "page": 1, "limit": 20, "total": 143, "totalPages": 8 } }
```

`COUNT(*) OVER()` keeps the total tied to the exact filtered query rather than the number of rows returned on the current page.

## Matching engine

Matching is deliberately rule-based and explainable. Category compatibility contributes the largest score, distance contributes up to 30 points, active availability contributes 15 points, and urgency contributes a small priority value. Offers must be active, category-compatible, and within the offer's declared radius. The service returns a score breakdown so a volunteer or interviewer can understand the ordering. It is not machine learning.

## Request lifecycle and concurrency

The normal path is:

```text
OPEN → MATCHED → ACCEPTED → IN_PROGRESS → RESOLVED
  └──────────────────────────────→ CANCELLED
```

The server rejects invalid transitions. Citizens can cancel only their own request; volunteers can update only requests assigned to them; administrators retain operational access subject to the same valid state changes.

Claiming is the important concurrency boundary. PostgreSQL runs a conditional update that requires an open state and no assignment, inside a transaction. The transaction then inserts `request_assignments` and the requester's notification before commit. The unique active-assignment index and affected-row result ensure a second volunteer receives a conflict instead of overwriting the first claim. The memory adapter mirrors this behavior for local development.

## Notifications

Notifications are durable rows with owner, type, read flag, and timestamp. Request acceptance, lifecycle changes, and hazard moderation create notifications. Read and read-all endpoints always include the authenticated user ID in the update condition, so one user cannot mark another user's notification.

## Socket.IO rooms and authentication

The socket handshake verifies the same signed JWT session cookie or bearer token used by the REST API and reloads the current user from storage. Each socket joins `user:<userId>` and `role:<role>`. Request rooms are allowed only to the requester, assigned volunteer, or an administrator. Workspace area joins use the server-known user area rather than a client-supplied identity.

Request events are scoped to the relevant user/request rooms. Hazard and alert events are scoped to area and administrator rooms. This avoids broadcasting sensitive updates to every connected browser. A multi-instance deployment can add the Socket.IO Redis adapter later without changing the domain events.

## Location privacy

Approximate area is used for discovery. Exact live location requires an explicit start action, is stored with a five-to-fifteen-minute expiry, and can be stopped. Query code always requires `expires_at > now()`. Only volunteers and administrators can query active live locations, and location events are sent to those role rooms rather than globally.

## Security

Passwords use bcrypt. Sessions are signed, HTTP-only cookies with production `secure` behavior. Public registration accepts only citizen and volunteer roles. The API reloads role data server-side, validates inputs with Zod, uses parameterized SQL, applies Helmet and CORS, rate-limits authentication routes, and hides stack traces and SQL details from production responses.

Contact preferences are stored as a request workflow choice; phone numbers are not part of public request or list payloads. In-app communication is the safe default.

## Testing and delivery

Vitest/Supertest cover API auth, validation, authorization, lifecycle behavior, duplicate voting, notification ownership, pagination, and matching rules. A separate PostGIS suite covers spatial filtering, distance ordering, one-claim concurrency, and database vote uniqueness; it runs when `RUN_DB_INTEGRATION=true` with a dedicated database. React Testing Library covers shared button behavior and request-form submission. GitHub Actions runs static checks, unit/API tests, a PostGIS service job, and the production build.

Docker Compose starts PostGIS, the API, and the Nginx frontend. Environment variables keep database URLs, secrets, origins, and ports outside source code. The health endpoint reports service status and whether a database URL is configured without exposing credentials.

## Scaling path

The next practical steps are a managed PostGIS database, connection-pool monitoring, a Redis Socket.IO adapter for multiple API instances, scheduled cleanup for expired locations, read models for map discovery, and a stronger immutable audit log for operations. Kafka, Kubernetes, microservices, and extra databases are intentionally out of scope for this project.
