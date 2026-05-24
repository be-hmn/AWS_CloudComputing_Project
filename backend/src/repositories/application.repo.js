import { store, seq } from '../store/memoryStore.js';

export const applicationRepo = {
  insert({ mentee_id, interest_field, topic, desired_at, message }) {
    const id = seq.applications.next();
    const row = {
      id,
      mentee_id: Number(mentee_id),
      interest_field,
      topic,
      desired_at,
      message: message ?? null,
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
    };
    store.applications.set(id, row);
    return row;
  },

  findById(id) {
    return store.applications.get(Number(id)) ?? null;
  },

  updateStatus(id, status) {
    const row = this.findById(id);
    if (!row) return null;
    row.status = status;
    return row;
  },

  listByMentee(menteeId) {
    return Array.from(store.applications.values())
      .filter((a) => a.mentee_id === Number(menteeId))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  list({ status, mentee_id } = {}) {
    let rows = Array.from(store.applications.values());
    if (status) rows = rows.filter((a) => a.status === status);
    if (mentee_id !== undefined) rows = rows.filter((a) => a.mentee_id === Number(mentee_id));
    return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
};
