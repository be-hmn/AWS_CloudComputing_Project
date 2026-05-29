import { Router } from 'express';
import { recordController } from '../controllers/record.controller.js';
import { authRequired } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { ROLE } from '../domain/role.js';
import { createRecordBody } from '../schemas/record.schema.js';

const router = Router();
router.use(authRequired);

// applications/:id/record
router.post(
  '/applications/:id/record',
  requireRole(ROLE.MENTOR),
  validate({ body: createRecordBody }),
  recordController.create,
);
router.put(
  '/applications/:id/record',
  requireRole(ROLE.MENTOR),
  validate({ body: createRecordBody }),
  recordController.update,
);
router.get('/applications/:id/record', recordController.getOne);

// 멘토가 "상담 완료" 만 처리(기록 작성과 분리)
router.post(
  '/applications/:id/complete',
  requireRole(ROLE.MENTOR),
  recordController.complete,
);

// 본인(멘티)의 상담 기록 목록
router.get('/me/records', requireRole(ROLE.MENTEE), recordController.listMine);

export default router;
