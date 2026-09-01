import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail, updateUserAvailability } from '../database/repository.js';
import { issueSession, ok, fail, requireAuth, type AuthenticatedRequest } from '../middleware/http.js';
import { validate } from '../middleware/validate.js';
import { availabilitySchema, loginSchema, registerSchema } from '../validators/index.js';

export const authRouter = Router();
const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 };
authRouter.post('/register', validate(registerSchema), async (req, res, next) => { try { const { name, email, password, role } = req.body; if (await findUserByEmail(email)) return fail(res, 'EMAIL_IN_USE', 'An account with that email already exists.', 409); const user = await createUser({ name, email, passwordHash: await bcrypt.hash(password, 12), role }); const sessionUser = { id: user.id, name: user.name, email: user.email, role: user.role, isAvailable: user.isAvailable, locationLabel: user.locationLabel }; res.cookie('rescue_session', issueSession(sessionUser), cookieOptions); return ok(res, { user: sessionUser }, 201); } catch (error) { next(error); } });
authRouter.post('/login', validate(loginSchema), async (req, res, next) => { try { const { email, password } = req.body; const user = await findUserByEmail(email); if (!user || !(await bcrypt.compare(password, user.passwordHash))) return fail(res, 'INVALID_CREDENTIALS', 'Email or password is incorrect.', 401); const sessionUser = { id: user.id, name: user.name, email: user.email, role: user.role, isAvailable: user.isAvailable, locationLabel: user.locationLabel }; res.cookie('rescue_session', issueSession(sessionUser), cookieOptions); return ok(res, { user: sessionUser }); } catch (error) { next(error); } });
authRouter.post('/logout', (_req, res) => { res.clearCookie('rescue_session'); return ok(res, { loggedOut: true }); });
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res) => ok(res, { user: req.user }));
authRouter.patch('/me/availability', requireAuth, validate(availabilitySchema), async (req: AuthenticatedRequest, res, next) => { try { const user = await updateUserAvailability(req.user!.id, req.body.isAvailable); if (!user) return fail(res, 'NOT_FOUND', 'User not found.', 404); return ok(res, { user }); } catch (error) { next(error); } });
