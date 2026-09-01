import { Bell, ChevronDown, ClipboardList, FileWarning, LayoutDashboard, LifeBuoy, LogOut, Map, Menu, Package, Search, Settings2, ShieldCheck, UserRound, UsersRound, X } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Logo, ToastViewport } from './ui';

const primaryNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/requests', label: 'Help requests', icon: LifeBuoy },
  { to: '/offers', label: 'Resource offers', icon: Package },
  { to: '/hazards', label: 'Hazards', icon: FileWarning },
  { to: '/map', label: 'Live map', icon: Map },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/activity', label: 'My activity', icon: ClipboardList },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const { user, notifications, logout, toasts, dismissToast, isDemoMode } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const unread = notifications.filter((notification) => !notification.read).length;

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const navClass = ({ isActive }: { isActive: boolean }) => `side-nav-link ${isActive ? 'active' : ''}`;

  return <div className="app-shell"><aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}><div className="sidebar-top"><Logo /><button className="icon-btn sidebar-close" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}><X size={18} /></button></div><div className="workspace-menu-wrap"><button className="workspace-switcher" type="button" aria-expanded={workspaceOpen} aria-haspopup="menu" onClick={() => setWorkspaceOpen((open) => !open)}><span className="workspace-avatar">RL</span><span><strong>Chennai response</strong><small>Community workspace</small></span><ChevronDown className={workspaceOpen ? 'workspace-chevron open' : 'workspace-chevron'} size={15} /></button>{workspaceOpen && <div className="workspace-menu" role="menu"><button className="workspace-option selected" type="button" role="menuitem" onClick={() => setWorkspaceOpen(false)}><span className="workspace-avatar">RL</span><span><strong>Chennai response</strong><small>Active workspace</small></span><span className="workspace-check">✓</span></button><div className="workspace-menu-note">This demo currently has one community workspace.</div></div>}</div><nav className="sidebar-nav" aria-label="Main navigation"><span className="nav-section-label">Workspace</span>{primaryNav.map(({ to, label, icon: Icon }) => <NavLink end={to === '/'} className={navClass} to={to} key={to} onClick={() => setSidebarOpen(false)}><Icon size={17} /><span>{label}</span>{label === 'Alerts' && unread > 0 && <span className="nav-count">{unread}</span>}</NavLink>)}<span className="nav-section-label nav-section-spaced">Account</span><NavLink className={navClass} to="/profile" onClick={() => setSidebarOpen(false)}><UserRound size={17} /><span>Profile</span></NavLink>{user?.role === 'ADMIN' && <><span className="nav-section-label nav-section-spaced">Administration</span><NavLink className={navClass} to="/admin" onClick={() => setSidebarOpen(false)}><ShieldCheck size={17} /><span>Admin dashboard</span></NavLink><NavLink className={navClass} to="/admin/hazards" onClick={() => setSidebarOpen(false)}><FileWarning size={17} /><span>Verify hazards</span></NavLink><NavLink className={navClass} to="/admin/users" onClick={() => setSidebarOpen(false)}><UsersRound size={17} /><span>User management</span></NavLink></>}</nav><div className="sidebar-footer"><div className="privacy-note"><ShieldCheck size={15} /><span>Approximate location is private by default.</span></div><button className="side-nav-link" onClick={() => navigate('/profile')}><Settings2 size={17} /><span>Settings</span></button></div></aside>{sidebarOpen && <button className="sidebar-overlay" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} /> }<div className="main-shell"><header className="topbar"><button className="icon-btn menu-btn" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={21} /></button><div className="topbar-search"><Search size={17} /><input aria-label="Search workspace" placeholder="Search requests, hazards, people..." /></div><div className="topbar-actions"><span className={`connection-pill ${isDemoMode ? 'demo' : ''}`}><span className="connection-dot" />{isDemoMode ? 'Demo workspace' : 'Live workspace'}</span><button className="icon-btn notification-btn" aria-label={`${unread} unread notifications`} onClick={() => navigate('/alerts')}><Bell size={18} />{unread > 0 && <span />}</button><div className="profile-menu-wrap"><button className="profile-trigger" onClick={() => setProfileOpen((open) => !open)}><span className="avatar">{user?.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><span className="profile-trigger-copy"><strong>{user?.name}</strong><small>{user?.role.toLowerCase()}</small></span><ChevronDown size={15} /></button>{profileOpen && <div className="profile-menu"><button onClick={() => { navigate('/profile'); setProfileOpen(false); }}><UserRound size={15} /> Profile</button><button onClick={handleLogout}><LogOut size={15} /> Sign out</button></div>}</div></div></header><main className="main-content" key={location.pathname}>{children}</main></div><ToastViewport toasts={toasts} dismiss={dismissToast} /></div>;
}
