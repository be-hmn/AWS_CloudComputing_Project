import { Router } from 'express';
import { applicationController } from '../controllers/application.controller.js';
import { authRequired } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { ROLE } from '../domain/role.js';
import { createApplicationBody } from '../schemas/application.schema.js';

const router = Router();
router.use(authRequired);

router.post(
  '/',
  requireRole(ROLE.MENTEE),
  validate({ body: createApplicationBody }),
  applicationController.create,
);
router.get('/', requireRole(ROLE.MENTEE), applicationController.listMine);
router.get('/:id', applicationController.getOne); // 권한은 서비스 레이어에서 검사
router.delete('/:id', requireRole(ROLE.MENTEE), applicationController.cancel);

export default router;
