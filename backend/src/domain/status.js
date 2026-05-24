import { AppError } from './errors.js';

export const APPLICATION_STATUS = Object.freeze({
  SUBMITTED: 'SUBMITTED', // 신청접수
  UNDER_REVIEW: 'UNDER_REVIEW', // 멘토검토중
  SCHEDULED: 'SCHEDULED', // 일정확정
  COMPLETED: 'COMPLETED', // 상담완료
  REJECTED: 'REJECTED', // 반려 (V1에서는 application 단위로 직접 사용하지 않음)
  CANCELLED: 'CANCELLED', // 취소
});

export const APPLICATION_STATUSES = Object.values(APPLICATION_STATUS);

/**
 * 허용되는 상태 전이 그래프.
 * 본 V1에서 application.status = REJECTED 는 enum 보존만 하고 활성 전이로 사용하지 않는다.
 */
export const ALLOWED_TRANSITIONS = Object.freeze({
  SUBMITTED: new Set(['UNDER_REVIEW', 'CANCELLED']),
  UNDER_REVIEW: new Set(['UNDER_REVIEW', 'SUBMITTED', 'SCHEDULED']),
  SCHEDULED: new Set(['COMPLETED']),
  COMPLETED: new Set(),
  REJECTED: new Set(),
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
