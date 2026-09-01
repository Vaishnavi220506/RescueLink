import { Router } from 'express';
import { createAlert, listAlerts } from '../database/repository.js';
import { ok, requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/http.js';
import { validate } from '../middleware/validate.js';
import { alertSchema } from '../validators/index.js';

export const alertsRouter = Router(); alertsRouter.use(requireAuth);
alertsRouter.get('/', async (_req, res, next) => { try { return ok(res, { items: await listAlerts() }); } catch (error) { next(error); } });
alertsRouter.post('/', requireRole('ADMIN'), validate(alertSchema), async (req: AuthenticatedRequest, res, next) => { try { const alert = await createAlert({ ...req.body, createdBy: req.user!.id }); req.app.get('io')?.emit('alert:new', alert); return ok(res, alert, 201); } catch (error) { next(error); } });
