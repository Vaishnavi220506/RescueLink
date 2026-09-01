import { isDatabaseEnabled, query } from '../db.js';
import { memoryStore } from '../memoryStore.js';
import type { NotificationRecord, Page } from '../../types.js';
import { pageOf, removeTotal } from './common.js';

export async function listNotifications(userId: string, filters: { page: number; limit: number } = { page: 1, limit: 50 }): Promise<Page<NotificationRecord>> {
  if (!isDatabaseEnabled) {
    const rows = memoryStore.notifications.filter((item) => item.userId === userId);
    const start = (filters.page - 1) * filters.limit;
    return pageOf(rows.slice(start, start + filters.limit), filters.page, filters.limit, rows.length);
  }
  const offset = (filters.page - 1) * filters.limit;
  const result = await query<NotificationRecord & { totalCount?: string }>('SELECT id, user_id AS "userId", title, description, type, is_read AS "read", created_at AS "createdAt", COUNT(*) OVER() AS "totalCount" FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [userId, filters.limit, offset]);
  const total = Number(result.rows[0]?.totalCount ?? 0);
  return pageOf(result.rows.map((row) => removeTotal(row) as NotificationRecord), filters.page, filters.limit, total);
}

export async function createNotification(input: Omit<NotificationRecord, 'id' | 'createdAt' | 'read'>) {
  if (!isDatabaseEnabled) return memoryStore.createNotification(input);
  const result = await query<NotificationRecord>('INSERT INTO notifications (user_id, title, description, type) VALUES ($1,$2,$3,$4) RETURNING id, user_id AS "userId", title, description, type, is_read AS "read", created_at AS "createdAt"', [input.userId, input.title, input.description, input.type]);
  return result.rows[0];
}

export async function markNotificationRead(userId: string, id: string) {
  if (!isDatabaseEnabled) return memoryStore.markNotificationRead(userId, id);
  const result = await query<NotificationRecord>('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING id, user_id AS "userId", title, description, type, is_read AS "read", created_at AS "createdAt"', [id, userId]);
  return result.rows[0] || null;
}

export async function markAllNotificationsRead(userId: string) {
  if (!isDatabaseEnabled) return memoryStore.markAllNotificationsRead(userId);
  const result = await query<{ count: string }>('WITH updated AS (UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false RETURNING id) SELECT COUNT(*) AS count FROM updated', [userId]);
  return Number(result.rows[0]?.count ?? 0);
}
