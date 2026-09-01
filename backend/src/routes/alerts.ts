import { Router } from 'express';
import { createAlert, listAlerts } from '../database/repository.js';
import { ok, requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/http.js';
import { validate } from '../middleware/validate.js';
import { alertSchema, listSchema } from '../validators/index.js';
import { emitAlertEvent } from '../sockets/index.js';

export const alertsRouter = Router(); alertsRouter.use(requireAuth);
alertsRouter.get('/', validate(listSchema, 'query'), async (req, res, next) => { try { return ok(res, await listAlerts(req.query as unknown as { page: number; limit: number })); } catch (error) { next(error); } });
alertsRouter.post('/', requireRole('ADMIN'), validate(alertSchema), async (req: AuthenticatedRequest, res, next) => { try { const alert = await createAlert({ ...req.body, createdBy: req.user!.id }); emitAlertEvent(req.app.get('io'), alert); return ok(res, alert, 201); } catch (error) { next(error); } });
