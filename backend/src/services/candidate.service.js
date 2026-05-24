import { AppError } from '../domain/errors.js';
import { applicationRepo } from '../repositories/application.repo.js';
import { mentorRepo } from '../repositories/mentor.repo.js';
import { userRepo } from '../repositories/user.repo.js';

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
      };
    });

    // 겹침=true 우선, 그다음 mentor_id 안정 정렬
    annotated.sort((a, b) => {
      if (a.overlaps_desired_at !== b.overlaps_desired_at) {
        return a.overlaps_desired_at ? -1 : 1;
      }
      return a.mentor_id - b.mentor_id;
    });
    return annotated;
  },
};
