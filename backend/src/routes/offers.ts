import { Router } from 'express';
import { createOffer, listOffers } from '../database/repository.js';
import { ok, requireAuth, type AuthenticatedRequest } from '../middleware/http.js';
import { validate } from '../middleware/validate.js';
import { listSchema, offerSchema } from '../validators/index.js';

export const offersRouter = Router(); offersRouter.use(requireAuth);
offersRouter.get('/', validate(listSchema, 'query'), async (req, res, next) => { try { return ok(res, await listOffers(req.query as never)); } catch (error) { next(error); } });
offersRouter.get('/nearby', validate(listSchema, 'query'), async (req, res, next) => { try { return ok(res, await listOffers(req.query as never)); } catch (error) { next(error); } });
offersRouter.post('/', validate(offerSchema), async (req: AuthenticatedRequest, res, next) => { try { return ok(res, await createOffer({ ...req.body, ownerId: req.user!.id, ownerName: req.user!.name, status: 'ACTIVE' }), 201); } catch (error) { next(error); } });
