import { Router } from 'express';
import { ok, requireAuth, type AuthenticatedRequest } from '../middleware/http.js';

export const notificationsRouter = Router(); notificationsRouter.use(requireAuth);
notificationsRouter.get('/', (_req: AuthenticatedRequest, res) => ok(res, { items: [] }));
