import { Router } from 'express';
import { ok, requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/http.js';
import { validate } from '../middleware/validate.js';
import { getActiveLiveLocations, startLiveLocation, stopLiveLocation } from '../services/liveLocation.js';
import { liveLocationSchema } from '../validators/index.js';

export const liveLocationsRouter = Router(); liveLocationsRouter.use(requireAuth);
liveLocationsRouter.get('/', requireRole('VOLUNTEER', 'ADMIN'), async (_req, res, next) => { try { return ok(res, { items: await getActiveLiveLocations() }); } catch (error) { next(error); } });
liveLocationsRouter.post('/start', validate(liveLocationSchema), async (req: AuthenticatedRequest, res, next) => { try { const location = await startLiveLocation(req.user!, req.body); req.app.get('io')?.to('role:VOLUNTEER').emit('location:update', location); req.app.get('io')?.to('role:ADMIN').emit('location:update', location); return ok(res, location, 201); } catch (error) { next(error); } });
liveLocationsRouter.post('/stop', async (req: AuthenticatedRequest, res, next) => { try { const stopped = await stopLiveLocation(req.user!.id); req.app.get('io')?.to('role:VOLUNTEER').emit('location:stopped', req.user!.id); req.app.get('io')?.to('role:ADMIN').emit('location:stopped', req.user!.id); return ok(res, { stopped }); } catch (error) { next(error); } });
