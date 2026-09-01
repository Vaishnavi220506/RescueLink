import { isDatabaseEnabled, query } from '../db.js';
import { memoryStore } from '../memoryStore.js';
import type { AuthUser, UserRecord, UserSummary, Page } from '../../types.js';
import { pageOf, removeTotal } from './common.js';

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
  const result = await query<UserRecord>('INSERT INTO users (name, email, password_hash, role, is_available) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, password_hash AS "passwordHash", role, is_available AS "isAvailable", location_label AS "locationLabel"', [input.name, input.email.toLowerCase(), input.passwordHash, input.role, input.role === 'VOLUNTEER']);
  return result.rows[0];
}

export async function updateUserAvailability(id: string, isAvailable: boolean): Promise<AuthUser | undefined> {
  if (!isDatabaseEnabled) {
    const user = memoryStore.updateUserAvailability(id, isAvailable);
    if (!user) return undefined;
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
  const result = await query<AuthUser>('UPDATE users SET is_available = $2, updated_at = now() WHERE id = $1 RETURNING id, name, email, role, is_available AS "isAvailable", location_label AS "locationLabel"', [id, isAvailable]);
  return result.rows[0];
}

export async function listUsers(filters: { page: number; limit: number }): Promise<Page<UserSummary>> {
  if (!isDatabaseEnabled) {
    const rows = memoryStore.users.map(({ passwordHash: _passwordHash, ...user }) => ({ ...user, createdAt: new Date(0).toISOString() }));
    const start = (filters.page - 1) * filters.limit;
    return pageOf(rows.slice(start, start + filters.limit), filters.page, filters.limit, rows.length);
  }
  const offset = (filters.page - 1) * filters.limit;
  const result = await query<UserSummary & { totalCount?: string }>('SELECT id, name, email, role, is_available AS "isAvailable", location_label AS "locationLabel", created_at AS "createdAt", COUNT(*) OVER() AS "totalCount" FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2', [filters.limit, offset]);
  const total = Number(result.rows[0]?.totalCount ?? 0);
  return pageOf(result.rows.map((row) => removeTotal(row) as UserSummary), filters.page, filters.limit, total);
}
