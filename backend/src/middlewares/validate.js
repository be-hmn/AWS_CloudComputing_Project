import { ZodError } from 'zod';
import { AppError } from '../domain/errors.js';

/**
 * zod 스키마 기반 요청 검증 미들웨어 팩토리.
 * 사용 예:
 *   router.post('/x', validate({ body: createXBody }), controller.create)
 */
export function validate(schemas) {
  return (req, _res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        const fields = Array.from(
          new Set(e.issues.map((i) => i.path.join('.')).filter(Boolean)),
        );
        return next(AppError.validationFailed(fields));
      }
      next(e);
    }
  };
}
