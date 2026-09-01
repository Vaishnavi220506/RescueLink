import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(16).default('development-only-rescue-link-secret'),
  COOKIE_SECRET: z.string().min(16).default('development-only-rescue-link-cookie'),
});

export const config = envSchema.parse(process.env);
