import http from 'node:http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { errorHandler, ok } from './middleware/http.js';
import { authRouter } from './routes/auth.js';
import { requestsRouter } from './routes/requests.js';
import { offersRouter } from './routes/offers.js';
import { hazardsRouter } from './routes/hazards.js';
import { alertsRouter } from './routes/alerts.js';
import { adminRouter } from './routes/admin.js';
import { notificationsRouter } from './routes/notifications.js';
import { liveLocationsRouter } from './routes/liveLocations.js';
import { dashboardRouter } from './routes/dashboard.js';
import { createSocketServer } from './sockets/index.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser(config.COOKIE_SECRET));
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }), authRouter);
  app.use('/api/requests', requestsRouter);
  app.use('/api/offers', offersRouter);
  app.use('/api/hazards', hazardsRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/live-locations', liveLocationsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.get('/health', (_req, res) => ok(res, { status: 'ok', service: 'rescue-link-api', database: process.env.DATABASE_URL ? 'configured' : 'demo-memory' }));
  app.use(errorHandler);
  return app;
}

const app = createApp();
const server = http.createServer(app);
const io = createSocketServer(server);
app.set('io', io);

if (process.env.NODE_ENV !== 'test') server.listen(config.PORT, () => { console.info(`RescueLink API listening on port ${config.PORT}`); });

export { app, server };
