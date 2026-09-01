import { isDatabaseEnabled, pool, query } from '../db.js';
import { memoryStore } from '../memoryStore.js';
import type { AuthUser, NotificationRecord, Page, RequestRecord, RequestStatus } from '../../types.js';
import { applyPointFilter, DatabaseExecutor, distanceKm, pageOf, removeTotal } from './common.js';
import type { ListFilters } from './filters.js';

const requestSelect = 'r.id, r.requester_id AS "requesterId", u.name AS "requesterName", r.category, r.title, r.description, r.urgency, r.location_label AS "locationLabel", ST_Y(r.location::geometry) AS lat, ST_X(r.location::geometry) AS lng, r.people_affected AS "peopleAffected", r.contact_preference AS "contactPreference", r.status, r.assigned_volunteer_id AS "assignedVolunteerId", av.name AS "assignedVolunteerName", r.created_at AS "createdAt", r.updated_at AS "updatedAt", r.resolved_at AS "resolvedAt"';

export async function listRequests(filters: ListFilters): Promise<Page<RequestRecord>> {
  if (!isDatabaseEnabled) {
    let rows = [...memoryStore.requests];
    if (filters.status) rows = rows.filter((item) => item.status === filters.status);
    if (filters.urgency) rows = rows.filter((item) => item.urgency === filters.urgency);
    if (filters.category) rows = rows.filter((item) => item.category === filters.category);
    if (filters.lat !== undefined && filters.lng !== undefined) rows = rows.map((item) => ({ ...item, distanceKm: distanceKm(filters.lat!, filters.lng!, item.lat, item.lng) })).filter((item) => filters.radius === undefined || (item.distanceKm ?? 0) <= filters.radius / 1000).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    const start = (filters.page - 1) * filters.limit;
    return pageOf(rows.slice(start, start + filters.limit), filters.page, filters.limit, rows.length);
  }

  const values: unknown[] = [];
  const where: string[] = [];
  if (filters.status) { values.push(filters.status); where.push(`r.status = $${values.length}`); }
  if (filters.urgency) { values.push(filters.urgency); where.push(`r.urgency = $${values.length}`); }
  if (filters.category) { values.push(filters.category); where.push(`r.category = $${values.length}`); }
  const point = applyPointFilter(values, where, 'r', filters.lat, filters.lng, filters.radius);
  const offset = (filters.page - 1) * filters.limit;
  values.push(filters.limit, offset);
  const result = await query<RequestRecord & { totalCount?: string }>(`SELECT ${requestSelect}, ${point.distanceSelect}, COUNT(*) OVER() AS "totalCount" FROM help_requests r JOIN users u ON u.id = r.requester_id LEFT JOIN users av ON av.id = r.assigned_volunteer_id ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${point.orderBy} LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
  const total = Number(result.rows[0]?.totalCount ?? 0);
  return pageOf(result.rows.map((row) => removeTotal(row) as RequestRecord), filters.page, filters.limit, total);
}

export async function createRequest(input: Omit<RequestRecord, 'id' | 'createdAt' | 'updatedAt' | 'requesterName'> & { requesterName: string }) {
  if (!isDatabaseEnabled) return memoryStore.createRequest(input);
  const result = await query<{ id: string }>('INSERT INTO help_requests (requester_id, category, title, description, urgency, location_label, location, people_affected, contact_preference, status) VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography, $9, $10, $11) RETURNING id', [input.requesterId, input.category, input.title, input.description, input.urgency, input.locationLabel, input.lng, input.lat, input.peopleAffected, input.contactPreference, input.status]);
  return findRequestById(result.rows[0].id);
}

export async function findRequestById(id: string, executor: DatabaseExecutor | null = null): Promise<RequestRecord | undefined> {
  if (!isDatabaseEnabled) return memoryStore.requests.find((item) => item.id === id);
  const result = await (executor ? executor.query<RequestRecord>(`SELECT ${requestSelect} FROM help_requests r JOIN users u ON u.id = r.requester_id LEFT JOIN users av ON av.id = r.assigned_volunteer_id WHERE r.id = $1`, [id]) : query<RequestRecord>(`SELECT ${requestSelect} FROM help_requests r JOIN users u ON u.id = r.requester_id LEFT JOIN users av ON av.id = r.assigned_volunteer_id WHERE r.id = $1`, [id]));
  return result.rows[0];
}

export async function claimRequest(id: string, volunteer: AuthUser) {
  if (!isDatabaseEnabled) return memoryStore.claimRequest(id, volunteer);
  if (!pool) return null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const updated = await client.query<{ id: string; requesterId: string }>('UPDATE help_requests SET status = \'ACCEPTED\', assigned_volunteer_id = $2, updated_at = now() WHERE id = $1 AND status IN (\'OPEN\', \'MATCHED\') AND assigned_volunteer_id IS NULL RETURNING id, requester_id AS "requesterId"', [id, volunteer.id]);
    if (!updated.rowCount) { await client.query('ROLLBACK'); return null; }
    await client.query('INSERT INTO request_assignments (request_id, volunteer_id) VALUES ($1, $2)', [id, volunteer.id]);
    const notification = await client.query<NotificationRecord>('INSERT INTO notifications (user_id, title, description, type) VALUES ($1, $2, $3, \'REQUEST\') RETURNING id, user_id AS "userId", title, description, type, is_read AS "read", created_at AS "createdAt"', [updated.rows[0].requesterId, 'Request accepted', `${volunteer.name} is responding to your help request.`]);
    await client.query('COMMIT');
    const request = await findRequestById(id);
    return request ? { request, notification: notification.rows[0] } : null;
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export async function updateRequestStatus(id: string, status: RequestStatus, expectedStatus?: RequestStatus) {
  if (!isDatabaseEnabled) return memoryStore.updateRequestStatus(id, status, expectedStatus);
  const values: unknown[] = [id, status];
  const expectedClause = expectedStatus ? ' AND status = $3' : '';
  if (expectedStatus) values.push(expectedStatus);
  const result = await query<{ id: string }>(`UPDATE help_requests SET status = $2, resolved_at = CASE WHEN $2 = 'RESOLVED' THEN now() ELSE resolved_at END, updated_at = now() WHERE id = $1${expectedClause} RETURNING id`, values);
  return result.rowCount ? findRequestById(id) : null;
}
