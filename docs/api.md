# RescueLink API

Base URL: `http://localhost:4000/api`

Protected endpoints accept the `rescue_session` HTTP-only cookie created by login. A bearer token is also accepted for API clients. Every response follows one of these shapes:

```json
{ "success": true, "data": {} }
```

```json
{ "success": false, "error": { "code": "INVALID_REQUEST", "message": "A useful message" } }
```

## Authentication

`POST /auth/register` creates a citizen or volunteer account. Public registration cannot create an administrator.

```json
{ "name": "Ananya Rao", "email": "ananya@example.com", "password": "strong-pass-123", "role": "VOLUNTEER" }
```

`POST /auth/login` accepts `email` and `password`. `POST /auth/logout` clears the session. `GET /auth/me` returns the current user. `PATCH /auth/me/availability` accepts `{ "isAvailable": true }` and updates volunteer availability.

## Pagination and nearby queries

List endpoints use the same response structure. `page` starts at 1, `limit` is capped at 100, and `total` is the number of matching records before pagination. `radius` is always in metres.

```http
GET /requests?lat=13.0012&lng=80.2565&radius=5000&page=1&limit=20&status=OPEN&urgency=HIGH&category=MEDICAL
```

```json
{
  "success": true,
  "data": {
    "items": [{ "id": "...", "distanceKm": 1.24 }],
    "pagination": { "page": 1, "limit": 20, "total": 43, "totalPages": 3 }
  }
}
```

When latitude and longitude are supplied, PostgreSQL/PostGIS applies `ST_DWithin` before pagination and returns `ST_Distance` as `distanceKm`, ordered nearest first. Without coordinates, results use newest-first ordering.

## Requests

- `GET /requests` and `GET /requests/nearby` list help requests. Filters: `status`, `urgency`, `category`, `lat`, `lng`, `radius`, `page`, `limit`.
- `POST /requests` creates an authenticated request. The server always starts it as `OPEN` and uses the authenticated user as requester.
- `POST /requests/:id/accept` is volunteer/admin-only. The claim is atomic and returns `409 REQUEST_UNAVAILABLE` if another volunteer won the race.
- `PATCH /requests/:id/status` applies the lifecycle state machine: `OPEN → MATCHED → ACCEPTED → IN_PROGRESS → RESOLVED`. Cancellation is allowed from open or assigned states by the requester, assigned volunteer, or admin according to authorization rules.

## Offers

- `GET /offers` and `GET /offers/nearby` support `category`, `offerStatus`, `lat`, `lng`, `radius`, `page`, and `limit`.
- `POST /offers` creates an active resource offer for the authenticated user.

Nearby offer results are filtered in PostGIS, include `distanceKm`, and default to `ACTIVE` offers.

## Hazards

- `GET /hazards` and `GET /hazards/nearby` support `type`, `severity`, `verification`, `lat`, `lng`, `radius`, `page`, and `limit`.
- `POST /hazards` creates an unverified community report.
- `POST /hazards/:id/vote` accepts `{ "vote": "CONFIRM" }` or `{ "vote": "DISPUTE" }`. One user can vote once per hazard. Three confirmations move a report to `COMMUNITY_VERIFIED`.

Rejected hazards are excluded from normal lists unless an explicit verification filter is requested.

## Alerts, dashboard, and notifications

- `GET /alerts` returns active, non-expired alerts with pagination. `POST /alerts` is admin-only.
- `GET /dashboard` returns database-backed `openRequests`, `availableOffers`, `activeHazards`, `criticalAlerts`, `resolvedToday`, and `volunteersAvailable`.
- `GET /notifications` returns only the authenticated user's notifications with pagination.
- `PATCH /notifications/:id/read` marks one owned notification read.
- `PATCH /notifications/read-all` marks all notifications for the current user read.
- `GET /admin/users` is admin-only and returns safe user summaries without password hashes.
- `GET /admin/hazards` and `PATCH /admin/hazards/:id` provide the admin verification queue.

## Temporary live locations

- `POST /live-locations/start` accepts latitude, longitude, status, optional note, and an optional TTL between 5 and 15 minutes.
- `POST /live-locations/stop` removes the current user's location.
- `GET /live-locations` is limited to volunteers and administrators and always ignores expired rows.

Exact coordinates are opt-in, short-lived, and are not returned to citizens through the normal feed.

## WebSocket events

Socket.IO connections use the same signed session cookie or bearer token as the API. Authenticated sockets join their own `user:<id>` and `role:<role>` rooms. Area and request rooms are checked server-side; a client cannot choose another user's room.

The event vocabulary is `request:new`, `request:accepted`, `request:updated`, `request:resolved`, `hazard:new`, `hazard:verified`, `alert:new`, `location:update`, and `location:stopped`. Sensitive request updates are scoped to the requester, assigned volunteer, request room, or admin room as appropriate.
