import { isDatabaseEnabled, query } from '../db.js';
import { memoryStore } from '../memoryStore.js';
import type { DashboardStats } from '../../types.js';

export async function getDashboardStats(): Promise<DashboardStats> {
  if (!isDatabaseEnabled) return memoryStore.getDashboardStats();
  const [requests, offers, hazards, alerts, resolved, volunteers] = await Promise.all([
    query<{ count: string }>("SELECT COUNT(*) AS count FROM help_requests WHERE status IN ('OPEN','MATCHED','ACCEPTED','IN_PROGRESS')"),
    query<{ count: string }>("SELECT COUNT(*) AS count FROM resource_offers WHERE status = 'ACTIVE'"),
    query<{ count: string }>("SELECT COUNT(*) AS count FROM hazards WHERE verification <> 'REJECTED'"),
    query<{ count: string }>("SELECT COUNT(*) AS count FROM alerts WHERE severity = 'CRITICAL' AND (expires_at IS NULL OR expires_at > now())"),
    query<{ count: string }>("SELECT COUNT(*) AS count FROM help_requests WHERE status = 'RESOLVED' AND resolved_at >= current_date"),
    query<{ count: string }>("SELECT COUNT(*) AS count FROM users WHERE role = 'VOLUNTEER' AND is_available = true"),
  ]);
  return { openRequests: Number(requests.rows[0].count), availableOffers: Number(offers.rows[0].count), activeHazards: Number(hazards.rows[0].count), criticalAlerts: Number(alerts.rows[0].count), resolvedToday: Number(resolved.rows[0].count), volunteersAvailable: Number(volunteers.rows[0].count) };
}
