import { randomUUID } from 'node:crypto';
import type { AlertRecord, AuthUser, HazardRecord, NotificationRecord, OfferRecord, RequestRecord, Role, UserRecord } from '../types.js';

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const baseUsers: UserRecord[] = [
  { id: 'user-ananya', name: 'Ananya Rao', email: 'ananya@rescue.link', passwordHash: '$2a$12$51bVXrufehVaNnZsJRmy5.t7Z2SqZOE9DyHvYF8Monz7AcAuETpoK', role: 'VOLUNTEER', isAvailable: true, locationLabel: 'Adyar, Chennai' },
  { id: 'user-admin', name: 'Operations admin', email: 'ops@rescue.link', passwordHash: '$2a$12$51bVXrufehVaNnZsJRmy5.t7Z2SqZOE9DyHvYF8Monz7AcAuETpoK', role: 'ADMIN', isAvailable: true, locationLabel: 'Chennai' },
  { id: 'user-priya', name: 'Priya Menon', email: 'priya@example.com', passwordHash: '$2a$12$51bVXrufehVaNnZsJRmy5.t7Z2SqZOE9DyHvYF8Monz7AcAuETpoK', role: 'CITIZEN', isAvailable: false, locationLabel: 'Velachery' },
];

export class MemoryStore {
  users = [...baseUsers];
  requests: RequestRecord[] = [
    { id: 'req-1001', requesterId: 'user-priya', requesterName: 'Priya Menon', category: 'MEDICAL', title: 'Insulin needed for elderly patient', description: 'Family is unable to reach the pharmacy due to flooding on Velachery Main Road.', urgency: 'HIGH', locationLabel: 'Velachery Main Road', lat: 12.9816, lng: 80.2182, peopleAffected: 1, contactPreference: 'IN_APP', status: 'OPEN', createdAt: ago(8), updatedAt: ago(8), distanceKm: 1.4 },
    { id: 'req-1002', requesterId: 'user-priya', requesterName: 'Karthik S.', category: 'TRANSPORT', title: 'Evacuation ride for family', description: 'Three people, including an infant, need a safe ride out of knee-deep water.', urgency: 'CRITICAL', locationLabel: 'Tambaram East', lat: 12.9249, lng: 80.1274, peopleAffected: 3, contactPreference: 'WHATSAPP', status: 'MATCHED', assignedVolunteerId: 'user-ananya', assignedVolunteerName: 'Ananya Rao', createdAt: ago(22), updatedAt: ago(9), distanceKm: 4.8 },
    { id: 'req-1003', requesterId: 'user-priya', requesterName: 'Rahul V.', category: 'WATER', title: 'Drinking water for apartment block', description: 'Residents on the upper floors have been without drinking water since this morning.', urgency: 'MEDIUM', locationLabel: 'Saidapet', lat: 13.0216, lng: 80.2231, peopleAffected: 18, contactPreference: 'IN_APP', status: 'OPEN', createdAt: ago(37), updatedAt: ago(37), distanceKm: 2.1 },
  ];
  offers: OfferRecord[] = [
    { id: 'offer-2001', ownerId: 'user-ananya', ownerName: 'Rajan S.', category: 'SHELTER', description: 'Dry rooms with blankets and basic meals.', quantity: 'Up to 6 people', radiusKm: 5, locationLabel: 'Anna Nagar West', lat: 13.0878, lng: 80.1957, status: 'ACTIVE', createdAt: ago(18), distanceKm: 5.2 },
    { id: 'offer-2002', ownerId: 'user-ananya', ownerName: 'Deepa M.', category: 'FOOD', description: 'Fresh rice and dal meals prepared for delivery.', quantity: '40 meals', radiusKm: 2, locationLabel: 'T. Nagar', lat: 13.0418, lng: 80.2341, status: 'ACTIVE', createdAt: ago(35), distanceKm: 3.1 },
  ];
  hazards: HazardRecord[] = [
    { id: 'haz-3001', type: 'FLOOD', description: 'Underpass is completely submerged. Do not attempt to cross.', severity: 'HIGH', locationLabel: 'Saidapet underpass', lat: 13.0216, lng: 80.2228, reporterId: 'user-priya', reporterName: 'Arun K.', verification: 'COMMUNITY_VERIFIED', confirmations: 12, disputes: 0, createdAt: ago(15), distanceKm: 2.3 },
    { id: 'haz-3002', type: 'POWER_LINE', description: 'Live wire down across the road. Area has not been cleared.', severity: 'CRITICAL', locationLabel: 'LB Road near SRM bus stop', lat: 13.0097, lng: 80.2646, reporterId: 'user-priya', reporterName: 'Meera N.', verification: 'UNVERIFIED', confirmations: 4, disputes: 1, createdAt: ago(30), distanceKm: 1.9 },
  ];
  alerts: AlertRecord[] = [{ id: 'alert-4001', title: 'Flood warning near Adyar River', description: 'Water levels are rising. Avoid low-lying roads around Kotturpuram and Saidapet.', severity: 'CRITICAL', area: 'Adyar river basin', radiusKm: 5, createdAt: ago(11) }];
  notifications: NotificationRecord[] = [];
  private votes = new Set<string>();

  findUserByEmail(email: string) { return this.users.find((user) => user.email.toLowerCase() === email.toLowerCase()); }
  findUserById(id: string) { return this.users.find((user) => user.id === id); }
  createUser(input: { name: string; email: string; passwordHash: string; role: Role }) { const user: UserRecord = { id: randomUUID(), ...input, isAvailable: input.role === 'VOLUNTEER' }; this.users.push(user); return user; }
  createRequest(input: Omit<RequestRecord, 'id' | 'createdAt' | 'updatedAt' | 'requesterName'> & { requesterName: string }) { const request: RequestRecord = { ...input, id: randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; this.requests.unshift(request); return request; }
  createOffer(input: Omit<OfferRecord, 'id' | 'createdAt' | 'ownerName'> & { ownerName: string }) { const offer: OfferRecord = { ...input, id: randomUUID(), createdAt: new Date().toISOString() }; this.offers.unshift(offer); return offer; }
  createHazard(input: Omit<HazardRecord, 'id' | 'createdAt' | 'reporterName'> & { reporterName: string }) { const hazard: HazardRecord = { ...input, id: randomUUID(), createdAt: new Date().toISOString() }; this.hazards.unshift(hazard); return hazard; }
  claimRequest(id: string, volunteer: AuthUser) { const request = this.requests.find((item) => item.id === id); if (!request || !['OPEN', 'MATCHED'].includes(request.status)) return null; request.status = 'ACCEPTED'; request.assignedVolunteerId = volunteer.id; request.assignedVolunteerName = volunteer.name; request.updatedAt = new Date().toISOString(); return request; }
  updateRequestStatus(id: string, status: RequestRecord['status']) { const request = this.requests.find((item) => item.id === id); if (!request) return null; request.status = status; request.updatedAt = new Date().toISOString(); if (status === 'RESOLVED') request.resolvedAt = request.updatedAt; return request; }
  voteHazard(id: string, userId: string, vote: 'CONFIRM' | 'DISPUTE') { const key = `${id}:${userId}`; if (this.votes.has(key)) return 'DUPLICATE'; this.votes.add(key); const hazard = this.hazards.find((item) => item.id === id); if (!hazard) return null; if (vote === 'CONFIRM') { hazard.confirmations += 1; if (hazard.confirmations >= 3) hazard.verification = 'COMMUNITY_VERIFIED'; } else hazard.disputes += 1; return hazard; }
}

export const memoryStore = new MemoryStore();
