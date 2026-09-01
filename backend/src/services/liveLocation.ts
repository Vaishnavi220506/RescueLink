import { deleteLiveLocation, listLiveLocations, upsertLiveLocation } from '../database/repository.js';
import type { AuthUser } from '../types.js';

export async function startLiveLocation(user: AuthUser, input: { lat: number; lng: number; status: string; note?: string; ttlMinutes?: number }) {
  const ttl = Math.min(Math.max(input.ttlMinutes ?? 10, 5), 15);
  return upsertLiveLocation({ userId: user.id, name: user.name, status: input.status, note: input.note, lat: input.lat, lng: input.lng, expiresAt: new Date(Date.now() + ttl * 60_000).toISOString() });
}

export async function stopLiveLocation(userId: string) {
  return deleteLiveLocation(userId);
}

export async function getActiveLiveLocations() {
  return listLiveLocations();
}
