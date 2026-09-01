# RescueLink interview guide

Use the technical answer when discussing implementation, then use the plain-language line if the interviewer wants the short version.

## Product and architecture

### 1. What problem does RescueLink solve?

Technical: It turns fragmented local emergency messages into a location-aware workflow for requests, offers, hazards, alerts, and resolution.

Plain language: It helps people nearby see who needs help, what resources are available, and which reports can be trusted.

### 2. Why React?

Technical: The dashboard is composed from reusable cards, forms, filters, map layers, and role-aware screens; React state also supports optimistic updates and realtime changes.

Plain language: It lets the interface update immediately when a request changes without reloading the whole page.

### 3. Why TypeScript?

Technical: Shared types make roles, lifecycle states, API records, and form payloads explicit across the frontend and backend.

Plain language: It catches mismatched data before it becomes a user-facing bug.

### 4. Why Express?

Technical: Express is a small, understandable fit for a modular monolith with middleware, route boundaries, and a separate service/repository layer.

Plain language: The API stays easy to trace from a request to the business rule to the database.

### 5. Why PostgreSQL?

Technical: Requests, users, assignments, votes, alerts, and notifications have relational ownership and consistency requirements.

Plain language: The data is connected, so a relational database is a natural fit.

### 6. Why PostGIS?

Technical: PostGIS adds indexed geographic points, radius filtering, and distance calculations to PostgreSQL.

Plain language: It can find what is genuinely nearby without loading every record into the server.

### 7. How does `ST_DWithin` work conceptually?

Technical: It tests whether two geography values are within a supplied distance in metres and can use the spatial GIST index.

Plain language: It answers “is this report inside the circle around the user?”

### 8. How do you find nearby volunteers or resources?

Technical: The API sends latitude, longitude, and a metre radius; PostGIS filters and orders requests, offers, and hazards, while the matching service scores compatible active offers.

Plain language: First find the nearby records, then rank the useful ones.

### 9. How does the matching algorithm work?

Technical: Category compatibility has the highest weight, then distance, active status, and urgency. An offer must also be within its declared service radius.

Plain language: A close offer is not useful if it is the wrong kind of help or unavailable.

### 10. Why rules instead of ML?

Technical: The rules are deterministic, explainable, testable, and appropriate for a portfolio-sized emergency workflow without training data.

Plain language: In an emergency, people should understand why something was recommended.

## Data correctness

### 11. How do you prevent two volunteers accepting one request?

Technical: The claim uses a conditional update requiring an open state and no assigned volunteer. The assignment and notification are inserted in the same transaction; a zero-row update returns 409.

Plain language: The database decides the winner, so two browser clicks cannot both succeed.

### 12. What is a database transaction here?

Technical: It groups the request update, assignment insert, and notification insert so they commit together or roll back together.

Plain language: The system does not leave a request assigned without its matching assignment record or notification.

### 13. What is the request lifecycle?

Technical: Valid progression is `OPEN → MATCHED → ACCEPTED → IN_PROGRESS → RESOLVED`; cancellation is allowed from open or active response states according to actor permissions.

Plain language: A request moves through clear stages and cannot jump backwards after completion.

### 14. Why keep both `assigned_volunteer_id` and `request_assignments`?

Technical: The request row is the fast current-state read; the assignment table records the assignment history and release time. Both are updated transactionally.

Plain language: One field answers who is responding now, while the table preserves what happened.

### 15. How does pagination work?

Technical: List queries apply filters first, use `COUNT(*) OVER()` for the matching total, then apply `LIMIT/OFFSET` and return page metadata.

Plain language: The API tells the client how many records exist, not just how many fit on the current screen.

### 16. Why are database indexes useful?

Technical: B-tree indexes support common status, ownership, category, time, and notification filters; GIST indexes support geography lookups.

Plain language: They prevent the database from checking every row for every request.

### 17. What is a GIST index?

Technical: It is a PostgreSQL index framework used by PostGIS to accelerate spatial operators such as nearby searches.

Plain language: It is the map-oriented index that makes location circles practical.

### 18. How are hazards verified?

Technical: Users can confirm or dispute once per hazard, enforced by `UNIQUE(hazard_id, user_id)`; three confirmations can mark community verification, while admins can verify or reject.

Plain language: Community signals and official admin review are shown as separate things.

### 19. What happens if PostgreSQL is unavailable?

Technical: Local development can use the clearly labelled memory adapter so the UI remains explorable. Production should fail visibly and use a managed database rather than silently losing durable writes.

Plain language: The demo can still be opened locally, but real deployments must have the database.

### 20. Why have a memory store?

Technical: It keeps onboarding and UI exploration simple while maintaining the same repository contracts and key invariants.

Plain language: Someone can try the app without setting up PostGIS first.

## Security and realtime

### 21. How does authentication work?

Technical: Bcrypt verifies passwords and a signed JWT is stored in an HTTP-only cookie. Protected requests reload the user from storage.

Plain language: The browser holds a session token it cannot read from JavaScript, and the server checks who the user is.

### 22. Authentication versus authorization?

Technical: Authentication establishes identity; authorization checks the identity's role and ownership before an action.

Plain language: Logging in does not automatically mean someone can verify hazards or manage users.

### 23. Why HTTP-only cookies?

Technical: They reduce exposure of the session token to client-side script and work with credentialed same-origin API calls.

Plain language: The session is kept away from ordinary page scripts.

### 24. What does Zod do?

Technical: Zod validates and coerces request bodies, query parameters, and route parameters before handlers use them.

Plain language: Bad or incomplete input is rejected consistently at the API boundary.

### 25. What does rate limiting protect?

Technical: The authentication routes have a bounded request window to reduce password guessing and basic abuse.

Plain language: It slows repeated login attacks.

### 26. How do Socket.IO rooms work?

Technical: Authenticated sockets join user, role, area, and authorized request rooms. Events target those rooms instead of calling a global broadcast.

Plain language: Updates go to the people who need them, not everyone connected to the app.

### 27. REST versus WebSockets in RescueLink?

Technical: REST performs durable reads and writes; Socket.IO delivers scoped change notifications so clients can refresh their local state promptly.

Plain language: REST saves the fact, while WebSockets announce that something changed.

### 28. How is location privacy handled?

Technical: Approximate area supports discovery. Exact live coordinates require an explicit action, expire after 5–15 minutes, can be stopped, and are readable only by volunteer/admin roles.

Plain language: The app does not quietly share a user's exact location.

### 29. How is contact data protected?

Technical: Public request/list records contain a contact preference, not phone numbers or WhatsApp identifiers. In-app contact is the default.

Plain language: A user's contact details are not placed on a public emergency board.

### 30. How does the frontend handle API errors?

Technical: Axios converts failures into typed errors; 401, 403, 404, 409, 422, and 500 remain distinguishable and are rendered through toasts or retry notices. Demo fallback is limited to network unavailability.

Plain language: A real permission or validation problem is shown honestly instead of pretending it worked.

## Delivery and scale

### 31. How do you test the application?

Technical: Vitest/Supertest cover API behavior, lifecycle, auth, roles, notifications, pagination, and matching. A separate PostGIS suite covers spatial filtering, distance ordering, concurrent claims, and unique votes. React Testing Library covers key interactions.

Plain language: Both the business rules and the main user action are tested.

### 32. How does CI work?

Technical: GitHub Actions runs install, lint, strict type checks, unit/API tests, a PostGIS service job with `schema.sql`, integration tests, and the production build.

Plain language: Every change is checked in a clean environment, including the real database path.

### 33. How does Docker Compose work?

Technical: It starts PostGIS with schema/seed initialization, then the API connected to the database, then the Nginx frontend pointed at the API.

Plain language: One command brings up the three pieces with the right network wiring.

### 34. How would you scale the system?

Technical: Keep the modular monolith, add managed PostGIS and pool monitoring, use a Socket.IO Redis adapter for multiple instances, move expiry cleanup to a lightweight scheduled job, and add read models for high-volume map queries.

Plain language: Scale the parts that become bottlenecks without splitting the product into many services too early.

### 35. What are the current limitations?

Technical: The local memory adapter is process-local, the map uses a configured approximate center, profile editing is not implemented, and multi-instance realtime coordination needs Redis.

Plain language: The core workflow is real, but some production operations still need infrastructure and product work.
