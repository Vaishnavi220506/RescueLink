import { Router } from 'express';
import { ok, requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/http.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { getActiveLiveLocations, startLiveLocation, stopLiveLocation } from '../services/liveLocation.js';

const locationSchema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), status: z.string().min(2).max(40), note: z.string().max(240).optional(), ttlMinutes: z.number().int().min(5).max(15).optional() });
export const liveLocationsRouter = Router(); liveLocationsRouter.use(requireAuth);
liveLocationsRouter.get('/', requireRole('VOLUNTEER', 'ADMIN'), (_req, res) => ok(res, { items: getActiveLiveLocations() }));
liveLocationsRouter.post('/start', validate(locationSchema), (req: AuthenticatedRequest, res) => ok(res, startLiveLocation(req.user!, req.body), 201));
liveLocationsRouter.post('/stop', (req: AuthenticatedRequest, res) => ok(res, { stopped: stopLiveLocation(req.user!.id) }));
