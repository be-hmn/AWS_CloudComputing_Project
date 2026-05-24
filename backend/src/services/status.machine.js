'use strict';

const { STATUS, ALL_STATUSES, ALLOWED_TRANSITIONS } = require('../domain/status');
const { AppError } = require('../domain/errors');

/**
 * 상태 전이 검증 함수.
 * - 허용된 전이면 next 를 그대로 반환한다.
 * - 허용되지 않은 전이면 AppError(STATUS_TRANSITION_NOT_ALLOWED, 409) 를 throw 한다.
 */
function transition(current, next) {
  if (!ALL_STATUSES.includes(current) || !ALL_STATUSES.includes(next)) {
    throw AppError.statusTransitionNotAllowed(current, next);
  }
  const allowed = ALLOWED_TRANSITIONS.get(current);
  if (!allowed || !allowed.has(next)) {
    throw AppError.statusTransitionNotAllowed(current, next);
  }
  return next;
}

function isAllowed(current, next) {
  const allowed = ALLOWED_TRANSITIONS.get(current);
  return Boolean(allowed && allowed.has(next));
}

module.exports = { STATUS, transition, isAllowed };
