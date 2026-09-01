import type { NextFunction, Request, Response } from 'express';
import { fail } from './http.js';
import type { z } from 'zod';

export function validate(schema: z.ZodTypeAny, source: 'body' | 'query' | 'params' = 'body') { return (req: Request, res: Response, next: NextFunction) => { const result = schema.safeParse(req[source]); if (!result.success) return fail(res, 'INVALID_REQUEST', result.error.issues[0]?.message || 'Invalid request.', 422); req[source] = result.data; next(); }; }
