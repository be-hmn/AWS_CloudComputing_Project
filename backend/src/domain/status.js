import { AppError } from './errors.js';

export const APPLICATION_STATUS = Object.freeze({
  SUBMITTED: 'SUBMITTED', // 신청접수
  UNDER_REVIEW: 'UNDER_REVIEW', // 멘토검토중
  SCHEDULED: 'SCHEDULED', // 일정확정
  COMPLETED: 'COMPLETED', // 상담완료
  REJECTED: 'REJECTED', // 반려 — 멘토가 배정을 반려한 직후 상태(운영자 재배정 대기)
  CANCELLED: 'CANCELLED', // 취소
});

export const APPLICATION_STATUSES = Object.values(APPLICATION_STATUS);

/**
 * 허용되는 상태 전이 그래프.
 * 멘토가 반려하면 application.status = REJECTED 로 두고,
 * 운영자가 다시 배정하면 REJECTED -> UNDER_REVIEW, 또는 직접 취소하면 REJECTED -> CANCELLED.
 */
export const ALLOWED_TRANSITIONS = Object.freeze({
  SUBMITTED: new Set(['UNDER_REVIEW', 'CANCELLED']),
  UNDER_REVIEW: new Set(['UNDER_REVIEW', 'REJECTED', 'SCHEDULED', 'CANCELLED']),
  SCHEDULED: new Set(['COMPLETED', 'CANCELLED']),
  COMPLETED: new Set(),
  REJECTED: new Set(['UNDER_REVIEW', 'CANCELLED']),
  CANCELLED: new Set(),
});

export const ASSIGNMENT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUPERSEDED: 'SUPERSEDED',
});

/**
 * 상태 전이를 시도한다. 허용되지 않으면 AppError 를 throw 한다.
 */
export function transition(from, to) {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed || !allowed.has(to)) {
    throw AppError.statusTransitionNotAllowed(from, to);
  }
  return to;
}

export function isValidApplicationStatus(value) {
  return APPLICATION_STATUSES.includes(value);
}
