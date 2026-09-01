import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/server.js';
import { isValidRequestTransition } from '../src/services/requestService.js';
import { memoryStore } from '../src/database/memoryStore.js';

const unique = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

async function registeredAgent(role: 'CITIZEN' | 'VOLUNTEER') {
  const agent = request.agent(app);
  const email = unique(role.toLowerCase());
  const response = await agent.post('/api/auth/register').send({ name: `${role} Test`, email, password: 'strong-pass-123', role });
  expect(response.status).toBe(201);
  return agent;
}

async function createRequest(agent: request.SuperAgentTest) {
  const response = await agent.post('/api/requests').send({
    category: 'WATER', title: 'Water for the apartment block', description: 'Residents need safe drinking water after the supply was interrupted.',
    urgency: 'MEDIUM', locationLabel: 'Adyar, Chennai', lat: 13.0012, lng: 80.2565, peopleAffected: 10, contactPreference: 'IN_APP',
  });
  expect(response.status).toBe(201);
  return response.body.data.id as string;
}

describe('RescueLink invariants', () => {
  it('allows only the documented request lifecycle transitions', () => {
    expect(isValidRequestTransition('OPEN', 'MATCHED')).toBe(true);
    expect(isValidRequestTransition('OPEN', 'RESOLVED')).toBe(false);
    expect(isValidRequestTransition('RESOLVED', 'OPEN')).toBe(false);
    expect(isValidRequestTransition('IN_PROGRESS', 'RESOLVED')).toBe(true);
  });

  it('prevents invalid status changes and keeps notification ownership private', async () => {
    const citizen = await registeredAgent('CITIZEN');
    const volunteer = await registeredAgent('VOLUNTEER');
    const requestId = await createRequest(citizen);

    const invalidProgress = await citizen.patch(`/api/requests/${requestId}/status`).send({ status: 'IN_PROGRESS' });
    expect(invalidProgress.status).toBe(403);

    expect((await volunteer.post(`/api/requests/${requestId}/accept`)).status).toBe(200);
    expect((await volunteer.patch(`/api/requests/${requestId}/status`).send({ status: 'RESOLVED' })).status).toBe(422);
    expect((await volunteer.patch(`/api/requests/${requestId}/status`).send({ status: 'IN_PROGRESS' })).status).toBe(200);
    expect((await volunteer.patch(`/api/requests/${requestId}/status`).send({ status: 'RESOLVED' })).status).toBe(200);
    expect((await volunteer.patch(`/api/requests/${requestId}/status`).send({ status: 'CANCELLED' })).status).toBe(422);

    const citizenNotifications = await citizen.get('/api/notifications?page=1&limit=20');
    expect(citizenNotifications.status).toBe(200);
    const notificationId = citizenNotifications.body.data.items.find((item: { title: string }) => item.title === 'Request accepted')?.id;
    expect(notificationId).toBeDefined();
    const privateRead = await volunteer.patch(`/api/notifications/${notificationId}/read`);
    expect(privateRead.status).toBe(404);
  });

  it('rejects duplicate hazard votes and reports missing hazards cleanly', async () => {
    const citizen = await registeredAgent('CITIZEN');
    const created = await citizen.post('/api/hazards').send({ type: 'FLOOD', description: 'The underpass is submerged and unsafe to cross right now.', severity: 'HIGH', locationLabel: 'Adyar underpass', lat: 13.0012, lng: 80.2565 });
    expect(created.status).toBe(201);
    const hazardId = created.body.data.id as string;
    expect((await citizen.post(`/api/hazards/${hazardId}/vote`).send({ vote: 'CONFIRM' })).status).toBe(200);
    const duplicate = await citizen.post(`/api/hazards/${hazardId}/vote`).send({ vote: 'CONFIRM' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('DUPLICATE_VOTE');
    expect((await citizen.post('/api/hazards/missing-hazard/vote').send({ vote: 'CONFIRM' })).status).toBe(404);
  });

  it('returns accurate pagination metadata and blocks role escalation', async () => {
    const citizen = await registeredAgent('CITIZEN');
    await createRequest(citizen);
    const page = await citizen.get('/api/requests?page=1&limit=1');
    expect(page.status).toBe(200);
    expect(page.body.data.pagination).toEqual(expect.objectContaining({ page: 1, limit: 1 }));
    expect(page.body.data.pagination.total).toBeGreaterThanOrEqual(1);
    expect(page.body.data.pagination.totalPages).toBeGreaterThanOrEqual(1);

    const escalation = await request(app).post('/api/auth/register').send({ name: 'Invalid Admin', email: unique('invalid-admin'), password: 'strong-pass-123', role: 'ADMIN' });
    expect(escalation.status).toBe(422);
    expect((await citizen.get('/api/admin/stats')).status).toBe(403);
  });

  it('enforces admin-only operations at the API boundary', async () => {
    const citizen = await registeredAgent('CITIZEN');
    const volunteer = await registeredAgent('VOLUNTEER');
    const admin = request.agent(app);
    expect((await admin.post('/api/auth/login').send({ email: 'ops@rescue.link', password: 'rescue-link' })).status).toBe(200);
    expect((await citizen.post('/api/alerts').send({ title: 'Unauthorized alert', description: 'This should never be broadcast by a citizen.', severity: 'HIGH', area: 'Adyar' })).status).toBe(403);
    expect((await volunteer.post('/api/alerts').send({ title: 'Unauthorized alert', description: 'This should never be broadcast by a volunteer.', severity: 'HIGH', area: 'Adyar' })).status).toBe(403);
    const hazard = await citizen.post('/api/hazards').send({ type: 'FIRE', description: 'Smoke is visible near the road and the area may be unsafe.', severity: 'HIGH', locationLabel: 'Adyar market', lat: 13.0012, lng: 80.2565 });
    expect((await citizen.patch(`/api/admin/hazards/${hazard.body.data.id}`).send({ verification: 'ADMIN_VERIFIED' })).status).toBe(403);
    expect((await admin.patch(`/api/admin/hazards/${hazard.body.data.id}`).send({ verification: 'ADMIN_VERIFIED' })).status).toBe(200);
    expect((await admin.get('/api/admin/users?page=1&limit=10')).status).toBe(200);
  });

  it('removes expired live locations before returning them', () => {
    const id = `expired-${Date.now()}`;
    memoryStore.upsertLiveLocation({ userId: id, name: 'Expired volunteer', status: 'AVAILABLE_TO_RESPOND', lat: 13.0012, lng: 80.2565, expiresAt: new Date(Date.now() - 1000).toISOString() });
    expect(memoryStore.listLiveLocations().some((location) => location.userId === id)).toBe(false);
  });
});
