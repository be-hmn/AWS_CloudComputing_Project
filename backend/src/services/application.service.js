import { AppError } from '../domain/errors.js';
import { ROLE } from '../domain/role.js';
import { APPLICATION_STATUS, transition } from '../domain/status.js';
import { applicationRepo } from '../repositories/application.repo.js';
import { assignmentRepo } from '../repositories/assignment.repo.js';
import { mentorRepo } from '../repositories/mentor.repo.js';
import { userRepo } from '../repositories/user.repo.js';

function shape(app) {
  return {
    id: app.id,
    mentee_id: app.mentee_id,
    interest_field: app.interest_field,
    topic: app.topic,
    desired_at: app.desired_at,
    message: app.message,
    status: app.status,
    created_at: app.created_at,
  };
}

export const applicationService = {
  createMyApplication(menteeId, body) {
    const row = applicationRepo.insert({
      mentee_id: menteeId,
      interest_field: body.interest_field,
      topic: body.topic,
      desired_at: body.desired_at,
      message: body.message,
    });
    return shape(row);
  },

  listMyApplications(menteeId) {
    return applicationRepo.listByMentee(menteeId).map(shape);
  },

  /**
   * 단건 조회 — 소유자(멘티), 운영자, 또는 해당 신청에 배정된 멘토만 접근 허용.
   */
  getOne(user, id) {
    const app = applicationRepo.findById(id);
    if (!app) throw AppError.notFound('신청을 찾을 수 없습니다.');

    if (user.role === ROLE.ADMIN) return shape(app);
    if (user.role === ROLE.MENTEE && app.mentee_id === user.id) return shape(app);

    if (user.role === ROLE.MENTOR) {
      const profile = mentorRepo.getByUserId(user.id);
      if (profile) {
        const assignments = assignmentRepo.listByApplication(app.id);
        if (assignments.some((a) => a.mentor_id === profile.id)) return shape(app);
      }
    }
    throw AppError.forbidden();
  },

  cancelMy(menteeId, id) {
    const app = applicationRepo.findById(id);
    if (!app) throw AppError.notFound('신청을 찾을 수 없습니다.');
    if (app.mentee_id !== Number(menteeId)) throw AppError.forbidden();
    transition(app.status, APPLICATION_STATUS.CANCELLED);
    applicationRepo.updateStatus(app.id, APPLICATION_STATUS.CANCELLED);
    return shape(applicationRepo.findById(app.id));
  },

  listForAdmin({ status }) {
    const apps = applicationRepo.list({ status });
    return apps.map(app => {
      const assignments = assignmentRepo.listByApplication(app.id);
      const lastRejected = assignments
        .filter(a => a.status === 'REJECTED')
        .sort((a, b) => (b.closed_at || '').localeCompare(a.closed_at || ''))[0] ?? null;

      let reject_info = null;
      if (lastRejected) {
        const mentor = mentorRepo.getById(lastRejected.mentor_id);
        const user = mentor ? userRepo.findById(mentor.user_id) : null;
        reject_info = {
          mentor_name: user?.name ?? '(알 수 없음)',
          reject_reason: lastRejected.reject_reason,
          rejected_at: lastRejected.closed_at,
        };
      }
      return { ...shape(app), reject_info };
    });
  },

  cancelByAdmin(id) {
    const app = applicationRepo.findById(id);
    if (!app) throw AppError.notFound('신청을 찾을 수 없습니다.');
    if (app.status === APPLICATION_STATUS.CANCELLED) {
      throw AppError.conflict('ALREADY_CANCELLED', '이미 취소된 신청입니다.');
    }
    if (app.status === APPLICATION_STATUS.COMPLETED) {
      throw AppError.conflict('ALREADY_COMPLETED', '상담이 완료된 신청은 취소할 수 없습니다.');
    }
    applicationRepo.updateStatus(app.id, APPLICATION_STATUS.CANCELLED);
    return shape(applicationRepo.findById(app.id));
  },

  listByMenteeForAdmin(menteeId) {
    const u = userRepo.findById(menteeId);
    if (!u) throw AppError.notFound('멘티를 찾을 수 없습니다.');
    return applicationRepo.listByMentee(menteeId).map(shape);
  },
};
