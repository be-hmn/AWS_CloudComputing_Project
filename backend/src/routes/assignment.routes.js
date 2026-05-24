import { Router } from 'express';
import { assignmentController } from '../controllers/assignment.controller.js';
import { authRequired } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { ROLE } from '../domain/role.js';
import { approveBody, rejectBody } from '../schemas/application.schema.js';

const router = Router();
router.use(authRequired, requireRole(ROLE.MENTOR));

router.post(
  '/:id/approve',
  validate({ body: approveBody }),
  assignmentController.approve,
);
router.post(
  '/:id/reject',
  validate({ body: rejectBody }),
  assignmentController.reject,
);

export default router;
