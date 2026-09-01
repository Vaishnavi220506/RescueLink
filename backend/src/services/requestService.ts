import { createNotification, findRequestById, updateRequestStatus } from '../database/repository.js';
import { AppError } from './errors.js';
import type { AuthUser, RequestRecord, RequestStatus } from '../types.js';

const transitions: Record<RequestStatus, RequestStatus[]> = {
  OPEN: ['MATCHED', 'CANCELLED'],
  MATCHED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['RESOLVED', 'CANCELLED'],
  RESOLVED: [],
  CANCELLED: [],
};

export function isValidRequestTransition(current: RequestStatus, next: RequestStatus) {
  return transitions[current].includes(next);
}

export async function transitionRequest(id: string, status: RequestStatus, actor: AuthUser) {
  const existing = await findRequestById(id);
  if (!existing) throw new AppError('NOT_FOUND', 'Request not found.', 404);
  if (actor.role === 'CITIZEN' && !(status === 'CANCELLED' && existing.requesterId === actor.id)) throw new AppError('FORBIDDEN', 'Only the requester can cancel this request.', 403);
  if (actor.role === 'VOLUNTEER' && existing.assignedVolunteerId !== actor.id) throw new AppError('FORBIDDEN', 'Only the assigned volunteer can update response progress.', 403);
  if (actor.role === 'ADMIN' && !isValidRequestTransition(existing.status, status)) throw new AppError('INVALID_STATUS', `Cannot move a ${existing.status} request to ${status}.`, 422);
  if (actor.role !== 'ADMIN' && !isValidRequestTransition(existing.status, status)) throw new AppError('INVALID_STATUS', `Cannot move a ${existing.status} request to ${status}.`, 422);
  const request = await updateRequestStatus(id, status, existing.status);
  if (!request) throw new AppError('CONFLICT', 'This request changed before the update completed. Refresh and try again.', 409);
  const notifications = await notifyParticipants(existing, request, actor);
  return { request, notifications };
}

async function notifyParticipants(previous: RequestRecord, next: RequestRecord, actor: AuthUser) {
  const title = next.status === 'RESOLVED' ? 'Request resolved' : next.status === 'IN_PROGRESS' ? 'Response started' : next.status === 'CANCELLED' ? 'Request cancelled' : 'Request updated';
  const description = next.status === 'RESOLVED' ? 'The help request has been marked resolved.' : `The request is now ${next.status.toLowerCase().replace('_', ' ')}.`;
  const recipients = new Set([previous.requesterId, previous.assignedVolunteerId].filter((id): id is string => Boolean(id) && id !== actor.id));
  return Promise.all([...recipients].map((userId) => createNotification({ userId, title, description, type: 'REQUEST' })));
}
