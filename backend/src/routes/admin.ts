import { Router } from 'express';
import { moderateHazard, listAlerts, listHazards, listRequests } from '../database/repository.js';
import { fail, ok, requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/http.js';
import { validate } from '../middleware/validate.js';
import { listSchema } from '../validators/index.js';

export const adminRouter = Router(); adminRouter.use(requireAuth, requireRole('ADMIN'));
adminRouter.get('/stats', async (_req, res, next) => { try { const [requests, hazards, alerts] = await Promise.all([listRequests({ page: 1, limit: 100 }), listHazards({ page: 1, limit: 100 }), listAlerts()]); return ok(res, { activeRequests: requests.items.filter((item) => !['RESOLVED', 'CANCELLED'].includes(item.status)).length, criticalRequests: requests.items.filter((item) => item.urgency === 'CRITICAL' && item.status !== 'RESOLVED').length, activeHazards: hazards.items.length, verifiedHazards: hazards.items.filter((item) => item.verification.includes('VERIFIED')).length, activeAlerts: alerts.length }); } catch (error) { next(error); } });
adminRouter.get('/hazards', validate(listSchema, 'query'), async (req, res, next) => { try { return ok(res, await listHazards({ ...(req.query as Record<string, unknown>), status: 'UNVERIFIED' } as never)); } catch (error) { next(error); } });
adminRouter.patch('/hazards/:id', async (req: AuthenticatedRequest, res, next) => { try { const verification = req.body.verification; if (!['ADMIN_VERIFIED', 'REJECTED'].includes(verification)) return fail(res, 'INVALID_VERIFICATION', 'Verification must be ADMIN_VERIFIED or REJECTED.', 422); const hazard = await moderateHazard(String(req.params.id), verification); if (!hazard) return fail(res, 'NOT_FOUND', 'Hazard not found.', 404); return ok(res, hazard); } catch (error) { next(error); } });
