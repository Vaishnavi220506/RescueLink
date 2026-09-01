import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/server.js';

const citizen = { name: 'Test Citizen', email: `citizen-${Date.now()}@example.com`, password: 'strong-pass-123', role: 'CITIZEN' };
const volunteer = { name: 'Test Volunteer', email: `volunteer-${Date.now()}@example.com`, password: 'strong-pass-123', role: 'VOLUNTEER' };

describe('RescueLink API', () => {
  it('registers users and prevents duplicate emails', async () => {
    const first = await request(app).post('/api/auth/register').send(citizen);
    expect(first.status).toBe(201); expect(first.body.success).toBe(true);
    const duplicate = await request(app).post('/api/auth/register').send(citizen);
    expect(duplicate.status).toBe(409); expect(duplicate.body.error.code).toBe('EMAIL_IN_USE');
  });

  it('rejects invalid credentials and accepts a valid login', async () => {
    await request(app).post('/api/auth/register').send(volunteer);
    const invalid = await request(app).post('/api/auth/login').send({ email: volunteer.email, password: 'wrong-pass' });
    expect(invalid.status).toBe(401); expect(invalid.body.success).toBe(false);
    const valid = await request(app).post('/api/auth/login').send({ email: volunteer.email, password: volunteer.password });
    expect(valid.status).toBe(200); expect(valid.headers['set-cookie']).toBeDefined();
  });

  it('requires authentication to create a request and validates input', async () => {
    const unauthenticated = await request(app).post('/api/requests').send({}); expect(unauthenticated.status).toBe(401);
    const agent = request.agent(app); await agent.post('/api/auth/register').send({ ...citizen, email: `another-${Date.now()}@example.com` });
    const invalid = await agent.post('/api/requests').send({ category: 'MEDICAL', title: 'Too short', description: 'short', urgency: 'HIGH' });
    expect(invalid.status).toBe(422); expect(invalid.body.error.code).toBe('INVALID_REQUEST');
  });

  it('protects volunteer-only acceptance and prevents a second claim', async () => {
    const volunteerAgent = request.agent(app); await volunteerAgent.post('/api/auth/login').send({ email: volunteer.email, password: volunteer.password });
    const citizenAgent = request.agent(app); await citizenAgent.post('/api/auth/login').send({ email: citizen.email, password: citizen.password });
    const created = await citizenAgent.post('/api/requests').send({ category: 'WATER', title: 'Water for our apartment block', description: 'Residents need safe drinking water after the supply was interrupted.', urgency: 'MEDIUM', locationLabel: 'Adyar, Chennai', lat: 13.0012, lng: 80.2565, peopleAffected: 10, contactPreference: 'IN_APP' });
    const id = created.body.data.id;
    expect((await citizenAgent.post(`/api/requests/${id}/accept`)).status).toBe(403);
    expect((await volunteerAgent.post(`/api/requests/${id}/accept`)).status).toBe(200);
    expect((await volunteerAgent.post(`/api/requests/${id}/accept`)).status).toBe(409);
  });
});
