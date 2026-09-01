import type { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { Server, type Socket } from 'socket.io';
import { config } from '../config.js';
import { findRequestById, findUserById } from '../database/repository.js';
import type { AuthUser, HazardRecord, NotificationRecord, RequestRecord } from '../types.js';

const roomForUser = (userId: string) => `user:${userId}`;
const roomForRole = (role: AuthUser['role']) => `role:${role}`;
const roomForRequest = (requestId: string) => `request:${requestId}`;
const roomForArea = (area: string) => `area:${area.trim().toLowerCase()}`;

function readCookie(header: string | undefined, name: string) {
  return header?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

async function authenticateSocket(socket: Socket, next: (error?: Error) => void) {
  const token = readCookie(socket.handshake.headers.cookie, 'rescue_session') || socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return next(new Error('UNAUTHENTICATED'));
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as { sub?: string };
    if (!payload.sub) return next(new Error('UNAUTHENTICATED'));
    const user = await findUserById(payload.sub);
    if (!user) return next(new Error('UNAUTHENTICATED'));
    socket.data.user = { id: user.id, name: user.name, email: user.email, role: user.role, isAvailable: user.isAvailable, locationLabel: user.locationLabel } satisfies AuthUser;
    return next();
  } catch { return next(new Error('UNAUTHENTICATED')); }
}

export function createSocketServer(server: HttpServer) {
  const io = new Server(server, { cors: { origin: config.FRONTEND_URL, credentials: true } });
  io.use(authenticateSocket);
  io.on('connection', (socket) => {
    const user = socket.data.user as AuthUser;
    socket.join(roomForUser(user.id));
    socket.join(roomForRole(user.role));
    if (user.locationLabel) socket.join(roomForArea(user.locationLabel));

    socket.on('workspace:join', (_area: unknown, acknowledgement?: (response: { joined: boolean }) => void) => {
      if (user.locationLabel) socket.join(roomForArea(user.locationLabel));
      acknowledgement?.({ joined: true });
    });

    socket.on('request:join', async (requestId: unknown, acknowledgement?: (response: { joined: boolean; error?: string }) => void) => {
      if (typeof requestId !== 'string' || requestId.length > 100) return acknowledgement?.({ joined: false, error: 'INVALID_REQUEST' });
      const request = await findRequestById(requestId);
      if (!request) return acknowledgement?.({ joined: false, error: 'NOT_FOUND' });
      const canJoin = user.role === 'ADMIN' || request.requesterId === user.id || request.assignedVolunteerId === user.id;
      if (!canJoin) return acknowledgement?.({ joined: false, error: 'FORBIDDEN' });
      socket.join(roomForRequest(requestId));
      acknowledgement?.({ joined: true });
    });
  });
  return io;
}

export function emitRequestEvent(io: Server, event: 'request:new' | 'request:accepted' | 'request:updated' | 'request:resolved', request: RequestRecord) {
  const rooms = [roomForUser(request.requesterId), roomForRequest(request.id)];
  if (request.assignedVolunteerId) rooms.push(roomForUser(request.assignedVolunteerId));
  if (event === 'request:new') rooms.push(roomForArea(request.locationLabel));
  io.to(rooms).emit(event, request);
}

export function emitHazardEvent(io: Server, event: 'hazard:new' | 'hazard:verified', hazard: HazardRecord) {
  io.to(roomForArea(hazard.locationLabel)).emit(event, hazard);
  io.to(roomForRole('ADMIN')).emit(event, hazard);
}

export function emitAlertEvent(io: Server, alert: { area: string }) {
  io.to(roomForArea(alert.area)).emit('alert:new', alert);
  io.to(roomForRole('ADMIN')).emit('alert:new', alert);
}

export function emitNotificationEvent(io: Server, notification: NotificationRecord) {
  io.to(roomForUser(notification.userId)).emit('notification:new', notification);
}
