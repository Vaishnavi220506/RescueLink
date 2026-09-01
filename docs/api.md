# RescueLink API

Base URL: `http://localhost:4000/api`

All protected endpoints accept the HTTP-only `rescue_session` cookie created by login. Errors use:

```json
{ "success": false, "error": { "code": "INVALID_REQUEST", "message": "Description is required" } }
```

## Authentication

`POST /auth/register`

```json
{ "name": "Ananya Rao", "email": "ananya@example.com", "password": "strong-pass-123", "role": "VOLUNTEER" }
```

`POST /auth/login` accepts `email` and `password`. `POST /auth/logout` clears the cookie. `GET /auth/me` returns the authenticated user.

## Requests

`GET /requests?page=1&limit=20&status=OPEN&urgency=HIGH&category=MEDICAL&lat=13.0&lng=80.25&radius=5000`

Returns `{ success: true, data: { items, total } }`. With coordinates, the PostGIS adapter uses `ST_DWithin` and includes `distanceKm`.

`POST /requests` requires category, title, description, urgency, location label, latitude, longitude, people affected, and contact preference.

`POST /requests/:id/accept` is volunteer/admin-only and returns `409 REQUEST_UNAVAILABLE` when another volunteer has already claimed the request.

`PATCH /requests/:id/status` accepts `OPEN`, `MATCHED`, `ACCEPTED`, `IN_PROGRESS`, `RESOLVED`, or `CANCELLED`. Citizens cannot move response progress.

## Offers and hazards

`GET/POST /offers` supports category, description, quantity, radius, and location. `GET/POST /hazards` supports hazard type, description, severity, and location. `POST /hazards/:id/vote` accepts `{ "vote": "CONFIRM" }` or `{ "vote": "DISPUTE" }`; a unique database constraint prevents duplicate votes.

## Alerts and live locations

`GET /alerts` returns active non-expired alerts. `POST /alerts` is admin-only. `GET /live-locations` returns currently active temporary locations; `POST /live-locations/start` requires coordinates, a status, and optional TTL; `POST /live-locations/stop` removes the current user's location.

## WebSocket events

The Socket.IO server supports `workspace:join`, `location:update`, and `location:stopped`. The product event vocabulary is `request:new`, `request:accepted`, `request:updated`, `request:resolved`, `hazard:new`, `hazard:verified`, `alert:new`, `location:update`, and `location:stopped`.
