import { describe, expect, it } from 'vitest';
import { isOfferCompatible, rankOffers, scoreOfferForRequest } from '../src/services/matching.js';
import type { OfferRecord, RequestRecord } from '../src/types.js';

const request = (overrides: Partial<RequestRecord> = {}): Pick<RequestRecord, 'category' | 'urgency' | 'lat' | 'lng'> => ({ category: 'MEDICAL', urgency: 'HIGH', lat: 13.0012, lng: 80.2565, ...overrides });
const offer = (overrides: Partial<OfferRecord> = {}): OfferRecord => ({ id: 'offer-test', ownerId: 'user-test', ownerName: 'Test volunteer', category: 'MEDICAL', description: 'Medical supplies', quantity: '10 kits', radiusKm: 10, locationLabel: 'Adyar', lat: 13.0012, lng: 80.2565, status: 'ACTIVE', createdAt: new Date().toISOString(), ...overrides });

describe('rule-based offer matching', () => {
  it('recognizes exact and compatible categories but rejects unrelated categories', () => {
    expect(isOfferCompatible('MEDICAL', 'MEDICAL')).toBe(true);
    expect(isOfferCompatible('MEDICAL', 'SUPPLIES')).toBe(true);
    expect(isOfferCompatible('MEDICAL', 'FOOD')).toBe(false);
  });

  it('ranks a nearby compatible offer ahead of a distant one', () => {
    const ranked = rankOffers(request(), [offer({ id: 'distant', lat: 13.05, lng: 80.30 }), offer({ id: 'nearby', lat: 13.006, lng: 80.26 })]);
    expect(ranked.map((item) => item.offer.id)).toEqual(['nearby', 'distant']);
  });

  it('excludes inactive, incompatible, and out-of-radius offers', () => {
    const ranked = rankOffers(request(), [
      offer({ id: 'paused', status: 'PAUSED' }),
      offer({ id: 'food', category: 'FOOD' }),
      offer({ id: 'outside', lat: 13.05, lng: 80.30, radiusKm: 1 }),
    ]);
    expect(ranked).toHaveLength(0);
  });

  it('keeps urgency visible in the score breakdown', () => {
    const normal = scoreOfferForRequest(request({ urgency: 'LOW' }), offer());
    const critical = scoreOfferForRequest(request({ urgency: 'CRITICAL' }), offer());
    expect(critical.breakdown.urgencyScore).toBeGreaterThan(normal.breakdown.urgencyScore);
    expect(critical.score).toBeGreaterThan(normal.score);
  });
});
