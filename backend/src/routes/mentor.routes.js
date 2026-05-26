import { Router } from 'express';
import { mentorController } from '../controllers/mentor.controller.js';
import { recordController } from '../controllers/record.controller.js';
import { authRequired } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { ROLE } from '../domain/role.js';
import {
  createProfileBody,
  patchProfileBody,
} from '../schemas/mentor.schema.js';

const router = Router();
router.use(authRequired, requireRole(ROLE.MENTOR));

router.post(
  '/me',
  validate({ body: createProfileBody }),
  mentorController.createMyProfile,
);
router.get('/me', mentorController.getMyProfile);
router.patch(
  '/me',
  validate({ body: patchProfileBody }),
  mentorController.patchMyProfile,
);
router.get('/me/assignments', mentorController.listMyAssignments);
router.get('/me/records', recordController.listMentorRecords);

export default router;
