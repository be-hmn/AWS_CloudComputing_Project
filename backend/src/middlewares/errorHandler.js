import { AppError } from '../domain/errors.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.http).json(err.toJSON());
  }

  // 알 수 없는 예외 — 스택은 서버 로그에만, 응답에는 미노출.
  // eslint-disable-next-line no-console
  console.error('[unhandled]', err);
  return res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: '서버 내부 오류가 발생했습니다.',
  });
}
