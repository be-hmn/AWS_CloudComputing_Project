import { store, seq } from '../store/memoryStore.js';

/**
 * 한 상담의 기본 길이(밀리초). 동일 멘토에 대한 시간 겹침 검사에 사용된다.
 * V1 에서는 application/schedule 모두 단일 시각만 보유하므로,
 * "scheduled_at 시작 + SLOT_DURATION_MS" 범위로 간주한다.
 */
const SLOT_DURATION_MS = 60 * 60 * 1000;

export const scheduleRepo = {
  /**
   * 동일 application 에는 이미 일정이 있을 수 없고,
   * 동일 멘토의 다른 일정과 시간 범위가 겹치면 'SCHEDULE_CONFLICT' 코드 에러 발생.
   * 추후 DB로 교체 시 UNIQUE 제약 위반(ER_DUP_ENTRY) 을 같은 코드로 매핑한다.
   */
  insert({ application_id, mentor_id, scheduled_at }) {
    const aid = Number(application_id);
    const mid = Number(mentor_id);
    const newStart = Date.parse(scheduled_at);
    const newEnd = newStart + SLOT_DURATION_MS;

    for (const row of store.consultation_schedules.values()) {
      if (row.application_id === aid) {
        const err = new Error('SCHEDULE_DUPLICATE_APPLICATION');
        err.code = 'SCHEDULE_DUPLICATE_APPLICATION';
        throw err;
      }
      if (row.mentor_id === mid) {
        const existStart = Date.parse(row.scheduled_at);
        const existEnd = existStart + SLOT_DURATION_MS;
        // [newStart, newEnd) 와 [existStart, existEnd) 가 겹치는 경우 차단
        if (newStart < existEnd && existStart < newEnd) {
          const err = new Error('SCHEDULE_CONFLICT');
          err.code = 'SCHEDULE_CONFLICT';
          throw err;
        }
      }
    }

    const id = seq.consultation_schedules.next();
    const created = {
      id,
      application_id: aid,
      mentor_id: mid,
      scheduled_at,
      created_at: new Date().toISOString(),
    };
    store.consultation_schedules.set(id, created);
    return created;
  },

  findByApplication(applicationId) {
    const aid = Number(applicationId);
    for (const row of store.consultation_schedules.values()) {
      if (row.application_id === aid) return row;
    }
    return null;
  },

  /**
   * 멘토 mentorId 의 기존 확정 일정 중 scheduled_at 범위와 겹치는 것이 있는지 검사.
   * 배정/승인 단계에서 사용한다.
   */
  hasConflict(mentorId, scheduledAt) {
    const mid = Number(mentorId);
    const newStart = Date.parse(scheduledAt);
    if (Number.isNaN(newStart)) return false;
    const newEnd = newStart + SLOT_DURATION_MS;
    for (const row of store.consultation_schedules.values()) {
      if (row.mentor_id !== mid) continue;
      const existStart = Date.parse(row.scheduled_at);
      const existEnd = existStart + SLOT_DURATION_MS;
      if (newStart < existEnd && existStart < newEnd) return true;
    }
    return false;
  },
};
