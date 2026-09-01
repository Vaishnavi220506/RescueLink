import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { demoAlerts, demoHazards, demoNotifications, demoOffers, demoRequests, demoUser } from '../data';
import { apiService } from '../services/api';
import { normalizeHazard, normalizeOffer, normalizeRequest } from '../services/api';
import { io } from 'socket.io-client';
import type { Alert, AppNotification, CreateAlertInput, CreateHazardInput, CreateOfferInput, CreateRequestInput, Hazard, HelpRequest, ResourceOffer, ToastMessage, User } from '../types';

interface AppContextValue {
  user: User | null;
  requests: HelpRequest[];
  offers: ResourceOffer[];
  hazards: Hazard[];
  alerts: Alert[];
  notifications: AppNotification[];
  toasts: ToastMessage[];
  isDemoMode: boolean;
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
  markNotificationRead: (id: string) => void;
  dismissToast: (id: string) => void;
  showToast: (message: string, type?: ToastMessage['type']) => void;
}

const AppContext = createContext<AppContextValue | null>(null);
const storageKey = 'rescue-link-session';

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) as User : null;
  });
  const [requests, setRequests] = useState(demoRequests);
  const [offers, setOffers] = useState(demoOffers);
  const [hazards, setHazards] = useState(demoHazards);
  const [alerts, setAlerts] = useState(demoAlerts);
  const [notifications, setNotifications] = useState(demoNotifications);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(true);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    Promise.all([apiService.requests({ page: 1, limit: 20 }), apiService.offers({ page: 1, limit: 20 }), apiService.hazards({ page: 1, limit: 20 }), apiService.alerts()]).then(([requestResult, offerResult, hazardResult, alertResult]) => {
      if (!mounted) return;
      setRequests(requestResult.items); setOffers(offerResult.items); setHazards(hazardResult.items); setAlerts(alertResult.items); setIsDemoMode(false);
    }).catch(() => { /* The demo workspace remains useful without a running API. */ });
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    const configuredUrl = import.meta.env.VITE_API_URL as string | undefined;
    if (!user || !configuredUrl) return;
    const socket = io(configuredUrl.replace(/\/api\/?$/, ''), { withCredentials: true, autoConnect: true });
    socket.emit('workspace:join', user.locationLabel || 'Chennai');
    socket.on('request:new', (item) => setRequests((current) => [normalizeRequest(item), ...current.filter((request) => request.id !== item.id)]));
    socket.on('request:updated', (item) => setRequests((current) => current.map((request) => request.id === item.id ? normalizeRequest(item) : request)));
    socket.on('request:accepted', (item) => setRequests((current) => current.map((request) => request.id === item.id ? normalizeRequest(item) : request)));
    socket.on('request:resolved', (item) => setRequests((current) => current.map((request) => request.id === item.id ? normalizeRequest(item) : request)));
    socket.on('hazard:new', (item) => setHazards((current) => [normalizeHazard(item), ...current.filter((hazard) => hazard.id !== item.id)]));
    return () => { socket.disconnect(); };
  }, [user]);

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const toast = { id: `${Date.now()}-${Math.random()}`, message, type };
    setToasts((current) => [...current, toast]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== toast.id)), 4200);
  }, []);

  const persistUser = (nextUser: User) => {
    setUser(nextUser);
    localStorage.setItem(storageKey, JSON.stringify(nextUser));
  };

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await apiService.login(email, password);
      setIsDemoMode(false);
      persistUser(result.user);
      return result.user;
    } catch {
      if (email.trim() && password.trim()) {
        setIsDemoMode(true);
        persistUser({ ...demoUser, email: email.trim() });
        showToast('Demo workspace loaded. Connect the API for persistent data.', 'info');
        return { ...demoUser, email: email.trim() };
      }
      throw new Error('Enter your email and password to continue.');
    }
  }, [showToast]);

  const register = useCallback(async (name: string, email: string, password: string, role: User['role']) => {
    try {
      const result = await apiService.register(name, email, password, role);
      setIsDemoMode(false);
      persistUser(result.user);
      return result.user;
    } catch {
      const nextUser = { ...demoUser, name: name.trim(), email: email.trim(), role };
      setIsDemoMode(true);
      persistUser(nextUser);
      showToast('Demo profile created. Connect the API to save accounts.', 'info');
      return nextUser;
    }
  }, [showToast]);

  const logout = useCallback(async () => {
    try { await apiService.logout(); } catch { /* local session is still cleared */ }
    localStorage.removeItem(storageKey);
    setUser(null);
  }, []);

  const createRequest = useCallback(async (input: CreateRequestInput) => {
    const optimistic: HelpRequest = { id: `req-${Date.now()}`, requester: { id: user?.id ?? 'demo', name: user?.name ?? 'You' }, ...input, distanceKm: 0.4, status: 'OPEN', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    try { const created = await apiService.createRequest(input); setRequests((current) => [created, ...current]); setIsDemoMode(false); }
    catch { setRequests((current) => [optimistic, ...current]); showToast('Request saved in this demo workspace.', 'success'); }
  }, [showToast, user]);

  const createOffer = useCallback(async (input: CreateOfferInput) => {
    const optimistic: ResourceOffer = { id: `offer-${Date.now()}`, owner: { id: user?.id ?? 'demo', name: user?.name ?? 'You' }, ...input, distanceKm: 0.4, status: 'ACTIVE', createdAt: new Date().toISOString() };
    try { const created = await apiService.createOffer(input); setOffers((current) => [created, ...current]); setIsDemoMode(false); }
    catch { setOffers((current) => [optimistic, ...current]); showToast('Offer saved in this demo workspace.', 'success'); }
  }, [showToast, user]);

  const createHazard = useCallback(async (input: CreateHazardInput) => {
    const optimistic: Hazard = { id: `haz-${Date.now()}`, reporter: { id: user?.id ?? 'demo', name: user?.name ?? 'You' }, ...input, distanceKm: 0.4, verification: 'UNVERIFIED', confirmations: 0, disputes: 0, createdAt: new Date().toISOString() };
    try { const created = await apiService.createHazard(input); setHazards((current) => [created, ...current]); setIsDemoMode(false); }
    catch { setHazards((current) => [optimistic, ...current]); showToast('Hazard report saved in this demo workspace.', 'success'); }
  }, [showToast, user]);

  const createAlert = useCallback(async (input: CreateAlertInput) => {
    const optimistic: Alert = { ...input, id: `alert-${Date.now()}`, createdAt: new Date().toISOString() };
    try { const created = await apiService.createAlert(input); setAlerts((current) => [created, ...current]); setIsDemoMode(false); }
    catch { setAlerts((current) => [optimistic, ...current]); showToast('Alert added to this demo workspace.', 'success'); }
  }, [showToast]);

  const moderateHazard = useCallback(async (id: string, verification: 'ADMIN_VERIFIED' | 'REJECTED') => {
    setHazards((current) => current.map((hazard) => hazard.id === id ? { ...hazard, verification } : hazard));
    try { const updated = await apiService.moderateHazard(id, verification); setHazards((current) => current.map((hazard) => hazard.id === id ? updated : hazard)); setIsDemoMode(false); }
    catch { showToast(verification === 'ADMIN_VERIFIED' ? 'Hazard verified for the community map.' : 'Report rejected and hidden from the community map.', 'success'); }
  }, [showToast]);

  const acceptRequest = useCallback(async (id: string) => {
    const volunteer = { id: user?.id ?? demoUser.id, name: user?.name ?? demoUser.name };
    setRequests((current) => current.map((request) => request.id === id ? { ...request, status: 'ACCEPTED', assignedVolunteer: volunteer, updatedAt: new Date().toISOString() } : request));
    try { const updated = await apiService.acceptRequest(id); setRequests((current) => current.map((request) => request.id === id ? updated : request)); setIsDemoMode(false); }
    catch { showToast('Request accepted in this demo workspace.', 'success'); }
  }, [showToast, user]);

  const updateRequestStatus = useCallback(async (id: string, status: HelpRequest['status']) => {
    setRequests((current) => current.map((request) => request.id === id ? { ...request, status, updatedAt: new Date().toISOString() } : request));
    try { const updated = await apiService.updateRequestStatus(id, status); setRequests((current) => current.map((request) => request.id === id ? updated : request)); setIsDemoMode(false); }
    catch { showToast(`Request marked ${status.toLowerCase().replace('_', ' ')} in this demo workspace.`, 'success'); }
  }, [showToast]);

  const voteHazard = useCallback(async (id: string, vote: 'CONFIRM' | 'DISPUTE') => {
    setHazards((current) => current.map((hazard) => hazard.id === id ? { ...hazard, confirmations: hazard.confirmations + (vote === 'CONFIRM' ? 1 : 0), disputes: hazard.disputes + (vote === 'DISPUTE' ? 1 : 0), verification: vote === 'CONFIRM' && hazard.confirmations + 1 >= 3 ? 'COMMUNITY_VERIFIED' : hazard.verification } : hazard));
    try { const updated = await apiService.voteHazard(id, vote); setHazards((current) => current.map((hazard) => hazard.id === id ? updated : hazard)); setIsDemoMode(false); }
    catch { showToast('Thanks — your community verification was recorded.', 'success'); }
  }, [showToast]);

  const startLiveLocation = useCallback(async (input: { lat: number; lng: number; status: string; note?: string }) => {
    try { await apiService.startLiveLocation(input); setIsDemoMode(false); } catch { showToast('Live location is active in this browser session; connect the API to share it with responders.', 'info'); }
  }, [showToast]);
  const stopLiveLocation = useCallback(async () => { try { await apiService.stopLiveLocation(); } catch { /* local sharing state still stops */ } }, []);

  const markNotificationRead = (id: string) => setNotifications((current) => current.map((notification) => notification.id === id ? { ...notification, read: true } : notification));
  const dismissToast = (id: string) => setToasts((current) => current.filter((toast) => toast.id !== id));

  const value = useMemo(() => ({ user, requests, offers, hazards, alerts, notifications, toasts, isDemoMode, login, register, logout, createRequest, createOffer, createHazard, createAlert, moderateHazard, acceptRequest, updateRequestStatus, voteHazard, startLiveLocation, stopLiveLocation, markNotificationRead, dismissToast, showToast }), [user, requests, offers, hazards, alerts, notifications, toasts, isDemoMode, login, register, logout, createRequest, createOffer, createHazard, createAlert, moderateHazard, acceptRequest, updateRequestStatus, voteHazard, startLiveLocation, stopLiveLocation, showToast]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
