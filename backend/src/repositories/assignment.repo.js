import { store, seq } from '../store/memoryStore.js';
import { ASSIGNMENT_STATUS } from '../domain/status.js';

export const assignmentRepo = {
  insert({ application_id, mentor_id }) {
    const id = seq.assignments.next();
    const row = {
      id,
      application_id: Number(application_id),
      mentor_id: Number(mentor_id),
      status: ASSIGNMENT_STATUS.PENDING,
      reject_reason: null,
      created_at: new Date().toISOString(),
      closed_at: null,
    };
    store.assignments.set(id, row);
    return row;
  },

  findById(id) {
    return store.assignments.get(Number(id)) ?? null;
  },

  /**
   * 주어진 application 에 active 상태(PENDING / APPROVED) 인 assignment 들.
   */
  findActiveByApplication(applicationId) {
    const aid = Number(applicationId);
    return Array.from(store.assignments.values()).filter(
      (a) =>
        a.application_id === aid &&
        (a.status === ASSIGNMENT_STATUS.PENDING ||
          a.status === ASSIGNMENT_STATUS.APPROVED),
    );
  },

  markSuperseded(ids) {
    for (const id of ids) {
      const row = store.assignments.get(Number(id));
      if (!row) continue;
      row.status = ASSIGNMENT_STATUS.SUPERSEDED;
      row.closed_at = new Date().toISOString();
    }
  },

  updateStatus(id, status, { reject_reason } = {}) {
    const row = this.findById(id);
    if (!row) return null;
    row.status = status;
    if (reject_reason !== undefined) row.reject_reason = reject_reason;
    if (
      status === ASSIGNMENT_STATUS.APPROVED ||
      status === ASSIGNMENT_STATUS.REJECTED ||
      status === ASSIGNMENT_STATUS.SUPERSEDED
    ) {
      row.closed_at = new Date().toISOString();
    }
    return row;
  },

  listByMentor(mentorId, { status } = {}) {
    const mid = Number(mentorId);
    let rows = Array.from(store.assignments.values()).filter((a) => a.mentor_id === mid);
    if (status) rows = rows.filter((a) => a.status === status);
    return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  listByApplication(applicationId) {
    const aid = Number(applicationId);
    return Array.from(store.assignments.values())
      .filter((a) => a.application_id === aid)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  countsByMentor() {
    const result = new Map();
    for (const a of store.assignments.values()) {
      const cur = result.get(a.mentor_id) ?? { assigned: 0, completed: 0 };
      cur.assigned += 1;
      result.set(a.mentor_id, cur);
    }
    return result;
  },
};
