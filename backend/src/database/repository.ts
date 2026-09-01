import { randomUUID } from 'node:crypto';
import { isDatabaseEnabled, pool, query } from './db.js';
import { memoryStore } from './memoryStore.js';
import type { AlertRecord, AuthUser, HazardRecord, OfferRecord, RequestRecord, RequestStatus, UserRecord } from '../types.js';

const distanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const earthRadius = 6371; const radians = (value: number) => value * Math.PI / 180; const dLat = radians(lat2 - lat1); const dLng = radians(lng2 - lng1); const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2; return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export async function findUserByEmail(email: string): Promise<UserRecord | undefined> {
  if (!isDatabaseEnabled) return memoryStore.findUserByEmail(email);
  const result = await query<UserRecord>('SELECT id, name, email, password_hash AS "passwordHash", role, is_available AS "isAvailable", location_label AS "locationLabel" FROM users WHERE lower(email) = lower($1) LIMIT 1', [email]);
  return result.rows[0];
}

export async function findUserById(id: string): Promise<UserRecord | undefined> {
  if (!isDatabaseEnabled) return memoryStore.findUserById(id);
  const result = await query<UserRecord>('SELECT id, name, email, password_hash AS "passwordHash", role, is_available AS "isAvailable", location_label AS "locationLabel" FROM users WHERE id = $1 LIMIT 1', [id]);
  return result.rows[0];
}

export async function createUser(input: { name: string; email: string; passwordHash: string; role: UserRecord['role'] }): Promise<UserRecord> {
  if (!isDatabaseEnabled) return memoryStore.createUser(input);
  const result = await query<UserRecord>('INSERT INTO users (name, email, password_hash, role, is_available) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, password_hash AS "passwordHash", role, is_available AS "isAvailable"', [input.name, input.email, input.passwordHash, input.role, input.role === 'VOLUNTEER']);
  return result.rows[0];
}

export interface ListFilters { page: number; limit: number; status?: string; urgency?: string; category?: string; lat?: number; lng?: number; radius?: number; }
export async function listRequests(filters: ListFilters) {
  if (!isDatabaseEnabled) {
    let rows = [...memoryStore.requests];
    if (filters.status) rows = rows.filter((item) => item.status === filters.status);
    if (filters.urgency) rows = rows.filter((item) => item.urgency === filters.urgency);
    if (filters.category) rows = rows.filter((item) => item.category === filters.category);
    if (filters.lat !== undefined && filters.lng !== undefined) rows = rows.map((item) => ({ ...item, distanceKm: distanceKm(filters.lat!, filters.lng!, item.lat, item.lng) })).filter((item) => !filters.radius || (item.distanceKm ?? 0) <= filters.radius / 1000).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    const start = (filters.page - 1) * filters.limit; return { items: rows.slice(start, start + filters.limit), total: rows.length };
  }
  const values: unknown[] = []; const where: string[] = [];
  if (filters.status) { values.push(filters.status); where.push(`r.status = $${values.length}`); }
  if (filters.urgency) { values.push(filters.urgency); where.push(`r.urgency = $${values.length}`); }
  if (filters.category) { values.push(filters.category); where.push(`r.category = $${values.length}`); }
  let distanceSelect = 'NULL AS "distanceKm"';
  if (filters.lat !== undefined && filters.lng !== undefined) { values.push(filters.lng, filters.lat); const point = `ST_SetSRID(ST_MakePoint($${values.length - 1}, $${values.length}), 4326)::geography`; distanceSelect = `ST_Distance(r.location, ${point}) / 1000 AS "distanceKm"`; if (filters.radius) { values.push(filters.radius); where.push(`ST_DWithin(r.location, ${point}, $${values.length})`); } }
  const offset = (filters.page - 1) * filters.limit; values.push(filters.limit, offset);
  const result = await query<RequestRecord>(`SELECT r.id, r.requester_id AS "requesterId", u.name AS "requesterName", r.category, r.title, r.description, r.urgency, r.location_label AS "locationLabel", ST_Y(r.location::geometry) AS lat, ST_X(r.location::geometry) AS lng, r.people_affected AS "peopleAffected", r.contact_preference AS "contactPreference", r.status, r.assigned_volunteer_id AS "assignedVolunteerId", av.name AS "assignedVolunteerName", r.created_at AS "createdAt", r.updated_at AS "updatedAt", r.resolved_at AS "resolvedAt", ${distanceSelect} FROM help_requests r JOIN users u ON u.id = r.requester_id LEFT JOIN users av ON av.id = r.assigned_volunteer_id ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY r.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
  return { items: result.rows, total: result.rowCount ?? result.rows.length };
}

export async function createRequest(input: Omit<RequestRecord, 'id' | 'createdAt' | 'updatedAt' | 'requesterName'> & { requesterName: string }) {
  if (!isDatabaseEnabled) return memoryStore.createRequest(input);
  const result = await query<{ id: string }>('INSERT INTO help_requests (requester_id, category, title, description, urgency, location_label, location, people_affected, contact_preference, status) VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography, $9, $10, $11) RETURNING id', [input.requesterId, input.category, input.title, input.description, input.urgency, input.locationLabel, input.lng, input.lat, input.peopleAffected, input.contactPreference, input.status]);
  const found = await listRequests({ page: 1, limit: 1, status: input.status }); return found.items.find((item) => item.id === result.rows[0].id) || { ...input, id: result.rows[0].id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

export async function findRequestById(id: string) {
  if (!isDatabaseEnabled) return memoryStore.requests.find((item) => item.id === id);
  const result = await query<RequestRecord>('SELECT r.id, r.requester_id AS "requesterId", u.name AS "requesterName", r.category, r.title, r.description, r.urgency, r.location_label AS "locationLabel", ST_Y(r.location::geometry) AS lat, ST_X(r.location::geometry) AS lng, r.people_affected AS "peopleAffected", r.contact_preference AS "contactPreference", r.status, r.assigned_volunteer_id AS "assignedVolunteerId", av.name AS "assignedVolunteerName", r.created_at AS "createdAt", r.updated_at AS "updatedAt", r.resolved_at AS "resolvedAt" FROM help_requests r JOIN users u ON u.id=r.requester_id LEFT JOIN users av ON av.id=r.assigned_volunteer_id WHERE r.id=$1', [id]);
  return result.rows[0];
}

export async function claimRequest(id: string, volunteer: AuthUser) {
  if (!isDatabaseEnabled) return memoryStore.claimRequest(id, volunteer);
  const result = await query<{ id: string }>(`UPDATE help_requests SET status = 'ACCEPTED', assigned_volunteer_id = $2, updated_at = now() WHERE id = $1 AND status IN ('OPEN', 'MATCHED') RETURNING id`, [id, volunteer.id]);
  if (!result.rowCount) return null;
  const found = await listRequests({ page: 1, limit: 50 }); return found.items.find((item) => item.id === id) || null;
}

export async function updateRequestStatus(id: string, status: RequestStatus) {
  if (!isDatabaseEnabled) return memoryStore.updateRequestStatus(id, status);
  const result = await query<{ id: string }>('UPDATE help_requests SET status = $2, resolved_at = CASE WHEN $2 = \'RESOLVED\' THEN now() ELSE resolved_at END, updated_at = now() WHERE id = $1 RETURNING id', [id, status]);
  if (!result.rowCount) return null; const found = await listRequests({ page: 1, limit: 50 }); return found.items.find((item) => item.id === id) || null;
}

export async function listOffers(filters: ListFilters) {
  if (!isDatabaseEnabled) { let rows = [...memoryStore.offers]; if (filters.category) rows = rows.filter((item) => item.category === filters.category); if (filters.lat !== undefined && filters.lng !== undefined) rows = rows.map((item) => ({ ...item, distanceKm: distanceKm(filters.lat!, filters.lng!, item.lat, item.lng) })).filter((item) => !filters.radius || (item.distanceKm ?? 0) <= filters.radius / 1000); return { items: rows.slice((filters.page - 1) * filters.limit, filters.page * filters.limit), total: rows.length }; }
  const result = await query<OfferRecord>('SELECT o.id, o.owner_id AS "ownerId", u.name AS "ownerName", o.category, o.description, o.quantity, o.radius_km AS "radiusKm", o.location_label AS "locationLabel", ST_Y(o.location::geometry) AS lat, ST_X(o.location::geometry) AS lng, o.status, o.created_at AS "createdAt" FROM resource_offers o JOIN users u ON u.id = o.owner_id WHERE o.status = \'ACTIVE\' ORDER BY o.created_at DESC LIMIT $1 OFFSET $2', [filters.limit, (filters.page - 1) * filters.limit]); return { items: result.rows, total: result.rowCount ?? result.rows.length };
}

export async function createOffer(input: Omit<OfferRecord, 'id' | 'createdAt' | 'ownerName'> & { ownerName: string }) {
  if (!isDatabaseEnabled) return memoryStore.createOffer(input); const result = await query<OfferRecord>('INSERT INTO resource_offers (owner_id, category, description, quantity, radius_km, location_label, location, status) VALUES ($1,$2,$3,$4,$5,$6,ST_SetSRID(ST_MakePoint($7,$8),4326)::geography,\'ACTIVE\') RETURNING id, created_at AS "createdAt"', [input.ownerId, input.category, input.description, input.quantity, input.radiusKm, input.locationLabel, input.lng, input.lat]); return { ...input, id: result.rows[0].id, createdAt: result.rows[0].createdAt, status: 'ACTIVE' as const };
}

export async function listHazards(filters: ListFilters) {
  if (!isDatabaseEnabled) { let rows = [...memoryStore.hazards]; if (filters.status) rows = rows.filter((item) => item.verification === filters.status); if (filters.urgency) rows = rows.filter((item) => item.severity === filters.urgency); if (filters.lat !== undefined && filters.lng !== undefined) rows = rows.map((item) => ({ ...item, distanceKm: distanceKm(filters.lat!, filters.lng!, item.lat, item.lng) })).filter((item) => !filters.radius || (item.distanceKm ?? 0) <= filters.radius / 1000); return { items: rows.slice((filters.page - 1) * filters.limit, filters.page * filters.limit), total: rows.length }; }
  const result = await query<HazardRecord>('SELECT h.id, h.type, h.description, h.severity, h.location_label AS "locationLabel", ST_Y(h.location::geometry) AS lat, ST_X(h.location::geometry) AS lng, h.reporter_id AS "reporterId", u.name AS "reporterName", h.verification, h.confirmations, h.disputes, h.created_at AS "createdAt" FROM hazards h JOIN users u ON u.id = h.reporter_id WHERE h.verification != \'REJECTED\' ORDER BY h.created_at DESC LIMIT $1 OFFSET $2', [filters.limit, (filters.page - 1) * filters.limit]); return { items: result.rows, total: result.rowCount ?? result.rows.length };
}

export async function createHazard(input: Omit<HazardRecord, 'id' | 'createdAt' | 'reporterName'> & { reporterName: string }) {
  if (!isDatabaseEnabled) return memoryStore.createHazard(input); const result = await query<HazardRecord>('INSERT INTO hazards (reporter_id, type, description, severity, location_label, location, verification) VALUES ($1,$2,$3,$4,$5,ST_SetSRID(ST_MakePoint($6,$7),4326)::geography,\'UNVERIFIED\') RETURNING id, created_at AS "createdAt"', [input.reporterId, input.type, input.description, input.severity, input.locationLabel, input.lng, input.lat]); return { ...input, id: result.rows[0].id, createdAt: result.rows[0].createdAt, verification: 'UNVERIFIED' as const, confirmations: 0, disputes: 0 };
}

export async function voteHazard(id: string, userId: string, vote: 'CONFIRM' | 'DISPUTE') {
  if (!isDatabaseEnabled) return memoryStore.voteHazard(id, userId, vote);
  if (!pool) return null; const client = await pool.connect(); try { await client.query('BEGIN'); const inserted = await client.query('INSERT INTO hazard_votes (hazard_id, user_id, vote) VALUES ($1,$2,$3) ON CONFLICT (hazard_id,user_id) DO NOTHING', [id, userId, vote]); if (!inserted.rowCount) { await client.query('ROLLBACK'); return 'DUPLICATE'; } await client.query(`UPDATE hazards SET ${vote === 'CONFIRM' ? 'confirmations = confirmations + 1' : 'disputes = disputes + 1'}, verification = CASE WHEN $2 = 'CONFIRM' AND confirmations + 1 >= 3 THEN 'COMMUNITY_VERIFIED' ELSE verification END WHERE id = $1`, [id, vote]); await client.query('COMMIT'); const result = await client.query<HazardRecord>('SELECT h.id, h.type, h.description, h.severity, h.location_label AS "locationLabel", ST_Y(h.location::geometry) AS lat, ST_X(h.location::geometry) AS lng, h.reporter_id AS "reporterId", u.name AS "reporterName", h.verification, h.confirmations, h.disputes, h.created_at AS "createdAt" FROM hazards h JOIN users u ON u.id=h.reporter_id WHERE h.id=$1', [id]); return result.rows[0]; } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export async function listAlerts() { if (!isDatabaseEnabled) return memoryStore.alerts; const result = await query('SELECT id, title, description, severity, area, radius_km AS "radiusKm", created_at AS "createdAt", expires_at AS "expiresAt" FROM alerts WHERE expires_at IS NULL OR expires_at > now() ORDER BY created_at DESC'); return result.rows as AlertRecord[]; }
export async function createAlert(input: Omit<AlertRecord, 'id' | 'createdAt'> & { createdBy: string }) { if (!isDatabaseEnabled) { const alert = { ...input, id: randomUUID(), createdAt: new Date().toISOString() }; memoryStore.alerts.unshift(alert); return alert; } const result = await query<AlertRecord>('INSERT INTO alerts (title, description, severity, area, radius_km, expires_at, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, title, description, severity, area, radius_km AS "radiusKm", created_at AS "createdAt", expires_at AS "expiresAt"', [input.title, input.description, input.severity, input.area, input.radiusKm, input.expiresAt, input.createdBy]); return result.rows[0]; }

export async function moderateHazard(id: string, verification: 'ADMIN_VERIFIED' | 'REJECTED') { if (!isDatabaseEnabled) { const hazard = memoryStore.hazards.find((item) => item.id === id); if (!hazard) return null; hazard.verification = verification; return hazard; } const result = await query<HazardRecord>('UPDATE hazards SET verification = $2, updated_at = now() WHERE id = $1 RETURNING id, type, description, severity, location_label AS "locationLabel", ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng, reporter_id AS "reporterId", verification, confirmations, disputes, created_at AS "createdAt"', [id, verification]); return result.rows[0] || null; }
