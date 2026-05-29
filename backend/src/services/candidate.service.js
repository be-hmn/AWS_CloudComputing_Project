import { AppError } from '../domain/errors.js';
import { applicationRepo } from '../repositories/application.repo.js';
import { mentorRepo } from '../repositories/mentor.repo.js';
import { userRepo } from '../repositories/user.repo.js';
import { scheduleRepo } from '../repositories/schedule.repo.js';
import { isoToKstWeekdayMinutes, minutesToTimeString } from '../utils/datetime.js';

/**
 * desired_at(ISO) 의 KST 요일·분과 멘토 weekly availability 슬롯이 매칭되는지 검사.
 */
export function mentorMatchesAvailability(mentor, desiredAtIso) {
  const want = isoToKstWeekdayMinutes(desiredAtIso);
  if (!want) return false;
  const slots = mentor.availabilities ?? [];
  return slots.some(
    (s) =>
      s.weekday === want.weekday &&
      s.start_minutes <= want.minutes &&
      want.minutes < s.end_minutes,
  );
}

export const candidateService = {
  /**
   * 신청 내용에 맞는 멘토 후보 목록.
   * - 활성(is_active) 인 멘토 중 interest_field 를 보유한 멘토만
   * - 희망 시각(desired_at) 의 KST 요일·시간이 weekly availability 안에 들어오는 멘토만
   * - 같은 시간대에 이미 확정 일정이 있는 멘토는 제외
   */
  listCandidates(applicationId) {
    const app = applicationRepo.findById(applicationId);
    if (!app) throw AppError.notFound('신청을 찾을 수 없습니다.');

    const candidates = mentorRepo.listActiveCandidatesByField(app.interest_field);
    return candidates
      .filter((c) => mentorMatchesAvailability(c, app.desired_at))
      .filter((c) => !scheduleRepo.hasConflict(c.id, app.desired_at))
      .map((c) => {
        const u = userRepo.findById(c.user_id);
        return {
          mentor_id: c.id,
          user_id: c.user_id,
          name: u?.name ?? null,
          major: c.major,
          intro: c.intro,
          fields: c.fields,
          availabilities: (c.availabilities ?? []).map((s) => ({
            id: s.id,
            weekday: s.weekday,
            start_time: minutesToTimeString(s.start_minutes),
            end_time: minutesToTimeString(s.end_minutes),
          })),
          is_active: c.is_active,
        };
      })
      .sort((a, b) => a.mentor_id - b.mentor_id);
  },
};
