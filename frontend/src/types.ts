export type Role = 'CITIZEN' | 'VOLUNTEER' | 'ADMIN';
export type RequestStatus = 'OPEN' | 'MATCHED' | 'ACCEPTED' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';
export type Urgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Category = 'MEDICAL' | 'FOOD' | 'WATER' | 'SHELTER' | 'TRANSPORT' | 'RESCUE' | 'SUPPLIES' | 'OTHER';
export type OfferStatus = 'ACTIVE' | 'PAUSED' | 'EXHAUSTED' | 'EXPIRED';
export type HazardType = 'FLOOD' | 'FIRE' | 'ROAD_BLOCK' | 'POWER_LINE' | 'DEBRIS' | 'BUILDING_DAMAGE' | 'OTHER';
export type HazardVerification = 'UNVERIFIED' | 'COMMUNITY_VERIFIED' | 'ADMIN_VERIFIED' | 'REJECTED';
export type AlertSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  locationLabel?: string;
  isAvailable?: boolean;
}

export interface HelpRequest {
  id: string;
  requester: Pick<User, 'id' | 'name'>;
  category: Category;
  title: string;
  description: string;
  urgency: Urgency;
  locationLabel: string;
  lat: number;
  lng: number;
  distanceKm: number;
  peopleAffected: number;
  contactPreference: 'IN_APP' | 'PHONE' | 'WHATSAPP';
  status: RequestStatus;
  assignedVolunteer?: Pick<User, 'id' | 'name'>;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceOffer {
  id: string;
  owner: Pick<User, 'id' | 'name'>;
  category: Category;
  description: string;
  quantity: string;
  radiusKm: number;
  locationLabel: string;
  lat: number;
  lng: number;
  distanceKm: number;
  status: OfferStatus;
  createdAt: string;
}

export interface Hazard {
  id: string;
  type: HazardType;
  description: string;
  severity: AlertSeverity;
  locationLabel: string;
  lat: number;
  lng: number;
  distanceKm: number;
  reporter: Pick<User, 'id' | 'name'>;
  verification: HazardVerification;
  confirmations: number;
  disputes: number;
  createdAt: string;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  area: string;
  radiusKm?: number;
  createdAt: string;
  expiresAt?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  type: 'REQUEST' | 'HAZARD' | 'ALERT' | 'SYSTEM';
  read: boolean;
  createdAt: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface CreateRequestInput {
  category: Category;
  title: string;
  description: string;
  urgency: Urgency;
  locationLabel: string;
  lat: number;
  lng: number;
  peopleAffected: number;
  contactPreference: HelpRequest['contactPreference'];
}

export interface CreateOfferInput {
  category: Category;
  description: string;
  quantity: string;
  radiusKm: number;
  locationLabel: string;
  lat: number;
  lng: number;
}

export interface CreateHazardInput {
  type: HazardType;
  description: string;
  severity: AlertSeverity;
  locationLabel: string;
  lat: number;
  lng: number;
}

export interface CreateAlertInput {
  title: string;
  description: string;
  severity: AlertSeverity;
  area: string;
  radiusKm?: number;
  expiresAt?: string;
}
