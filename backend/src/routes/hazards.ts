import { Router } from 'express';
import { createHazard, createNotification, listHazards, voteHazard } from '../database/repository.js';
import { fail, ok, requireAuth, type AuthenticatedRequest } from '../middleware/http.js';
import { validate } from '../middleware/validate.js';
import { hazardSchema, listSchema, voteSchema } from '../validators/index.js';
import { emitHazardEvent, emitNotificationEvent } from '../sockets/index.js';

export const hazardsRouter = Router(); hazardsRouter.use(requireAuth);
hazardsRouter.get('/', validate(listSchema, 'query'), async (req, res, next) => { try { return ok(res, await listHazards(req.query as never)); } catch (error) { next(error); } });
hazardsRouter.get('/nearby', validate(listSchema, 'query'), async (req, res, next) => { try { return ok(res, await listHazards(req.query as never)); } catch (error) { next(error); } });
hazardsRouter.post('/', validate(hazardSchema), async (req: AuthenticatedRequest, res, next) => { try { const hazard = await createHazard({ ...req.body, reporterId: req.user!.id, reporterName: req.user!.name, verification: 'UNVERIFIED', confirmations: 0, disputes: 0 }); emitHazardEvent(req.app.get('io'), 'hazard:new', hazard); return ok(res, hazard, 201); } catch (error) { next(error); } });
hazardsRouter.post('/:id/vote', validate(voteSchema), async (req: AuthenticatedRequest, res, next) => { try { const result = await voteHazard(String(req.params.id), req.user!.id, req.body.vote); if (result === 'DUPLICATE') return fail(res, 'DUPLICATE_VOTE', 'You have already voted on this hazard.', 409); if (!result) return fail(res, 'NOT_FOUND', 'Hazard not found.', 404); if (result.verification === 'COMMUNITY_VERIFIED') { emitHazardEvent(req.app.get('io'), 'hazard:verified', result); if (result.confirmations === 3) { const notification = await createNotification({ userId: result.reporterId, title: 'Hazard community verified', description: 'Your report reached the community confirmation threshold.', type: 'HAZARD' }); emitNotificationEvent(req.app.get('io'), notification); } } return ok(res, result); } catch (error) { next(error); } });
