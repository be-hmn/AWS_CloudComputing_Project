import { store, seq } from '../store/memoryStore.js';

export const scheduleRepo = {
  /**
   * 동일 (mentor_id, scheduled_at) 가 이미 존재하면 'SCHEDULE_CONFLICT' 코드 에러 발생.
   * 추후 DB로 교체 시 UNIQUE 제약 위반(ER_DUP_ENTRY) 을 같은 코드로 매핑한다.
   */
  insert({ application_id, mentor_id, scheduled_at }) {
    const aid = Number(application_id);
    const mid = Number(mentor_id);

    for (const row of store.consultation_schedules.values()) {
      if (row.application_id === aid) {
        const err = new Error('SCHEDULE_DUPLICATE_APPLICATION');
        err.code = 'SCHEDULE_DUPLICATE_APPLICATION';
        throw err;
      }
      if (row.mentor_id === mid && row.scheduled_at === scheduled_at) {
        const err = new Error('SCHEDULE_CONFLICT');
        err.code = 'SCHEDULE_CONFLICT';
        throw err;
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
};
