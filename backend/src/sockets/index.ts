import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { config } from '../config.js';

export function createSocketServer(server: HttpServer) {
  const io = new Server(server, { cors: { origin: config.FRONTEND_URL, credentials: true } });
  io.on('connection', (socket) => { socket.on('workspace:join', (area: string) => socket.join(`area:${area}`)); socket.on('location:update', (payload) => socket.broadcast.emit('location:update', { ...payload, expiresAt: Date.now() + 10 * 60_000 })); socket.on('location:stopped', (userId: string) => socket.broadcast.emit('location:stopped', userId)); });
  return io;
}
