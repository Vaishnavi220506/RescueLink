import { Router } from 'express';
import { createNotification, getDashboardStats, listHazards, listUsers, moderateHazard } from '../database/repository.js';
import { fail, ok, requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/http.js';
import { validate } from '../middleware/validate.js';
import { emitHazardEvent, emitNotificationEvent } from '../sockets/index.js';
import { listSchema, moderationSchema } from '../validators/index.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('ADMIN'));
adminRouter.get('/stats', async (_req, res, next) => { try { return ok(res, await getDashboardStats()); } catch (error) { next(error); } });
adminRouter.get('/hazards', validate(listSchema, 'query'), async (req, res, next) => { try { return ok(res, await listHazards({ ...(req.query as unknown as Record<string, unknown>), verification: 'UNVERIFIED' } as never)); } catch (error) { next(error); } });
adminRouter.patch('/hazards/:id', validate(moderationSchema), async (req: AuthenticatedRequest, res, next) => { try { const hazard = await moderateHazard(String(req.params.id), req.body.verification); if (!hazard) return fail(res, 'NOT_FOUND', 'Hazard not found.', 404); const notification = await createNotification({ userId: hazard.reporterId, title: req.body.verification === 'ADMIN_VERIFIED' ? 'Hazard verified' : 'Hazard report rejected', description: req.body.verification === 'ADMIN_VERIFIED' ? 'An administrator verified your hazard report.' : 'An administrator reviewed and rejected your hazard report.', type: 'HAZARD' }); const io = req.app.get('io'); emitNotificationEvent(io, notification); emitHazardEvent(io, 'hazard:verified', hazard); return ok(res, hazard); } catch (error) { next(error); } });
adminRouter.get('/users', validate(listSchema, 'query'), async (req, res, next) => { try { return ok(res, await listUsers(req.query as unknown as { page: number; limit: number })); } catch (error) { next(error); } });
