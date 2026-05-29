import { AppError } from '../domain/errors.js';
import {
  APPLICATION_STATUS,
  ASSIGNMENT_STATUS,
  transition,
} from '../domain/status.js';
import { applicationRepo } from '../repositories/application.repo.js';
import { assignmentRepo } from '../repositories/assignment.repo.js';
import { mentorRepo } from '../repositories/mentor.repo.js';
import { scheduleRepo } from '../repositories/schedule.repo.js';
import { mentorMatchesAvailability } from './candidate.service.js';

export const assignmentService = {
  /**
   * 운영자가 신청에 멘토를 배정.
   * - 현재 application.status 가 SUBMITTED 또는 UNDER_REVIEW 여야 함
   * - 비활성 멘토 거부
   * - 기존 active assignment 는 SUPERSEDED 로 종료
   */
  assignByAdmin(applicationId, mentorId) {
    const app = applicationRepo.findById(applicationId);
    if (!app) throw AppError.notFound('신청을 찾을 수 없습니다.');

    const mentor = mentorRepo.getById(mentorId);
    if (!mentor) throw AppError.notFound('멘토를 찾을 수 없습니다.');
    if (!mentor.is_active) throw AppError.mentorInactive();

    if (
      app.status !== APPLICATION_STATUS.SUBMITTED &&
      app.status !== APPLICATION_STATUS.UNDER_REVIEW &&
      app.status !== APPLICATION_STATUS.REJECTED
    ) {
      throw AppError.statusTransitionNotAllowed(app.status, APPLICATION_STATUS.UNDER_REVIEW);
    }

    // 해당 멘토에게 동일 시간대(±1시간) 확정 일정이 있으면 배정 자체를 차단한다.
    if (scheduleRepo.hasConflict(mentor.id, app.desired_at)) {
      throw AppError.scheduleConflict();
    }

    // 멘토의 weekly availability 와 desired_at 이 매칭되지 않으면 배정 거부.
    const mentorWithSlots = {
      ...mentor,
      availabilities: mentorRepo.getAvailabilities(mentor.id),
    };
    if (!mentorMatchesAvailability(mentorWithSlots, app.desired_at)) {
      throw AppError.conflict(
        'MENTOR_NOT_AVAILABLE',
        '해당 시간에 멘토의 가능 시간대가 없습니다.',
      );
    }

    const actives = assignmentRepo.findActiveByApplication(app.id);
    if (actives.length > 0) assignmentRepo.markSuperseded(actives.map((a) => a.id));

    const assignment = assignmentRepo.insert({
      application_id: app.id,
      mentor_id: mentor.id,
    });

    // 상태 전이 (SUBMITTED -> UNDER_REVIEW or UNDER_REVIEW -> UNDER_REVIEW)
    transition(app.status, APPLICATION_STATUS.UNDER_REVIEW);
    applicationRepo.updateStatus(app.id, APPLICATION_STATUS.UNDER_REVIEW);

    return assignment;
  },

  approveAsMentor(mentorUserId, assignmentId) {
    const assignment = assignmentRepo.findById(assignmentId);
    if (!assignment) throw AppError.notFound('배정을 찾을 수 없습니다.');

    const profile = mentorRepo.getByUserId(mentorUserId);
    if (!profile || profile.id !== assignment.mentor_id) throw AppError.forbidden();
    if (assignment.status !== ASSIGNMENT_STATUS.PENDING) {
      throw AppError.conflict(
        'ASSIGNMENT_NOT_PENDING',
        '대기 상태의 배정만 승인할 수 있습니다.',
      );
    }

    const app = applicationRepo.findById(assignment.application_id);
    if (!app) throw AppError.notFound('신청을 찾을 수 없습니다.');
    if (app.status === APPLICATION_STATUS.CANCELLED) {
      throw AppError.conflict(
        'APPLICATION_CANCELLED',
        '이미 취소된 신청에는 승인할 수 없습니다.',
      );
    }
    transition(app.status, APPLICATION_STATUS.SCHEDULED);

    let schedule;
    try {
      schedule = scheduleRepo.insert({
        application_id: app.id,
        mentor_id: profile.id,
        scheduled_at: app.desired_at,
      });
    } catch (e) {
      if (e.code === 'SCHEDULE_CONFLICT') throw AppError.scheduleConflict();
      if (e.code === 'SCHEDULE_DUPLICATE_APPLICATION') {
        throw AppError.conflict(
          'SCHEDULE_DUPLICATE_APPLICATION',
          '해당 신청에 이미 확정된 일정이 있습니다.',
        );
      }
      throw e;
    }

    applicationRepo.updateStatus(app.id, APPLICATION_STATUS.SCHEDULED);
    assignmentRepo.updateStatus(assignment.id, ASSIGNMENT_STATUS.APPROVED);

    return {
      application_id: app.id,
      assignment_id: assignment.id,
      scheduled_at: schedule.scheduled_at,
      status: APPLICATION_STATUS.SCHEDULED,
    };
  },

  rejectAsMentor(mentorUserId, assignmentId, { reject_reason }) {
    const assignment = assignmentRepo.findById(assignmentId);
    if (!assignment) throw AppError.notFound('배정을 찾을 수 없습니다.');

    const profile = mentorRepo.getByUserId(mentorUserId);
    if (!profile || profile.id !== assignment.mentor_id) throw AppError.forbidden();
    if (assignment.status !== ASSIGNMENT_STATUS.PENDING) {
      throw AppError.conflict(
        'ASSIGNMENT_NOT_PENDING',
        '대기 상태의 배정만 반려할 수 있습니다.',
      );
    }

    const app = applicationRepo.findById(assignment.application_id);
    if (!app) throw AppError.notFound('신청을 찾을 수 없습니다.');
    if (app.status === APPLICATION_STATUS.CANCELLED) {
      throw AppError.conflict(
        'APPLICATION_CANCELLED',
        '이미 취소된 신청에는 반려할 수 없습니다.',
      );
    }

    transition(app.status, APPLICATION_STATUS.REJECTED);
    applicationRepo.updateStatus(app.id, APPLICATION_STATUS.REJECTED);
    assignmentRepo.updateStatus(assignment.id, ASSIGNMENT_STATUS.REJECTED, {
      reject_reason,
    });

    return {
      application_id: app.id,
      assignment_id: assignment.id,
      status: APPLICATION_STATUS.REJECTED,
      reject_reason,
    };
  },

  /**
   * 멘토 본인에게 배정된 요청 목록.
   * 운영자에 의해 취소(application=CANCELLED)된 신청의 PENDING 배정은 제외하여
   * 멘토 화면에 살아있는 것처럼 보이지 않게 한다.
   */
  listMyAssignments(mentorUserId, { status } = {}) {
    const profile = mentorRepo.getByUserId(mentorUserId);
    if (!profile) throw AppError.notFound('멘토 프로필이 등록되지 않았습니다.');
    const rows = assignmentRepo.listByMentor(profile.id, { status });
    return rows
      .map((a) => {
        const app = applicationRepo.findById(a.application_id);
        return { row: a, app };
      })
      .filter(({ row, app }) => {
        // PENDING 인 배정인데 신청이 이미 취소되었으면 멘토에게 노출하지 않는다.
        if (
          row.status === ASSIGNMENT_STATUS.PENDING &&
          app &&
          app.status === APPLICATION_STATUS.CANCELLED
        ) {
          return false;
        }
        return true;
      })
      .map(({ row: a, app }) => ({
        assignment_id: a.id,
        assignment_status: a.status,
        application: app
          ? {
              id: app.id,
              mentee_id: app.mentee_id,
              interest_field: app.interest_field,
              topic: app.topic,
              desired_at: app.desired_at,
              status: app.status,
            }
          : null,
      }));
  },
};
