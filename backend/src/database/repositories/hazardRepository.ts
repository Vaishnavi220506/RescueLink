import { isDatabaseEnabled, pool, query } from '../db.js';
import { memoryStore } from '../memoryStore.js';
import type { HazardRecord, Page } from '../../types.js';
import { applyPointFilter, distanceKm, pageOf, removeTotal } from './common.js';
import type { ListFilters } from './filters.js';

export async function listHazards(filters: ListFilters): Promise<Page<HazardRecord>> {
  if (!isDatabaseEnabled) {
    let rows = [...memoryStore.hazards];
    if (filters.type) rows = rows.filter((item) => item.type === filters.type);
    if (filters.severity) rows = rows.filter((item) => item.severity === filters.severity);
    if (filters.verification || filters.status) rows = rows.filter((item) => item.verification === (filters.verification || filters.status));
    else rows = rows.filter((item) => item.verification !== 'REJECTED');
    if (filters.lat !== undefined && filters.lng !== undefined) rows = rows.map((item) => ({ ...item, distanceKm: distanceKm(filters.lat!, filters.lng!, item.lat, item.lng) })).filter((item) => filters.radius === undefined || (item.distanceKm ?? 0) <= filters.radius / 1000).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    const start = (filters.page - 1) * filters.limit;
    return pageOf(rows.slice(start, start + filters.limit), filters.page, filters.limit, rows.length);
  }
  const values: unknown[] = [];
  const where: string[] = [];
  if (filters.type) { values.push(filters.type); where.push(`h.type = $${values.length}`); }
  if (filters.severity) { values.push(filters.severity); where.push(`h.severity = $${values.length}`); }
  if (filters.verification || filters.status) { values.push(filters.verification || filters.status); where.push(`h.verification = $${values.length}`); }
  else where.push(`h.verification <> 'REJECTED'`);
  const point = applyPointFilter(values, where, 'h', filters.lat, filters.lng, filters.radius);
  const offset = (filters.page - 1) * filters.limit;
  values.push(filters.limit, offset);
  const result = await query<HazardRecord & { totalCount?: string }>(`SELECT h.id, h.type, h.description, h.severity, h.location_label AS "locationLabel", ST_Y(h.location::geometry) AS lat, ST_X(h.location::geometry) AS lng, h.reporter_id AS "reporterId", u.name AS "reporterName", h.verification, h.confirmations, h.disputes, h.created_at AS "createdAt", ${point.distanceSelect}, COUNT(*) OVER() AS "totalCount" FROM hazards h JOIN users u ON u.id = h.reporter_id WHERE ${where.join(' AND ')} ORDER BY ${point.orderBy} LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
  const total = Number(result.rows[0]?.totalCount ?? 0);
  return pageOf(result.rows.map((row) => removeTotal(row) as HazardRecord), filters.page, filters.limit, total);
}

export async function createHazard(input: Omit<HazardRecord, 'id' | 'createdAt' | 'reporterName'> & { reporterName: string }) {
  if (!isDatabaseEnabled) return memoryStore.createHazard(input);
  const result = await query<HazardRecord>('INSERT INTO hazards (reporter_id, type, description, severity, location_label, location, verification) VALUES ($1,$2,$3,$4,$5,ST_SetSRID(ST_MakePoint($6,$7),4326)::geography,\'UNVERIFIED\') RETURNING id, created_at AS "createdAt"', [input.reporterId, input.type, input.description, input.severity, input.locationLabel, input.lng, input.lat]);
  return { ...input, id: result.rows[0].id, createdAt: result.rows[0].createdAt, verification: 'UNVERIFIED' as const, confirmations: 0, disputes: 0 };
}

export async function voteHazard(id: string, userId: string, vote: 'CONFIRM' | 'DISPUTE') {
  if (!isDatabaseEnabled) return memoryStore.voteHazard(id, userId, vote);
  if (!pool) return null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const exists = await client.query<{ id: string }>('SELECT id FROM hazards WHERE id = $1 FOR UPDATE', [id]);
    if (!exists.rowCount) { await client.query('ROLLBACK'); return null; }
    const inserted = await client.query('INSERT INTO hazard_votes (hazard_id, user_id, vote) VALUES ($1,$2,$3) ON CONFLICT (hazard_id,user_id) DO NOTHING', [id, userId, vote]);
    if (!inserted.rowCount) { await client.query('ROLLBACK'); return 'DUPLICATE'; }
    await client.query(`UPDATE hazards SET ${vote === 'CONFIRM' ? 'confirmations = confirmations + 1' : 'disputes = disputes + 1'}, verification = CASE WHEN $2 = 'CONFIRM' AND confirmations + 1 >= 3 THEN 'COMMUNITY_VERIFIED' ELSE verification END, updated_at = now() WHERE id = $1`, [id, vote]);
    await client.query('COMMIT');
    const result = await query<HazardRecord>('SELECT h.id, h.type, h.description, h.severity, h.location_label AS "locationLabel", ST_Y(h.location::geometry) AS lat, ST_X(h.location::geometry) AS lng, h.reporter_id AS "reporterId", u.name AS "reporterName", h.verification, h.confirmations, h.disputes, h.created_at AS "createdAt" FROM hazards h JOIN users u ON u.id = h.reporter_id WHERE h.id = $1', [id]);
    return result.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export async function moderateHazard(id: string, verification: 'ADMIN_VERIFIED' | 'REJECTED') {
  if (!isDatabaseEnabled) { const hazard = memoryStore.hazards.find((item) => item.id === id); if (!hazard) return null; hazard.verification = verification; return hazard; }
  const result = await query<HazardRecord>('UPDATE hazards SET verification = $2, updated_at = now() WHERE id = $1 RETURNING id, type, description, severity, location_label AS "locationLabel", ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng, reporter_id AS "reporterId", verification, confirmations, disputes, created_at AS "createdAt"', [id, verification]);
  return result.rows[0] || null;
}
