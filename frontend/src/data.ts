import type { Alert, AppNotification, Hazard, HelpRequest, ResourceOffer, User } from './types';

export const demoUser: User = {
  id: 'user-ananya',
  name: 'Ananya Rao',
  email: 'ananya@rescue.link',
  role: 'VOLUNTEER',
  locationLabel: 'Adyar, Chennai',
  isAvailable: true,
};

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

export const demoRequests: HelpRequest[] = [
  {
    id: 'req-1001', requester: { id: 'user-priya', name: 'Priya Menon' }, category: 'MEDICAL',
    title: 'Insulin needed for elderly patient', description: 'Family is unable to reach the pharmacy due to flooding on Velachery Main Road.',
    urgency: 'HIGH', locationLabel: 'Velachery Main Road', lat: 12.9816, lng: 80.2182, distanceKm: 1.4,
    peopleAffected: 1, contactPreference: 'IN_APP', status: 'OPEN', createdAt: minutesAgo(8), updatedAt: minutesAgo(8),
  },
  {
    id: 'req-1002', requester: { id: 'user-karthik', name: 'Karthik S.' }, category: 'TRANSPORT',
    title: 'Evacuation ride for family', description: 'Three people, including an infant, need a safe ride out of knee-deep water.',
    urgency: 'CRITICAL', locationLabel: 'Tambaram East', lat: 12.9249, lng: 80.1274, distanceKm: 4.8,
    peopleAffected: 3, contactPreference: 'WHATSAPP', status: 'MATCHED', assignedVolunteer: { id: 'user-deepa', name: 'Deepa M.' }, createdAt: minutesAgo(22), updatedAt: minutesAgo(9),
  },
  {
    id: 'req-1003', requester: { id: 'user-rahul', name: 'Rahul V.' }, category: 'WATER',
    title: 'Drinking water for apartment block', description: 'Residents on the upper floors have been without drinking water since this morning.',
    urgency: 'MEDIUM', locationLabel: 'Saidapet', lat: 13.0216, lng: 80.2231, distanceKm: 2.1,
    peopleAffected: 18, contactPreference: 'IN_APP', status: 'OPEN', createdAt: minutesAgo(37), updatedAt: minutesAgo(37),
  },
  {
    id: 'req-1004', requester: { id: 'user-sameer', name: 'Sameer Khan' }, category: 'SHELTER',
    title: 'Temporary shelter for two adults', description: 'Need a dry, accessible place to stay overnight while the power is restored.',
    urgency: 'LOW', locationLabel: 'Mylapore', lat: 13.0339, lng: 80.2675, distanceKm: 3.6,
    peopleAffected: 2, contactPreference: 'IN_APP', status: 'IN_PROGRESS', assignedVolunteer: { id: 'user-ananya', name: 'Ananya Rao' }, createdAt: minutesAgo(58), updatedAt: minutesAgo(14),
  },
];

export const demoOffers: ResourceOffer[] = [
  { id: 'offer-2001', owner: { id: 'user-rajan', name: 'Rajan S.' }, category: 'SHELTER', description: 'Dry rooms with blankets and basic meals.', quantity: 'Up to 6 people', radiusKm: 5, locationLabel: 'Anna Nagar West', lat: 13.0878, lng: 80.1957, distanceKm: 5.2, status: 'ACTIVE', createdAt: minutesAgo(18) },
  { id: 'offer-2002', owner: { id: 'user-deepa', name: 'Deepa M.' }, category: 'FOOD', description: 'Fresh rice and dal meals prepared for delivery.', quantity: '40 meals', radiusKm: 2, locationLabel: 'T. Nagar', lat: 13.0418, lng: 80.2341, distanceKm: 3.1, status: 'ACTIVE', createdAt: minutesAgo(35) },
  { id: 'offer-2003', owner: { id: 'user-arjun', name: 'Arjun R.' }, category: 'TRANSPORT', description: 'SUV and driver available for safe evacuation.', quantity: '4 seats', radiusKm: 10, locationLabel: 'Adyar', lat: 13.0012, lng: 80.2565, distanceKm: 0.9, status: 'ACTIVE', createdAt: minutesAgo(42) },
  { id: 'offer-2004', owner: { id: 'user-nisha', name: 'Nisha P.' }, category: 'MEDICAL', description: 'First-aid kits and wound care supplies.', quantity: '12 kits', radiusKm: 4, locationLabel: 'Guindy', lat: 13.0067, lng: 80.2206, distanceKm: 2.8, status: 'PAUSED', createdAt: minutesAgo(75) },
];

export const demoHazards: Hazard[] = [
  { id: 'haz-3001', type: 'FLOOD', description: 'Underpass is completely submerged. Do not attempt to cross.', severity: 'HIGH', locationLabel: 'Saidapet underpass', lat: 13.0216, lng: 80.2228, distanceKm: 2.3, reporter: { id: 'user-arun', name: 'Arun K.' }, verification: 'COMMUNITY_VERIFIED', confirmations: 12, disputes: 0, createdAt: minutesAgo(15) },
  { id: 'haz-3002', type: 'POWER_LINE', description: 'Live wire down across the road. Area has not been cleared.', severity: 'CRITICAL', locationLabel: 'LB Road near SRM bus stop', lat: 13.0097, lng: 80.2646, distanceKm: 1.9, reporter: { id: 'user-meera', name: 'Meera N.' }, verification: 'UNVERIFIED', confirmations: 4, disputes: 1, createdAt: minutesAgo(30) },
  { id: 'haz-3003', type: 'ROAD_BLOCK', description: 'Large pothole exposed by flooding. One lane is blocked.', severity: 'MEDIUM', locationLabel: 'Poonamallee High Road', lat: 13.0732, lng: 80.2088, distanceKm: 5.8, reporter: { id: 'user-vikram', name: 'Vikram S.' }, verification: 'ADMIN_VERIFIED', confirmations: 8, disputes: 0, createdAt: minutesAgo(45) },
  { id: 'haz-3004', type: 'DEBRIS', description: 'Fallen branches and debris are blocking the service lane.', severity: 'LOW', locationLabel: 'Besant Nagar 2nd Avenue', lat: 13.0004, lng: 80.2676, distanceKm: 2.6, reporter: { id: 'user-latha', name: 'Latha R.' }, verification: 'UNVERIFIED', confirmations: 2, disputes: 0, createdAt: minutesAgo(67) },
];

export const demoAlerts: Alert[] = [
  { id: 'alert-4001', title: 'Flood warning near Adyar River', description: 'Water levels are rising. Avoid low-lying roads around Kotturpuram and Saidapet.', severity: 'CRITICAL', area: 'Adyar river basin', radiusKm: 5, createdAt: minutesAgo(11) },
  { id: 'alert-4002', title: 'Power restoration underway', description: 'TANGEDCO crews are working near LB Road. Keep clear of utility vehicles.', severity: 'HIGH', area: 'Besant Nagar · Adyar', createdAt: minutesAgo(29) },
  { id: 'alert-4003', title: 'Community shelter open', description: 'The corporation school on 2nd Main Road is accepting families until 10 PM.', severity: 'INFO', area: 'Adyar', createdAt: minutesAgo(55) },
];

export const demoNotifications: AppNotification[] = [
  { id: 'note-1', title: 'Request matched', description: 'A nearby volunteer has been suggested for the evacuation request in Tambaram East.', type: 'REQUEST', read: false, createdAt: minutesAgo(9) },
  { id: 'note-2', title: 'Critical hazard nearby', description: 'A power line down report is 1.9 km from your location.', type: 'HAZARD', read: false, createdAt: minutesAgo(30) },
  { id: 'note-3', title: 'Your request is in progress', description: 'You are responding to Sameer Khan’s shelter request.', type: 'REQUEST', read: true, createdAt: minutesAgo(14) },
  { id: 'note-4', title: 'Welcome to RescueLink', description: 'Your location is approximate until you explicitly enable sharing.', type: 'SYSTEM', read: true, createdAt: minutesAgo(180) },
];
