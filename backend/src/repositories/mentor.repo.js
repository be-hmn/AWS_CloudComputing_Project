import { store, seq } from '../store/memoryStore.js';

export const mentorRepo = {
  getByUserId(userId) {
    for (const p of store.mentor_profiles.values()) {
      if (p.user_id === Number(userId)) return p;
    }
    return null;
  },

  getById(id) {
    return store.mentor_profiles.get(Number(id)) ?? null;
  },

  insertProfile({ user_id, major, intro, profile_image_key }) {
    const id = seq.mentor_profiles.next();
    const row = {
      id,
      user_id,
      major,
      intro: intro ?? null,
      profile_image_key: profile_image_key ?? null,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    store.mentor_profiles.set(id, row);
    return row;
  },

  updateProfile(id, patch) {
    const row = this.getById(id);
    if (!row) return null;
    if (patch.major !== undefined) row.major = patch.major;
    if (patch.intro !== undefined) row.intro = patch.intro;
    if (patch.profile_image_key !== undefined) row.profile_image_key = patch.profile_image_key;
    return row;
  },

  setActive(id, isActive) {
    const row = this.getById(id);
    if (!row) return null;
    row.is_active = !!isActive;
    return row;
  },

  // ---------- fields ----------
  getFields(mentorId) {
    return store.mentor_fields
      .filter((f) => f.mentor_id === Number(mentorId))
      .map((f) => f.field);
  },

  replaceFields(mentorId, fields) {
    const mid = Number(mentorId);
    for (let i = store.mentor_fields.length - 1; i >= 0; i--) {
      if (store.mentor_fields[i].mentor_id === mid) {
        store.mentor_fields.splice(i, 1);
      }
    }
    const unique = Array.from(new Set(fields));
    for (const field of unique) {
      store.mentor_fields.push({ mentor_id: mid, field });
    }
    return unique;
  },

  // ---------- availabilities ----------
  getAvailabilities(mentorId) {
    return Array.from(store.mentor_availabilities.values())
      .filter((a) => a.mentor_id === Number(mentorId))
      .sort((a, b) => a.start_at.localeCompare(b.start_at));
  },

  replaceAvailabilities(mentorId, slots) {
    const mid = Number(mentorId);
    for (const [id, a] of store.mentor_availabilities) {
      if (a.mentor_id === mid) store.mentor_availabilities.delete(id);
    }
    const inserted = [];
    for (const s of slots) {
      const id = seq.mentor_availabilities.next();
      const row = { id, mentor_id: mid, start_at: s.start_at, end_at: s.end_at };
      store.mentor_availabilities.set(id, row);
      inserted.push(row);
    }
    return inserted;
  },

  // ---------- listings ----------
  listAll({ activeOnly = false } = {}) {
    return Array.from(store.mentor_profiles.values())
      .filter((p) => (activeOnly ? p.is_active : true))
      .map((p) => ({
        ...p,
        fields: this.getFields(p.id),
        availabilities: this.getAvailabilities(p.id),
      }));
  },

  /**
   * 특정 분야로 활성 멘토 후보 목록을 반환.
   */
  listActiveCandidatesByField(field) {
    const matchingMentorIds = new Set(
      store.mentor_fields.filter((f) => f.field.toLowerCase().includes(field.toLowerCase())).map((f) => f.mentor_id),
    );
    return Array.from(store.mentor_profiles.values())
      .filter((p) => p.is_active && matchingMentorIds.has(p.id))
      .map((p) => ({
        ...p,
        fields: this.getFields(p.id),
        availabilities: this.getAvailabilities(p.id),
      }));
  },
};
