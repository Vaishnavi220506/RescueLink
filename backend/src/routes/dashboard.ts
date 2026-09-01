import { Router } from 'express';
import { getDashboardStats } from '../database/repository.js';
import { ok, requireAuth } from '../middleware/http.js';

export const dashboardRouter = Router();
dashboardRouter.get('/', requireAuth, async (_req, res, next) => { try { return ok(res, await getDashboardStats()); } catch (error) { next(error); } });
