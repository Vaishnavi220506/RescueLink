import { isDatabaseEnabled, query } from '../db.js';
import { memoryStore } from '../memoryStore.js';
import type { LiveLocationRecord } from '../../types.js';

export async function upsertLiveLocation(input: LiveLocationRecord) {
  if (!isDatabaseEnabled) return memoryStore.upsertLiveLocation(input);
  const result = await query<LiveLocationRecord>('INSERT INTO live_locations (user_id, location, status, note, expires_at) VALUES ($1, ST_SetSRID(ST_MakePoint($2,$3),4326)::geography, $4, $5, $6) ON CONFLICT (user_id) DO UPDATE SET location = EXCLUDED.location, status = EXCLUDED.status, note = EXCLUDED.note, expires_at = EXCLUDED.expires_at, updated_at = now() RETURNING user_id AS "userId", status, note, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng, expires_at AS "expiresAt", updated_at AS "updatedAt"', [input.userId, input.lng, input.lat, input.status, input.note, input.expiresAt]);
  return result.rows[0];
}

export async function deleteLiveLocation(userId: string) {
  if (!isDatabaseEnabled) return memoryStore.deleteLiveLocation(userId);
  const result = await query('DELETE FROM live_locations WHERE user_id = $1', [userId]);
  return Boolean(result.rowCount);
}

export async function listLiveLocations(): Promise<LiveLocationRecord[]> {
  if (!isDatabaseEnabled) return memoryStore.listLiveLocations();
  const result = await query<LiveLocationRecord>('SELECT l.user_id AS "userId", u.name, l.status, l.note, ST_Y(l.location::geometry) AS lat, ST_X(l.location::geometry) AS lng, l.expires_at AS "expiresAt", l.updated_at AS "updatedAt" FROM live_locations l JOIN users u ON u.id = l.user_id WHERE l.expires_at > now() ORDER BY l.updated_at DESC');
  return result.rows;
}
