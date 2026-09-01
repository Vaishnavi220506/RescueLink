import type { Category, OfferRecord, RequestRecord } from '../types.js';

const compatible = new Map<Category, Category[]>([
  ['MEDICAL', ['MEDICAL', 'SUPPLIES']], ['FOOD', ['FOOD']], ['WATER', ['WATER', 'FOOD']], ['SHELTER', ['SHELTER']],
  ['TRANSPORT', ['TRANSPORT', 'RESCUE']], ['RESCUE', ['RESCUE', 'TRANSPORT']], ['SUPPLIES', ['SUPPLIES', 'MEDICAL']], ['OTHER', ['OTHER']],
]);

export function scoreOfferForRequest(request: Pick<RequestRecord, 'category' | 'urgency' | 'lat' | 'lng'>, offer: Pick<OfferRecord, 'category' | 'lat' | 'lng' | 'radiusKm' | 'status'>) {
  const categoryScore = compatible.get(request.category)?.includes(offer.category) ? 50 : 0;
  const distance = haversineKm(request.lat, request.lng, offer.lat, offer.lng);
  const distanceScore = Math.max(0, 30 - distance * 3);
  const availabilityScore = offer.status === 'ACTIVE' ? 15 : 0;
  const urgencyScore = request.urgency === 'CRITICAL' ? 5 : request.urgency === 'HIGH' ? 3 : 1;
  return { score: Math.round(categoryScore + distanceScore + availabilityScore + urgencyScore), breakdown: { categoryScore, distanceScore: Math.round(distanceScore), availabilityScore, urgencyScore }, distanceKm: Number(distance.toFixed(2)) };
}

export function isOfferCompatible(requestCategory: Category, offerCategory: Category) { return compatible.get(requestCategory)?.includes(offerCategory) ?? false; }
export function rankOffers(request: Pick<RequestRecord, 'category' | 'urgency' | 'lat' | 'lng'>, offers: OfferRecord[]) { return offers.map((offer) => ({ offer, ...scoreOfferForRequest(request, offer) })).filter((match) => match.offer.status === 'ACTIVE' && isOfferCompatible(request.category, match.offer.category) && match.distanceKm <= match.offer.radiusKm).sort((a, b) => b.score - a.score); }
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) { const r = 6371; const toRad = (value: number) => value * Math.PI / 180; const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2; return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); }
