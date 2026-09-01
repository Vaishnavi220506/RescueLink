import type { PoolClient, QueryResultRow } from 'pg';
import type { Page, Pagination } from '../../types.js';

export type DatabaseExecutor = Pick<PoolClient, 'query'>;
export type QueryPageRow = QueryResultRow & { totalCount?: string | number };

export const distanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const earthRadius = 6371;
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const pageOf = <T>(items: T[], page: number, limit: number, total: number): Page<T> => ({ items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
export const removeTotal = <T extends QueryPageRow>(row: T): Omit<T, 'totalCount'> => {
  const { totalCount: _totalCount, ...item } = row;
  return item;
};

export function applyPointFilter(values: unknown[], where: string[], alias: string, lat?: number, lng?: number, radius?: number) {
  if (lat === undefined || lng === undefined) return { distanceSelect: 'NULL AS "distanceKm"', orderBy: `${alias}.created_at DESC` };
  values.push(lng, lat);
  const point = `ST_SetSRID(ST_MakePoint($${values.length - 1}, $${values.length}), 4326)::geography`;
  const distanceSelect = `ST_Distance(${alias}.location, ${point}) / 1000 AS "distanceKm"`;
  if (radius !== undefined) {
    values.push(radius);
    where.push(`ST_DWithin(${alias}.location, ${point}, $${values.length})`);
  }
  return { distanceSelect, orderBy: '"distanceKm" ASC, ' + `${alias}.created_at DESC` };
}
