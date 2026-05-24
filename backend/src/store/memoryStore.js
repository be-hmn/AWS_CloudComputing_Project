/**
 * In-memory data store.
 *
 * 추후 실제 DB(MySQL/RDS 등)로 교체할 때:
 *  - 각 repository 파일에서 본 store 대신 SQL 쿼리를 호출하도록 바꾸면 된다.
 *  - 트랜잭션 경계는 services/* 의 withTransaction 유틸을 통해 추가한다.
 *
 * 현재는 모든 컬렉션이 Map<id, row> 형태이며, id 는 자동증가 정수.
 */

class Sequence {
  constructor() {
    this._n = 0;
  }
  next() {
    this._n += 1;
    return this._n;
  }
}

export const store = {
  users: new Map(), // id -> { id, email, password_hash, role, name, created_at }
  mentor_profiles: new Map(), // id -> { id, user_id, major, intro, profile_image_key, is_active, created_at }
  mentor_fields: [], // [{ mentor_id, field }]
  mentor_availabilities: new Map(), // id -> { id, mentor_id, start_at, end_at }
  applications: new Map(), // id -> { id, mentee_id, interest_field, topic, desired_at, message, status, created_at }
  assignments: new Map(), // id -> { id, application_id, mentor_id, status, reject_reason, created_at, closed_at }
  consultation_schedules: new Map(), // id -> { id, application_id, mentor_id, scheduled_at, created_at }
  consultation_records: new Map(), // id -> { id, application_id, summary, follow_up_task, needs_next_consultation, attachment_key, created_at }
};

export const seq = {
  users: new Sequence(),
  mentor_profiles: new Sequence(),
  mentor_availabilities: new Sequence(),
  applications: new Sequence(),
  assignments: new Sequence(),
  consultation_schedules: new Sequence(),
  consultation_records: new Sequence(),
};

/**
 * 테스트나 데모 시 데이터 초기화에 사용.
 */
export function resetStore() {
  for (const key of Object.keys(store)) {
    if (Array.isArray(store[key])) store[key].length = 0;
    else store[key].clear();
  }
  for (const s of Object.values(seq)) s._n = 0;
}
