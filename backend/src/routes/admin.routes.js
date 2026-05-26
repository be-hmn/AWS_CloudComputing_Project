import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { recordController } from '../controllers/record.controller.js';
import { authRequired } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { ROLE } from '../domain/role.js';
import { setActiveBody } from '../schemas/mentor.schema.js';
import {
  assignBody,
  listApplicationsQuery,
} from '../schemas/application.schema.js';

const router = Router();
router.use(authRequired, requireRole(ROLE.ADMIN));

// 멘토 관리
router.get('/mentors', adminController.listMentors);
router.get('/mentors/stats', adminController.mentorStats);
router.patch(
  '/mentors/:id/active',
  validate({ body: setActiveBody }),
  adminController.setMentorActive,
);

// 신청 관리
router.get(
  '/applications',
  validate({ query: listApplicationsQuery }),
  adminController.listApplications,
);
router.get('/applications/:id/candidates', adminController.listCandidates);
router.post(
  '/applications/:id/assign',
  validate({ body: assignBody }),
  adminController.assignMentor,
);
router.patch('/applications/:id/cancel', adminController.cancelApplication);

// 멘티 목록
router.get('/mentees', adminController.listMentees);

// 멘티 신청 이력
router.get('/mentees/:id/applications', adminController.listMenteeApplications);

// 전체 상담 기록
router.get('/records', recordController.listAll);

export default router;
