# Resume-ready points

Use only the bullets that match the features you can demonstrate in the repository:

- Built RescueLink, a full-stack hyperlocal emergency coordination platform using React, TypeScript, Node.js, Express, PostgreSQL/PostGIS, and Leaflet.
- Designed role-based citizen, volunteer, and admin workflows for help requests, resource offers, hazard reports, alerts, and request resolution.
- Implemented location-aware discovery with PostGIS geography points, radius filtering, calculated distance, and GIST spatial indexes.
- Protected volunteer request acceptance with a conditional server-side update so concurrent volunteers cannot claim the same request.
- Added bcrypt password hashing, HTTP-only JWT cookies, Zod validation, consistent API errors, Helmet, CORS, and login rate limiting.
- Created a responsive operations dashboard with live map layers, community hazard confirmation, temporary location sharing, privacy controls, and reusable empty/error states.
- Added Vitest/Supertest and React Testing Library coverage for authentication, validation, role authorization, lifecycle transitions, matching rules, duplicate hazard votes, request claiming, and key form interactions, plus Docker Compose and GitHub Actions CI.
