import { isDatabaseEnabled, query } from '../db.js';
import { memoryStore } from '../memoryStore.js';
import type { OfferRecord, Page } from '../../types.js';
import { applyPointFilter, distanceKm, pageOf, removeTotal } from './common.js';
import type { ListFilters } from './filters.js';

export async function listOffers(filters: ListFilters): Promise<Page<OfferRecord>> {
  if (!isDatabaseEnabled) {
    let rows = [...memoryStore.offers];
    if (filters.category) rows = rows.filter((item) => item.category === filters.category);
    if (filters.offerStatus) rows = rows.filter((item) => item.status === filters.offerStatus);
    else rows = rows.filter((item) => item.status === 'ACTIVE');
    if (filters.lat !== undefined && filters.lng !== undefined) rows = rows.map((item) => ({ ...item, distanceKm: distanceKm(filters.lat!, filters.lng!, item.lat, item.lng) })).filter((item) => filters.radius === undefined || (item.distanceKm ?? 0) <= filters.radius / 1000).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    const start = (filters.page - 1) * filters.limit;
    return pageOf(rows.slice(start, start + filters.limit), filters.page, filters.limit, rows.length);
  }
  const values: unknown[] = [];
  const where: string[] = [];
  if (filters.category) { values.push(filters.category); where.push(`o.category = $${values.length}`); }
  values.push(filters.offerStatus || 'ACTIVE'); where.push(`o.status = $${values.length}`);
  const point = applyPointFilter(values, where, 'o', filters.lat, filters.lng, filters.radius);
  const offset = (filters.page - 1) * filters.limit;
  values.push(filters.limit, offset);
  const result = await query<OfferRecord & { totalCount?: string }>(`SELECT o.id, o.owner_id AS "ownerId", u.name AS "ownerName", o.category, o.description, o.quantity, o.radius_km AS "radiusKm", o.location_label AS "locationLabel", ST_Y(o.location::geometry) AS lat, ST_X(o.location::geometry) AS lng, o.status, o.created_at AS "createdAt", ${point.distanceSelect}, COUNT(*) OVER() AS "totalCount" FROM resource_offers o JOIN users u ON u.id = o.owner_id WHERE ${where.join(' AND ')} ORDER BY ${point.orderBy} LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
  const total = Number(result.rows[0]?.totalCount ?? 0);
  return pageOf(result.rows.map((row) => removeTotal(row) as OfferRecord), filters.page, filters.limit, total);
}

export async function createOffer(input: Omit<OfferRecord, 'id' | 'createdAt' | 'ownerName'> & { ownerName: string }) {
  if (!isDatabaseEnabled) return memoryStore.createOffer(input);
  const result = await query<OfferRecord>('INSERT INTO resource_offers (owner_id, category, description, quantity, radius_km, location_label, location, status) VALUES ($1,$2,$3,$4,$5,$6,ST_SetSRID(ST_MakePoint($7,$8),4326)::geography,\'ACTIVE\') RETURNING id, created_at AS "createdAt"', [input.ownerId, input.category, input.description, input.quantity, input.radiusKm, input.locationLabel, input.lng, input.lat]);
  return { ...input, id: result.rows[0].id, createdAt: result.rows[0].createdAt, status: 'ACTIVE' as const };
}
