# RescueLink interview guide

## What problem does it solve?

RescueLink turns scattered local emergency information into a shared workflow: people ask for help, volunteers offer capacity, neighbors report hazards, and administrators moderate the operational picture.

## Architecture in simple terms

The React client is the control room, the Express API is the coordinator, PostgreSQL/PostGIS is the durable record plus map search engine, and Socket.IO is the live update channel.

## Why React and TypeScript?

React makes the dashboard composable: cards, filters, modals, and map panels can be reused across routes. TypeScript makes request states and role-sensitive actions explicit before code reaches the browser.

## Why Express and PostgreSQL?

Express is small and understandable for a modular monolith. PostgreSQL fits relational ownership, status transitions, votes, and notifications. PostGIS adds accurate radius searches without introducing another database.

## How are requests matched?

The system uses a transparent score: category fit, distance, active availability, and urgency. This is a rules engine, so an interviewer can inspect why an offer ranked highly.

## How is the race condition prevented?

Acceptance is a conditional update: `UPDATE help_requests SET ... WHERE id = $1 AND status IN ('OPEN','MATCHED')`. Only one concurrent request can change the row from an open state. A second caller updates zero rows and receives a conflict instead of overwriting the assignment.

## How does PostGIS help?

Coordinates are stored as geography points. `ST_DWithin` answers “within this radius?” and `ST_Distance` returns the calculated distance. A GIST index keeps the search practical as data grows.

## How do WebSockets help?

REST creates or changes durable records. Socket.IO tells connected, relevant clients that a request, hazard, alert, or temporary location changed, so users do not need to refresh.

## How are privacy and security handled?

Passwords are bcrypt-hashed; sessions use HTTP-only cookies; API roles are checked server-side; request bodies use Zod; Helmet, CORS, and login rate limiting reduce common attack surface. Exact location sharing is opt-in and expires automatically.

## Why not Redis yet?

The core data is relational and PostGIS handles the important spatial queries. Redis becomes useful when multiple API instances need shared Socket.IO state or when the live-location TTL map must survive process restarts. It is intentionally optional in the first version.

## Testing and delivery

Vitest and Supertest cover high-value behavior: registration, duplicate emails, authentication, validation, role restrictions, and atomic claims. Docker Compose gives a reproducible PostGIS environment. GitHub Actions runs lint, type checks, tests, and builds on pushes and pull requests.

## How could it scale?

Keep the modular monolith, add read models for map discovery, move volatile location state to Redis, use a Socket.IO adapter, add background jobs for expiry/notifications, and deploy multiple stateless API instances behind a load balancer. The data model and authorization boundaries already provide the seams for those changes.
