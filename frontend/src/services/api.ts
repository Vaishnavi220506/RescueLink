import axios from 'axios';
import type { Alert, CreateAlertInput, CreateHazardInput, CreateOfferInput, CreateRequestInput, Hazard, HelpRequest, ResourceOffer, User } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
  timeout: 5000,
});

type ApiResponse<T> = { success: boolean; data: T; error?: { code: string; message: string } };

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;
export const normalizeRequest = (item: HelpRequest & { requesterId?: string; requesterName?: string; assignedVolunteerId?: string; assignedVolunteerName?: string }): HelpRequest => ({ ...item, distanceKm: Number(item.distanceKm ?? 0), requester: item.requester || { id: item.requesterId || 'unknown', name: item.requesterName || 'Community member' }, assignedVolunteer: item.assignedVolunteer || (item.assignedVolunteerId ? { id: item.assignedVolunteerId, name: item.assignedVolunteerName || 'Assigned volunteer' } : undefined) });
export const normalizeOffer = (item: ResourceOffer & { ownerId?: string; ownerName?: string }): ResourceOffer => ({ ...item, distanceKm: Number(item.distanceKm ?? 0), radiusKm: Number(item.radiusKm ?? 0), owner: item.owner || { id: item.ownerId || 'unknown', name: item.ownerName || 'Community volunteer' } });
export const normalizeHazard = (item: Hazard & { reporterId?: string; reporterName?: string }): Hazard => ({ ...item, distanceKm: Number(item.distanceKm ?? 0), reporter: item.reporter || { id: item.reporterId || 'unknown', name: item.reporterName || 'Community member' } });

export const apiService = {
  async login(email: string, password: string) { return unwrap(await api.post<ApiResponse<{ user: User }>>('/auth/login', { email, password })); },
  async register(name: string, email: string, password: string, role: string) { return unwrap(await api.post<ApiResponse<{ user: User }>>('/auth/register', { name, email, password, role })); },
  async logout() { await api.post('/auth/logout'); },
  async me() { return unwrap(await api.get<ApiResponse<{ user: User }>>('/auth/me')); },
  async requests(params?: Record<string, string | number>) { const result = unwrap(await api.get<ApiResponse<{ items: HelpRequest[] }>>('/requests', { params })); return { ...result, items: result.items.map(normalizeRequest) }; },
  async createRequest(input: CreateRequestInput) { return normalizeRequest(unwrap(await api.post<ApiResponse<HelpRequest>>('/requests', input))); },
  async acceptRequest(id: string) { return normalizeRequest(unwrap(await api.post<ApiResponse<HelpRequest>>(`/requests/${id}/accept`))); },
  async updateRequestStatus(id: string, status: string) { return normalizeRequest(unwrap(await api.patch<ApiResponse<HelpRequest>>(`/requests/${id}/status`, { status }))); },
  async offers(params?: Record<string, string | number>) { const result = unwrap(await api.get<ApiResponse<{ items: ResourceOffer[] }>>('/offers', { params })); return { ...result, items: result.items.map(normalizeOffer) }; },
  async createOffer(input: CreateOfferInput) { return normalizeOffer(unwrap(await api.post<ApiResponse<ResourceOffer>>('/offers', input))); },
  async hazards(params?: Record<string, string | number>) { const result = unwrap(await api.get<ApiResponse<{ items: Hazard[] }>>('/hazards', { params })); return { ...result, items: result.items.map(normalizeHazard) }; },
  async createHazard(input: CreateHazardInput) { return normalizeHazard(unwrap(await api.post<ApiResponse<Hazard>>('/hazards', input))); },
  async voteHazard(id: string, vote: 'CONFIRM' | 'DISPUTE') { return normalizeHazard(unwrap(await api.post<ApiResponse<Hazard>>(`/hazards/${id}/vote`, { vote }))); },
  async alerts() { return unwrap(await api.get<ApiResponse<{ items: Alert[] }>>('/alerts')); },
  async createAlert(input: CreateAlertInput) { return unwrap(await api.post<ApiResponse<Alert>>('/alerts', input)); },
  async moderateHazard(id: string, verification: 'ADMIN_VERIFIED' | 'REJECTED') { return normalizeHazard(unwrap(await api.patch<ApiResponse<Hazard>>(`/admin/hazards/${id}`, { verification }))); },
  async startLiveLocation(input: { lat: number; lng: number; status: string; note?: string; ttlMinutes?: number }) { return unwrap(await api.post<ApiResponse<unknown>>('/live-locations/start', input)); },
  async stopLiveLocation() { return unwrap(await api.post<ApiResponse<{ stopped: boolean }>>('/live-locations/stop')); },
};
