import { mentorRepo } from '../repositories/mentor.repo.js';
import { assignmentRepo } from '../repositories/assignment.repo.js';
import { applicationRepo } from '../repositories/application.repo.js';
import { userRepo } from '../repositories/user.repo.js';
import { APPLICATION_STATUS, ASSIGNMENT_STATUS } from '../domain/status.js';

export const statsService = {
  /**
   * 멘토별 (assigned_count, completed_count) 집계.
   * - assigned_count: SUPERSEDED 가 아닌 모든 assignment 합계
   * - completed_count: 멘토에게 APPROVED 된 assignment 의 application 중 status = COMPLETED 인 건수
   */
  mentorStats() {
    const mentors = mentorRepo.listAll();
    const result = [];

    for (const m of mentors) {
      const assignments = assignmentRepo.listByMentor(m.id);
      const assigned_count = assignments.filter(
        (a) => a.status !== ASSIGNMENT_STATUS.SUPERSEDED,
      ).length;
      const completed_count = assignments.filter((a) => {
        if (a.status !== ASSIGNMENT_STATUS.APPROVED) return false;
        const app = applicationRepo.findById(a.application_id);
        return app && app.status === APPLICATION_STATUS.COMPLETED;
      }).length;

      const u = userRepo.findById(m.user_id);
      result.push({
        mentor_id: m.id,
        name: u?.name ?? null,
        major: m.major,
        is_active: m.is_active,
        assigned_count,
        completed_count,
      });
    }
    return result;
  },
};
