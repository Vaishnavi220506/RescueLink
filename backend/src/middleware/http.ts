import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { findUserById } from '../database/repository.js';
import type { AuthUser, Role } from '../types.js';

export interface AuthenticatedRequest extends Request { user?: AuthUser; }

export const ok = <T>(res: Response, data: T, status = 200) => res.status(status).json({ success: true, data });
export const fail = (res: Response, code: string, message: string, status = 400) => res.status(status).json({ success: false, error: { code, message } });

export function issueSession(user: AuthUser) { return jwt.sign({ sub: user.id, role: user.role }, config.JWT_SECRET, { expiresIn: '7d' }); }

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.rescue_session || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return fail(res, 'UNAUTHENTICATED', 'Please sign in to continue.', 401);
  try { const payload = jwt.verify(token, config.JWT_SECRET) as { sub: string }; const user = await findUserById(payload.sub); if (!user) return fail(res, 'UNAUTHENTICATED', 'Please sign in to continue.', 401); req.user = { id: user.id, name: user.name, email: user.email, role: user.role, isAvailable: user.isAvailable, locationLabel: user.locationLabel }; next(); } catch { return fail(res, 'UNAUTHENTICATED', 'Please sign in to continue.', 401); }
}

export function requireRole(...roles: Role[]) { return (req: AuthenticatedRequest, res: Response, next: NextFunction) => { if (!req.user || !roles.includes(req.user.role)) return fail(res, 'FORBIDDEN', 'You do not have permission to perform this action.', 403); next(); }; }

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) { const message = error instanceof Error ? error.message : 'Unexpected server error.'; if (message.includes('duplicate') || message.includes('unique')) return fail(res, 'CONFLICT', 'That record already exists.', 409); console.error('[rescue-link]', error); return fail(res, 'INTERNAL_ERROR', 'Something went wrong. Please try again.', 500); }
