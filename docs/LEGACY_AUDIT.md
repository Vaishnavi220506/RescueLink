# Legacy prototype audit

The original repository was a single static page (`index.html`, `style.css`, `app.js`) with a separate `alertpanel.jsx` file that was not mounted by the page.

- Leaflet was loaded from a CDN and initialized in `app.js`.
- Help requests, offers, hazards, statistics, and shared pins were JavaScript arrays seeded at page load.
- New posts and hazard reports only mutated browser memory and disappeared on refresh.
- Contact values were rendered into public cards.
- Validation used browser `alert()` and there was no authentication, server, persistence, role authorization, pagination, or concurrency protection.

The replacement keeps the useful product concepts—help board, offers, hazards, Leaflet map, alerts, and location sharing—but moves them into typed React components, a documented API, a PostGIS schema, and server-owned workflows.
