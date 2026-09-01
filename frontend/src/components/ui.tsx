import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, MapPin, Package, ShieldCheck, Siren, Users, X, type LucideIcon } from 'lucide-react';
import type { Alert, AlertSeverity, Hazard, HelpRequest, ResourceOffer, RequestStatus, Urgency } from '../types';

export function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="brand-lockup"><span className="brand-mark"><ShieldCheck size={18} strokeWidth={2.3} /></span>{!compact && <span>Rescue<span className="brand-accent">Link</span></span>}</div>;
}

export function Button({ children, variant = 'primary', size = 'md', className = '', type = 'button', disabled = false, onClick }: { children: React.ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'; size?: 'sm' | 'md' | 'lg'; className?: string; type?: 'button' | 'submit'; disabled?: boolean; onClick?: () => void }) {
  return <button type={type} className={`btn btn-${variant} btn-${size} ${className}`} disabled={disabled} onClick={onClick}>{children}</button>;
}

const statusClass: Record<string, string> = {
  OPEN: 'blue', MATCHED: 'purple', ACCEPTED: 'amber', IN_PROGRESS: 'orange', RESOLVED: 'green', CANCELLED: 'gray',
  ACTIVE: 'green', PAUSED: 'amber', EXHAUSTED: 'gray', EXPIRED: 'gray',
  LOW: 'gray', MEDIUM: 'amber', HIGH: 'orange', CRITICAL: 'red', INFO: 'blue',
  UNVERIFIED: 'gray', COMMUNITY_VERIFIED: 'teal', ADMIN_VERIFIED: 'green', REJECTED: 'red',
};

export function Badge({ value, dot = false }: { value: string; dot?: boolean }) {
  const normalized = value.toUpperCase();
  const label = value.replaceAll('_', ' ');
  return <span className={`badge badge-${statusClass[normalized] || 'gray'}`}>{dot && <span className="badge-dot" />}{label}</span>;
}

export function StatusBadge({ status }: { status: RequestStatus }) { return <Badge value={status} dot />; }
export function UrgencyBadge({ urgency }: { urgency: Urgency }) { return <Badge value={urgency} />; }

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="page-header"><div><div className="eyebrow">{eyebrow || 'RescueLink workspace'}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="page-header-action">{action}</div>}</div>;
}

export function StatCard({ label, value, detail, icon: Icon, tone = 'blue' }: { label: string; value: string | number; detail?: string; icon: LucideIcon; tone?: 'blue' | 'red' | 'green' | 'amber' }) {
  return <div className="stat-card-new"><div className={`stat-icon stat-${tone}`}><Icon size={18} /></div><div className="stat-content"><span className="stat-label">{label}</span><strong>{value}</strong>{detail && <span className="stat-detail">{detail}</span>}</div></div>;
}

export function EmptyState({ icon: Icon = Package, title, description, action }: { icon?: LucideIcon; title: string; description: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={22} /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function LoadingSkeleton({ count = 3 }: { count?: number }) {
  return <div className="skeleton-list">{Array.from({ length: count }, (_, index) => <div className="skeleton-card" key={index}><span /><span /><span /></div>)}</div>;
}

export function ToastViewport({ toasts, dismiss }: { toasts: { id: string; type: string; message: string }[]; dismiss: (id: string) => void }) {
  return <div className="toast-viewport" aria-live="polite">{toasts.map((toast) => <div className={`toast toast-${toast.type}`} key={toast.id}><span className="toast-symbol">{toast.type === 'success' ? <CheckCircle2 size={17} /> : toast.type === 'error' ? <AlertTriangle size={17} /> : <Siren size={17} />}</span><span>{toast.message}</span><button aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}><X size={15} /></button></div>)}</div>;
}

export function Modal({ open, title, description, onClose, children }: { open: boolean; title: string; description?: string; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button className="icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button></div>{children}</div></div>;
}

const categoryIcon: Record<string, LucideIcon> = { MEDICAL: Siren, FOOD: Package, WATER: Package, SHELTER: ShieldCheck, TRANSPORT: ArrowUpRight, RESCUE: Users, SUPPLIES: Package, OTHER: Package };

export function RequestCard({ request, canAccept, onAccept, onStatus }: { request: HelpRequest; canAccept?: boolean; onAccept?: () => void; onStatus?: (status: RequestStatus) => void }) {
  const Icon = categoryIcon[request.category] || Package;
  const actionStatus = request.status === 'ACCEPTED' ? 'IN_PROGRESS' : request.status === 'IN_PROGRESS' ? 'RESOLVED' : null;
  return <article className="request-card"><div className="request-card-top"><div className="category-icon"><Icon size={17} /></div><div className="request-card-title"><span className="card-kicker">{request.category.replaceAll('_', ' ')}</span><h3>{request.title}</h3></div><UrgencyBadge urgency={request.urgency} /></div><p className="card-description">{request.description}</p><div className="card-meta"><span><MapPin size={14} />{request.distanceKm.toFixed(1)} km</span><span><Clock3 size={14} />{timeAgo(request.createdAt)}</span><StatusBadge status={request.status} /></div>{request.assignedVolunteer && <div className="assignment-line"><Users size={14} /> Responding: {request.assignedVolunteer.name}</div>}{(canAccept && request.status === 'OPEN' && onAccept) || (actionStatus && onStatus) ? <div className="card-actions">{canAccept && request.status === 'OPEN' && onAccept && <Button size="sm" onClick={onAccept}>Accept request</Button>}{actionStatus && onStatus && <Button size="sm" variant={actionStatus === 'RESOLVED' ? 'success' : 'secondary'} onClick={() => onStatus(actionStatus)}>{actionStatus === 'RESOLVED' ? 'Mark resolved' : 'Start response'}</Button>}</div> : null}</article>;
}

export function OfferCard({ offer }: { offer: ResourceOffer }) {
  return <article className="offer-card"><div className="offer-card-top"><div className="category-icon green"><Package size={17} /></div><div className="request-card-title"><span className="card-kicker">{offer.category.replaceAll('_', ' ')}</span><h3>{offer.description}</h3></div><Badge value={offer.status} dot /></div><div className="offer-quantity"><strong>{offer.quantity}</strong><span>available capacity</span></div><div className="card-meta"><span><MapPin size={14} />{offer.distanceKm.toFixed(1)} km · {offer.locationLabel}</span><span><Clock3 size={14} />{timeAgo(offer.createdAt)}</span></div><div className="card-actions"><Button size="sm" variant="secondary">View offer</Button></div></article>;
}

const hazardLabels: Record<string, string> = { FLOOD: 'Flooding', FIRE: 'Fire', ROAD_BLOCK: 'Road blocked', POWER_LINE: 'Power line down', DEBRIS: 'Debris', BUILDING_DAMAGE: 'Building damage', OTHER: 'Other' };
export function HazardCard({ hazard, canVote, onVote }: { hazard: Hazard; canVote?: boolean; onVote?: (vote: 'CONFIRM' | 'DISPUTE') => void }) {
  return <article className="hazard-card-new"><div className="hazard-card-top"><div><span className="card-kicker">{hazardLabels[hazard.type] || hazard.type}</span><h3>{hazard.locationLabel}</h3></div><Badge value={hazard.severity} /></div><p className="card-description">{hazard.description}</p><div className="card-meta"><span><MapPin size={14} />{hazard.distanceKm.toFixed(1)} km</span><span><Clock3 size={14} />{timeAgo(hazard.createdAt)}</span><Badge value={hazard.verification} /></div><div className="verification-row"><span><CheckCircle2 size={14} /> {hazard.confirmations} confirmed</span><span><AlertTriangle size={14} /> {hazard.disputes} disputes</span>{canVote && onVote && <div className="vote-actions"><button onClick={() => onVote('CONFIRM')}>Confirm</button><button onClick={() => onVote('DISPUTE')}>Dispute</button></div>}</div></article>;
}

export function AlertCard({ alert, compact = false }: { alert: Alert; compact?: boolean }) {
  return <article className={`alert-card ${compact ? 'compact' : ''} alert-border-${statusClass[alert.severity] || 'blue'}`}><div className="alert-card-icon"><AlertTriangle size={17} /></div><div className="alert-card-body"><div className="alert-card-heading"><Badge value={alert.severity} /><span>{timeAgo(alert.createdAt)}</span></div><h3>{alert.title}</h3><p>{alert.description}</p><div className="alert-area"><MapPin size={13} /> {alert.area}{alert.radiusKm ? ` · ${alert.radiusKm} km radius` : ''}</div></div></article>;
}

export function timeAgo(date: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const severityColor: Record<AlertSeverity, string> = { INFO: '#2a7c8a', LOW: '#6b7c93', MEDIUM: '#c78724', HIGH: '#df6b3a', CRITICAL: '#c9484d' };
