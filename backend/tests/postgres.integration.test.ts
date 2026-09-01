import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/server.js';
import { closeDatabase, query } from '../src/database/db.js';

const integration = describe.skipIf(!process.env.RUN_DB_INTEGRATION || !process.env.DATABASE_URL);
const unique = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

async function registeredAgent(role: 'CITIZEN' | 'VOLUNTEER') {
  const agent = request.agent(app);
  const result = await agent.post('/api/auth/register').send({ name: `Postgres ${role}`, email: unique(role.toLowerCase()), password: 'strong-pass-123', role });
  expect(result.status).toBe(201);
  return agent;
}

async function createRequest(agent: request.SuperAgentTest) {
  const result = await agent.post('/api/requests').send({
    category: 'WATER', title: 'Postgres integration water request', description: 'Residents need safe drinking water after the supply was interrupted.',
    urgency: 'HIGH', locationLabel: 'Adyar, Chennai', lat: 13.0012, lng: 80.2565, peopleAffected: 10, contactPreference: 'IN_APP',
  });
  expect(result.status).toBe(201);
  return result.body.data.id as string;
}

integration('PostGIS and transactional invariants', () => {
  beforeAll(async () => {
    await query('TRUNCATE TABLE audit_logs, live_locations, notifications, hazard_votes, request_assignments, alerts, hazards, resource_offers, help_requests, users RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('calculates nearby distance and applies the radius in PostGIS', async () => {
    const citizen = await registeredAgent('CITIZEN');
    await createRequest(citizen);
    const nearby = await citizen.get('/api/requests/nearby?lat=13.0012&lng=80.2565&radius=1000&limit=10');
    expect(nearby.status).toBe(200);
    expect(nearby.body.data.items.length).toBeGreaterThan(0);
    expect(Number(nearby.body.data.items[0].distanceKm)).toBeLessThan(0.01);
  });

  it('allows only one concurrent volunteer claim', async () => {
    const citizen = await registeredAgent('CITIZEN');
    const firstVolunteer = await registeredAgent('VOLUNTEER');
    const secondVolunteer = await registeredAgent('VOLUNTEER');
    const requestId = await createRequest(citizen);
    const results = await Promise.all([
      firstVolunteer.post(`/api/requests/${requestId}/accept`),
      secondVolunteer.post(`/api/requests/${requestId}/accept`),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
  });

  it('enforces one hazard vote per user in the database', async () => {
    const citizen = await registeredAgent('CITIZEN');
    const created = await citizen.post('/api/hazards').send({ type: 'FLOOD', description: 'The underpass is submerged and unsafe to cross right now.', severity: 'HIGH', locationLabel: 'Adyar underpass', lat: 13.0012, lng: 80.2565 });
    expect(created.status).toBe(201);
    const hazardId = created.body.data.id as string;
    const results = await Promise.all([
      citizen.post(`/api/hazards/${hazardId}/vote`).send({ vote: 'CONFIRM' }),
      citizen.post(`/api/hazards/${hazardId}/vote`).send({ vote: 'CONFIRM' }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
  });
});
