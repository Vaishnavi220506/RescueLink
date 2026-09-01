import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { io } from 'socket.io-client';
import { demoAlerts, demoHazards, demoNotifications, demoOffers, demoRequests, demoUser } from '../data';
import { apiService, isApiUnauthorized, isApiUnavailable, normalizeHazard, normalizeRequest } from '../services/api';
import type { Alert, AppNotification, CreateAlertInput, CreateHazardInput, CreateOfferInput, CreateRequestInput, DashboardStats, Hazard, HelpRequest, LiveLocation, ResourceOffer, ToastMessage, User } from '../types';

interface AppContextValue {
  user: User | null;
  requests: HelpRequest[];
  offers: ResourceOffer[];
  hazards: Hazard[];
  alerts: Alert[];
  notifications: AppNotification[];
  liveLocations: LiveLocation[];
  dashboardStats: DashboardStats;
  toasts: ToastMessage[];
  isDemoMode: boolean;
  isHydrating: boolean;
  dataError: string | null;
  retryHydration: () => void;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, role: User['role']) => Promise<User>;
  logout: () => Promise<void>;
  createRequest: (input: CreateRequestInput) => Promise<void>;
  createOffer: (input: CreateOfferInput) => Promise<void>;
  createHazard: (input: CreateHazardInput) => Promise<void>;
  createAlert: (input: CreateAlertInput) => Promise<void>;
  moderateHazard: (id: string, verification: 'ADMIN_VERIFIED' | 'REJECTED') => Promise<void>;
  acceptRequest: (id: string) => Promise<void>;
  updateRequestStatus: (id: string, status: HelpRequest['status']) => Promise<void>;
  voteHazard: (id: string, vote: 'CONFIRM' | 'DISPUTE') => Promise<void>;
  startLiveLocation: (input: { lat: number; lng: number; status: string; note?: string }) => Promise<void>;
  stopLiveLocation: () => Promise<void>;
  updateAvailability: (isAvailable: boolean) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  dismissToast: (id: string) => void;
  showToast: (message: string, type?: ToastMessage['type']) => void;
}

const AppContext = createContext<AppContextValue | null>(null);
const storageKey = 'rescue-link-session';

function readStoredUser() {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) as User : null;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

function statsFromDemo(requests: HelpRequest[], offers: ResourceOffer[], hazards: Hazard[], alerts: Alert[]): DashboardStats {
  return { openRequests: requests.filter((item) => ['OPEN', 'MATCHED', 'ACCEPTED', 'IN_PROGRESS'].includes(item.status)).length, availableOffers: offers.filter((item) => item.status === 'ACTIVE').length, activeHazards: hazards.filter((item) => item.verification !== 'REJECTED').length, criticalAlerts: alerts.filter((item) => item.severity === 'CRITICAL').length, resolvedToday: requests.filter((item) => item.status === 'RESOLVED').length, volunteersAvailable: offers.filter((item) => item.status === 'ACTIVE').length };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [requests, setRequests] = useState(demoRequests);
  const [offers, setOffers] = useState(demoOffers);
  const [hazards, setHazards] = useState(demoHazards);
  const [alerts, setAlerts] = useState(demoAlerts);
  const [notifications, setNotifications] = useState(demoNotifications);
  const [liveLocations, setLiveLocations] = useState<LiveLocation[]>([]);
  const [dashboardStats, setDashboardStats] = useState(() => statsFromDemo(demoRequests, demoOffers, demoHazards, demoAlerts));
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isHydrating, setIsHydrating] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [hydrationVersion, setHydrationVersion] = useState(0);

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const toast = { id: `${Date.now()}-${Math.random()}`, message, type };
    setToasts((current) => [...current, toast]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== toast.id)), 4200);
  }, []);

  const persistUser = useCallback((nextUser: User) => {
    setUser(nextUser);
    localStorage.setItem(storageKey, JSON.stringify(nextUser));
  }, []);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    setIsHydrating(true); setDataError(null);
    const nearbyQuery = { page: 1, limit: 100, lat: 13.0012, lng: 80.2565, radius: 20000 };
    const liveLocationsRequest = user.role === 'CITIZEN' ? Promise.resolve({ items: [] as LiveLocation[] }) : apiService.liveLocations();
    Promise.all([apiService.requests(nearbyQuery), apiService.offers(nearbyQuery), apiService.hazards(nearbyQuery), apiService.alerts({ page: 1, limit: 50 }), apiService.notifications({ page: 1, limit: 50 }), apiService.dashboard(), liveLocationsRequest]).then(([requestResult, offerResult, hazardResult, alertResult, notificationResult, stats, locationResult]) => {
      if (!mounted) return;
      setRequests(requestResult.items); setOffers(offerResult.items); setHazards(hazardResult.items); setAlerts(alertResult.items); setNotifications(notificationResult.items); setDashboardStats(stats); setLiveLocations(locationResult.items); setIsDemoMode(false);
    }).catch((error: unknown) => {
      if (!mounted) return;
      if (isApiUnauthorized(error)) { localStorage.removeItem(storageKey); setUser(null); return; }
      if (!isApiUnavailable(error)) { setDataError(error instanceof Error ? error.message : 'Unable to load workspace data.'); showToast(error instanceof Error ? error.message : 'Unable to load workspace data.', 'error'); }
    }).finally(() => { if (mounted) setIsHydrating(false); });
    return () => { mounted = false; };
  }, [hydrationVersion, showToast, user]);

  useEffect(() => {
    const configuredUrl = import.meta.env.VITE_API_URL as string | undefined;
    const apiOrigin = configuredUrl?.replace(/\/api\/?$/, '') || (window.location.hostname === 'localhost' ? 'http://localhost:4000' : '');
    if (!user || !apiOrigin) return;
    const socket = io(apiOrigin, { withCredentials: true, autoConnect: true });
    socket.on('connect_error', () => undefined);
    socket.on('request:new', (item) => setRequests((current) => [normalizeRequest(item), ...current.filter((request) => request.id !== item.id)]));
    socket.on('request:updated', (item) => setRequests((current) => current.map((request) => request.id === item.id ? normalizeRequest(item) : request)));
    socket.on('request:accepted', (item) => setRequests((current) => current.map((request) => request.id === item.id ? normalizeRequest(item) : request)));
    socket.on('request:resolved', (item) => setRequests((current) => current.map((request) => request.id === item.id ? normalizeRequest(item) : request)));
    socket.on('hazard:new', (item) => setHazards((current) => [normalizeHazard(item), ...current.filter((hazard) => hazard.id !== item.id)]));
    socket.on('hazard:verified', (item) => setHazards((current) => current.map((hazard) => hazard.id === item.id ? normalizeHazard(item) : hazard)));
    socket.on('alert:new', (item) => setAlerts((current) => [item, ...current.filter((alert) => alert.id !== item.id)]));
    socket.on('notification:new', (item) => setNotifications((current) => [item, ...current.filter((notification) => notification.id !== item.id)]));
    socket.on('location:update', (item: LiveLocation) => setLiveLocations((current) => [item, ...current.filter((location) => location.userId !== item.userId)]));
    socket.on('location:stopped', (userId: string) => setLiveLocations((current) => current.filter((location) => location.userId !== userId)));
    return () => { socket.disconnect(); };
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    try { const result = await apiService.login(email, password); setIsDemoMode(false); persistUser(result.user); return result.user; }
    catch (error) { if (isApiUnavailable(error) && email.trim() && password.trim()) { setIsDemoMode(true); const nextUser = { ...demoUser, email: email.trim() }; persistUser(nextUser); showToast('Demo workspace loaded. Connect the API for persistent data.', 'info'); return nextUser; } throw error; }
  }, [persistUser, showToast]);

  const register = useCallback(async (name: string, email: string, password: string, role: User['role']) => {
    try { const result = await apiService.register(name, email, password, role); setIsDemoMode(false); persistUser(result.user); return result.user; }
    catch (error) { if (isApiUnavailable(error)) { const nextUser = { ...demoUser, name: name.trim(), email: email.trim(), role }; setIsDemoMode(true); persistUser(nextUser); showToast('Demo profile created. Connect the API to save accounts.', 'info'); return nextUser; } throw error; }
  }, [persistUser, showToast]);

  const logout = useCallback(async () => { try { await apiService.logout(); } catch { /* local session is still cleared */ } localStorage.removeItem(storageKey); setUser(null); }, []);

  const createRequest = useCallback(async (input: CreateRequestInput) => {
    const optimistic: HelpRequest = { id: `req-${Date.now()}`, requester: { id: user?.id ?? 'demo', name: user?.name ?? 'You' }, ...input, distanceKm: 0.4, status: 'OPEN', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    try { const created = await apiService.createRequest(input); setRequests((current) => [created, ...current]); setIsDemoMode(false); }
    catch (error) { if (!isApiUnavailable(error)) throw error; setRequests((current) => [optimistic, ...current]); showToast('Request saved in this demo workspace.', 'success'); }
  }, [showToast, user]);

  const createOffer = useCallback(async (input: CreateOfferInput) => {
    const optimistic: ResourceOffer = { id: `offer-${Date.now()}`, owner: { id: user?.id ?? 'demo', name: user?.name ?? 'You' }, ...input, distanceKm: 0.4, status: 'ACTIVE', createdAt: new Date().toISOString() };
    try { const created = await apiService.createOffer(input); setOffers((current) => [created, ...current]); setIsDemoMode(false); }
    catch (error) { if (!isApiUnavailable(error)) throw error; setOffers((current) => [optimistic, ...current]); showToast('Offer saved in this demo workspace.', 'success'); }
  }, [showToast, user]);

  const createHazard = useCallback(async (input: CreateHazardInput) => {
    const optimistic: Hazard = { id: `haz-${Date.now()}`, reporter: { id: user?.id ?? 'demo', name: user?.name ?? 'You' }, ...input, distanceKm: 0.4, verification: 'UNVERIFIED', confirmations: 0, disputes: 0, createdAt: new Date().toISOString() };
    try { const created = await apiService.createHazard(input); setHazards((current) => [created, ...current]); setIsDemoMode(false); }
    catch (error) { if (!isApiUnavailable(error)) throw error; setHazards((current) => [optimistic, ...current]); showToast('Hazard report saved in this demo workspace.', 'success'); }
  }, [showToast, user]);

  const createAlert = useCallback(async (input: CreateAlertInput) => {
    try { const created = await apiService.createAlert(input); setAlerts((current) => [created, ...current]); setIsDemoMode(false); }
    catch (error) { if (!isApiUnavailable(error)) throw error; const optimistic: Alert = { ...input, id: `alert-${Date.now()}`, createdAt: new Date().toISOString() }; setAlerts((current) => [optimistic, ...current]); showToast('Alert added to this demo workspace.', 'success'); }
  }, [showToast]);

  const moderateHazard = useCallback(async (id: string, verification: 'ADMIN_VERIFIED' | 'REJECTED') => {
    const previous = hazards.find((hazard) => hazard.id === id);
    setHazards((current) => current.map((hazard) => hazard.id === id ? { ...hazard, verification } : hazard));
    try { const updated = await apiService.moderateHazard(id, verification); setHazards((current) => current.map((hazard) => hazard.id === id ? updated : hazard)); setIsDemoMode(false); }
    catch (error) { if (!isApiUnavailable(error)) { if (previous) setHazards((current) => current.map((hazard) => hazard.id === id ? previous : hazard)); throw error; } showToast(verification === 'ADMIN_VERIFIED' ? 'Hazard verified for the community map.' : 'Report rejected and hidden from the community map.', 'success'); }
  }, [hazards, showToast]);

  const acceptRequest = useCallback(async (id: string) => {
    const previous = requests.find((request) => request.id === id);
    const volunteer = { id: user?.id ?? demoUser.id, name: user?.name ?? demoUser.name };
    setRequests((current) => current.map((request) => request.id === id ? { ...request, status: 'ACCEPTED', assignedVolunteer: volunteer, updatedAt: new Date().toISOString() } : request));
    try { const updated = await apiService.acceptRequest(id); setRequests((current) => current.map((request) => request.id === id ? updated : request)); setIsDemoMode(false); }
    catch (error) { if (!isApiUnavailable(error)) { if (previous) setRequests((current) => current.map((request) => request.id === id ? previous : request)); throw error; } showToast('Request accepted in this demo workspace.', 'success'); }
  }, [requests, showToast, user]);

  const updateRequestStatus = useCallback(async (id: string, status: HelpRequest['status']) => {
    const previous = requests.find((request) => request.id === id);
    setRequests((current) => current.map((request) => request.id === id ? { ...request, status, updatedAt: new Date().toISOString() } : request));
    try { const updated = await apiService.updateRequestStatus(id, status); setRequests((current) => current.map((request) => request.id === id ? updated : request)); setIsDemoMode(false); }
    catch (error) { if (!isApiUnavailable(error)) { if (previous) setRequests((current) => current.map((request) => request.id === id ? previous : request)); throw error; } showToast(`Request marked ${status.toLowerCase().replace('_', ' ')} in this demo workspace.`, 'success'); }
  }, [requests, showToast]);

  const voteHazard = useCallback(async (id: string, vote: 'CONFIRM' | 'DISPUTE') => {
    const previous = hazards.find((hazard) => hazard.id === id);
    setHazards((current) => current.map((hazard) => hazard.id === id ? { ...hazard, confirmations: hazard.confirmations + (vote === 'CONFIRM' ? 1 : 0), disputes: hazard.disputes + (vote === 'DISPUTE' ? 1 : 0), verification: vote === 'CONFIRM' && hazard.confirmations + 1 >= 3 ? 'COMMUNITY_VERIFIED' : hazard.verification } : hazard));
    try { const updated = await apiService.voteHazard(id, vote); setHazards((current) => current.map((hazard) => hazard.id === id ? updated : hazard)); setIsDemoMode(false); }
    catch (error) { if (!isApiUnavailable(error)) { if (previous) setHazards((current) => current.map((hazard) => hazard.id === id ? previous : hazard)); throw error; } showToast('Thanks. Your community verification was recorded.', 'success'); }
  }, [hazards, showToast]);

  const startLiveLocation = useCallback(async (input: { lat: number; lng: number; status: string; note?: string }) => { try { const location = await apiService.startLiveLocation(input) as LiveLocation; setLiveLocations((current) => [location, ...current.filter((item) => item.userId !== location.userId)]); setIsDemoMode(false); } catch (error) { if (!isApiUnavailable(error)) throw error; showToast('Live location is active in this browser session; connect the API to share it with responders.', 'info'); } }, [showToast]);
  const stopLiveLocation = useCallback(async () => { try { await apiService.stopLiveLocation(); if (user) setLiveLocations((current) => current.filter((location) => location.userId !== user.id)); } catch (error) { if (!isApiUnavailable(error)) throw error; } }, [user]);
  const updateAvailability = useCallback(async (isAvailable: boolean) => {
    if (!user) return;
    const previous = user;
    persistUser({ ...user, isAvailable });
    try { const result = await apiService.updateAvailability(isAvailable); persistUser(result.user); setIsDemoMode(false); }
    catch (error) { if (!isApiUnavailable(error)) { persistUser(previous); throw error; } showToast('Availability updated in this demo workspace.', 'info'); }
  }, [persistUser, showToast, user]);

  const markNotificationRead = useCallback(async (id: string) => { setNotifications((current) => current.map((notification) => notification.id === id ? { ...notification, read: true } : notification)); try { await apiService.markNotificationRead(id); } catch (error) { if (!isApiUnavailable(error)) showToast(error instanceof Error ? error.message : 'Unable to update notification.', 'error'); } }, [showToast]);
  const markAllNotificationsRead = useCallback(async () => { setNotifications((current) => current.map((notification) => ({ ...notification, read: true }))); try { await apiService.markAllNotificationsRead(); } catch (error) { if (!isApiUnavailable(error)) showToast(error instanceof Error ? error.message : 'Unable to update notifications.', 'error'); } }, [showToast]);
  const dismissToast = useCallback((id: string) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);
  const retryHydration = useCallback(() => setHydrationVersion((version) => version + 1), []);

  const displayDashboardStats = useMemo(() => isDemoMode ? statsFromDemo(requests, offers, hazards, alerts) : dashboardStats, [alerts, dashboardStats, hazards, isDemoMode, offers, requests]);
  const value = useMemo(() => ({ user, requests, offers, hazards, alerts, notifications, liveLocations, dashboardStats: displayDashboardStats, toasts, isDemoMode, isHydrating, dataError, retryHydration, login, register, logout, createRequest, createOffer, createHazard, createAlert, moderateHazard, acceptRequest, updateRequestStatus, voteHazard, startLiveLocation, stopLiveLocation, updateAvailability, markNotificationRead, markAllNotificationsRead, dismissToast, showToast }), [user, requests, offers, hazards, alerts, notifications, liveLocations, displayDashboardStats, toasts, isDemoMode, isHydrating, dataError, retryHydration, login, register, logout, createRequest, createOffer, createHazard, createAlert, moderateHazard, acceptRequest, updateRequestStatus, voteHazard, startLiveLocation, stopLiveLocation, updateAvailability, markNotificationRead, markAllNotificationsRead, dismissToast, showToast]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
