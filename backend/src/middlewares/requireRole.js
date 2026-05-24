import { AppError } from '../domain/errors.js';

/**
 * req.user.role 이 허용된 역할 집합에 포함되어야 통과한다.
 */
export function requireRole(...allowed) {
  const set = new Set(allowed);
  return (req, _res, next) => {
    if (!req.user) return next(AppError.authTokenMissing());
    if (!set.has(req.user.role)) return next(AppError.forbidden());
    next();
  };
}
