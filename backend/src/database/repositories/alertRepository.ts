import { randomUUID } from 'node:crypto';
import { isDatabaseEnabled, query } from '../db.js';
import { memoryStore } from '../memoryStore.js';
import type { AlertRecord, Page } from '../../types.js';
import { pageOf, removeTotal } from './common.js';

export async function listAlerts(filters: { page: number; limit: number } = { page: 1, limit: 50 }): Promise<Page<AlertRecord>> {
  if (!isDatabaseEnabled) {
    const rows = memoryStore.alerts.filter((alert) => !alert.expiresAt || new Date(alert.expiresAt).getTime() > Date.now());
    const start = (filters.page - 1) * filters.limit;
    return pageOf(rows.slice(start, start + filters.limit), filters.page, filters.limit, rows.length);
  }
  const offset = (filters.page - 1) * filters.limit;
  const result = await query<AlertRecord & { totalCount?: string }>('SELECT id, title, description, severity, area, radius_km AS "radiusKm", created_at AS "createdAt", expires_at AS "expiresAt", COUNT(*) OVER() AS "totalCount" FROM alerts WHERE expires_at IS NULL OR expires_at > now() ORDER BY created_at DESC LIMIT $1 OFFSET $2', [filters.limit, offset]);
  const total = Number(result.rows[0]?.totalCount ?? 0);
  return pageOf(result.rows.map((row) => removeTotal(row) as AlertRecord), filters.page, filters.limit, total);
}

export async function createAlert(input: Omit<AlertRecord, 'id' | 'createdAt'> & { createdBy: string }) {
  if (!isDatabaseEnabled) { const { createdBy: _createdBy, ...alertInput } = input; const alert = { ...alertInput, id: randomUUID(), createdAt: new Date().toISOString() }; memoryStore.alerts.unshift(alert); return alert; }
  const result = await query<AlertRecord>('INSERT INTO alerts (title, description, severity, area, radius_km, expires_at, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, title, description, severity, area, radius_km AS "radiusKm", created_at AS "createdAt", expires_at AS "expiresAt"', [input.title, input.description, input.severity, input.area, input.radiusKm, input.expiresAt, input.createdBy]);
  return result.rows[0];
}
