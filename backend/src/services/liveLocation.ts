import type { AuthUser } from '../types.js';

interface LiveLocation { userId: string; name: string; status: string; note?: string; lat: number; lng: number; expiresAt: number; }
const active = new Map<string, LiveLocation>();

export function startLiveLocation(user: AuthUser, input: { lat: number; lng: number; status: string; note?: string; ttlMinutes?: number }) { const ttl = Math.min(Math.max(input.ttlMinutes ?? 10, 5), 15); const location = { userId: user.id, name: user.name, ...input, expiresAt: Date.now() + ttl * 60_000 }; active.set(user.id, location); return location; }
export function stopLiveLocation(userId: string) { return active.delete(userId); }
export function getActiveLiveLocations() { const now = Date.now(); for (const [id, location] of active) if (location.expiresAt <= now) active.delete(id); return [...active.values()]; }
