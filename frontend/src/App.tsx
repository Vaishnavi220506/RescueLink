import { Navigate, Route, Routes } from 'react-router-dom';
import { useApp } from './context/AppContext';
import { AppShell } from './components/AppShell';
import { LoginPage, RegisterPage } from './pages/Auth';
import { DashboardPage } from './pages/Dashboard';
import { RequestsPage } from './pages/Requests';
import { OffersPage } from './pages/Offers';
import { HazardsPage } from './pages/Hazards';
import { LiveMapPage } from './pages/LiveMap';
import { AlertsPage } from './pages/Alerts';
import { ActivityPage } from './pages/Activity';
import { ProfilePage } from './pages/Profile';
import { AdminDashboardPage, AdminHazardsPage, AdminUsersPage } from './pages/Admin';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useApp();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return <Routes><Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /><Route path="*" element={<ProtectedRoute><AppShell><Routes><Route path="/" element={<DashboardPage />} /><Route path="/requests" element={<RequestsPage />} /><Route path="/offers" element={<OffersPage />} /><Route path="/hazards" element={<HazardsPage />} /><Route path="/map" element={<LiveMapPage />} /><Route path="/alerts" element={<AlertsPage />} /><Route path="/activity" element={<ActivityPage />} /><Route path="/profile" element={<ProfilePage />} /><Route path="/admin" element={<AdminDashboardPage />} /><Route path="/admin/hazards" element={<AdminHazardsPage />} /><Route path="/admin/users" element={<AdminUsersPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></AppShell></ProtectedRoute>} /></Routes>;
}
