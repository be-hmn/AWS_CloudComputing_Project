import { AppError } from '../domain/errors.js';
import { applicationRepo } from '../repositories/application.repo.js';
import { mentorRepo } from '../repositories/mentor.repo.js';
import { userRepo } from '../repositories/user.repo.js';
import { scheduleRepo } from '../repositories/schedule.repo.js';

function overlapsDesiredAt(slots, desiredAtIso) {
  const t = Date.parse(desiredAtIso);
  return slots.some(
    (s) => Date.parse(s.start_at) <= t && t < Date.parse(s.end_at),
  );
}

export const candidateService = {
  /**
   * 신청 내용에 맞는 멘토 후보 목록.
   * - 활성(is_active) 인 멘토 중 interest_field 를 보유한 멘토만
   * - 희망 시간(desired_at) 과 가능 시간이 겹치는 멘토를 우선 정렬
   * - 동일 시간대에 이미 확정 일정이 있는 멘토는 has_schedule_conflict=true 로 표시
   */
  listCandidates(applicationId) {
    const app = applicationRepo.findById(applicationId);
    if (!app) throw AppError.notFound('신청을 찾을 수 없습니다.');

    const candidates = mentorRepo.listActiveCandidatesByField(app.interest_field);
    const annotated = candidates.map((c) => {
      const u = userRepo.findById(c.user_id);
      return {
        mentor_id: c.id,
        user_id: c.user_id,
        name: u?.name ?? null,
        major: c.major,
        intro: c.intro,
        fields: c.fields,
        availabilities: c.availabilities,
        is_active: c.is_active,
        overlaps_desired_at: overlapsDesiredAt(c.availabilities, app.desired_at),
        has_schedule_conflict: scheduleRepo.hasConflict(c.id, app.desired_at),
      };
    });

    // 충돌 없는 후보를 위로, 그다음 가용시간 겹침 우선
    annotated.sort((a, b) => {
      if (a.has_schedule_conflict !== b.has_schedule_conflict) {
        return a.has_schedule_conflict ? 1 : -1;
      }
      if (a.overlaps_desired_at !== b.overlaps_desired_at) {
        return a.overlaps_desired_at ? -1 : 1;
      }
      return a.mentor_id - b.mentor_id;
    });
    return annotated;
  },
};
