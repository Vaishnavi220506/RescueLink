import { Router } from 'express';
import { createRequest, claimRequest, listRequests } from '../database/repository.js';
import { fail, ok, requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/http.js';
import { validate } from '../middleware/validate.js';
import { listSchema, requestSchema, statusSchema } from '../validators/index.js';
import { transitionRequest } from '../services/requestService.js';
import { emitNotificationEvent, emitRequestEvent } from '../sockets/index.js';

export const requestsRouter = Router();
requestsRouter.use(requireAuth);
requestsRouter.get('/', validate(listSchema, 'query'), async (req, res, next) => { try { const result = await listRequests(req.query as never); return ok(res, result); } catch (error) { next(error); } });
requestsRouter.get('/nearby', validate(listSchema, 'query'), async (req, res, next) => { try { const result = await listRequests(req.query as never); return ok(res, result); } catch (error) { next(error); } });
requestsRouter.post('/', validate(requestSchema), async (req: AuthenticatedRequest, res, next) => { try { const user = req.user!; const request = await createRequest({ ...req.body, requesterId: user.id, requesterName: user.name, status: 'OPEN' }); if (!request) return fail(res, 'INTERNAL_ERROR', 'The request could not be created.', 500); emitRequestEvent(req.app.get('io'), 'request:new', request); return ok(res, request, 201); } catch (error) { next(error); } });
requestsRouter.post('/:id/accept', requireRole('VOLUNTEER', 'ADMIN'), async (req: AuthenticatedRequest, res, next) => { try { const result = await claimRequest(String(req.params.id), req.user!); if (!result) return fail(res, 'REQUEST_UNAVAILABLE', 'This request has already been claimed or is no longer open.', 409); const io = req.app.get('io'); emitRequestEvent(io, 'request:accepted', result.request); emitNotificationEvent(io, result.notification); return ok(res, result.request); } catch (error) { next(error); } });
requestsRouter.patch('/:id/status', validate(statusSchema), async (req: AuthenticatedRequest, res, next) => { try { const result = await transitionRequest(String(req.params.id), req.body.status, req.user!); const io = req.app.get('io'); emitRequestEvent(io, result.request.status === 'RESOLVED' ? 'request:resolved' : 'request:updated', result.request); result.notifications.forEach((notification) => emitNotificationEvent(io, notification)); return ok(res, result.request); } catch (error) { next(error); } });
