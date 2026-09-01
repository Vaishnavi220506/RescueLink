import axios from 'axios';
import type { Alert, AppNotification, CreateAlertInput, CreateHazardInput, CreateOfferInput, CreateRequestInput, DashboardStats, Hazard, HelpRequest, LiveLocation, Pagination, ResourceOffer, User, UserSummary } from '../types';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api', withCredentials: true, timeout: 5000 });

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); this.name = 'ApiError'; }
}

api.interceptors.response.use(undefined, (error: unknown) => {
  if (!axios.isAxiosError(error)) return Promise.reject(error);
  const status = error.response?.status ?? 0;
  const payload = error.response?.data as { error?: { code?: string; message?: string } } | undefined;
  return Promise.reject(new ApiError(status, payload?.error?.code || (status ? 'HTTP_ERROR' : 'NETWORK_ERROR'), payload?.error?.message || 'The RescueLink service is unavailable.'));
});

type ApiResponse<T> = { success: boolean; data: T; error?: { code: string; message: string } };
type RawPage<T> = { items: T[]; pagination?: Pagination; total?: number };
const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;
const legacyPagination = <T>(result: RawPage<T>): Pagination => result.pagination || { page: 1, limit: result.items.length || 20, total: Number(result.total ?? result.items.length), totalPages: Math.ceil(Number(result.total ?? result.items.length) / (result.items.length || 20)) };
export const isApiUnavailable = (error: unknown) => error instanceof ApiError ? error.status === 0 : axios.isAxiosError(error) && !error.response;
export const isApiUnauthorized = (error: unknown) => error instanceof ApiError && error.status === 401;

export const normalizeRequest = (item: HelpRequest & { requesterId?: string; requesterName?: string; assignedVolunteerId?: string; assignedVolunteerName?: string }): HelpRequest => ({ ...item, distanceKm: Number(item.distanceKm ?? 0), requester: item.requester || { id: item.requesterId || 'unknown', name: item.requesterName || 'Community member' }, assignedVolunteer: item.assignedVolunteer || (item.assignedVolunteerId ? { id: item.assignedVolunteerId, name: item.assignedVolunteerName || 'Assigned volunteer' } : undefined) });
export const normalizeOffer = (item: ResourceOffer & { ownerId?: string; ownerName?: string }): ResourceOffer => ({ ...item, distanceKm: Number(item.distanceKm ?? 0), radiusKm: Number(item.radiusKm ?? 0), owner: item.owner || { id: item.ownerId || 'unknown', name: item.ownerName || 'Community volunteer' } });
export const normalizeHazard = (item: Hazard & { reporterId?: string; reporterName?: string }): Hazard => ({ ...item, distanceKm: Number(item.distanceKm ?? 0), reporter: item.reporter || { id: item.reporterId || 'unknown', name: item.reporterName || 'Community member' } });

export const apiService = {
  async login(email: string, password: string) { return unwrap(await api.post<ApiResponse<{ user: User }>>('/auth/login', { email, password })); },
  async register(name: string, email: string, password: string, role: string) { return unwrap(await api.post<ApiResponse<{ user: User }>>('/auth/register', { name, email, password, role })); },
  async logout() { await api.post('/auth/logout'); },
  async me() { return unwrap(await api.get<ApiResponse<{ user: User }>>('/auth/me')); },
  async updateAvailability(isAvailable: boolean) { return unwrap(await api.patch<ApiResponse<{ user: User }>>('/auth/me/availability', { isAvailable })); },
  async dashboard() { return unwrap(await api.get<ApiResponse<DashboardStats>>('/dashboard')); },
  async requests(params?: Record<string, string | number>) { const result = unwrap(await api.get<ApiResponse<RawPage<HelpRequest>>>('/requests', { params })); return { items: result.items.map(normalizeRequest), pagination: legacyPagination(result) }; },
  async createRequest(input: CreateRequestInput) { return normalizeRequest(unwrap(await api.post<ApiResponse<HelpRequest>>('/requests', input))); },
  async acceptRequest(id: string) { return normalizeRequest(unwrap(await api.post<ApiResponse<HelpRequest>>(`/requests/${id}/accept`))); },
  async updateRequestStatus(id: string, status: string) { return normalizeRequest(unwrap(await api.patch<ApiResponse<HelpRequest>>(`/requests/${id}/status`, { status }))); },
  async offers(params?: Record<string, string | number>) { const result = unwrap(await api.get<ApiResponse<RawPage<ResourceOffer>>>('/offers', { params })); return { items: result.items.map(normalizeOffer), pagination: legacyPagination(result) }; },
  async createOffer(input: CreateOfferInput) { return normalizeOffer(unwrap(await api.post<ApiResponse<ResourceOffer>>('/offers', input))); },
  async hazards(params?: Record<string, string | number>) { const result = unwrap(await api.get<ApiResponse<RawPage<Hazard>>>('/hazards', { params })); return { items: result.items.map(normalizeHazard), pagination: legacyPagination(result) }; },
  async createHazard(input: CreateHazardInput) { return normalizeHazard(unwrap(await api.post<ApiResponse<Hazard>>('/hazards', input))); },
  async voteHazard(id: string, vote: 'CONFIRM' | 'DISPUTE') { return normalizeHazard(unwrap(await api.post<ApiResponse<Hazard>>(`/hazards/${id}/vote`, { vote }))); },
  async alerts(params?: Record<string, string | number>) { const result = unwrap(await api.get<ApiResponse<RawPage<Alert>>>('/alerts', { params })); return { items: result.items, pagination: legacyPagination(result) }; },
  async createAlert(input: CreateAlertInput) { return unwrap(await api.post<ApiResponse<Alert>>('/alerts', input)); },
  async notifications(params?: Record<string, string | number>) { const result = unwrap(await api.get<ApiResponse<RawPage<AppNotification>>>('/notifications', { params })); return { items: result.items, pagination: legacyPagination(result) }; },
  async markNotificationRead(id: string) { return unwrap(await api.patch<ApiResponse<AppNotification>>(`/notifications/${id}/read`)); },
  async markAllNotificationsRead() { return unwrap(await api.patch<ApiResponse<{ updated: number }>>('/notifications/read-all')); },
  async moderateHazard(id: string, verification: 'ADMIN_VERIFIED' | 'REJECTED') { return normalizeHazard(unwrap(await api.patch<ApiResponse<Hazard>>(`/admin/hazards/${id}`, { verification }))); },
  async adminUsers(params?: Record<string, string | number>) { const result = unwrap(await api.get<ApiResponse<RawPage<UserSummary>>>('/admin/users', { params })); return { items: result.items, pagination: legacyPagination(result) }; },
  async startLiveLocation(input: { lat: number; lng: number; status: string; note?: string; ttlMinutes?: number }) { return unwrap(await api.post<ApiResponse<unknown>>('/live-locations/start', input)); },
  async stopLiveLocation() { return unwrap(await api.post<ApiResponse<{ stopped: boolean }>>('/live-locations/stop')); },
  async liveLocations() { return unwrap(await api.get<ApiResponse<{ items: LiveLocation[] }>>('/live-locations')); },
};
