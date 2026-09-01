import { Router } from 'express';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../database/repository.js';
import { ok, requireAuth, type AuthenticatedRequest } from '../middleware/http.js';
import { validate } from '../middleware/validate.js';
import { listSchema, notificationParamsSchema } from '../validators/index.js';

export const notificationsRouter = Router(); notificationsRouter.use(requireAuth);
notificationsRouter.get('/', validate(listSchema, 'query'), async (req: AuthenticatedRequest, res, next) => { try { return ok(res, await listNotifications(req.user!.id, req.query as unknown as { page: number; limit: number })); } catch (error) { next(error); } });
notificationsRouter.patch('/read-all', async (req: AuthenticatedRequest, res, next) => { try { return ok(res, { updated: await markAllNotificationsRead(req.user!.id) }); } catch (error) { next(error); } });
notificationsRouter.patch('/:id/read', validate(notificationParamsSchema, 'params'), async (req: AuthenticatedRequest, res, next) => { try { const notification = await markNotificationRead(req.user!.id, String(req.params.id)); if (!notification) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Notification not found.' } }); return ok(res, notification); } catch (error) { next(error); } });
