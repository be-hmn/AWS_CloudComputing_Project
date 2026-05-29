import { AppError } from '../domain/errors.js';
import { ROLE } from '../domain/role.js';
import { APPLICATION_STATUS, transition } from '../domain/status.js';
import { applicationRepo } from '../repositories/application.repo.js';
import { assignmentRepo } from '../repositories/assignment.repo.js';
import { mentorRepo } from '../repositories/mentor.repo.js';
import { recordRepo } from '../repositories/record.repo.js';
import { fileService } from './file.service.js';

async function attachUrl(record) {
  if (!record) return null;
  let attachment_url = null;
  if (record.attachment_key) {
    const r = await fileService.requestDownloadUrlByOwner(record.attachment_key);
    attachment_url = r.download_url;
  }
  return { ...record, attachment_url };
}

/** 해당 application 의 APPROVED 배정을 가진 멘토인지 검사 */
function assertOwningMentor(mentorUserId, app) {
  const profile = mentorRepo.getByUserId(mentorUserId);
  if (!profile) throw AppError.forbidden();
  const owns = assignmentRepo
    .listByApplication(app.id)
    .some((a) => a.mentor_id === profile.id && a.status === 'APPROVED');
  if (!owns) throw AppError.forbidden();
  return profile;
}

export const recordService = {
  /**
   * 멘토가 "상담 완료" 만 처리. 상태 전이 SCHEDULED -> COMPLETED.
   * 기록은 별도 createRecord 에서 작성한다.
   */
  completeAsMentor(mentorUserId, applicationId) {
    const app = applicationRepo.findById(applicationId);
    if (!app) throw AppError.notFound('신청을 찾을 수 없습니다.');
    assertOwningMentor(mentorUserId, app);
    transition(app.status, APPLICATION_STATUS.COMPLETED);
    applicationRepo.updateStatus(app.id, APPLICATION_STATUS.COMPLETED);
    return { application_id: app.id, status: APPLICATION_STATUS.COMPLETED };
  },

  async createRecord(mentorUserId, applicationId, body) {
    const app = applicationRepo.findById(applicationId);
    if (!app) throw AppError.notFound('신청을 찾을 수 없습니다.');
    assertOwningMentor(mentorUserId, app);

    if (app.status !== APPLICATION_STATUS.COMPLETED) {
      throw AppError.conflict(
        'STATUS_NOT_COMPLETED',
        '상담 완료 상태에서만 기록을 작성할 수 있습니다.',
      );
    }

    let record;
    try {
      record = recordRepo.insert({
        application_id: app.id,
        summary: body.summary,
        follow_up_task: body.follow_up_task,
        needs_next_consultation: body.needs_next_consultation,
        attachment_key: body.attachment_key,
      });
    } catch (e) {
      if (e.code === 'RECORD_ALREADY_EXISTS') throw AppError.recordAlreadyExists();
      throw e;
    }
    return await attachUrl(record);
  },

  async updateRecord(mentorUserId, applicationId, body) {
    const app = applicationRepo.findById(applicationId);
    if (!app) throw AppError.notFound('신청을 찾을 수 없습니다.');
    assertOwningMentor(mentorUserId, app);

    if (app.status !== APPLICATION_STATUS.COMPLETED) {
      throw AppError.conflict(
        'STATUS_NOT_COMPLETED',
        '상담 완료 상태에서만 기록을 수정할 수 있습니다.',
      );
    }

    const updated = recordRepo.updateByApplication(app.id, {
      summary: body.summary,
      follow_up_task: body.follow_up_task,
      needs_next_consultation: body.needs_next_consultation,
      attachment_key: body.attachment_key,
    });
    if (!updated) throw AppError.notFound('상담 기록이 없습니다.');
    return await attachUrl(updated);
  },

  /**
   * 단건 조회 — 멘티 본인 / 배정된 멘토 / 운영자만 접근 허용.
   */
  async getRecord(user, applicationId) {
    const app = applicationRepo.findById(applicationId);
    if (!app) throw AppError.notFound('신청을 찾을 수 없습니다.');
    const record = recordRepo.findByApplication(app.id);
    if (!record) throw AppError.notFound('상담 기록이 없습니다.');

    const allowed =
      user.role === ROLE.ADMIN ||
      (user.role === ROLE.MENTEE && app.mentee_id === user.id) ||
      (user.role === ROLE.MENTOR &&
        (() => {
          const p = mentorRepo.getByUserId(user.id);
          if (!p) return false;
          return assignmentRepo
            .listByApplication(app.id)
            .some((a) => a.mentor_id === p.id);
        })());
    if (!allowed) throw AppError.forbidden();

    return await attachUrl(record);
  },

  async listMyRecords(menteeId) {
    const apps = applicationRepo
      .listByMentee(menteeId)
      .filter((a) => a.status === APPLICATION_STATUS.COMPLETED);
    const out = [];
    for (const app of apps) {
      const r = recordRepo.findByApplication(app.id);
      if (r) out.push({ application_id: app.id, ...(await attachUrl(r)) });
    }
    return out;
  },

  async listMyRecordsAsMentor(mentorUserId) {
    const profile = mentorRepo.getByUserId(mentorUserId);
    if (!profile) return [];
    const myAssignments = assignmentRepo.listByMentor(profile.id)
      .filter(a => a.status === 'APPROVED');
    const out = [];
    for (const a of myAssignments) {
      const r = recordRepo.findByApplication(a.application_id);
      if (r) out.push({ application_id: a.application_id, ...(await attachUrl(r)) });
    }
    return out;
  },

  async listAllForAdmin() {
    const all = recordRepo.listAll();
    const out = [];
    for (const r of all) {
      const app = applicationRepo.findById(r.application_id);
      const assignments = app ? assignmentRepo.listByApplication(app.id) : [];
      const approved = assignments.find((a) => a.status === 'APPROVED');
      out.push({
        ...(await attachUrl(r)),
        application_id: r.application_id,
        mentee_id: app?.mentee_id ?? null,
        mentor_id: approved?.mentor_id ?? null,
      });
    }
    return out;
  },
};
