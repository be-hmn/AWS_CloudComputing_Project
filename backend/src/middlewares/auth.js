import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../domain/errors.js';

export function authRequired(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(AppError.authTokenMissing());

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: Number(payload.sub), role: payload.role, name: payload.name };
    next();
  } catch {
    next(AppError.authTokenInvalid());
  }
}
