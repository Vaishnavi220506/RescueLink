export type Role = 'CITIZEN' | 'VOLUNTEER' | 'ADMIN';
export type RequestStatus = 'OPEN' | 'MATCHED' | 'ACCEPTED' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';
export type Urgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Category = 'MEDICAL' | 'FOOD' | 'WATER' | 'SHELTER' | 'TRANSPORT' | 'RESCUE' | 'SUPPLIES' | 'OTHER';
export type OfferStatus = 'ACTIVE' | 'PAUSED' | 'EXHAUSTED' | 'EXPIRED';
export type HazardType = 'FLOOD' | 'FIRE' | 'ROAD_BLOCK' | 'POWER_LINE' | 'DEBRIS' | 'BUILDING_DAMAGE' | 'OTHER';
export type HazardVerification = 'UNVERIFIED' | 'COMMUNITY_VERIFIED' | 'ADMIN_VERIFIED' | 'REJECTED';
export type Severity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuthUser { id: string; name: string; email: string; role: Role; isAvailable: boolean; locationLabel?: string; }
export interface UserRecord extends AuthUser { passwordHash: string; }
export interface RequestRecord { id: string; requesterId: string; requesterName: string; category: Category; title: string; description: string; urgency: Urgency; locationLabel: string; lat: number; lng: number; peopleAffected: number; contactPreference: 'IN_APP' | 'PHONE' | 'WHATSAPP'; status: RequestStatus; assignedVolunteerId?: string; assignedVolunteerName?: string; createdAt: string; updatedAt: string; resolvedAt?: string; distanceKm?: number; }
export interface OfferRecord { id: string; ownerId: string; ownerName: string; category: Category; description: string; quantity: string; radiusKm: number; locationLabel: string; lat: number; lng: number; status: OfferStatus; createdAt: string; distanceKm?: number; }
export interface HazardRecord { id: string; type: HazardType; description: string; severity: Severity; locationLabel: string; lat: number; lng: number; reporterId: string; reporterName: string; verification: HazardVerification; confirmations: number; disputes: number; createdAt: string; distanceKm?: number; }
export interface AlertRecord { id: string; title: string; description: string; severity: Severity; area: string; radiusKm?: number; createdAt: string; expiresAt?: string; }
export interface NotificationRecord { id: string; userId: string; title: string; description: string; type: 'REQUEST' | 'HAZARD' | 'ALERT' | 'SYSTEM'; read: boolean; createdAt: string; }
export interface Pagination { page: number; limit: number; total: number; totalPages: number; }
export interface Page<T> { items: T[]; pagination: Pagination; }
export interface DashboardStats { openRequests: number; availableOffers: number; activeHazards: number; criticalAlerts: number; resolvedToday: number; volunteersAvailable: number; }
export interface UserSummary { id: string; name: string; email: string; role: Role; isAvailable: boolean; locationLabel?: string; createdAt: string; }
export interface LiveLocationRecord { userId: string; name: string; status: string; note?: string; lat: number; lng: number; expiresAt: string; updatedAt?: string; }
