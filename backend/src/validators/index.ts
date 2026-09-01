import { z } from 'zod';

const latitude = z.number().min(-90).max(90);
const longitude = z.number().min(-180).max(180);
const categories = ['MEDICAL', 'FOOD', 'WATER', 'SHELTER', 'TRANSPORT', 'RESCUE', 'SUPPLIES', 'OTHER'] as const;
const urgencies = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const statuses = ['OPEN', 'MATCHED', 'ACCEPTED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'] as const;

export const registerSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(180), password: z.string().min(8).max(100), role: z.enum(['CITIZEN', 'VOLUNTEER']).default('CITIZEN') });
export const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(100) });
export const requestSchema = z.object({ category: z.enum(categories), title: z.string().trim().min(5).max(120), description: z.string().trim().min(20).max(2000), urgency: z.enum(urgencies), locationLabel: z.string().trim().min(2).max(180), lat: latitude, lng: longitude, peopleAffected: z.number().int().min(1).max(1000), contactPreference: z.enum(['IN_APP', 'PHONE', 'WHATSAPP']) });
export const offerSchema = z.object({ category: z.enum(categories), description: z.string().trim().min(12).max(1000), quantity: z.string().trim().min(1).max(120), radiusKm: z.number().min(1).max(50), locationLabel: z.string().trim().min(2).max(180), lat: latitude, lng: longitude });
export const hazardSchema = z.object({ type: z.enum(['FLOOD', 'FIRE', 'ROAD_BLOCK', 'POWER_LINE', 'DEBRIS', 'BUILDING_DAMAGE', 'OTHER']), description: z.string().trim().min(15).max(2000), severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']), locationLabel: z.string().trim().min(2).max(180), lat: latitude, lng: longitude });
export const voteSchema = z.object({ vote: z.enum(['CONFIRM', 'DISPUTE']) });
export const statusSchema = z.object({ status: z.enum(statuses) });
export const alertSchema = z.object({ title: z.string().trim().min(5).max(160), description: z.string().trim().min(10).max(2000), severity: z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']), area: z.string().trim().min(2).max(180), radiusKm: z.number().min(1).max(100).optional(), expiresAt: z.string().datetime().optional() });
export const listSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), status: z.enum(statuses).optional(), urgency: z.enum(urgencies).optional(), category: z.enum(categories).optional(), lat: z.coerce.number().min(-90).max(90).optional(), lng: z.coerce.number().min(-180).max(180).optional(), radius: z.coerce.number().int().min(100).max(100000).default(10000) });

export function bodyOf<T extends z.ZodTypeAny>(schema: T) { return (value: unknown) => { const result = schema.safeParse(value); if (!result.success) { const issue = result.error.issues[0]; const error = new Error(issue?.message || 'Invalid request.'); error.name = 'VALIDATION_ERROR'; throw error; } return result.data; }; }
